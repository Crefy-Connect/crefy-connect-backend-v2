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
    createWalletClient,
    decodeErrorResult
} from "viem";
import { AccountAbstractionService } from "./account-abstraction.js";
import logger from "../utils/logger.js";
import { Account, privateKeyToAccount } from "viem/accounts";
import { normalize, labelhash } from 'viem/ens';
import { ChainUtils } from "../config/chains.config.js";
import { formatEther } from "viem";
import { sepolia } from "viem/chains";
import { L1_SUBNAME_REGISTRAR_CONTRACT_ABI } from "../utils/contracts/L1SubnameRegistrar.js";

interface SubnameClaimedEvent {
    node: string;
    label: string;
    owner: Address;
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
        revertReason?: string;
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

        this.publicClient = createPublicClient({
            chain: sepolia,
            transport: http(),
        });

        this.walletClient = createWalletClient({
            account: this.account,
            chain: sepolia,
            transport: http()
        });
    }

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

    // ========================
    // Public Methods
    // ========================

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

    async claimName(name: string, sponsored: boolean = false) {
        const normalizedName = normalize(name);

        // check if the name is already taken
        const isTaken = await this.isNameTaken(name);
        if (isTaken) {
            throw new Error("Name is already taken");
        }

        // call write contract
        const response = await this.writeContract("claimName", [normalizedName]);
        return response;
    }

    // ========================
    // Private Helpers
    // ========================



    private async writeContract(functionName: string, args: any[]) {
        try {
            const { request } = await this.publicClient.simulateContract({
                account: this.account,
                address: this.contractAddress,
                abi: this.contractABI,
                functionName,
                args,
            });

            console.log("Request:", request);

            // 4. Execute transaction
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
                chainId: this.chain.id,
            };
        } catch (error: any) {
            console.log("Error:", error);
            logger.error(`Contract write failed for ${functionName}:`, error);
            throw error;
        }
    }

    private extractRevertReason(error: any): string {
        if (error.cause?.data?.errorName) {
            return error.cause.data.errorName;
        }
        if (error.data?.data) {
            try {
                const decoded = decodeErrorResult({
                    abi: this.contractABI,
                    data: error.data.data
                });
                return decoded.errorName || 'Unknown revert reason';
            } catch (e) {
                return 'Could not decode revert reason';
            }
        }
        return error.message || 'Unknown error';
    }

    private formatError(
        error: string,
        functionName: string,
        args: any[],
        additionalDetails: Partial<ErrorResponse['details']> = {}
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
                ...additionalDetails
            }
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

}

export default ENSL1SubnameRegistrarService;