import { Wallet } from "../models/wallet.models.js";
import WalletGenerationService from "../services/wallet.generate.services.js";
import logger from "../utils/logger.js";
import { generateOTP, expireOTP, generateJWT, verifyJWT } from "../utils/auth.js";
import crypto from "crypto";
import { ApiError } from "../utils/apiError.js";
import SmsService from "../services/sms.service.js";
class SmsLoginsController {
    smsService;
    constructor() {
        // Use your Supabase x-api-key here
        this.smsService = new SmsService(process.env.SUPABASE_SMS_API_KEY);
    }
    /**
     * Login or create wallet via SMS
     */
    async smsWalletLogin(req, res) {
        logger.info(`SMS login request received`);
        try {
            const app = req.developer_app;
            const { phoneNumber } = req.body;
            const token = req.header("Authorization")?.replace("Bearer ", "");
            if (!phoneNumber || !/^\+\d{10,15}$/.test(phoneNumber)) {
                return res.status(400).json({
                    success: false,
                    message: "Valid phone number in international format is required"
                });
            }
            const existingWallet = await Wallet.findOne({ phoneNumber, socialType: "sms", appId: app.appId });
            // If token is provided and valid, check if it matches the wallet
            if (token) {
                try {
                    const decoded = verifyJWT(token);
                    if (existingWallet && existingWallet.address === decoded.walletAddress && existingWallet.isActive) {
                        return res.status(200).json({
                            success: true,
                            message: "User already logged in",
                            data: {
                                walletAddress: existingWallet.address,
                                publicKey: existingWallet.publicKey,
                                socialType: existingWallet.socialType,
                                userData: existingWallet.userData,
                            },
                            isActive: true,
                            token: token,
                        });
                    }
                }
                catch {
                    logger.info("Invalid token provided, proceeding with OTP verification");
                }
            }
            const otp = generateOTP();
            const otpExpiry = expireOTP(otp);
            if (existingWallet) {
                existingWallet.otp = otp.toString();
                existingWallet.otpExpiry = otpExpiry;
                await existingWallet.save();
                // Log OTP and phoneNumber
                logger.info(`Sending OTP ${otp} to phone number ${phoneNumber}`);
                await this.smsService.sendSms(phoneNumber, `Your OTP is ${otp}`);
                return res.status(200).json({
                    success: true,
                    message: "OTP sent to phone number for verification",
                    isActive: existingWallet.isActive,
                    walletExists: true
                });
            }
            // Create wallet for new user
            const { address, privateKey, publicKey } = await WalletGenerationService.generateAddress();
            const encryptionSalt = crypto.randomBytes(16).toString("hex");
            const newWallet = await Wallet.create({
                appId: app.appId,
                phoneNumber,
                socialType: "sms",
                address,
                publicKey,
                encryptedPrivateKey: privateKey,
                encryptionSalt,
                userData: JSON.stringify({ phoneNumber }),
                isActive: false,
                otp: otp.toString(),
                otpExpiry,
            });
            await newWallet.save();
            // Send OTP via SMS
            await this.smsService.sendSms(phoneNumber, `Your OTP is ${otp}`);
            return res.status(201).json({
                success: true,
                message: "OTP sent to phone number for verification",
                isActive: false,
                walletExists: false
            });
        }
        catch (error) {
            logger.error(`Error in smsWalletLogin: ${error}`);
            return res.status(500).json({
                success: false,
                message: "Internal server error"
            });
        }
    }
    /**
     * Verify wallet OTP (SMS)
     */
    async walletVerify(req, res) {
        try {
            const app = req.developer_app;
            const { phoneNumber, otp } = req.body;
            if (!phoneNumber || !/^\+\d{10,15}$/.test(phoneNumber)) {
                throw new ApiError(400, "Valid phone number is required");
            }
            const wallet = await Wallet.findOne({ phoneNumber, socialType: "sms", appId: app.appId });
            if (!wallet) {
                throw new ApiError(404, "Wallet not found");
            }
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
                catch {
                    // Proceed to OTP verification
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
            const newToken = generateJWT({ walletAddress: wallet.address });
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
                    message: error.message
                });
            }
            return res.status(500).json({
                success: false,
                message: "Internal server error"
            });
        }
    }
    /**
     * Resend OTP via SMS
     */
    async resendSmsOTP(req, res) {
        try {
            const app = req.developer_app;
            const { phoneNumber } = req.body;
            const wallet = await Wallet.findOne({ phoneNumber, socialType: "sms", appId: app.appId });
            if (!wallet) {
                throw new ApiError(404, "Wallet not found");
            }
            const otp = generateOTP();
            const otpExpiry = expireOTP(otp);
            wallet.otp = otp.toString();
            wallet.otpExpiry = otpExpiry;
            await wallet.save();
            await this.smsService.sendSms(phoneNumber, `Your OTP is ${otp}`);
            return res.status(200).json({
                success: true,
                message: "OTP resent to phone number for verification",
            });
        }
        catch (error) {
            logger.error(`Error in resendSmsOTP: ${error}`);
            if (error instanceof ApiError) {
                return res.status(error.statusCode).json({
                    success: false,
                    message: error.message
                });
            }
            return res.status(500).json({
                success: false,
                message: "Internal server error"
            });
        }
    }
}
export default new SmsLoginsController();
