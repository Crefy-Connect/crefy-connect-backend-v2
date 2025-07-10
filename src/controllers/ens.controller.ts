import type { Request, Response } from "express";
import ENSL1SubnameRegistrarService from "../web3/ens.services.js";
import logger from "../utils/logger.js";
import { ChainUtils } from "../config/chains.config.js";
import { Wallet } from "../models/wallet.models.js";
import { HttpStatus } from "@src/utils/httpStatus.js";
import { ENSRoot } from "../models/ensroot.models.js";

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
            const { _id: walletId } = (req as any).wallet;
            const { ens_name, contractAddress, chain, isActive } = req.body;

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
                isActive: isActive !== false // Default to true if not specified
            });

            await newRoot.save();

            return res.status(HttpStatus.OK).json({
                success: true,
                message: "ENS root registered successfully",
                data: {
                    name: newRoot.ens_name,
                    contractAddress: newRoot.contractAddress,
                    isActive: newRoot.isActive,
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
     * @api {get} /ens/subnames/check-availability Check Subname Availability
     * @apiName CheckSubnameAvailability
     * @apiGroup ENS
     * @apiQuery {String} subName The subname to check
     * @apiQuery {String} chain The blockchain network (ethereum|sepolia|goerli)
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

            // Convert query parameters to strings
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


}