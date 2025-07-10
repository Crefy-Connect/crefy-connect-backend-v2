import { contract_config } from "../config/index.js";
import {
    type Address,
    type Hash,
    type TransactionReceipt,
    encodeFunctionData,
    type Abi,
    createPublicClient,
    type Chain,
    http,
    type PublicClient,
    type WalletClient,
    createWalletClient
} from "viem";
import { AccountAbstractionService } from "./account-abstraction.js";
import logger from "../utils/logger.js";
import { Account, privateKeyToAccount } from "viem/accounts";
import { normalize, labelhash } from 'viem/ens';
import { ChainUtils } from "../config/chains.config.js";
import { formatEther } from "viem";

interface SubnameClaimedEvent {
    node: string;
    label: string;
    owner: Address;
}

interface ContractCall {
    contractAddress: Address;
    abi: Abi;
    functionName: string;
    args?: any[];
    value?: string;
}


interface TransactionResult {
    status: 'success';
    address: string;
    hash: string;
    receipt: any;
    gasUsed: bigint;
    effectiveGasPrice: bigint;
    estimatedGas: bigint; // Estimated gas before execution
    estimatedCost: bigint; // Estimated cost (gas * gasPrice)
    chainId: number;
}

interface ErrorResponse {
    status: 'error';
    error: string;
    details: {
        functionName: string;
        args: any[];
        account: string;
        contractAddress: string;
        chainId: number;
        estimatedGas?: bigint; // Only if gas estimation was done
        gasPrice?: bigint; // Only if gas estimation was done
        estimatedCost?: bigint; // Only if gas estimation was done
        accountBalance?: bigint; // Only if balance check failed
        required?: bigint; // Only if balance check failed
        shortBy?: bigint; // Only if balance check failed
    };
}

class ENSL1SubnameRegistrarService {
    private readonly contractAddress: Address;
    private readonly contractABI: Abi;
    private publicClient: PublicClient;
    private account: Account;
    private aaService: AccountAbstractionService;
    private chain: Chain;
    private walletClient: WalletClient;


    constructor(chainName: string, privateKey: string, contractAddress: Address) {
        this.contractAddress = contractAddress;
        this.contractABI = contract_config.L1_SUBNAME_REGISTRAR_CONTRACT_ABI;

        const chain = ChainUtils.getChainByName(chainName);
        if (!chain) {
            throw new Error(`Chain not found for name: ${chainName}`);
        }

        if (!privateKey) {
            throw new Error("Private key is required");
        }

        this.chain = chain;
        this.aaService = new AccountAbstractionService({ privateKey, chainId: this.chain.id });

        this.account = privateKeyToAccount(privateKey as `0x${string}`);

        // Initialize public client for read operations
        this.publicClient = createPublicClient({
            chain: this.chain,
            transport: http()
        });

        this.walletClient = createWalletClient({
            account: this.account,
            chain: this.chain,
            transport: http()
        });
    }

    // View functions
    async getNameWrapperAddress(): Promise<Address> {
        return this.readContract({
            functionName: "NameWrapperAddress",
            args: []
        });
    }

    async getId(): Promise<number> {
        return this.readContract({
            functionName: "getId",
            args: []
        });
    }

    async getSubnameOwner(label: string): Promise<Address> {
        return this.readContract({
            functionName: "getSubnameOwner",
            args: [label]
        });
    }

    async isNameTaken(name: string): Promise<boolean> {
        const normalizedName = normalize(name);
        const hashedNode = labelhash(normalizedName);
        console.log(hashedNode);
        console.log(typeof hashedNode);
        return this.readContract({
            functionName: "nameTaken",
            args: [hashedNode]
        });
    }

    async ownsParentNode(): Promise<boolean> {
        return this.readContract({
            functionName: "ownsParentNode",
            args: []
        });
    }

    async getParentNode(): Promise<string> {
        return this.readContract({
            functionName: "parentNode",
            args: []
        });
    }

    async getSubnameOwnerByNode(node: string): Promise<Address> {
        return this.readContract({
            functionName: "subnameOwners",
            args: [node]
        });
    }

    async viewAllSubnames(): Promise<string[]> {
        return this.readContract({
            functionName: "viewAllSubnames",
            args: []
        });
    }

    async supportsInterface(interfaceId: string): Promise<boolean> {
        return this.readContract({
            functionName: "supportsInterface",
            args: [interfaceId]
        });
    }

    async getBalance(): Promise<{ balance: string, address: Address }> {
        try {
            const balance = await this.publicClient.getBalance({
                address: this.account.address
            });
            return {
                balance: formatEther(balance),
                address: this.account.address
            }
        } catch (error: any) {
            logger.error(`Failed to get balance: ${error.message}`);
            throw new Error(`Failed to get balance: ${error.message}`);
        }
    }

    async claimName(name: string, sponsored: boolean = false): Promise<TransactionResult | ErrorResponse> {
        try {
            // Validate name format first
            if (!name || typeof name !== 'string' || name.length < 1) {
                return {
                    status: 'error',
                    error: 'Invalid name format',
                    details: {
                        functionName: 'claimName',
                        args: [name],
                        account: this.account.address,
                        contractAddress: this.contractAddress,
                        chainId: this.chain.id
                    }
                };
            }

            // Debug logging
            logger.info(`Attempting to claim name: ${name}`);
            const normalizedName = normalize(name);
            logger.info(`Normalized name: ${normalizedName}`);

            // First try simulation
            try {
                const { request } = await this.publicClient.simulateContract({
                    account: this.account,
                    address: this.contractAddress,
                    abi: this.contractABI,
                    functionName: "claimName",
                    args: [normalizedName]
                });
                logger.info('Simulation successful', request);
            } catch (simError) {
                logger.error('Simulation failed', simError);
                return {
                    status: 'error',
                    error: `Simulation failed: ${simError instanceof Error ? simError.message : String(simError)}`,
                    details: {
                        functionName: 'claimName',
                        args: [name],
                        account: this.account.address,
                        contractAddress: this.contractAddress,
                        chainId: this.chain.id
                    }
                };
            }

            // If simulation passes, proceed with actual transaction
            if (sponsored) {
                return await this.aaWriteContract({
                    functionName: "claimName",
                    args: [normalizedName]
                });
            }
            return await this.writeContract({
                functionName: "claimName",
                args: [normalizedName]
            });
        } catch (error: any) {
            logger.error(`Claim name failed: ${error.message}`);
            return {
                status: 'error',
                error: error.message,
                details: {
                    functionName: 'claimName',
                    args: [name],
                    account: this.account.address,
                    contractAddress: this.contractAddress,
                    chainId: this.chain.id
                }
            };
        }
    }


    // Helper methods
    private async readContract(params: {
        functionName: string;
        args: any[];
    }): Promise<any> {
        try {
            return await this.publicClient.readContract({
                address: this.contractAddress,
                abi: this.contractABI,
                functionName: params.functionName,
                args: params.args
            });
        } catch (error: any) {
            logger.error(`Contract read failed for ${params.functionName}: ${error.message}`);
            throw new Error(`Contract read failed: ${error.message}`);
        }
    }

    private async writeContract(params: {
        functionName: string;
        args: any[];
    }): Promise<any> {
        const balance = await this.publicClient.getBalance({
            address: this.account.address,
        });
        try {
            console.log("FUNCTION NAME", params.functionName, params.args, this.contractAddress);
            // 1. Simulate the contract call (to check for revert errors)
            const { request } = await this.publicClient.simulateContract({
                account: this.account,
                address: this.contractAddress,
                abi: this.contractABI,
                functionName: params.functionName,
                args: params.args,
            });

            // 2. Estimate gas required for the transaction
            const gasEstimate = await this.publicClient.estimateContractGas({
                account: this.account,
                address: this.contractAddress,
                abi: this.contractABI,
                functionName: params.functionName,
                args: params.args,
            });

            // 3. Get current gas price
            const gasPrice = await this.publicClient.getGasPrice();
            // 4. Calculate estimated cost in ETH (gas * gasPrice)
            const estimatedCost = gasEstimate * gasPrice;
            console.log("ESTIMATED COST", estimatedCost);
            // 5. Get account balance to check if they can afford it


            // 6. Check if balance is sufficient
            if (balance < estimatedCost) {
                return {
                    status: 'error',
                    error: 'Insufficient funds for gas fee',
                    details: {
                        functionName: params.functionName,
                        args: params.args,
                        estimatedGas: gasEstimate,
                        gasPrice,
                        estimatedCost,
                        accountBalance: balance,
                        required: estimatedCost,
                        shortBy: balance - estimatedCost,
                    },
                };
            }

            // 7. If balance is sufficient, proceed with transaction
            const txHash = await this.walletClient.writeContract(request);

            // 8. Wait for transaction receipt
            const receipt = await this.publicClient.waitForTransactionReceipt({
                hash: txHash,
            });

            return {
                status: 'success',
                address: this.account.address,
                hash: txHash,
                receipt,
                gasUsed: receipt.gasUsed,
                effectiveGasPrice: receipt.effectiveGasPrice,
                estimatedGas: gasEstimate, // Return estimated gas for reference
                estimatedCost, // Return estimated cost for reference
                chainId: this.chain.id,
            };
        } catch (error: any) {
            console.log("ERROR", error);
            return {
                status: 'error',
                error: error.message,
                balance: balance,
                details: {
                    functionName: params.functionName,
                    args: params.args,
                    account: this.account.address,
                    contractAddress: this.contractAddress,
                    chainId: this.chain.id,
                },
            };
        }
    }

    private async aaWriteContract(params: {
        functionName: string;
        args: any[];
    }): Promise<any> {
        try {
            console.log("INITIALIZING AA PROCESS ON ENS CONTRACT");
            const response: any = await this.aaService.executeContractFunction({
                contractAddress: this.contractAddress,
                abi: this.contractABI,
                functionName: params.functionName,
                args: params.args
            }, "SPONSORED");

            // Transform AA response to match writeContract structure
            return {
                status: 'success',
                address: this.account.address,
                hash: response.transactionHash || response.hash,
                receipt: response.receipt || {
                    transactionHash: response.transactionHash,
                    gasUsed: response.gasUsed,
                    effectiveGasPrice: response.effectiveGasPrice,
                    status: response.success ? 'success' : 'reverted'
                },
                gasUsed: response.gasUsed,
                effectiveGasPrice: response.effectiveGasPrice,
                estimatedGas: response.gasLimit || response.estimatedGas,
                estimatedCost: response.estimatedCost || (response.gasLimit && response.gasPrice
                    ? response.gasLimit * response.gasPrice
                    : undefined),
                chainId: this.chain.id,
                isAA: true // Additional flag to indicate this was an AA transaction
            };
        } catch (error: any) {
            logger.error(`Contract write failed for ${params.functionName}: ${error.message}`);
            return {
                status: 'error',
                error: error.message,
                details: {
                    functionName: params.functionName,
                    args: params.args,
                    account: this.account.address,
                    contractAddress: this.contractAddress,
                    chainId: this.chain.id,
                    isAA: true
                }
            };
        }
    }

}

export default ENSL1SubnameRegistrarService;