import { Request, Response } from "express";
import { AccountAbstractionService } from "../web3/account-abstraction.js";
import logger from "../utils/logger.js";
import { Wallet } from "../models/wallet.models.js";
import { Chain, baseSepolia, scrollSepolia } from "viem/chains";


export class CryptoTransactionController {
    /**
     * Initialize AA service for a specific user wallet
     * @param walletId - The wallet ID or email to lookup
     * @returns Initialized AccountAbstractionService
     */
    private async initializeAA(walletId: string, chain: string): Promise<AccountAbstractionService> {
        try {
            let chainObj: Chain;
            if (chain === "baseSepolia") {
                chainObj = baseSepolia;
            } else if (chain === "scrollSepolia") {
                logger.info("Scroll Sepolia");
                chainObj = scrollSepolia;
            } else {
                throw new Error("Invalid chain");
            }
            // Find wallet by email or Id
            const wallet = await Wallet.findOne({
                $or: [{ email: walletId }, { _id: walletId }]
            });

            if (!wallet) {
                throw new Error("Wallet not found");
            }

            if (!wallet.isActive) {
                throw new Error("Wallet is not active");
            }

            return new AccountAbstractionService({
                privateKey: wallet.encryptedPrivateKey,
                chain: chainObj,
            });
        } catch (error) {
            logger.error(`Error initializing AA service: ${error}`);
            throw error;
        }
    }

    /**
     * Send ETH to a specified address
     */
    public async sendETH(req: Request, res: Response) {
        try {
            const { walletId } = (req as any).wallet;
            const { to, value, chain } = req.body;

            if (!to || !value || !chain) {
                return res.status(400).json({
                    success: false,
                    message: "recipient address, value amount and chain network are required"
                });
            }

            const aaService = await this.initializeAA(walletId, chain);
            const result = await aaService.sendETH(to, value || '0');

            if (result.error) {
                return res.status(500).json({
                    error: result.error.message,
                    address: result.address
                });
            }

            return res.status(200).json({
                success: true,
                fromAddress: result.address,
                toAddress: to,
                transactionHash: result.hash,
                receipt: result.receipt
            });
        } catch (error: any) {
            logger.error(`Error in sendETH: ${error.message}`);
            return res.status(500).json({ error: error.message });
        }
    }

    /**
     * Send ERC20 tokens from a user's wallet
     */
    public async sendERC20(req: Request, res: Response) {
        try {
            const { walletId } = (req as any).wallet;
            const { tokenAddress, to, amount, chain, decimals } = req.body;

            if (!walletId || !tokenAddress || !to || !amount) {
                return res.status(400).json({
                    error: "Wallet ID, token address, recipient, and amount are required"
                });
            }

            const aaService = await this.initializeAA(walletId, chain);
            const result = await aaService.sendERC20(tokenAddress, to, amount, decimals || 18);

            if (result.error) {
                return res.status(500).json({
                    error: result.error.message,
                    address: result.address
                });
            }

            return res.status(200).json({
                success: true,
                fromAddress: result.address,
                toAddress: to,
                tokenAddress,
                transactionHash: result.hash,
                receipt: result.receipt
            });
        } catch (error: any) {
            logger.error(`Error in sendERC20: ${error.message}`);
            return res.status(500).json({ error: error.message });
        }
    }

    /**
     * Get wallet address and status
     */
    public async getWalletInfo(req: Request, res: Response) {
        try {
            const { _id: walletId } = (req as any).wallet;
            if (!walletId) {
                return res.status(400).json({ error: "Wallet ID is required" });
            }

            const wallet = await Wallet.findOne({ _id: walletId });

            if (!wallet) {
                return res.status(404).json({ error: "Wallet not found" });
            }

            const aaService = await this.initializeAA(walletId, "baseSepolia");
            const currentAddress = await aaService.getAccountAddress();

            return res.status(200).json({
                success: true,
                walletId: wallet._id,
                walletEmail: wallet.email,
                socialType: wallet.socialType,
                registeredAddress: wallet.address,
                currentAddress,
                isActive: wallet.isActive,
                createdAt: wallet.createdAt,
                updatedAt: wallet.updatedAt
            })

        } catch (error: any) {
            logger.error(`Error in getWalletInfo: ${error.message}`);
            return res.status(500).json({ error: error.message });
        }
    }

    /**
     * Execute a custom contract function from a user's wallet
     */
    public async executeContractFunction(req: Request, res: Response) {
        try {
            console.log((req as any).wallet);
            const { _id: walletId } = (req as any).wallet;
            logger.info(`Wallet ID: ${walletId}`);
            const { contractAddress, abi, functionName, args, value, chain } = req.body;

            if (!walletId || !contractAddress || !abi || !functionName) {
                return res.status(400).json({ error: "Wallet ID, contract address, ABI, and function name are required" });
            }

            const aaService = await this.initializeAA(walletId, chain);
            const result = await aaService.executeContractFunction({
                contractAddress,
                abi,
                functionName,
                args: args || [],
                value: value || '0'
            });

            if (result.error) {
                return res.status(500).json({
                    error: result.error.message,
                    address: result.address
                });
            }
            console.log(result);
            console.log(result.receipt);
            console.log(typeof result.receipt);

            const simplifiedReceipt = {
                transactionHash: result.receipt?.transactionHash,
                blockNumber: result.receipt?.blockNumber?.toString(), // Convert BigInt to string
                status: result.receipt?.status,
                gasUsed: result.receipt?.gasUsed?.toString(), // Convert BigInt to string
                effectiveGasPrice: result.receipt?.effectiveGasPrice?.toString(), // Convert BigInt to string
                logsCount: result.receipt?.logs?.length
            };


            return res.status(200).json({
                success: true,
                fromAddress: result.address,
                contractAddress,
                transactionHash: result.hash,
                receipt: simplifiedReceipt
            });
        } catch (error: any) {
            logger.error(`Error in executeContractFunction: ${error.message}`);
            return res.status(500).json({ error: error.message });
        }
    }
}