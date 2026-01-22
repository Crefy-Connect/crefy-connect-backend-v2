export class CryptoTransactionHandler {
    aaService;
    /**
     * Creates a new CryptoTransactionHandler instance
     * @param {AccountAbstractionService} aaService - The account abstraction service to use
     */
    constructor(aaService) {
        this.aaService = aaService;
    }
    /**
     * Sends native cryptocurrency (ETH, MATIC, etc.)
     * @param {string} recipient - The recipient address
     * @param {string} amount - The amount to send in human-readable format (e.g., "0.1")
     * @returns {Promise<TransactionResult>} The transaction result
     */
    async sendNative(recipient, amount) {
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
    async sendERC20(tokenAddress, recipient, amount, decimals = 18) {
        return this.aaService.sendERC20(tokenAddress, recipient, amount, decimals);
    }
}
