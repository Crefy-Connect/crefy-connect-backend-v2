import axios, { AxiosError, AxiosResponse } from 'axios';
import { africas_talking_config } from '../config/index.js';
import logger from '../utils/logger.js';

interface SMSSendResult {
    status: 'success' | 'error';
    messageId?: string;
    recipients?: SMSRecipient[];
    errorCode?: string;
    errorMessage?: string;
}

interface SMSRecipient {
    phoneNumber: string;
    status: 'Success' | 'Failed';
    messageId?: string;
    cost?: string;
}

interface SMSOptions {
    enqueue?: boolean;
    keyword?: string;
    linkId?: string;
    retryDurationInHours?: number;
}

class AfricasTalkingSMS {
    private apiKey: string;
    private username: string;
    private senderId?: string;
    private shortCode?: string;
    private baseUrl: string;

    constructor(
        apiKey: string = africas_talking_config.AFRICAS_TALKING_API_KEY,
        username: string = africas_talking_config.AFRICAS_TALKING_USERNAME,
        senderId?: string,
        shortCode?: string
    ) {
        if (!apiKey || !username) {
            throw new Error('Africa\'s Talking credentials not provided or found in config');
        }

        this.apiKey = apiKey;
        this.username = username;
        this.senderId = senderId || africas_talking_config.AFRICAS_TALKING_SENDER_ID;
        this.shortCode = shortCode || africas_talking_config.AFRICAS_TALKING_SENDER_ID;
        logger.info(`AfricasTalkingSMS initialized with apiKey: ${this.apiKey}, username: ${this.username}, senderId: ${this.senderId}, shortCode: ${this.shortCode}`);
        this.baseUrl = 'https://api.africastalking.com/version1';
    }

    async sendSms(
        to: string[] | string,
        message: string,
        options: SMSOptions = {}
    ): Promise<SMSSendResult> {
        try {
            const recipients = Array.isArray(to) ? to.join(',') : to;
            const from = this.shortCode || this.senderId;

            if (!from) {
                throw new Error('Either shortCode or senderId must be provided');
            }

            // Create form data
            const formData = new URLSearchParams();
            formData.append('username', this.username);
            formData.append('to', recipients);
            formData.append('message', message);
            formData.append('from', from);

            // Add options if they exist
            Object.entries(options).forEach(([key, value]) => {
                if (value !== undefined) {
                    formData.append(key, String(value));
                }
            });

            logger.info(formData.toString());

            const response: AxiosResponse = await axios.post(
                `${this.baseUrl}/messaging/bulk`,
                {
                    headers: {
                        'apiKey': this.apiKey,
                        'Content-Type': 'application/json', // Correct content type
                        'Accept': 'application/json',
                    },
                    data: {
                        username: this.username,
                        to: recipients,
                        message,
                    }
                }
            );

            const data = response.data.SMSMessageData;

            return {
                status: 'success',
                messageId: data.Message,
                recipients: data.Recipients.map((recipient: any) => ({
                    phoneNumber: recipient.number,
                    status: recipient.status,
                    messageId: recipient.messageId,
                    cost: recipient.cost,
                })),
            };
        } catch (error: any) {
            const axiosError = error as AxiosError;
            let errorMessage = axiosError.message;

            if (axiosError.response?.data) {
                errorMessage = typeof axiosError.response.data === 'object'
                    ? JSON.stringify(axiosError.response.data)
                    : String(axiosError.response.data);
            }

            logger.error(`SMS sending failed: ${errorMessage}`);
            return {
                status: 'error',
                errorCode: axiosError.response?.status.toString() || '500',
                errorMessage: `SMS sending failed: ${errorMessage}`,
            };
        }
    }


    private serializeOptions(options: SMSOptions): Record<string, string> {
        return Object.entries(options).reduce((acc, [key, value]) => {
            if (value !== undefined) {
                acc[key] = String(value);
            }
            return acc;
        }, {} as Record<string, string>);
    }

    async getSmsBalance(): Promise<{ status: string; balance: string }> {
        try {
            const response: AxiosResponse = await axios.get(
                `${this.baseUrl}/user`,
                {
                    params: {
                        username: this.username,
                    },
                    headers: {
                        apiKey: this.apiKey,
                        Accept: 'application/json',
                    },
                }
            );

            return {
                status: 'success',
                balance: response.data.User.balance,
            };
        } catch (error) {
            const axiosError = error as AxiosError;
            throw new Error(`Failed to get balance: ${axiosError.message}`);
        }
    }

    static validatePhoneNumber(phoneNumber: string, countryCode: string = '+254'): boolean {
        // Remove all non-digit characters
        const cleaned = phoneNumber.replace(/\D/g, '');

        // Check if number starts with country code (without +)
        if (cleaned.startsWith(countryCode.replace('+', ''))) {
            return cleaned.length === (countryCode.replace('+', '').length + 9);
        }

        // Check if number starts with 0 (local format)
        if (cleaned.startsWith('0')) {
            return cleaned.length === 10;
        }

        // Check if number starts with + (international format)
        if (phoneNumber.startsWith('+')) {
            return cleaned.length === (countryCode.replace('+', '').length + 9);
        }

        return false;
    }
}

export default AfricasTalkingSMS;