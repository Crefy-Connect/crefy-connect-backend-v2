import axios from 'axios';
import { ethers } from 'ethers';
import logger from '../utils/logger.js';
import { elementpay_config } from '../config/index.js';
import { erc20Abi } from 'viem';
export class ElementPayClient {
    apiKey;
    baseUrl;
    provider;
    signer;
    client;
    /**
     * @param {Object} config
     * @param {string} config.apiKey - Your Element Pay API key
     * @param {string} [config.baseUrl] - API base URL (defaults to staging)
     * @param {ethers.providers.Provider} config.provider - Ethers.js provider
     * @param {ethers.Signer} [config.signer] - Optional Ethers.js signer for token approvals
     */
    constructor({ provider, signer = null }) {
        this.apiKey = elementpay_config.apiKey || '';
        this.baseUrl = elementpay_config.baseUrl || 'https://staging.elementpay.net/api/v1';
        this.provider = provider;
        this.signer = signer;
        // Log errors if any of the required environment variables are not set
        if (!this.apiKey)
            logger.error('ELEMENTPAY_API_KEY is not set');
        if (!this.baseUrl)
            logger.error('ELEMENTPAY_BASE_URL is not set');
        this.client = axios.create({
            baseURL: this.baseUrl,
            headers: {
                'x-api-key': this.apiKey,
                'Content-Type': 'application/json',
            }
        });
    }
    /**
     * Create a new order (onramp or offramp)
     */
    async createOrder({ user_address, token, order_type, fiat_payload, webhook_url = '' }) {
        if (order_type === 0 && !webhook_url) {
            logger.error('Webhook URL is required for onramp orders');
            throw new Error('Webhook URL is required for onramp orders');
        }
        const payload = {
            user_address,
            token,
            order_type,
            fiat_payload,
            ...(webhook_url && { webhook_url })
        };
        try {
            const response = await this.client.post('/orders/create', payload);
            return response.data;
        }
        catch (error) {
            this._handleApiError(error);
        }
    }
    /**
     * Approve token transfer for offramp orders
     */
    async approveToken(tokenAddress, amount, elementContract) {
        if (!this.signer) {
            throw new Error('Signer is required for token approvals');
        }
        try {
            console.log('tokenAddress', tokenAddress);
            console.log('amount', amount);
            console.log('elementContract', elementContract);
            console.log('signer', this.signer);
            const contract = new ethers.Contract(tokenAddress, erc20Abi, this.signer);
            const tx = await contract.approve(elementContract, amount);
            return tx;
        }
        catch (error) {
            logger.error('Token approval failed:', error);
            throw error;
        }
    }
    /**
     * Get order status by transaction hash
     */
    async getOrderStatus(txHash) {
        try {
            const response = await this.client.get(`/orders/tx/${txHash}`);
            return response.data;
        }
        catch (error) {
            this._handleApiError(error);
        }
    }
    /**
     * Get current exchange rates
     */
    async getExchangeRates(currency = 'usdc') {
        try {
            const response = await this.client.get(`/rates`, {
                params: { currency }
            });
            return response.data;
        }
        catch (error) {
            this._handleApiError(error);
        }
    }
    /**
     * Calculate required token amount for offramp
     */
    async calculateRequiredTokenAmount(fiatAmount, currency = 'usdc') {
        const rates = await this.getExchangeRates(currency);
        const tokenAmount = fiatAmount / rates.marked_up_rate;
        return ethers.parseEther(tokenAmount.toString()).toString();
    }
    /**
     * Handle API errors consistently
     */
    _handleApiError(error) {
        if (error.response) {
            const message = error.response.data?.message || error.response.statusText;
            logger.error(`API Error: ${message} (Status: ${error.response.status})`);
            throw new Error(`API Error: ${message} (Status: ${error.response.status})`);
        }
        else if (error.request) {
            logger.error('No response received from API');
            throw new Error('No response received from API');
        }
        else {
            logger.error(`Request setup error: ${error.message}`);
            throw new Error(`Request setup error: ${error.message}`);
        }
    }
}
