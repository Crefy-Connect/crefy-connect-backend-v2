import { Request, Response } from "express";
import { Developer } from "../models/developer.models.js";
import { generateApiKey, generateOTP, expireOTP, hashPassword, comparePassword, generateJWT, validateEmail } from "../utils/auth.js";
import logger from "../utils/logger.js";
import { mongodb_config } from "../config/index.js";
import EmailService from "../services/email.service.js";

class DeveloperController {
    /**
     * Register a new developer
    */
    public async registerDeveloper(req: Request, res: Response): Promise<Response> {
        try {
            const { name, email, password } = req.body;

            // Validate input
            if (!name || !email || !password) {
                return res.status(400).json({
                    success: false,
                    message: 'Name, email and password are required'
                });
            }

            // Validate email format
            if (!validateEmail(email)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid email format'
                });
            }

            // Check if developer already exists
            const existingDeveloper = await Developer.findOne({ email });
            if (existingDeveloper) {
                return res.status(409).json({
                    success: false,
                    message: 'Developer with this email already exists'
                });
            }

            // Hash password
            const hashedPassword = hashPassword(password);

            // Generate API key and otp
            const apiKey = generateApiKey();
            const otp = generateOTP();
            const otpExpiresAt = expireOTP(otp);

            // Create new developer
            const developer = new Developer({
                name,
                email,
                password: hashedPassword,
                apiKey,
                otp,
                otpExpiresAt
            });

            // Save developer
            await developer.save();

            // Send OTP email
            await EmailService.sendOTPEmail(name, email, otp.toString());

            logger.info(`New developer registered: ${name} (${email})`);

            return res.status(201).json({
                success: true,
                message: "Developer registered successfully",
                data: {
                    id: developer._id,
                    name: developer.name,
                    email: developer.email,
                    createdAt: developer.createdAt,
                }
            });
        } catch (error) {
            logger.error(`Error registering developer: ${error}`);
            return res.status(500).json({
                success: false,
                message: "Internal server error"
            });
        }
    }

    /**
     * Verify OTP
     */
    public async verifyOTP(req: Request, res: Response): Promise<Response> {
        try {
            const { email, otp } = req.body;

            // Validate input
            if (!email || !otp) {
                return res.status(400).json({
                    success: false,
                    message: 'Email and OTP are required'
                });
            }

            // Find developer by email
            const developer = await Developer.findOne({ email });
            if (!developer) {
                return res.status(404).json({
                    success: false,
                    message: 'Developer not found'
                });
            }

            // Check if developer is active
            if (developer.isActive) {
                return res.status(409).json({
                    success: false,
                    message: 'Account is already verified, please login'
                });
            }

            // Check if OTP is expired
            if (developer.otpExpiresAt < new Date()) {
                return res.status(400).json({
                    success: false,
                    message: 'OTP has expired'
                });
            }

            // Check if OTP is correct
            if (developer.otp !== parseInt(otp)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid OTP'
                });
            }

            // Update developer status
            developer.isActive = true;
            await developer.save();

            return res.status(200).json({
                success: true,
                message: 'OTP verified successfully',
            });
        } catch (error) {
            logger.error(`Error verifying OTP: ${error}`);
            return res.status(500).json({
                success: false,
                message: "Internal server error"
            });
        }
    }

    /**
     * Resend OTP
     */
    public async resendOTP(req: Request, res: Response): Promise<Response> {
        try {
            const { email } = req.body;

            // Find developer by email
            const developer = await Developer.findOne({ email });
            if (!developer) {
                return res.status(404).json({
                    success: false,
                    message: 'Developer not found'
                });
            }

            // Check if developer is active
            if (developer.isActive) {
                return res.status(409).json({
                    success: false,
                    message: 'Account is already verified, please login'
                });
            }

            // Generate new OTP
            const otp = generateOTP();
            const otpExpiresAt = expireOTP(otp);

            // Update developer OTP
            developer.otp = otp;
            developer.otpExpiresAt = otpExpiresAt;
            await developer.save();

            // Send OTP email
            await EmailService.sendOTPEmail(developer.name, developer.email, otp.toString());

            return res.status(200).json({
                success: true,
                message: 'OTP resent successfully'
            });
        } catch (error) {
            logger.error(`Error resending OTP: ${error}`);
            return res.status(500).json({
                success: false,
                message: "Internal server error"
            });
        }
    }

    /**
     * Login developer
     */
    public async loginDeveloper(req: Request, res: Response): Promise<Response> {
        try {
            const { email, password } = req.body;

            // Find developer by email
            const developer = await Developer.findOne({ email });
            if (!developer) {
                return res.status(404).json({
                    success: false,
                    message: 'Developer not found'
                });
            }

            // Check if developer is active
            if (!developer.isActive) {
                return res.status(409).json({
                    success: false,
                    message: 'Account is not verified, please verify your account'
                });
            }

            // Check if password is correct
            if (!comparePassword(password, developer.password)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid credentials'
                });
            }

            // Generate JWT token
            const token = generateJWT({ id: developer._id });

            return res.status(200).json({
                success: true,
                message: 'Login successful',
                token,
                data: {
                    id: developer._id,
                    name: developer.name,
                    email: developer.email,
                    createdAt: developer.createdAt,
                }
            });
        } catch (error) {
            logger.error(`Error logging in developer: ${error}`);
            return res.status(500).json({
                success: false,
                message: "Internal server error"
            });
        }
    }

    /**
 * Get developer profile
 */
    public async getDeveloperProfile(req: Request, res: Response): Promise<Response> {
        try {
            // Get the authenticated user's ID from the request
            const userId = (req as any).user.id;

            // Find developer by ID
            const developer = await Developer.findById(userId)
                .select('-password -apiKey -otp -otpExpiresAt -__v');

            if (!developer) {
                return res.status(404).json({
                    success: false,
                    message: 'Developer not found'
                });
            }

            return res.status(200).json({
                success: true,
                message: 'Developer profile fetched successfully',
                data: {
                    id: developer._id,
                    name: developer.name,
                    email: developer.email,
                    createdAt: developer.createdAt,
                    isActive: developer.isActive
                }
            });
        } catch (error) {
            logger.error(`Error getting developer profile: ${error}`);
            return res.status(500).json({
                success: false,
                message: "Internal server error"
            });
        }
    }

    /**
     * Delete developer
     */
    public async deleteDeveloper(req: Request, res: Response): Promise<Response> {
        try {
            // Get the authenticated user's ID from the request
            const userId = (req as any).user.id;

            // Find developer by ID
            const developer = await Developer.findById(userId);
            if (!developer) {
                return res.status(404).json({
                    success: false,
                    message: 'Developer not found'
                });
            }

            // Delete developer
            await developer.deleteOne();

            await EmailService.sendAccountDeletedEmail(developer.name, developer.email);

            return res.status(200).json({
                success: true,
                message: 'Developer deleted successfully'
            });
        } catch (error) {
            logger.error(`Error deleting developer: ${error}`);
            return res.status(500).json({
                success: false,
                message: "Internal server error"
            });
        }
    }
}

export default new DeveloperController();