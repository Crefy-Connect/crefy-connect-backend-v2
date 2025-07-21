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
    estimatedGas: bigint;
    estimatedCost: number;
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
        estimatedGas?: bigint;
        gasPrice?: bigint;
        estimatedCost?: bigint;
        accountBalance?: bigint;
        required?: bigint;
        shortBy?: bigint;
    };
}

class ENSL1SubnameRegistrarService {
    private readonly contractAddress: Address;
    private readonly contractABI: Abi;
    private publicClient!: PublicClient;
    private account: Account;
    private aaService: AccountAbstractionService;
    private chain: Chain;
    private walletClient!: WalletClient;

    constructor(chainName: string, privateKey: string, contractAddress: Address) {
        this.contractAddress = contractAddress;
        this.contractABI = contract_config.L1_SUBNAME_REGISTRAR_CONTRACT_ABI;

        const chain = ChainUtils.getChainByName(chainName);
        if (!chain) {
            throw new Error(`Chain not found: ${chainName}`);
        }

        if (!privateKey) {
            throw new Error("Private key is required");
        }

        this.chain = chain;
        this.account = privateKeyToAccount(privateKey as `0x${string}`);
        this.aaService = new AccountAbstractionService({
            privateKey,
            chainId: this.chain.id
        });


        this.initializeClients();
    }

    // ========================
    // Public Methods
    // ========================

    // View functions
    async getNameWrapperAddress(): Promise<Address> {
        return this.readContract("NameWrapperAddress", []);
    }

    async getId(): Promise<number> {
        return this.readContract("getId", []);
    }

    async getSubnameOwner(label: string): Promise<Address> {
        return this.readContract("getSubnameOwner", [label]);
    }

    async isNameTaken(name: string): Promise<boolean> {
        const normalizedName = normalize(name);
        const labelHash = labelhash(normalizedName);
        return this.readContract("nameTaken", [labelHash]);
    }

    async ownsParentNode(): Promise<boolean> {
        return this.readContract("ownsParentNode", []);
    }

    async getParentNode(): Promise<string> {
        return this.readContract("parentNode", []);
    }

    async getSubnameOwnerByNode(node: string): Promise<Address> {
        return this.readContract("subnameOwners", [node]);
    }

    async viewAllSubnames(): Promise<string[]> {
        return this.readContract("viewAllSubnames", []);
    }

    async supportsInterface(interfaceId: string): Promise<boolean> {
        return this.readContract("supportsInterface", [interfaceId]);
    }

    async getBalance(): Promise<{ balance: string, address: Address }> {
        try {
            const balance = await this.publicClient.getBalance({
                address: this.account.address
            });
            return {
                balance: formatEther(balance),
                address: this.account.address
            };
        } catch (error: any) {
            logger.error(`Balance check failed: ${error.message}`);
            throw new Error(`Balance check failed: ${error.message}`);
        }
    }

    async claimName(name: string, sponsored: boolean = false): Promise<TransactionResult | ErrorResponse> {
        // Validate input
        if (!name || typeof name !== 'string' || name.length < 3) { // Changed to min 3 characters
            return this.formatError(
                'Name must be at least 3 characters',
                'claimName',
                [name]
            );
        }

        const normalizedName = normalize(name);
        logger.info(`Claiming name: ${normalizedName}`);

        // Additional pre-flight checks
        try {
            const taken = await this.isNameTaken(name);
            if (taken) {
                return this.formatError(
                    `Name '${name}' is already taken`,
                    'claimName',
                    [name]
                );
            }

            const ownsParent = await this.ownsParentNode();
            if (!ownsParent) {
                return this.formatError(
                    `Parent node is not owned by the contract`,
                    'claimName',
                    [name]
                );
            }
        } catch (error: any) {
            return this.formatError(
                `Pre-flight check failed: ${error.message}`,
                'claimName',
                [name]
            );
        }

        // Execute transaction
        try {
            return sponsored
                ? await this.aaWriteContract("claimName", [normalizedName])
                : await this.writeContract("claimName", [normalizedName]);
        } catch (error: any) {
            logger.error(`Claim failed: ${error.message}`);
            return this.formatError(
                error.message,
                'claimName',
                [name]
            );
        }
    }


    // ========================
    // Private Helpers
    // ========================

    private initializeClients() {
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

    private async readContract(functionName: string, args: any[]): Promise<any> {
        try {
            return await this.publicClient.readContract({
                address: this.contractAddress,
                abi: this.contractABI,
                functionName,
                args
            });
        } catch (error: any) {
            logger.error(`Read failed: ${functionName} - ${error.message}`);
            throw new Error(`Contract read failed: ${error.message}`);
        }
    }

    private async simulateContract(functionName: string, args: any[]) {
        await this.publicClient.simulateContract({
            account: this.account,
            address: this.contractAddress,
            abi: this.contractABI,
            functionName,
            args
        });
    }

    private async writeContract(functionName: string, args: any[]): Promise<TransactionResult> {
        // Get current balance
        const balance = await this.publicClient.getBalance({
            address: this.account.address,
        });

        // Simulation
        const { request } = await this.publicClient.simulateContract({
            account: this.account,
            address: this.contractAddress,
            abi: this.contractABI,
            functionName,
            args,
        });

        // Gas estimation
        let gasEstimate: bigint;
        try {
            gasEstimate = await this.publicClient.estimateContractGas({
                account: this.account,
                address: this.contractAddress,
                abi: this.contractABI,
                functionName,
                args,
            });
        } catch (estimateError: any) {
            // Extract revert reason if available
            let errorMsg = estimateError.message;
            if (estimateError.cause?.data?.errorName) {
                errorMsg = `Contract reverted: ${estimateError.cause.data.errorName}`;
            }
            throw new Error(`Gas estimation failed: ${errorMsg}`);
        }


        const gasPrice = await this.publicClient.getGasPrice();
        const estimatedCost = gasEstimate * gasPrice;

        // Balance check
        if (balance < estimatedCost) {
            throw new Error(
                `Insufficient funds. Required: ${formatEther(estimatedCost)} ETH, Available: ${formatEther(balance)} ETH`
            );
        }

        // Execute transaction
        const txHash = await this.walletClient.writeContract(request);
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
            estimatedGas: gasEstimate,
            estimatedCost: Number(estimatedCost),
            chainId: this.chain.id,
        };
    }

    private async aaWriteContract(functionName: string, args: any[]): Promise<TransactionResult> {
        const response: any = await this.aaService.executeContractFunction({
            contractAddress: this.contractAddress,
            abi: this.contractABI,
            functionName,
            args
        }, "SPONSORED");

        return {
            status: 'success',
            address: this.account.address,
            hash: response.transactionHash,
            receipt: response.receipt,
            gasUsed: response.gasUsed,
            effectiveGasPrice: response.effectiveGasPrice,
            estimatedGas: response.gasLimit,
            estimatedCost: Number(response.gasLimit * response.gasPrice),
            chainId: this.chain.id,
        };
    }

    private formatError(
        error: string,
        functionName: string,
        args: any[]
    ): ErrorResponse {
        return {
            status: 'error',
            error,
            details: {
                functionName,
                args,
                account: this.account.address,
                contractAddress: this.contractAddress,
                chainId: this.chain.id,
            }
        };
    }
}

export default ENSL1SubnameRegistrarService;