import {
    type Address,
    type Hash,
    encodeFunctionData,
    type Abi,
    createPublicClient,
    http,
    type PublicClient,
    toHex,
    encodeAbiParameters,
    parseAbiParameters
} from "viem";
import { normalize, labelhash, namehash } from "viem/ens";
import { ChainUtils } from "../config/chains.config.js";
import logger from "../utils/logger.js";

interface PreparedTransaction {
    to: Address;
    data: Hash;
    value?: string;
    gas?: string;
    from?: Address;
    chainId?: number;
}

interface NameWrapperTransferParams {
    operator: Address;
    approved: boolean;
}

const RESOLVER_ABI = [
    {
        "inputs": [
            { "internalType": "bytes32", "name": "node", "type": "bytes32" },
            { "internalType": "address", "name": "a", "type": "address" }
        ],
        "name": "setAddr",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            { "internalType": "bytes32", "name": "node", "type": "bytes32" }
        ],
        "name": "addr",
        "outputs": [
            { "internalType": "address payable", "name": "", "type": "address" }
        ],
        "stateMutability": "view",
        "type": "function"
    }
] as const;

export class Web3Service {
    private publicClient!: PublicClient;
    private chain;

    constructor(chainName: string) {
        const chain = ChainUtils.getChainByName(chainName);
        if (!chain) {
            throw new Error(`Chain not found: ${chainName}`);
        }

        this.chain = chain;
        this.initializeClient();
    }

    private initializeClient() {
        this.publicClient = createPublicClient({
            chain: this.chain,
            transport: http()
        });
    }

    public async prepareTransaction(
        contractAddress: Address,
        abi: Abi,
        functionName: string,
        args: any[] = [],
        value: bigint = BigInt(0),
        from?: Address
    ): Promise<PreparedTransaction> {
        try {
            const data = encodeFunctionData({
                abi,
                functionName,
                args
            });

            let estimatedGas: bigint;
            try {
                estimatedGas = await this.publicClient.estimateContractGas({
                    address: contractAddress,
                    abi,
                    functionName,
                    args,
                    value,
                    account: from // Optional
                });
            } catch (error) {
                logger.error(`Gas estimation failed: ${error}`);
                estimatedGas = BigInt(500000); // Default gas limit
            }

            return {
                to: contractAddress,
                data,
                value: value.toString(),
                gas: estimatedGas.toString(),
                from,
                chainId: Number(this.chain.id)
            };
        } catch (error) {
            logger.error(`Error preparing transaction: ${error}`);
            throw new Error(`Failed to prepare transaction: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    public async prepareENSRegistrarCreation(
        contractAddress: Address,
        abi: Abi,
        ensName: string,
        from?: Address
    ): Promise<PreparedTransaction> {
        if (!ensName || typeof ensName !== "string") {
            throw new Error("ENS name must be a valid string");
        }

        return this.prepareTransaction(
            contractAddress,
            abi,
            "createSubnameRegistrar",
            [ensName],
            BigInt(0),
            from
        );
    }

    public async prepareNameWrapperTransfer(
        contractAddress: Address,
        abi: Abi,
        params: { operator: Address, approved: boolean }
    ): Promise<PreparedTransaction> {
        try {
            const { operator, approved } = params;

            if (!/^0x[a-fA-F0-9]{40}$/.test(operator)) {
                throw new Error("Invalid operator address");
            }

            const txData = encodeFunctionData({
                abi,
                functionName: 'setApprovalForAll',
                args: [operator, approved]
            });

            let estimatedGas: bigint;
            try {
                estimatedGas = await this.publicClient.estimateContractGas({
                    address: contractAddress,
                    abi,
                    functionName: 'setApprovalForAll',
                    args: [operator, approved],
                    account: operator
                });
            } catch (error) {
                logger.error(`Gas estimation failed: ${error}`);
                estimatedGas = BigInt(500000);
            }

            return {
                to: contractAddress,
                data: txData,
                value: '0',
                gas: estimatedGas.toString(),
                from: operator,
                chainId: Number(this.chain.id)
            };
        } catch (error) {
            logger.error(`Error preparing NameWrapper approval: ${error}`);
            throw new Error(`Failed to prepare NameWrapper approval: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    // New ENS Resolver methods
    public async getEnsAddress(ensName: string): Promise<Address | null> {
        try {
            const normalizedName = normalize(ensName);
            return await this.publicClient.getEnsAddress({
                name: normalizedName
            });
        } catch (error) {
            logger.error(`Error fetching ENS address: ${error}`);
            throw new Error(`Failed to get ENS address: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    public async getEnsResolver(ensName: string): Promise<Address | null> {
        try {
            const normalizedName = normalize(ensName);
            return await this.publicClient.getEnsResolver({
                name: normalizedName
            });
        } catch (error) {
            logger.error(`Error fetching ENS resolver: ${error}`);
            throw new Error(`Failed to get ENS resolver: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    public async getResolverAddress(ensName: string): Promise<Address | null> {
        const normalizedName = normalize(ensName);
        const nameHash = namehash(normalizedName);
        const resolverAddress = await this.getEnsResolver(ensName);

        if (!resolverAddress) return null;

        try {
            return await this.publicClient.readContract({
                address: resolverAddress,
                abi: RESOLVER_ABI,
                functionName: "addr",
                args: [nameHash]
            });
        } catch (error) {
            logger.error(`Error reading resolver address: ${error}`);
            return null;
        }
    }

    public async prepareSetResolverAddress(
        ensName: string,
        newAddress: Address,
        from?: Address
    ): Promise<PreparedTransaction> {
        try {
            const normalizedName = normalize(ensName);
            const nameHash = namehash(normalizedName);
            const resolverAddress = await this.getEnsResolver(ensName);

            if (!resolverAddress) {
                throw new Error("No resolver found for ENS name");
            }

            if (!/^0x[a-fA-F0-9]{40}$/.test(newAddress)) {
                throw new Error("Invalid address format");
            }

            return this.prepareTransaction(
                resolverAddress,
                RESOLVER_ABI,
                "setAddr",
                [nameHash, newAddress],
                BigInt(0),
                from
            );
        } catch (error) {
            logger.error(`Error preparing set resolver address: ${error}`);
            throw new Error(`Failed to prepare set resolver address: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
}