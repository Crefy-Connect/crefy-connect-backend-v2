import { contract_config } from "../config/index.js";
import { createPublicClient, http, createWalletClient, decodeErrorResult } from "viem";
import { AccountAbstractionService } from "./account-abstraction.js";
import logger from "../utils/logger.js";
import { privateKeyToAccount } from "viem/accounts";
import { normalize, labelhash } from 'viem/ens';
import { ChainUtils } from "../config/chains.config.js";
import { sepolia } from "viem/chains";
class ENSL1SubnameRegistrarService {
    contractAddress;
    contractABI;
    publicClient;
    account;
    aaService;
    chain;
    walletClient;
    constructor(chainName, privateKey, contractAddress) {
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
        this.account = privateKeyToAccount(privateKey);
        console.log(this.account);
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
    async getNameWrapperAddress() {
        return this.readContract("NameWrapperAddress", []);
    }
    async getId() {
        return this.readContract("getId", []);
    }
    async getSubnameOwner(label) {
        return this.readContract("getSubnameOwner", [label]);
    }
    async isNameTaken(name) {
        const normalizedName = normalize(name);
        const labelHash = labelhash(normalizedName);
        return this.readContract("nameTaken", [labelHash]);
    }
    async ownsParentNode() {
        return this.readContract("ownsParentNode", []);
    }
    async getParentNode() {
        return this.readContract("parentNode", []);
    }
    async getSubnameOwnerByNode(node) {
        return this.readContract("subnameOwners", [node]);
    }
    async viewAllSubnames() {
        return this.readContract("viewAllSubnames", []);
    }
    async supportsInterface(interfaceId) {
        return this.readContract("supportsInterface", [interfaceId]);
    }
    // ========================
    // Public Methods
    // ========================
    async readContract(functionName, args) {
        try {
            return await this.publicClient.readContract({
                address: this.contractAddress,
                abi: this.contractABI,
                functionName,
                args
            });
        }
        catch (error) {
            logger.error(`Read failed: ${functionName} - ${error.message}`);
            throw new Error(`Contract read failed: ${error.message}`);
        }
    }
    async claimName(name, sponsored = false) {
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
    async writeContract(functionName, args) {
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
        }
        catch (error) {
            console.log("Error:", error);
            logger.error(`Contract write failed for ${functionName}:`, error);
            throw error;
        }
    }
    extractRevertReason(error) {
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
            }
            catch (e) {
                return 'Could not decode revert reason';
            }
        }
        return error.message || 'Unknown error';
    }
    formatError(error, functionName, args, additionalDetails = {}) {
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
    async aaWriteContract(functionName, args) {
        const response = await this.aaService.executeContractFunction({
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
