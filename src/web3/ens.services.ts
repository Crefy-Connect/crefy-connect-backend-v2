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

interface TransactionResult {
    address: Address;
    hash?: Hash;
    receipt?: TransactionReceipt;
    error?: Error;
    gasUsed?: bigint;
    effectiveGasPrice?: bigint;
    chainId: number;
}

interface ContractCall {
    contractAddress: Address;
    abi: Abi;
    functionName: string;
    args?: any[];
    value?: string;
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

    async claimName(name: string): Promise<TransactionResult> {
        const normalizedName = normalize(name);
        return this.aaWriteContract({
            functionName: "claimName",
            args: [normalizedName]
        });
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
    }): Promise<TransactionResult> {
        try {
            // Simulate the contract call first
            const { request } = await this.publicClient.simulateContract({
                account: this.account,
                address: this.contractAddress,
                abi: this.contractABI,
                functionName: params.functionName,
                args: params.args
            });

            // Send the actual transaction
            const txHash = await this.walletClient.writeContract(request);

            // Wait for transaction receipt
            const receipt = await this.publicClient.waitForTransactionReceipt({
                hash: txHash
            });

            return {
                address: this.account.address,
                hash: txHash,
                receipt,
                gasUsed: receipt.gasUsed,
                effectiveGasPrice: receipt.effectiveGasPrice,
                chainId: this.chain.id
            };
        } catch (error: any) {
            logger.error(`Contract write failed for ${params.functionName}: ${error.message}`);
            throw new Error(`Contract write failed: ${error.message}`);
        }
    }

    private async aaWriteContract(params: {
        functionName: string;
        args: any[];
    }): Promise<any> {
        try {
            console.log("INITIALIZING AAPROCESSES ON ENS CONTRACT");
            const response = await this.aaService.executeContractFunction({
                contractAddress: this.contractAddress,
                abi: this.contractABI,
                functionName: params.functionName,
                args: params.args
            }, "SPONSORED");
            console.log(response);
            return response;
        } catch (error: any) {
            logger.error(`Contract write failed for ${params.functionName}: ${error.message}`);
            throw new Error(`Contract write failed: ${error.message}`);
        }
    }

}

export default ENSL1SubnameRegistrarService;