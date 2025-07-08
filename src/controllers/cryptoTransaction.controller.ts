import type { Request, Response } from "express"
import { AccountAbstractionService } from "../web3/account-abstraction.js"
import logger from "../utils/logger.js"
import { Wallet } from "../models/wallet.models.js"
import { ResponseHandler } from "../utils/response.handler.js"
import { ChainUtils } from "../config/chains.config.js"

export class CryptoTransactionController {
    /**
     * Initialize AA service for a specific user wallet
     */
    private async initializeAA(walletId: string, chainName: string): Promise<AccountAbstractionService> {
        try {
            // Find chain by name
            const chain = ChainUtils.getChainByName(chainName)
            if (!chain) {
                throw new Error(`Invalid chain: ${chainName}. Supported chains: ${ChainUtils.getAllSupportedChains().map(c => c.name).join(", ")}`)
            }

            // Find wallet by email or Id
            const wallet = await Wallet.findOne({
                $or: [{ email: walletId }, { _id: walletId }],
            })

            if (!wallet) {
                throw new Error("Wallet not found")
            }

            if (!wallet.isActive) {
                throw new Error("Wallet is not active. Please verify your wallet first.")
            }

            return new AccountAbstractionService({
                privateKey: wallet.encryptedPrivateKey,
                chainId: chain.id,
            })
        } catch (error) {
            logger.error(`Error initializing AA service: ${error}`)
            throw error
        }
    }

    /**
     * Send ETH to a specified address
     */
    public async sendETH(req: Request, res: Response) {
        try {
            const { _id: walletId } = (req as any).wallet
            const { to, value, chain, mode = "SPONSORED" } = req.body

            logger.info(`Wallet ID: ${walletId}`)
            logger.info(`Sending ETH to ${to} with value ${value} on chain ${chain}`)

            // Validation
            if (!to || !value || !chain) {
                return ResponseHandler.validationError(
                    res,
                    [],
                    "Recipient address, value amount and chain network are required",
                )
            }

            // Validate Ethereum address format
            if (!/^0x[a-fA-F0-9]{40}$/.test(to)) {
                return ResponseHandler.validationError(res, [], "Invalid recipient address format")
            }

            // Validate value format
            if (!/^[0-9]+(\.[0-9]+)?$/.test(value)) {
                return ResponseHandler.validationError(res, [], 'Invalid value format. Use decimal format (e.g., "0.01")')
            }

            // Validate transaction mode
            if (!["SPONSORED", "FEE"].includes(mode)) {
                return ResponseHandler.validationError(res, [], 'Invalid transaction mode. Must be "SPONSORED" or "FEE"')
            }

            const aaService = await this.initializeAA(walletId, chain)
            const chainInfo = aaService.getChainInfo()

            // Check account balance if not sponsored
            if (mode === "FEE") {
                const accountInfo = await aaService.getAccountInfo()
                const balance = parseFloat(accountInfo.balance)
                const valueNum = parseFloat(value)

                if (balance < valueNum) {
                    return ResponseHandler.custom(res, 400, false, "Insufficient funds for transaction", undefined, {
                        code: "INSUFFICIENT_FUNDS",
                        chain: chain,
                        currentBalance: accountInfo.balance,
                        requiredAmount: value,
                        nativeCurrency: chainInfo.nativeCurrency.symbol,
                    })
                }
            }

            const result = await aaService.sendETH(to, value, mode)

            if (result.error) {
                return ResponseHandler.error(res, result.error, 500)
            }

            const responseData = {
                fromAddress: result.address,
                toAddress: to,
                transactionHash: result.hash,
                receipt: {
                    blockHash: result.receipt?.blockHash,
                    blockNumber: result.receipt?.blockNumber?.toString(),
                    gasUsed: result.receipt?.gasUsed?.toString(),
                    status: result.receipt?.status,
                    type: result.receipt?.type,
                    effectiveGasPrice: result.receipt?.effectiveGasPrice?.toString(),
                },
                chain: chainInfo.name,
                chainId: chainInfo.id,
                mode,
                value: value,
                nativeCurrency: chainInfo.nativeCurrency,
            }

            return ResponseHandler.success(res, responseData, "ETH transfer completed successfully")
        } catch (error: any) {
            logger.error(`Error in sendETH: ${error.message}`)
            return ResponseHandler.error(res, error)
        }
    }

    /**
     * Send ERC20 tokens from a user's wallet
     */
    public async sendERC20(req: Request, res: Response) {
        try {
            const { _id: walletId } = (req as any).wallet
            const { tokenSymbol, to, amount, chain, mode = "SPONSORED" } = req.body

            // Validation
            if (!tokenSymbol || !to || !amount || !chain) {
                return ResponseHandler.validationError(
                    res,
                    [],
                    "Token symbol, recipient address, amount, and chain are required",
                )
            }

            // Validate recipient address
            if (!/^0x[a-fA-F0-9]{40}$/.test(to)) {
                return ResponseHandler.validationError(res, [], "Invalid recipient address format")
            }

            // Validate amount
            if (!/^[0-9]+(\.[0-9]+)?$/.test(amount)) {
                return ResponseHandler.validationError(res, [], "Invalid amount format")
            }

            // Validate transaction mode
            if (!["SPONSORED", "FEE"].includes(mode)) {
                return ResponseHandler.validationError(res, [], 'Invalid transaction mode. Must be "SPONSORED" or "FEE"')
            }

            const aaService = await this.initializeAA(walletId, chain)
            const chainInfo = aaService.getChainInfo()
            const result = await aaService.sendTokenBySymbol(tokenSymbol, to, amount, mode)

            if (result.error) {
                return ResponseHandler.error(res, result.error, 500)
            }

            const responseData = {
                fromAddress: result.address,
                toAddress: to,
                tokenSymbol,
                transactionHash: result.hash,
                receipt: {
                    blockHash: result.receipt?.blockHash,
                    blockNumber: result.receipt?.blockNumber?.toString(),
                    gasUsed: result.receipt?.gasUsed?.toString(),
                    status: result.receipt?.status,
                    type: result.receipt?.type,
                    effectiveGasPrice: result.receipt?.effectiveGasPrice?.toString(),
                    logsCount: result.receipt?.logs?.length,
                },
                chain: chainInfo.name,
                chainId: chainInfo.id,
                amount,
                mode,
                nativeCurrency: chainInfo.nativeCurrency,
            }

            return ResponseHandler.success(res, responseData, "Token transfer completed successfully")
        } catch (error: any) {
            logger.error(`Error in sendERC20: ${error.message}`)
            return ResponseHandler.error(res, error)
        }
    }

    /**
     * Get wallet address and status
     */
    public async getWalletInfo(req: Request, res: Response) {
        try {
            const { _id: walletId } = (req as any).wallet

            if (!walletId) {
                return ResponseHandler.validationError(res, [], "Wallet ID is required")
            }

            const wallet = await Wallet.findOne({ _id: walletId })
            if (!wallet) {
                return ResponseHandler.notFound(res, "Wallet not found")
            }

            // Get balances and info for all supported chains
            const aaa = await this.initializeAA(walletId, 'Base Sepolia')
            const accountInfomation = await aaa.getAccountInfo()

            const chainInfo = []

            for (const chain of ChainUtils.getAllSupportedChains()) {
                try {
                    const aaService = await this.initializeAA(walletId, chain.name)
                    const accountInfo = await aaService.getAccountInfo()
                    const tokenBalances = await aaService.getAllTokenBalances()

                    chainInfo.push({
                        chain: chain.name,
                        chainId: chain.id,
                        accountAddress: accountInfo.address,
                        isDeployed: accountInfo.isDeployed,
                        accountVersion: accountInfo.version,
                        nativeBalance: accountInfo.balance,
                        nativeCurrency: chain.nativeCurrency,
                        tokenBalances: tokenBalances.map(balance => ({
                            symbol: balance.token.symbol,
                            name: balance.token.name,
                            address: balance.token.address,
                            balance: balance.balance,
                            decimals: balance.token.decimals,
                            isNative: balance.token.isNative,
                            logo: balance.token.logo,
                        })),
                    })
                } catch (error) {
                    logger.warn(`Failed to get info for chain ${chain.name}: ${error}`)
                    chainInfo.push({
                        chain: chain.name,
                        chainId: chain.id,
                        error: "Failed to fetch chain information",
                    })
                }
            }

            const responseData = {
                walletId: wallet._id,
                walletEmail: wallet.email,
                socialType: wallet.socialType,
                isActive: wallet.isActive,
                walletAddress: accountInfomation.walletAddress,
                smartAccountAddress: accountInfomation.smartAccountAddress,
                chains: chainInfo,
                createdAt: wallet.createdAt,
                updatedAt: wallet.updatedAt,
            }

            return ResponseHandler.success(res, responseData, "Wallet information retrieved successfully")
        } catch (error: any) {
            logger.error(`Error in getWalletInfo: ${error.message}`)
            return ResponseHandler.error(res, error)
        }
    }

    /**
     * Execute a custom contract function from a user's wallet
     */
    public async executeContractFunction(req: Request, res: Response) {
        try {
            const { _id: walletId } = (req as any).wallet
            const { contractAddress, abi, functionName, args = [], value = "0", chain, mode = "SPONSORED" } = req.body

            logger.info(`Wallet ID: ${walletId}`)

            // Validation
            if (!contractAddress || !abi || !functionName || !chain) {
                return ResponseHandler.validationError(res, [], "Contract address, ABI, function name, and chain are required")
            }

            // Validate contract address
            if (!/^0x[a-fA-F0-9]{40}$/.test(contractAddress)) {
                return ResponseHandler.validationError(res, [], "Invalid contract address format")
            }

            // Validate ABI
            if (!Array.isArray(abi)) {
                return ResponseHandler.validationError(res, [], "ABI must be an array")
            }

            // Validate value format if provided
            if (value !== "0" && !/^[0-9]+(\.[0-9]+)?$/.test(value)) {
                return ResponseHandler.validationError(res, [], "Invalid value format")
            }

            // Validate transaction mode
            if (!["SPONSORED", "FEE"].includes(mode)) {
                return ResponseHandler.validationError(res, [], 'Invalid transaction mode. Must be "SPONSORED" or "FEE"')
            }

            const aaService = await this.initializeAA(walletId, chain)
            const chainInfo = aaService.getChainInfo()
            const result = await aaService.executeContractFunction(
                {
                    contractAddress,
                    abi,
                    functionName,
                    args,
                    value,
                },
                mode
            )

            if (result.error) {
                if (result.error.message.includes('AA33 reverted')) {
                    return ResponseHandler.error(res, 'Transaction rejected by paymaster', 417);
                }
                return ResponseHandler.error(res, result.error, 500);
            }

            const simplifiedReceipt = {
                transactionHash: result.receipt?.transactionHash,
                blockNumber: result.receipt?.blockNumber?.toString(),
                blockHash: result.receipt?.blockHash,
                status: result.receipt?.status,
                gasUsed: result.receipt?.gasUsed?.toString(),
                effectiveGasPrice: result.receipt?.effectiveGasPrice?.toString(),
                logsCount: result.receipt?.logs?.length,
                type: result.receipt?.type,
                contractAddress: result.receipt?.logs[1]?.address,
            }

            const responseData = {
                fromAddress: result.address,
                contractAddress,
                functionName,
                transactionHash: result.hash,
                receipt: simplifiedReceipt,
                chain: chainInfo.name,
                chainId: chainInfo.id,
                value,
                mode,
                nativeCurrency: chainInfo.nativeCurrency,
            }

            return ResponseHandler.success(res, responseData, "Contract function executed successfully")
        } catch (error: any) {
            logger.error(`Error in executeContractFunction: ${error.message}`)
            return ResponseHandler.error(res, error)
        }
    }

    /**
     * Get supported chains
     */
    public async getSupportedChains(req: Request, res: Response) {
        try {
            const chains = ChainUtils.getAllSupportedChains().map(chain => ({
                name: chain.name,
                chainId: chain.id,
                isTestnet: chain.isTestnet,
                nativeCurrency: chain.nativeCurrency,
                logo: chain.logo,
                faucetUrl: chain.faucetUrl,
                bridgeUrl: chain.bridgeUrl,
                rpcUrl: chain.rpcUrls.default.http[0],
                blockExplorer: chain.blockExplorers?.default?.url,
            }))

            return ResponseHandler.success(res, chains, "Supported chains retrieved successfully")
        } catch (error: any) {
            logger.error(`Error in getSupportedChains: ${error.message}`)
            return ResponseHandler.error(res, error)
        }
    }
}