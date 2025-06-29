import { smtp_config } from '../config/index.js';
import nodemailer from 'nodemailer';
import logger from '../utils/logger.js';
class EmailService {
    // Simplified transporter type declaration
    transporter;
    constructor() {
        // Create transporter with explicit type
        // @ts-ignore
        this.transporter = nodemailer.createTransport({
            host: smtp_config.host,
            port: smtp_config.port,
            secure: smtp_config.secure,
            auth: {
                user: smtp_config.auth.user,
                pass: smtp_config.auth.pass
            }
        });
    }
    /**
     * Send an email
     */
    async sendEmail(options) {
        try {
            const mailOptions = {
                from: smtp_config.from,
                to: options.to,
                subject: options.subject,
                text: options.text,
                html: options.html
            };
            const info = await this.transporter.sendMail(mailOptions);
            logger.info(`Email sent to ${options.to}: ${info.messageId}`);
            return true;
        }
        catch (error) {
            logger.error('Error sending email:', error);
            return false;
        }
    }
    /**
     * Send OTP to developer on registration
     */
    async sendOTPEmail(name, email, otp) {
        return this.sendEmail({
            to: email,
            subject: 'Your Crefy Connect OTP',
            text: `Hello ${name},\n\nYour OTP is: ${otp}\n\nPlease use this OTP to verify your account.`,
            html: `<p>Hello ${name},</p>
                   <p>Your OTP is: <strong>${otp}</strong></p>
                   <p>Please use this OTP to verify your account.</p>`
        });
    }
    /**
     * Send account deletion confirmation
     */
    async sendAccountDeletedEmail(name, email) {
        return this.sendEmail({
            to: email,
            subject: 'Your Crefy Connect Account Has Been Deleted',
            text: `Hello ${name},\n\nYour account has been successfully deleted.`,
            html: `<p>Hello ${name},</p>
                   <p>Your account has been successfully deleted.</p>`
        });
    }
}
export default new EmailService();
