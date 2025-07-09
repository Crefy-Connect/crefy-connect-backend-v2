import { Request, Response } from "express";
import { Developer } from "../models/developer.models.js";
import { generateApiKey, generateOTP, expireOTP, hashPassword, comparePassword, generateJWT, validateEmail } from "../utils/auth.js";
import logger from "../utils/logger.js";
import { mongodb_config } from "../config/index.js";
import EmailService from "../services/email.service.js";
import { HttpStatus } from "../utils/httpStatus.js";

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
     * Forgot password with enail by sending a link with verifi
     */
    public async forgotPassword(req: Request, res: Response) {
        try {
            const { email } = req.body;

            // Find developer by email
            if (!email) {
                return res.status(HttpStatus.BAD_REQUEST).json({
                    status: 'error',
                    error: 'EMAIL_REQUIRED',
                    message: 'Email address is required'
                });
            }

            const developer = await Developer.findOne({ email });
            if (!developer) {
                return res.status(HttpStatus.NOT_FOUND).json({
                    status: 'error',
                    error: 'DEVELOPER_NOT_FOUND',
                    message: 'Developer not found'
                });
            }

            // Generate reset token (using JWT in this example)
            const resetToken = generateJWT({ developerId: developer._id });
            const resetExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 1 day expiry
            logger.info(`Reset expiry: c${resetExpiry}`, Date.now());

            // Update developer with reset token and expiry
            developer.passwordResetToken = resetToken;
            developer.passwordResetExpires = resetExpiry;
            await developer.save();

            // Send reset email
            const isEmailSent = await EmailService.sendPasswordResetEmail(developer.name, developer.email, resetToken);
            if (!isEmailSent) {
                return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                    status: 'error',
                    error: 'EMAIL_SEND_FAILED',
                    message: 'Failed to send password reset email'
                });
            }

            return res.status(HttpStatus.OK).json({
                status: 'success',
                message: 'Password reset email sent successfully'
            });
        } catch (error: any) {
            logger.error(`Error sending forgot password email: ${error}`);
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                status: 'error',
                error: 'INTERNAL_SERVER_ERROR',
                message: 'An error occurred while sending the forgot password email'
            });
        }
    }


    /**
    * Verify password reset token
    * @param req 
    * @param res 
    * @returns 
    */
    static async verifyResetToken(req: Request, res: Response) {
        try {
            const { token } = req.query;
            const decodedToken = decodeURIComponent(token as string);

            if (!token) {
                return res.status(HttpStatus.BAD_REQUEST).json({
                    status: 'error',
                    error: 'TOKEN_REQUIRED',
                    message: 'Reset token is required'
                });
            }

            const developer = await Developer.findOne({ passwordResetToken: decodedToken });
            if (!developer) {
                return res.status(HttpStatus.UNAUTHORIZED).json({
                    status: 'error',
                    error: 'INVALID_TOKEN',
                    message: 'Invalid or expired reset token'
                });
            }

            res.status(HttpStatus.OK).json({
                status: 'success',
                message: 'Reset token is valid'
            });
        } catch (error: any) {
            logger.error('Error in verifyResetToken:', error);
            res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                status: 'error',
                error: 'SERVER_ERROR',
                message: 'An error occurred while verifying reset token'
            });
        }
    }

    /**
     * Reset password using valid token
     * @param req 
     * @param res 
     * @returns 
     */
    static async resetPassword(req: Request, res: Response) {
        try {
            const { token, newPassword } = req.body;
            const decodedToken = decodeURIComponent(token as string);

            if (!token || !newPassword) {
                return res.status(HttpStatus.BAD_REQUEST).json({
                    status: 'error',
                    error: 'MISSING_FIELDS',
                    message: 'Reset token and new password are required'
                });
            }

            const developer = await Developer.findOne({ passwordResetToken: decodedToken });
            if (!developer) {
                return res.status(HttpStatus.UNAUTHORIZED).json({
                    status: 'error',
                    error: 'INVALID_TOKEN',
                    message: 'Invalid or expired reset token'
                });
            }

            // Check if reset token has expired
            if (developer.passwordResetExpires && developer.passwordResetExpires < new Date()) {
                return res.status(HttpStatus.UNAUTHORIZED).json({
                    status: 'error',
                    error: 'EXPIRED_TOKEN',
                    message: 'Reset token has expired'
                });
            }

            // Hash new password
            const hashedPassword = hashPassword(newPassword);

            // Update developer password
            developer.password = hashedPassword;
            developer.passwordResetToken = undefined;
            developer.passwordResetExpires = undefined;
            await developer.save();

            return res.status(HttpStatus.OK).json({
                status: 'success',
                message: 'Password reset successfully'
            });
        } catch (error: any) {
            logger.error('Error in resetPassword:', error);
            res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                status: 'error',
                error: 'SERVER_ERROR',
                message: 'An error occurred while resetting password'
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

export { DeveloperController };
export default new DeveloperController();