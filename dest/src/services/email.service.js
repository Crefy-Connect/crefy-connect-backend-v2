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
    /**
    * Send password reset link to company
    */
    async sendPasswordResetEmail(name, email, resetToken) {
        const resetLink = `${process.env.FRONTEND_URL}/auth/reset-password?token=${resetToken}`;
        return this.sendEmail({
            to: email,
            subject: 'Password Reset Request for Crefy Connect',
            text: `Hello ${name},\n\nWe received a request to reset your password. Please click the following link to reset your password:\n\n${resetLink}\n\nThis link will expire in 15 minutes. If you didn't request this, please ignore this email.`,
            html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #333;">Password Reset Request</h2>
                <p>Hello ${name},</p>
                <p>We received a request to reset your password. Please click the button below to reset your password:</p>
                <a href="${resetLink}" style="background-color: #4CAF50; border: none; color: white; padding: 15px 32px; text-align: center; text-decoration: none; display: inline-block; font-size: 16px; margin: 20px 0; cursor: pointer; border-radius: 4px;">Reset Password</a>
                <p>Or copy and paste this link into your browser:<br>${resetLink}</p>
                <p>This link will expire in 15 minutes.</p>
                <p>If you didn't request this password reset, please ignore this email or contact support if you have questions.</p>
                <br>
                <p>Best regards,<br>The Crefy Connect Team</p>
            </div>`
        });
    }
}
export default new EmailService();
