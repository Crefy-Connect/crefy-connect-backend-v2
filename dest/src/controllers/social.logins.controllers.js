import { Wallet } from "../models/wallet.models.js";
import WalletGenerationService from "../services/wallet.generate.services.js";
import logger from "../utils/logger.js";
import { generateOTP, expireOTP, validateEmail, generateJWT, verifyJWT, } from "../utils/auth.js";
import EmailService from "../services/email.service.js";
import crypto from "crypto";
import { ApiError } from "../utils/apiError.js";
class SocialLoginsController {
    /**
     * Email login for social logins
     * @param req - Request object
     * @param res - Response object
     * @returns - Response object
     */
    async emailWalletLogin(req, res) {
        logger.info(`Email login request received`);
        try {
            const app = req.developer_app;
            const { email } = req.body;
            const token = req.header("Authorization")?.replace("Bearer ", "");
            if (!validateEmail(email)) {
                return res.status(400).json({
                    success: false,
                    message: "Valid email is required",
                });
            }
            // Check for existing wallet
            const existingWallet = await Wallet.findOne({
                email,
                socialType: "email",
                appId: app.appId,
            });
            // If token is provided and valid, check if it matches the wallet
            if (token) {
                try {
                    const decoded = verifyJWT(token);
                    if (existingWallet &&
                        existingWallet.address === decoded.address &&
                        existingWallet.isActive) {
                        // User is already authenticated
                        return res.status(200).json({
                            success: true,
                            message: "User already logged in",
                            data: {
                                address: existingWallet.address,
                                publicKey: existingWallet.publicKey,
                                socialType: existingWallet.socialType,
                                userData: existingWallet.userData,
                            },
                            isActive: true,
                            token: token,
                        });
                    }
                }
                catch (error) {
                    // Token is invalid, proceed with normal login flow
                    logger.info("Invalid token provided, proceeding with OTP verification");
                }
            }
            const otp = generateOTP();
            const otpExpiry = expireOTP(otp);
            if (existingWallet) {
                // Update OTP for existing wallet
                existingWallet.otp = otp.toString();
                existingWallet.otpExpiry = otpExpiry;
                await existingWallet.save();
                // Send OTP email
                await EmailService.sendOTPEmail("User", email, otp.toString());
                return res.status(200).json({
                    success: true,
                    message: "OTP sent to email for verification",
                    isActive: existingWallet.isActive,
                    walletExists: true,
                });
            }
            // Generate new wallet for new user
            const { address, privateKey, publicKey } = await WalletGenerationService.generateAddress();
            logger.info(`Generated wallet: ${address}, ${publicKey}, ${privateKey}`);
            const encryptionSalt = crypto.randomBytes(16).toString("hex");
            // Create new wallet
            const newWallet = await Wallet.create({
                appId: app.appId,
                email,
                socialType: "email",
                address: address,
                publicKey: publicKey,
                encryptedPrivateKey: privateKey,
                encryptionSalt,
                userData: JSON.stringify({ email }),
                isActive: false,
                otp: otp.toString(),
                otpExpiry,
            });
            await newWallet.save();
            // Send OTP email
            await EmailService.sendOTPEmail("User", email, otp.toString());
            logger.info(`OTP sent to ${email}`);
            return res.status(201).json({
                success: true,
                message: "OTP sent to email for verification",
                isActive: false,
                walletExists: false,
            });
        }
        catch (error) {
            logger.error(`Error in emailLogin: ${error}`);
            return res.status(500).json({
                success: false,
                message: "Internal server error",
            });
        }
    }
    /**
     * Verify wallet account
     */
    async walletVerify(req, res) {
        try {
            const app = req.developer_app;
            const { email, otp } = req.body;
            logger.info(`Wallet verify request received: ${email}, ${otp}`);
            if (!validateEmail(email)) {
                throw new ApiError(400, "Valid email is required");
            }
            const wallet = await Wallet.findOne({
                email,
                socialType: "email",
                appId: app.appId,
            });
            if (!wallet) {
                throw new ApiError(404, "Wallet not found");
            }
            // check if wallet is already verified and has a valid token
            const token = req.header("Authorization")?.replace("Bearer ", "");
            if (token && wallet.isActive) {
                try {
                    const decoded = verifyJWT(token);
                    if (wallet.address === decoded.walletAddress) {
                        return res.status(200).json({
                            success: true,
                            message: "User already logged in",
                            data: {
                                walletAddress: wallet.address,
                                publicKey: wallet.publicKey,
                                socialType: wallet.socialType,
                                userData: wallet.userData,
                            },
                            isActive: true,
                            token: token,
                        });
                    }
                }
                catch (error) {
                    // Token is invalid, proceed with OTP verification
                }
            }
            if (wallet.otp !== otp) {
                throw new ApiError(400, "Invalid OTP");
            }
            if (wallet.otpExpiry && wallet.otpExpiry < new Date()) {
                throw new ApiError(400, "OTP expired");
            }
            wallet.isActive = true;
            await wallet.save();
            const newToken = generateJWT({ address: wallet.address });
            return res.status(200).json({
                success: true,
                message: "Wallet verified successfully",
                data: {
                    walletAddress: wallet.address,
                    publicKey: wallet.publicKey,
                    socialType: wallet.socialType,
                    userData: wallet.userData,
                },
                isActive: true,
                token: newToken,
            });
        }
        catch (error) {
            logger.error(`Error in walletVerify: ${error}`);
            if (error instanceof ApiError) {
                return res.status(error.statusCode).json({
                    success: false,
                    message: error.message,
                });
            }
            return res.status(500).json({
                success: false,
                message: "Internal server error",
            });
        }
    }
    /**
     * Resend Email OTP
     */
    async resendEmailOTP(req, res) {
        try {
            const app = req.developer_app;
            const { email } = req.body;
            const wallet = await Wallet.findOne({
                email,
                socialType: "email",
                appId: app.appId,
            });
            if (!wallet) {
                throw new ApiError(404, "Wallet not found");
            }
            const otp = generateOTP();
            const otpExpiry = expireOTP(otp);
            wallet.otp = otp.toString();
            wallet.otpExpiry = otpExpiry;
            await wallet.save();
            await EmailService.sendOTPEmail("User", email, otp.toString());
            return res.status(200).json({
                success: true,
                message: "OTP resent to email for verification",
            });
        }
        catch (error) {
            logger.error(`Error in resendEmailOTP: ${error}`);
            if (error instanceof ApiError) {
                return res.status(error.statusCode).json({
                    success: false,
                    message: error.message,
                });
            }
            return res.status(500).json({
                success: false,
                message: "Internal server error",
            });
        }
    }
    /**
     * Google OAuth Callback
     */
    async googleOAuthCallback(req, res) {
        try {
            if (!req.user) {
                logger.error("Google OAuth callback: No user found");
                return res.status(401).json({
                    success: false,
                    message: "Unauthorized",
                });
            }
            return res.status(200).json({
                success: true,
                message: "Google Wallet Authentication successful",
            });
        }
        catch (error) {
            logger.error(`Error in googleOAuth: ${error}`);
            return res.status(500).json({
                success: false,
                message: "Internal server error",
            });
        }
    }
    /**
     * Google OAuth Failure Handler
     */
    googleOAuthFailure(_req, res) {
        res.status(401).json({
            success: false,
            message: "Google OAuth failed",
        });
    }
}
export default new SocialLoginsController();
