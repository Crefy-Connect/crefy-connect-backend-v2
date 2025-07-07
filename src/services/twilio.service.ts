import twilio from 'twilio';
import * as dotenv from 'dotenv';
import { twilio_config } from '@src/config/index.js';
import logger from '@src/utils/logger.js';

dotenv.config();

interface SMSResult {
    status: 'success' | 'error';
    messageSid?: string;
    dateCreated?: Date;
    to?: string;
    errorCode?: string;
    errorMessage?: string;
}

class TwilioSMS {
    private accountSid: string;
    private authToken: string;
    private twilioNumber: string;
    private client: twilio.Twilio;

    constructor(
        accountSid: string = twilio_config.TWILIO_ACCOUNT_SID,
        authToken: string = twilio_config.TWILIO_AUTH_TOKEN,
        twilioNumber: string = twilio_config.TWILIO_PHONE_NUMBER
    ) {
        if (!accountSid || !authToken || !twilioNumber) {
            throw new Error('Twilio credentials not provided or found in environment');
        }

        this.accountSid = accountSid;
        this.authToken = authToken;
        this.twilioNumber = twilioNumber;
        this.client = twilio(this.accountSid, this.authToken);
        logger.info('Twilio client initialized');
        logger.info(`Twilio client initialized with accountSid: ${this.accountSid}, authToken: ${this.authToken}, twilioNumber: ${this.twilioNumber}`);
        logger.info(this.client);
    }

    async sendSms(toNumber: string, messageBody: string): Promise<SMSResult> {
        try {
            logger.info(`Sending SMS to ${toNumber} with message: ${messageBody}`);
            const message = await this.client.messages.create({
                body: messageBody,
                from: this.twilioNumber,
                to: toNumber,
            });

            return {
                status: 'success',
                messageSid: message.sid,
                dateCreated: message.dateCreated,
                to: message.to,
            };
        } catch (error: any) {
            console.log(error);
            logger.error(`Error sending SMS to ${toNumber}: ${error.message}`);
            return {
                status: 'error',
                to: toNumber,
                errorCode: error.code,
                errorMessage: error.message,
            };
        }
    }

    static validatePhoneNumber(phoneNumber: string): boolean {
        // Remove all non-digit characters
        const cleaned = phoneNumber.replace(/\D/g, '');
        // Very basic check - at least 10 digits (US number without country code)
        return cleaned.length >= 10;
    }
}

export default TwilioSMS;