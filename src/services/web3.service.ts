import {
    type Address,
    type Hash,
    encodeFunctionData,
    type Abi,
    createPublicClient,
    http,
    type PublicClient,
    getAddress,
    getContract
} from "viem";
import { normalize, namehash } from "viem/ens";
import { ChainUtils } from "../config/chains.config.js";
import logger from "../utils/logger.js";
import RESOLVER_ABI from "../utils/contracts/resolver.abi.js";
import { ERC20_ABI } from "../utils/contracts/erc20.abi.js";

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

    public async getNativeBalance(address: Address): Promise<bigint> {
        try {
            if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
                throw new Error("Invalid address format");
            }

            return await this.publicClient.getBalance({
                address: getAddress(address) // Normalizes the address
            });
        } catch (error) {
            logger.error(`Error fetching native balance: ${error}`);
            throw new Error(`Failed to get native balance: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    public async getTokenBalance(tokenAddress: Address, walletAddress: Address): Promise<bigint> {
        try {
            const contract = getContract({
                address: tokenAddress,
                abi: ERC20_ABI,
                client: this.publicClient
            });

            return await contract.read.balanceOf([walletAddress]);
        } catch (error) {
            logger.error(`Error fetching token balance: ${error}`);
            throw new Error(`Failed to get token balance: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    public async getTokenMetadata(tokenAddress: Address): Promise<{ symbol: string, decimals: number, name: string }> {
        try {
            const contract = getContract({
                address: tokenAddress,
                abi: ERC20_ABI,
                client: this.publicClient
            });

            const [symbol, decimals, name] = await Promise.all([
                contract.read.symbol().catch(() => "UNKNOWN"),
                contract.read.decimals().catch(() => 18),
                contract.read.name().catch(() => "Unknown Token")
            ]);

            return { symbol, decimals, name };
        } catch (error) {
            logger.error(`Error fetching token metadata: ${error}`);
            throw new Error(`Failed to get token metadata: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    public async getAllTokenBalances(
        walletAddress: Address,
        tokenAddresses: Address[]
    ): Promise<Array<{
        token: Address,
        balance: bigint,
        symbol: string,
        decimals: number,
        name: string
    }>> {
        try {
            const balances = await Promise.all(
                tokenAddresses.map(async (tokenAddress) => {
                    try {
                        const [balance, metadata] = await Promise.all([
                            this.getTokenBalance(tokenAddress, walletAddress),
                            this.getTokenMetadata(tokenAddress)
                        ]);

                        return {
                            token: tokenAddress,
                            balance,
                            ...metadata
                        };
                    } catch (error) {
                        logger.error(`Error fetching balance for token ${tokenAddress}: ${error}`);
                        return {
                            token: tokenAddress,
                            balance: BigInt(0),
                            symbol: "UNKNOWN",
                            decimals: 18,
                            name: "Unknown Token"
                        };
                    }
                })
            );

            return balances;
        } catch (error) {
            logger.error(`Error fetching token balances: ${error}`);
            throw new Error(`Failed to get token balances: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    public async getWalletBalances(
        walletAddress: Address,
        tokenAddresses: Address[] = []
    ): Promise<{
        nativeBalance: bigint,
        tokens: Array<{
            token: Address,
            balance: bigint,
            symbol: string,
            decimals: number,
            name: string
        }>
    }> {
        try {
            const [nativeBalance, tokenBalances] = await Promise.all([
                this.getNativeBalance(walletAddress),
                this.getAllTokenBalances(walletAddress, tokenAddresses)
            ]);

            return {
                nativeBalance,
                tokens: tokenBalances.filter(token => token.balance > 0) // Only return tokens with balance
            };
        } catch (error) {
            logger.error(`Error fetching wallet balances: ${error}`);
            throw new Error(`Failed to get wallet balances: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
}