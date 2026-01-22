import axios from 'axios';
import logger from '../utils/logger.js';
class SmsService {
    apiKey;
    baseUrl;
    http;
    /**
     * Constructor to initialize Africa's Talking SMS Service
     * @param {string} username - Your Africa's Talking application username
     * @param {string} apiKey - Your Africa's Talking API key
     * @param {boolean} sandbox - Use sandbox mode (default: false)
    */
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.baseUrl = "https://kbzktzsczpwsttjmfnge.supabase.co/functions/v1/send-message";
        this.http = axios.create({
            baseURL: this.baseUrl,
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
                "x-api-key": this.apiKey,
            },
        });
    }
    /**
     * Send SMS to a single phone number
     * @param {string} phoneNumber - Recipient phone number in international format
     * @param {string} message - The SMS text to send
     */
    async sendSms(phoneNumber, message) {
        try {
            const response = await this.http.post("", {
                phoneNumber,
                message
            });
            logger.info(`SMS sent to ${phoneNumber}: ${message}`);
            return response.data;
        }
        catch (error) {
            logger.error("Error sending SMS:", error.response?.data || error.message);
            throw error;
        }
    }
}
export default SmsService;
