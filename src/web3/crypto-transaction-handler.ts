// @ts-nocheck
import { AccountAbstractionService, TransactionResult } from "./AccountAbstractionService";
import { Abi, parseUnits } from "viem";
import { erc20Abi } from "viem";

export class CryptoTransactionHandler {
    private aaService: AccountAbstractionService;

    /**
     * Creates a new CryptoTransactionHandler instance
     * @param {AccountAbstractionService} aaService - The account abstraction service to use
     */
    constructor(aaService: AccountAbstractionService) {
        this.aaService = aaService;
    }


    /**
     * Sends native cryptocurrency (ETH, MATIC, etc.)
     * @param {string} recipient - The recipient address
     * @param {string} amount - The amount to send in human-readable format (e.g., "0.1")
     * @returns {Promise<TransactionResult>} The transaction result
     */
    public async sendNative(recipient: string, amount: string): Promise<TransactionResult> {
        return this.aaService.sendETH(recipient, amount);
    }

    /**
     * Sends ERC20 tokens
     * @param {string} tokenAddress - The ERC20 token contract address
     * @param {string} recipient - The recipient address
     * @param {string} amount - The amount to send in human-readable format (e.g., "100")
     * @param {number} decimals - The token decimals (default: 18)
     * @returns {Promise<TransactionResult>} The transaction result
     */
    public async sendERC20(
        tokenAddress: string,
        recipient: string,
        amount: string,
        decimals: number = 18
    ): Promise<TransactionResult> {
        return this.aaService.sendERC20(tokenAddress, recipient, amount, decimals);
    }


}