// @ts-nocheck
import { toNexusAccount, createBicoPaymasterClient, createSmartAccountClient } from "@biconomy/abstractjs"
import { privateKeyToAccount, type Account } from "viem/accounts"
import type { Chain } from "viem/chains"
import {
    erc20Abi,
    encodeFunctionData,
    parseUnits,
    type Abi,
    http,
    parseEther,
    type Hash,
    type TransactionReceipt,
    createPublicClient,
    createWalletClient,
    formatEther,
    formatUnits,
    type Address,
} from "viem"
import { config } from "dotenv"
import logger from "../utils/logger.js"
import { ChainUtils, type ExtendedChain, type ChainAAConfig, type TokenInfo } from "../config/chains.config.js"

config()

// Types and Interfaces
interface TransactionResult {
    address: string
    hash?: Hash
    receipt?: TransactionReceipt
    error?: Error
    gasUsed?: bigint
    effectiveGasPrice?: bigint
    chainId: number
}

interface ContractCall {
    contractAddress: string
    abi: Abi
    functionName: string
    args?: any[]
    value?: string
}

interface TransactionParams {
    to?: string
    value?: string
    data?: string
    contractCall?: ContractCall
    mode?: "SPONSORED" | "FEE"
}

interface AccountInfo {
    address: string
    isDeployed: boolean
    balance: string
    version: AccountVersion
    chainId: number
    chainName: string
    supportedTokens: TokenInfo[]
}

interface GasFees {
    maxFeePerGas: bigint
    maxPriorityFeePerGas: bigint
    gasPrice?: bigint
}

type AccountVersion = "V2" | "NEXUS" | "UNKNOWN"
type TransactionMode = "SPONSORED" | "FEE"

// Constants
const NEXUS_IMPLEMENTATION_ADDRESS = "0x000000008761E87F023f65c49DC9cb1C7EdFEaaf"
const NEXUS_BOOTSTRAP_ADDRESS = "0x000000F5b753Fdd20C5CA2D7c1210b3Ab1EA5903"
const EMPTY_HOOK_ADDRESS = "0x0000000000000000000000000000000000000001"

// Minimum ETH required for deployment (0.01 ETH)
const MIN_DEPLOYMENT_ETH = parseEther("0.01")

// Gas buffer multiplier (50% buffer)
const GAS_BUFFER_MULTIPLIER = 150n

/**
 * Account Abstraction Service for managing smart contract wallets
 * Supports multiple chains and account versions (V2, Nexus)
 */
export class AccountAbstractionService {
    private privateKey: string
    public account: Account
    private chain: ExtendedChain
    private chainConfig: ChainAAConfig
    private publicClient: any
    private smartAccountClient: any
    private accountVersion: AccountVersion = "UNKNOWN"
    private cachedAccountAddress?: string

    constructor({
        privateKey,
        chainId = 84532, // Default to Base Sepolia
    }: {
        privateKey?: string
        chainId?: number
    } = {}) {
        this.validateConstructorParams(privateKey, chainId)

        this.privateKey = this.formatPrivateKey(privateKey!)
        this.account = privateKeyToAccount(this.privateKey)

        // Get chain and config from our chains configuration
        this.chain = ChainUtils.getChainById(chainId)!
        this.chainConfig = ChainUtils.getAAConfigByChainId(chainId)!

        this.initializeClients()

        logger.info(`AccountAbstractionService initialized for ${this.chain.name} (Chain ID: ${this.chain.id})`)
        logger.info(`Account EOA: ${this.account.address}`)
        logger.info(`Deployment required: ${this.chainConfig.requiresDeployment}`)
    }

    /**
     * Validate constructor parameters
     */
    private validateConstructorParams(privateKey?: string, chainId?: number): void {
        if (!privateKey) {
            throw new Error("Private key is required")
        }

        if (!chainId || !ChainUtils.isChainSupported(chainId)) {
            const supportedChains = ChainUtils.getAllSupportedChains()
                .map((c) => `${c.name} (${c.id})`)
                .join(", ")
            throw new Error(`Unsupported chain ID: ${chainId}. Supported chains: ${supportedChains}`)
        }

        // Validate chain configuration
        const validation = ChainUtils.validateChainConfig(chainId)
        if (!validation.isValid) {
            throw new Error(`Chain configuration invalid: ${validation.errors.join(", ")}`)
        }
    }

    /**
     * Format private key to ensure proper hex format
     */
    private formatPrivateKey(privateKey: string): string {
        const formatted = privateKey.startsWith("0x") ? privateKey : `0x${privateKey}`

        // Validate private key format
        if (!/^0x[a-fA-F0-9]{64}$/.test(formatted)) {
            throw new Error("Invalid private key format")
        }

        return formatted
    }

    /**
     * Initialize blockchain clients
     */
    private initializeClients(): void {
        try {
            this.publicClient = createPublicClient({
                chain: this.chain as Chain,
                transport: http(this.chain.rpcUrls.default.http[0]),
            })
        } catch (error) {
            logger.error(`Failed to initialize public client: ${error.message}`)
            throw new Error(`Failed to initialize blockchain connection for ${this.chain.name}`)
        }
    }

    /**
     * Create smart account client
     */
    private async createSmartAccountClient() {
        try {
            if (!this.smartAccountClient) {
                this.smartAccountClient = createSmartAccountClient({
                    account: await toNexusAccount({
                        signer: this.account,
                        chain: this.chain as Chain,
                        transport: http(),
                    }),
                    transport: http(this.chainConfig.bundlerUrl),
                    paymaster: createBicoPaymasterClient({
                        paymasterUrl: this.chainConfig.paymasterUrl,
                    }),
                })
            }
            return this.smartAccountClient
        } catch (error) {
            logger.error(`Failed to create smart account client: ${error.message}`)
            throw new Error(`Failed to create smart account client: ${error.message}`)
        }
    }

    /**
     * Get smart contract account address
     */
    public async getAccountAddress(): Promise<string> {
        try {
            if (!this.cachedAccountAddress) {
                const client = await this.createSmartAccountClient()
                this.cachedAccountAddress = client.account.address
            }
            return this.cachedAccountAddress
        } catch (error) {
            logger.error(`Failed to get account address: ${error.message}`)
            throw new Error(`Failed to get account address: ${error.message}`)
        }
    }

    /**
     * Get EOA (Externally Owned Account) balance
     */
    public async getEOABalance(): Promise<string> {
        try {
            const balance = await this.publicClient.getBalance({
                address: this.account.address as Address,
            })
            return formatEther(balance)
        } catch (error) {
            logger.error(`Failed to get EOA balance: ${error.message}`)
            throw new Error(`Failed to get EOA balance: ${error.message}`)
        }
    }

    /**
     * Get smart contract account balance
     */
    public async getAccountBalance(): Promise<string> {
        try {
            const address = await this.getAccountAddress()
            const balance = await this.publicClient.getBalance({
                address: address as Address,
            })
            return formatEther(balance)
        } catch (error) {
            logger.error(`Failed to get account balance: ${error.message}`)
            throw new Error(`Failed to get account balance: ${error.message}`)
        }
    }

    /**
     * Get ERC20 token balance
     */
    public async getTokenBalance(tokenAddress: string, decimals = 18): Promise<string> {
        try {
            const address = await this.getAccountAddress()
            const balance = await this.publicClient.readContract({
                address: tokenAddress as Address,
                abi: erc20Abi,
                functionName: "balanceOf",
                args: [address as Address],
            })
            return formatUnits(balance as bigint, decimals)
        } catch (error) {
            logger.error(`Failed to get token balance: ${error.message}`)
            throw new Error(`Failed to get token balance: ${error.message}`)
        }
    }

    /**
     * Get all token balances for supported tokens on current chain
     */
    public async getAllTokenBalances(): Promise<Array<{ token: TokenInfo; balance: string }>> {
        try {
            const supportedTokens = ChainUtils.getSupportedTokens(this.chain.id)
            const balances = await Promise.allSettled(
                supportedTokens.map(async (token) => {
                    if (token.isNative) {
                        const balance = await this.getAccountBalance()
                        return { token, balance }
                    } else {
                        const balance = await this.getTokenBalance(token.address, token.decimals)
                        return { token, balance }
                    }
                }),
            )

            return balances
                .filter(
                    (result): result is PromiseFulfilledResult<{ token: TokenInfo; balance: string }> =>
                        result.status === "fulfilled",
                )
                .map((result) => result.value)
        } catch (error) {
            logger.error(`Failed to get all token balances: ${error.message}`)
            throw new Error(`Failed to get all token balances: ${error.message}`)
        }
    }

    /**
     * Check if account is deployed on the blockchain
     */
    private async isAccountDeployed(address: string): Promise<boolean> {
        try {
            const bytecode = await this.publicClient.getBytecode({
                address: address as Address,
            })
            return !!bytecode && bytecode !== "0x"
        } catch (error) {
            logger.error(`Failed to check account deployment: ${error.message}`)
            return false
        }
    }

    /**
     * Detect account version (V2, Nexus, or Unknown)
     */
    private async detectAccountVersion(address: string): Promise<AccountVersion> {
        const isDeployed = await this.isAccountDeployed(address)

        if (!isDeployed) {
            return "UNKNOWN"
        }

        try {
            // Try Nexus implementation check first
            try {
                const implementation = await this.publicClient.readContract({
                    address: address as Address,
                    abi: [
                        {
                            name: "implementation",
                            type: "function",
                            stateMutability: "view",
                            inputs: [],
                            outputs: [{ type: "address" }],
                        },
                    ],
                    functionName: "implementation",
                })

                if (implementation === NEXUS_IMPLEMENTATION_ADDRESS) {
                    return "NEXUS"
                }
            } catch (e) {
                // Implementation check failed, likely V2 account
            }

            // Fallback check for V2 account
            const isV2 = await this.publicClient.readContract({
                address: address as Address,
                abi: [
                    {
                        name: "isModuleEnabled",
                        type: "function",
                        stateMutability: "view",
                        inputs: [{ type: "address" }],
                        outputs: [{ type: "bool" }],
                    },
                ],
                functionName: "isModuleEnabled",
                args: [this.chainConfig.factoryAddress],
            })

            return isV2 ? "V2" : "UNKNOWN"
        } catch (error) {
            logger.warn(`Could not detect account version: ${error.message}`)
            return "UNKNOWN"
        }
    }

    /**
     * Get comprehensive account information
     */
    public async getAccountInfo(): Promise<AccountInfo> {
        try {
            const address = await this.getAccountAddress()
            const isDeployed = await this.isAccountDeployed(address)
            const balance = await this.getAccountBalance()
            const version = await this.detectAccountVersion(address)
            const supportedTokens = ChainUtils.getSupportedTokens(this.chain.id)

            return {
                address,
                isDeployed,
                balance,
                version,
                chainId: this.chain.id,
                chainName: this.chain.name,
                supportedTokens,
            }
        } catch (error) {
            logger.error(`Failed to get account info: ${error.message}`)
            throw new Error(`Failed to get account info: ${error.message}`)
        }
    }

    /**
     * Estimate gas fees for transactions
     */
    private async estimateGasFees(): Promise<GasFees> {
        try {
            const feeData = await this.publicClient.estimateFeesPerGas()

            if (!feeData.maxFeePerGas || !feeData.maxPriorityFeePerGas) {
                throw new Error("Failed to estimate gas fees")
            }

            return {
                maxFeePerGas: feeData.maxFeePerGas,
                maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
                gasPrice: feeData.gasPrice,
            }
        } catch (error) {
            logger.error(`Failed to estimate gas fees: ${error.message}`)
            throw new Error(`Failed to estimate gas fees: ${error.message}`)
        }
    }

    /**
     * Check if EOA has sufficient funds for deployment
     */
    public async checkDeploymentFunds(): Promise<{ sufficient: boolean; required: string; current: string }> {
        try {
            const eoaBalance = await this.publicClient.getBalance({
                address: this.account.address,
            })

            const { maxFeePerGas } = await this.estimateGasFees()
            const estimatedGas = BigInt(this.chainConfig.maxGasLimit) / 10n // Conservative estimate
            const estimatedCost = (estimatedGas * maxFeePerGas * GAS_BUFFER_MULTIPLIER) / 100n

            const required = estimatedCost > MIN_DEPLOYMENT_ETH ? estimatedCost : MIN_DEPLOYMENT_ETH

            return {
                sufficient: eoaBalance >= required,
                required: formatEther(required),
                current: formatEther(eoaBalance),
            }
        } catch (error) {
            logger.error(`Failed to check deployment funds: ${error.message}`)
            throw new Error(`Failed to check deployment funds: ${error.message}`)
        }
    }

    /**
     * Deploy smart contract account
     */
    private async deployAccount(): Promise<TransactionResult> {
        const address = await this.getAccountAddress()

        try {
            logger.info("Starting account deployment...")

            // Check if already deployed
            if (await this.isAccountDeployed(address)) {
                logger.info("Account already deployed")
                return { address, chainId: this.chain.id }
            }

            // Check funds
            const fundsCheck = await this.checkDeploymentFunds()
            if (!fundsCheck.sufficient) {
                throw new Error(
                    `Insufficient funds for deployment. Required: ${fundsCheck.required} ${this.chain.nativeCurrency.symbol}, ` +
                    `Current: ${fundsCheck.current} ${this.chain.nativeCurrency.symbol}. Please send funds to ${this.account.address}`,
                )
            }

            // Create EOA wallet client for deployment
            const eoaClient = createWalletClient({
                account: this.account,
                chain: this.chain as Chain,
                transport: http(this.chain.rpcUrls.default.http[0]),
            })

            // Prepare deployment transaction
            const factoryData = encodeFunctionData({
                abi: [
                    {
                        name: "deployAccount",
                        type: "function",
                        stateMutability: "nonpayable",
                        inputs: [
                            { type: "bytes", name: "data" },
                            { type: "uint256", name: "index" },
                        ],
                        outputs: [],
                    },
                ],
                functionName: "deployAccount",
                args: ["0x", 0n],
            })

            const { maxFeePerGas, maxPriorityFeePerGas } = await this.estimateGasFees()

            // Send deployment transaction
            const hash = await eoaClient.sendTransaction({
                to: this.chainConfig.factoryAddress as Address,
                data: factoryData,
                maxFeePerGas: (maxFeePerGas * GAS_BUFFER_MULTIPLIER) / 100n,
                maxPriorityFeePerGas: (maxPriorityFeePerGas * GAS_BUFFER_MULTIPLIER) / 100n,
                value: 0n,
            })

            // Wait for confirmation
            const receipt = await this.publicClient.waitForTransactionReceipt({ hash })
            console.log("receipt", receipt)

            if (receipt.status === "success") {
                logger.info(`Account deployed successfully: ${receipt.transactionHash}`)
                this.accountVersion = "V2"

                return {
                    address,
                    hash,
                    receipt,
                    gasUsed: receipt.gasUsed,
                    effectiveGasPrice: receipt.effectiveGasPrice,
                    chainId: this.chain.id,
                }
            } else {
                throw new Error("Deployment transaction failed")
            }
        } catch (error: any) {
            logger.error(`Account deployment failed: ${error.message}`)
            return {
                address,
                error: new Error(`Deployment failed: ${error.message}`),
                chainId: this.chain.id,
            }
        }
    }

    /**
     * Send ETH transaction
     */
    public async sendETH(to: string, value: string, mode?: TransactionMode): Promise<TransactionResult> {
        try {
            // Validate inputs
            if (!to || !/^0x[a-fA-F0-9]{40}$/.test(to)) {
                throw new Error("Invalid recipient address")
            }

            const valueInWei = parseEther(value)
            if (valueInWei <= 0n) {
                throw new Error("Value must be greater than 0")
            }

            // Use chain's gas policy if mode not specified
            const transactionMode = mode || this.chainConfig.gasPolicy === "HYBRID" ? "SPONSORED" : this.chainConfig.gasPolicy

            return await this.sendTransaction({
                to,
                value: valueInWei.toString(),
                mode: transactionMode,
            })
        } catch (error: any) {
            logger.error(`Failed to send ${this.chain.nativeCurrency.symbol}: ${error.message}`)
            throw new Error(`Failed to send ${this.chain.nativeCurrency.symbol}: ${error.message}`)
        }
    }

    /**
     * Send ERC20 token transaction by symbol
     */
    public async sendTokenBySymbol(
        symbol: string,
        to: string,
        amount: string,
        mode?: TransactionMode,
    ): Promise<TransactionResult> {
        try {
            const token = ChainUtils.getTokenBySymbol(this.chain.id, symbol)
            if (!token) {
                const supportedTokens = ChainUtils.getSupportedTokens(this.chain.id)
                    .map((t) => t.symbol)
                    .join(", ")
                throw new Error(`Token ${symbol} not supported on ${this.chain.name}. Supported tokens: ${supportedTokens}`)
            }

            if (token.isNative) {
                return await this.sendETH(to, amount, mode)
            }

            return await this.sendERC20(token.address, to, amount, token.decimals, mode)
        } catch (error: any) {
            logger.error(`Failed to send ${symbol}: ${error.message}`)
            throw new Error(`Failed to send ${symbol}: ${error.message}`)
        }
    }

    /**
     * Send ERC20 token transaction
     */
    public async sendERC20(
        tokenAddress: string,
        to: string,
        amount: string,
        decimals = 18,
        mode?: TransactionMode,
    ): Promise<TransactionResult> {
        try {
            // Validate inputs
            if (!tokenAddress || !/^0x[a-fA-F0-9]{40}$/.test(tokenAddress)) {
                throw new Error("Invalid token address")
            }

            if (!to || !/^0x[a-fA-F0-9]{40}$/.test(to)) {
                throw new Error("Invalid recipient address")
            }

            const amountInUnits = parseUnits(amount, decimals)
            if (amountInUnits <= 0n) {
                throw new Error("Amount must be greater than 0")
            }

            // Use chain's gas policy if mode not specified
            const transactionMode = mode || this.chainConfig.gasPolicy === "HYBRID" ? "SPONSORED" : this.chainConfig.gasPolicy

            return await this.executeContractFunction(
                {
                    contractAddress: tokenAddress,
                    abi: erc20Abi,
                    functionName: "transfer",
                    args: [to as Address, amountInUnits],
                },
                transactionMode,
            )
        } catch (error: any) {
            logger.error(`Failed to send ERC20: ${error.message}`)
            throw new Error(`Failed to send ERC20: ${error.message}`)
        }
    }

    /**
     * Execute contract function
     */
    public async executeContractFunction(contractCall: ContractCall, mode?: TransactionMode): Promise<TransactionResult> {
        try {
            // Validate contract call
            if (!contractCall.contractAddress || !/^0x[a-fA-F0-9]{40}$/.test(contractCall.contractAddress)) {
                throw new Error("Invalid contract address")
            }

            // Use chain's gas policy if mode not specified
            const transactionMode = mode || this.chainConfig.gasPolicy === "HYBRID" ? "SPONSORED" : this.chainConfig.gasPolicy

            return await this.sendTransaction({
                contractCall,
                mode: transactionMode,
            })
        } catch (error: any) {
            logger.error(`Failed to execute contract function: ${error.message}`)
            throw new Error(`Failed to execute contract function: ${error.message}`)
        }
    }

    /**
     * Main transaction sending method
     */
    public async sendTransaction(params: TransactionParams): Promise<TransactionResult> {
        logger.info("Starting transaction process...")

        try {
            const client = await this.createSmartAccountClient()
            const address = await this.getAccountAddress()

            // Ensure account is deployed if required
            if (this.chainConfig.requiresDeployment && !(await this.isAccountDeployed(address))) {
                logger.info("Account not deployed, deploying first...")
                const deployResult = await this.deployAccount()
                if (deployResult.error) {
                    return deployResult
                }
            }

            // Prepare transaction calls
            const calls = await this.prepareCalls(params)
            const { maxFeePerGas, maxPriorityFeePerGas } = await this.estimateGasFees()

            // Attempt transaction with fallback
            let hash: Hash
            try {
                logger.info(`Attempting ${params.mode || this.chainConfig.gasPolicy} transaction...`)
                hash = await client.sendTransaction({
                    calls,
                    maxFeePerGas,
                    maxPriorityFeePerGas,
                    mode: params.mode || this.chainConfig.gasPolicy,
                })
            } catch (sponsoredError: any) {
                if (params.mode !== "FEE" && this.shouldFallbackToFee(sponsoredError)) {
                    logger.warn("Sponsored transaction failed, attempting fee-paid transaction...")
                    hash = await client.sendTransaction({
                        calls,
                        maxFeePerGas,
                        maxPriorityFeePerGas,
                        mode: "FEE",
                    })
                } else {
                    throw sponsoredError
                }
            }

            logger.info(`Transaction submitted: ${hash}`)
            const receipt = await client.waitForTransactionReceipt({ hash })
            console.log("receipt", receipt)

            if (receipt.status === "success") {
                logger.info(`Transaction confirmed: ${receipt.transactionHash}`)
                return {
                    address,
                    hash,
                    receipt,
                    gasUsed: receipt.gasUsed,
                    effectiveGasPrice: receipt.effectiveGasPrice,
                    chainId: this.chain.id,
                }
            } else {
                throw new Error("Transaction failed")
            }
        } catch (error: any) {
            logger.error(`Transaction failed: ${error.message}`)
            const address = await this.getAccountAddress().catch(() => "unknown")
            return {
                address,
                error: new Error(`Transaction failed: ${error.message}`),
                chainId: this.chain.id,
            }
        }
    }

    /**
     * Prepare transaction calls from parameters
     */
    private async prepareCalls(params: TransactionParams): Promise<any[]> {
        const calls: any[] = []

        if (params.contractCall) {
            const { contractAddress, abi, functionName, args = [], value = "0" } = params.contractCall
            calls.push({
                to: contractAddress as Address,
                data: encodeFunctionData({ abi, functionName, args }),
                value: BigInt(value),
            })
        } else if (params.to) {
            calls.push({
                to: params.to as Address,
                value: params.value ? BigInt(params.value) : 0n,
                data: (params.data as `0x${string}`) || undefined,
            })
        }

        if (calls.length === 0) {
            throw new Error("No valid transaction calls prepared")
        }

        return calls
    }

    /**
     * Determine if should fallback to fee mode
     */
    private shouldFallbackToFee(error: any): boolean {
        const errorMessage = error.message?.toLowerCase() || ""
        return errorMessage.includes("aa33") || errorMessage.includes("reverted") || errorMessage.includes("paymaster")
    }

    /**
     * Get transaction URL for block explorer
     */
    public getTransactionUrl(txHash: string): string | undefined {
        return ChainUtils.getTransactionUrl(this.chain.id, txHash)
    }

    /**
     * Get address URL for block explorer
     */
    public getAddressUrl(address?: string): string | undefined {
        const addr = address || this.cachedAccountAddress
        if (!addr) return undefined
        return ChainUtils.getAddressUrl(this.chain.id, addr)
    }

    /**
     * Get current chain information
     */
    public getChainInfo(): {
        id: number
        name: string
        isTestnet: boolean
        nativeCurrency: { name: string; symbol: string; decimals: number }
        blockExplorer: string
    } {
        return {
            id: this.chain.id,
            name: this.chain.name,
            isTestnet: this.chain.isTestnet,
            nativeCurrency: this.chain.nativeCurrency,
            blockExplorer: this.chain.blockExplorers?.default?.url || "",
        }
    }

    /**
     * Get supported chains (static method)
     */
    public static getSupportedChains(): ExtendedChain[] {
        return ChainUtils.getAllSupportedChains()
    }

    /**
     * Check if chain is supported (static method)
     */
    public static isChainSupported(chainId: number): boolean {
        return ChainUtils.isChainSupported(chainId)
    }

    /**
     * Get chain statistics (static method)
     */
    public static getChainStats() {
        return ChainUtils.getChainStats()
    }
}

// Export types for external use
export type {
    TransactionResult,
    ContractCall,
    TransactionParams,
    AccountInfo,
    GasFees,
    AccountVersion,
    TransactionMode,
}

// Re-export chain utilities and types
export { ChainUtils, type ExtendedChain, type ChainAAConfig, type TokenInfo }