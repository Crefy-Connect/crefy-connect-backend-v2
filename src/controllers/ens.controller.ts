import type { Request, Response } from "express";
import ENSL1SubnameRegistrarService from "../web3/ens.services.js";
import logger from "../utils/logger.js";
import { ChainUtils } from "../config/chains.config.js";
import { Wallet } from "../models/wallet.models.js";
import { HttpStatus } from "../utils/httpStatus.js";
import { ENSRoot } from "../models/ensroot.models.js";
import { Web3Service } from "../services/web3.service.js";
import { contract_config } from "../config/index.js";

export default class ENSController {
    /**
     * Initialize ENS service for a specific user wallet
     */
    private async initializeENSService(walletId: string, chainName: string, appId: string): Promise<ENSL1SubnameRegistrarService> {
        try {
            const chain = ChainUtils.getChainByName(chainName);
            if (!chain) {
                throw new Error(`Invalid chain: ${chainName}. Supported chains: ${ChainUtils.getAllSupportedChains().map(c => c.name).join(", ")}`);
            }

            const wallet = await Wallet.findOne({
                $or: [{ email: walletId }, { _id: walletId }],
            });

            if (!wallet) {
                throw new Error("Wallet not found");
            }

            if (!wallet.isActive) {
                throw new Error("Wallet is not active. Please verify your wallet first.");
            }

            const ens_root = await ENSRoot.findOne({ ownerAppId: appId });
            if (!ens_root) {
                throw new Error("ENS root not found for this app");
            }

            const contractAddress = ens_root.contractAddress as `0x${string}`;

            return new ENSL1SubnameRegistrarService(chain.name, wallet.encryptedPrivateKey, contractAddress);
        } catch (error) {
            logger.error(`Error initializing ENS service: ${error}`);
            throw error;
        }
    }

    /**
     * @api {post} /ens/roots Register ENS Root
     * @apiName RegisterRoot
     * @apiGroup ENS
     */
    public async registerRoot(req: Request, res: Response) {
        try {
            const { id: walletId } = (req as any).user;
            const { ens_name, contractAddress, chain, status, txHash } = req.body;

            if (!ens_name || !chain) {
                return res.status(HttpStatus.BAD_REQUEST).json({
                    success: false,
                    message: "Name and chain are required"
                });
            }

            if (!ens_name.endsWith(".eth")) {
                return res.status(HttpStatus.BAD_REQUEST).json({
                    success: false,
                    message: "ENS Name must end with .eth"
                });
            }

            const existingRoot = await ENSRoot.findOne({ ens_name });
            if (existingRoot) {
                return res.status(HttpStatus.CONFLICT).json({
                    success: false,
                    message: "ENS root already registered"
                });
            }

            const newRoot = new ENSRoot({
                ens_name,
                contractAddress,
                ownerAppId: (req as any).developer_app.appId,
                status: status || 'pending',
                txHash: txHash || null
            });

            await newRoot.save();

            return res.status(HttpStatus.OK).json({
                success: true,
                message: "ENS root registered successfully",
                data: {
                    name: newRoot.ens_name,
                    contractAddress: newRoot.contractAddress,
                    status: newRoot.status,
                    ownerAppId: newRoot.ownerAppId
                }
            });
        } catch (error: any) {
            logger.error(`Error in registerRoot: ${error.message}`);
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: error.message
            });
        }
    }

    /**
     * @api {get} /ens/name Get ENS Name
     * @apiName GetENSName
     * @apiGroup ENS
     */
    public async getENSName(req: Request, res: Response) {
        try {
            const { appId } = (req as any).developer_app;
            const ensRoot = await ENSRoot.findOne({ ownerAppId: appId });

            if (!ensRoot) {
                return res.status(HttpStatus.NOT_FOUND).json({
                    success: false,
                    message: "No ENS root registered for this app"
                });
            }

            return res.status(HttpStatus.OK).json({
                success: true,
                data: {
                    ensName: ensRoot.ens_name,
                    contractAddress: ensRoot.contractAddress,
                    status: ensRoot.status
                }
            });
        } catch (error: any) {
            logger.error(`Error in getENSName: ${error.message}`);
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: error.message
            });
        }
    }

    /**
     * @api {get} /ens/resolver/address Get Resolver Address
     * @apiName GetResolverAddress
     * @apiGroup ENS
     * @apiQuery {String} ensName The ENS name to query
     * @apiQuery {String} chain The blockchain network
     */
    public async getResolverAddress(req: Request, res: Response) {
        try {
            const { ensName, chain } = req.query;

            if (!ensName || !chain) {
                return res.status(HttpStatus.BAD_REQUEST).json({
                    success: false,
                    message: "ENS name and chain are required"
                });
            }

            const web3Service = new Web3Service(chain.toString());
            const address = await web3Service.getResolverAddress(ensName.toString());

            return res.status(HttpStatus.OK).json({
                success: true,
                data: {
                    ensName,
                    address
                }
            });
        } catch (error: any) {
            logger.error(`Error in getResolverAddress: ${error.message}`);
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: error.message
            });
        }
    }

    /**
     * @api {post} /ens/resolver/set-address Prepare Set Resolver Address
     * @apiName PrepareSetResolverAddress
     * @apiGroup ENS
     * @apiDescription Prepares a transaction to set the address for an ENS name
     */
    public async prepareSetResolverAddress(req: Request, res: Response) {
        try {
            const { ensName, newAddress, chain, from } = req.body;

            if (!ensName || !newAddress || !chain) {
                return res.status(HttpStatus.BAD_REQUEST).json({
                    success: false,
                    message: "ENS name, new address and chain are required"
                });
            }

            const web3Service = new Web3Service(chain);
            const preparedTx = await web3Service.prepareSetResolverAddress(
                ensName,
                newAddress,
                from
            );

            return res.status(HttpStatus.OK).json({
                success: true,
                message: "Transaction prepared successfully",
                data: preparedTx
            });
        } catch (error: any) {
            logger.error(`Error in prepareSetResolverAddress: ${error.message}`);

            if (error.message.includes("Invalid address format")) {
                return res.status(HttpStatus.BAD_REQUEST).json({
                    success: false,
                    message: error.message
                });
            }

            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: error.message
            });
        }
    }

    /**
     * @api {get} /ens/subnames/check-availability Check Subname Availability
     * @apiName CheckSubnameAvailability
     * @apiGroup ENS
     */
    public async checkAvailability(req: Request, res: Response) {
        try {
            const { _id: walletId } = (req as any).wallet;
            const { appId } = (req as any).developer_app;
            const { subName, chain } = req.query;

            if (!subName || !chain) {
                return res.status(HttpStatus.BAD_REQUEST).json({
                    success: false,
                    message: "Subname and chain are required as query parameters"
                });
            }

            const subNameStr = subName.toString();
            const chainStr = chain.toString();

            const ensService = await this.initializeENSService(walletId, chainStr, appId);
            const isTaken = await ensService.isNameTaken(subNameStr);

            return res.status(HttpStatus.OK).json({
                success: true,
                message: isTaken ? "Subname is already taken" : "Subname is available",
                available: !isTaken
            });
        } catch (error: any) {
            logger.error(`Error in checkAvailability: ${error.message}`);

            if (error.message.includes("ENS root not found")) {
                return res.status(HttpStatus.NOT_FOUND).json({
                    success: false,
                    message: error.message
                });
            }

            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: error.message
            });
        }
    }

    /**
     * @api {post} /ens/subnames/claim Claim Subname
     * @apiName ClaimSubname
     * @apiGroup ENS
     */
    public async claimSubname(req: Request, res: Response) {
        try {
            const { _id: walletId } = (req as any).wallet;
            const { subName, chain } = req.body;
            const { appId } = (req as any).developer_app;

            if (!subName || !chain) {
                return res.status(HttpStatus.BAD_REQUEST).json({
                    success: false,
                    message: "ENS name and chain are required"
                });
            }

            // check if the wallet already has the subname
            const wallet = await Wallet.findById(walletId);
            if (wallet && wallet.subname) {
                return res.status(HttpStatus.BAD_REQUEST).json({
                    success: false,
                    message: "This wallet already has a subname assigned"
                });
            }
            const ensService = await this.initializeENSService(walletId, chain, appId);

            const isTaken = await ensService.isNameTaken(subName as string);
            if (isTaken) {
                return res.status(HttpStatus.BAD_REQUEST).json({
                    success: false,
                    message: "Subname is already taken"
                });
            }

            const response: any = await ensService.claimName(subName as string);

            if (response.status === 'error') {
                const gasInfoMatch = response.error.match(
                    /maxFeePerGas:\s+([^\s]+)\s+gwei.*?maxPriorityFeePerGas:\s+([^\s]+)\s+gwei/s
                );
                let maxFeePerGas = 0;
                let maxPriorityFeePerGas = 0;
                let errorDetails: any = {};

                errorDetails = {
                    url: response.error.match(/URL:\s+([^\n]+)/)?.[1]?.trim(),
                    requestBody: response.error.match(/Request body:\s+([^\n]+)/)?.[1]?.trim(),
                    gasParams: {} as Record<string, string>
                };

                if (gasInfoMatch) {
                    maxFeePerGas = gasInfoMatch[1];
                    maxPriorityFeePerGas = gasInfoMatch[2];
                }

                return res.status(HttpStatus.INSUFFICIENT_GAS_FEE).json({
                    success: false,
                    errorDetails: errorDetails,
                    maxFeePerGas: maxFeePerGas,
                    maxPriorityFeePerGas: maxPriorityFeePerGas,
                    balance: Number(response.balance)
                });
            }

            return res.status(HttpStatus.OK).json({
                success: true,
                message: "Subname claimed successfully",
                data: {
                    txHash: response.hash
                }
            });
        } catch (error: any) {
            logger.error(`Error in claimSubname: ${error.message}`);
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: error.message
            });
        }
    }

    public async prepareCreateSubnameRegistrar(req: Request, res: Response) {
        try {
            const { id: userID } = (req as any).user;
            const { ensName, chain, from } = req.body;
            const { appId } = (req as any).developer_app;

            if (!ensName || !chain) {
                return res.status(HttpStatus.BAD_REQUEST).json({
                    success: false,
                    message: "ENS name and chain are required"
                });
            }

            const existingRoot = await ENSRoot.findOne({
                ownerAppId: appId,
                ens_name: ensName
            });

            if (existingRoot && existingRoot.status === 'active' && existingRoot.contractAddress) {
                return res.status(HttpStatus.OK).json({
                    success: true,
                    message: "ENS root already registered",
                    data: {
                        contractAddress: existingRoot.contractAddress,
                        status: existingRoot.status
                    }
                });
            }

            if (existingRoot && existingRoot.status !== 'active') {
                return res.status(HttpStatus.OK).json({
                    success: true,
                    message: `ENS root registration ${existingRoot.status}`,
                    data: {
                        status: existingRoot.status,
                        txHash: existingRoot.txHash,
                        contractAddress: existingRoot.contractAddress
                    }
                });
            }

            const web3Service = new Web3Service(chain);
            const preparedTx = await web3Service.prepareENSRegistrarCreation(
                contract_config.ENS_FACTORY_CONTRACT_ADDRESS as `0x${string}`,
                contract_config.ENS_FACTORY_CONTRACT_ABI,
                ensName,
                from
            );

            return res.status(HttpStatus.OK).json({
                success: true,
                message: "Transaction prepared successfully",
                data: preparedTx
            });
        } catch (error: any) {
            logger.error(`Error in prepareCreateSubnameRegistrar: ${error.message}`);

            if (error.message.includes("ENS name must be a valid string")) {
                return res.status(HttpStatus.BAD_REQUEST).json({
                    success: false,
                    message: error.message
                });
            }

            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: error.message
            });
        }
    }

    /**
     * @api {post} /ens/namewrapper/prepare-approval Prepare NameWrapper Approval
     * @apiName PrepareNameWrapperApproval
     * @apiGroup ENS
     */
    public async prepareNameWrapperTransfer(req: Request, res: Response) {
        try {
            const { id: userID } = (req as any).user;
            const { chain, operator, approved } = req.body;
            const { appId } = (req as any).developer_app;

            if (!chain || !operator || typeof approved !== 'boolean') {
                return res.status(HttpStatus.BAD_REQUEST).json({
                    success: false,
                    message: "Chain, operator (address), and approved (boolean) are required parameters"
                });
            }

            const chainConfig = ChainUtils.getChainByName(chain);
            if (!chainConfig) {
                return res.status(HttpStatus.BAD_REQUEST).json({
                    success: false,
                    message: `Unsupported chain: ${chain}`
                });
            }

            const web3Service = new Web3Service(chain);
            const preparedTx = await web3Service.prepareNameWrapperTransfer(
                contract_config.ENS_NAMEWRAPPER_CONTRACT_ADDRESS as `0x${string}`,
                contract_config.ENS_NAMEWRAPPER_CONTRACT_ABI,
                {
                    operator,
                    approved
                }
            );

            return res.status(HttpStatus.OK).json({
                success: true,
                message: "NameWrapper approval transaction prepared successfully",
                data: preparedTx
            });
        } catch (error: any) {
            logger.error(`Error in prepareNameWrapperTransfer: ${error.message}`);

            if (error.message.includes("invalid address") || error.message.includes("invalid parameters")) {
                return res.status(HttpStatus.BAD_REQUEST).json({
                    success: false,
                    message: error.message
                });
            }

            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: error.message
            });
        }
    }

    /**
     * @api {post} /ens/roots/update-status Update ENS Root Status
     * @apiName UpdateENSRootStatus
     * @apiGroup ENS
     */
    public async updateENSRootStatus(req: Request, res: Response) {
        try {
            const { status, contractAddress, txHash } = req.body;
            const { appId } = (req as any).developer_app;

            if (!status || !['active', 'failed'].includes(status)) {
                return res.status(HttpStatus.BAD_REQUEST).json({
                    success: false,
                    message: "Valid ENS name and status are required"
                });
            }

            if (status === 'active' && !contractAddress) {
                return res.status(HttpStatus.BAD_REQUEST).json({
                    success: false,
                    message: "Contract address is required for active status"
                });
            }

            const ensRoot = await ENSRoot.findOneAndUpdate(
                { contractAddress, ownerAppId: appId },
                {
                    status,
                    ...(txHash && { txHash }),
                    updatedAt: new Date()
                },
                { new: true }
            );

            if (!ensRoot) {
                return res.status(HttpStatus.NOT_FOUND).json({
                    success: false,
                    message: "ENS root not found"
                });
            }

            return res.status(HttpStatus.OK).json({
                success: true,
                message: `ENS root status updated to ${status}`,
                data: ensRoot
            });
        } catch (error: any) {
            logger.error(`Error in updateENSRootStatus: ${error.message}`);
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: error.message
            });
        }
    }

    /**
     * @api {get} /ens/roots Get All Roots
     * @apiName GetAllRoots
     * @apiGroup ENS
     */
    public async getAllRoots(req: Request, res: Response) {
        try {
            const { appId } = (req as any).developer_app;
            const roots = await ENSRoot.find({ ownerAppId: appId });

            return res.status(HttpStatus.OK).json({
                success: true,
                message: "All ENS roots fetched successfully",
                data: roots
            });
        } catch (error: any) {
            logger.error(`Error in getAllRoots: ${error.message}`);
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                success: false,
                message: error.message
            });
        }
    }
}