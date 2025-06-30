import { Request, Response } from "express";
import { Wallet } from "../models/wallet.models.js";
import WalletGenerationService from "../services/wallet.generate.services.js";
import logger from "../utils/logger.js";
import { generateOTP, expireOTP, validateEmail } from "../utils/auth.js";
import EmailService from "../services/email.service.js";
import crypto from 'crypto';
import passport from "passport";
import { server_config } from "../config/index.js";

interface IWallet {
    email: string;
    walletAddress: string;
    publicKey: string;
    encryptedPrivateKey: string;
    encryptionSalt: string;
    appId: string;
    userData: string;
    otp?: string;
    otpExpiry?: Date;
    isActive: boolean;
}

class SocialLoginsController {

    /** 
     * Email login for social logins 
     * @param req - Request object
     * @param res - Response object
     * @returns - Response object
     */
    public async emailWalletLogin(req: Request, res: Response): Promise<Response> {
        logger.info(`Email login request received`);
        try {
            const appId = req.params.appId;
            const { email } = req.body;

            if (!validateEmail(email)) {
                return res.status(400).json({
                    success: false,
                    message: 'Valid email is required'
                });
            }

            // Check for existing wallet
            const existingWallet = await Wallet.findOne({ email, socialType: 'email' });

            if (existingWallet) {
                return res.status(200).json({
                    success: true,
                    message: 'Wallet already exists',
                    data: {
                        walletAddress: existingWallet.address,
                        publicKey: existingWallet.publicKey,
                        socialType: existingWallet.socialType,
                    }
                });
            }

            // Generate new wallet  
            const { address, privateKey, publicKey, mnemonic } = await WalletGenerationService.generateAddress();
            logger.info(`Generated wallet: ${address}, ${publicKey}, ${privateKey}, ${mnemonic}`);
            const otp = generateOTP();
            const otpExpiry = expireOTP(otp);
            const encryptionSalt = crypto.randomBytes(16).toString('hex');

            // Create new wallet
            const newWallet = await Wallet.create({
                appId,
                email,
                socialType: 'email',
                address: address,
                publicKey: publicKey,
                encryptedPrivateKey: privateKey,
                encryptionSalt,
                userData: JSON.stringify({ email }),
                isActive: false,
                otp,
                otpExpiry,
            });

            newWallet.save();

            // Send OTP email
            await EmailService.sendOTPEmail("User", email, otp.toString());

            logger.info(`OTP sent to ${email}`);

            return res.status(201).json({
                success: true,
                message: 'OTP sent to email for verification',
            });
        } catch (error) {
            logger.error(`Error in emailLogin: ${error}`);
            return res.status(500).json({
                success: false,
                message: "Internal server error"
            });
        }
    }

    /**
     * Verify wallet account
     */
    public async walletVerify(req: Request, res: Response): Promise<Response> {
        try {
            const { email, otp } = req.body;
            logger.info(`Wallet verify request received: ${email}, ${otp}`);
            if (!validateEmail(email)) {
                return res.status(400).json({
                    success: false,
                    message: 'Valid email is required'
                });
            }

            const wallet = await Wallet.findOne({ email, socialType: 'email' });
            logger.info(`Wallet found: ${wallet}`);
            if (!wallet) {
                return res.status(400).json({
                    success: false,
                    message: 'Wallet not found'
                });
            }

            // check if wallet is already verified
            if (wallet.isActive) {
                return res.status(200).json({
                    success: true,
                    message: 'Wallet already verified',
                    data: {
                        walletAddress: wallet.address,
                        publicKey: wallet.publicKey,
                        socialType: wallet.socialType,
                    }
                });
            }

            if (wallet.otp !== otp) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid OTP'
                });
            }

            if (wallet.otpExpiry && wallet.otpExpiry < new Date()) {
                return res.status(400).json({
                    success: false,
                    message: 'OTP expired'
                });
            }

            wallet.isActive = true;
            await wallet.save();

            return res.status(200).json({
                success: true,
                message: 'Wallet verified successfully'
            });
        } catch (error) {
            logger.error(`Error in walletVerify: ${error}`);
            return res.status(500).json({
                success: false,
                message: "Internal server error"
            });
        }
    }

    /**
     * Resend Email OTP
     */
    public async resendEmailOTP(req: Request, res: Response): Promise<Response> {
        try {
            const { email } = req.body;
            const wallet = await Wallet.findOne({ email, socialType: 'email' });
            if (!wallet) {
                return res.status(400).json({
                    success: false,
                    message: 'Wallet not found'
                });
            }

            const otp = generateOTP();
            const otpExpiry = expireOTP(otp);
            wallet.otp = otp.toString();
            wallet.otpExpiry = otpExpiry;

            await wallet.save();

            await EmailService.sendOTPEmail("User", email, otp.toString());

            return res.status(200).json({
                success: true,
                message: 'OTP resent to email for verification',
            });
        } catch (error) {
            logger.error(`Error in resendEmailOTP: ${error}`);
            return res.status(500).json({
                success: false,
                message: "Internal server error"
            });
        }
    }

    /**
     * Google OAuth Callback
     */
    public async googleOAuthCallback(req: Request, res: Response): Promise<Response> {
        try {
            if (!req.user) {
                logger.error('Google OAuth callback: No user found');
                return res.status(401).json({
                    success: false,
                    message: "Unauthorized"
                });
            }

            return res.status(200).json({
                success: true,
                message: "Google Wallet Authentication successful"
            })
        } catch (error) {
            logger.error(`Error in googleOAuth: ${error}`);
            return res.status(500).json({
                success: false,
                message: "Internal server error"
            });
        }
    }

    /**
     * Google OAuth Failure Handler
     */
    public googleOAuthFailure(_req: Request, res: Response): void {
        res.status(401).json({
            success: false,
            message: "Google OAuth failed"
        });
    }

}

export default new SocialLoginsController();