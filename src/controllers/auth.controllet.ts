import { Request, Response } from "express";
import { Wallet } from "../models/wallet.models.js";
import logger from "../utils/logger.js";
import { verifyJWT } from "../utils/auth.js";
import { ApiError } from "../utils/apiError.js";
import { ENSRoot } from "../models/ensroot.models.js";

interface IWallet {
  email: string;
  address: string;
  publicKey: string;
  encryptedPrivateKey: string;
  encryptionSalt: string;
  appId: string;
  userData: string;
  otp?: string;
  otpExpiry?: Date;
  isActive: boolean;
  socialType: string;
}

interface AuthenticatedRequest extends Request {
  wallet?: IWallet;
  developer_app?: any;
}

class AuthController {
  /**
   * Get current authenticated wallet info
   * @param req - AuthenticatedRequest with wallet attached from middleware
   * @param res - Response object
   * @returns - Wallet information
   */
  public async getWalletInfo(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<Response> {
    logger.info(`Get wallet info request received`);
    try {
      // Get wallet from middleware (already authenticated)
      const wallet = (req as any).wallet;

      if (!wallet) {
        throw new ApiError(401, "Wallet not authenticated");
      }

      const ensRoot = await ENSRoot.findOne({ ownerAppId: wallet.appId });

      // Return wallet info (excluding sensitive data)
      return res.status(200).json({
        success: true,
        message: "Wallet info retrieved successfully",
        data: {
          walletAddress: wallet.address,
          publicKey: wallet.publicKey,
          email: wallet.email,
          socialType: wallet.socialType,
          userData: wallet.userData ? JSON.parse(wallet.userData) : null,
          isActive: wallet.isActive,
          appId: wallet.appId,
          ensSubname:
            wallet.subname && ensRoot && ensRoot.ens_name
              ? wallet.subname + "." + ensRoot.ens_name
              : null,
        },
      });
    } catch (error) {
      logger.error(`Error in getWalletInfo: ${error}`);

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
   * Get wallet info by token (alternative endpoint)
   * @param req - Request object with Authorization header
   * @param res - Response object
   * @returns - Wallet information
   */
  public async getWalletByToken(
    req: Request,
    res: Response
  ): Promise<Response> {
    logger.info(`Get wallet by token request received`);
    try {
      const token = req.headers["authorization"]?.split(" ")[1];
      console.log("TOKEN: ", token);

      if (!token) {
        throw new ApiError(401, "Authorization token required");
      }

      // Verify JWT token
      const decoded = verifyJWT(token) as { address: string };
      console.log("DECODED: ", decoded);

      if (!decoded?.address) {
        throw new ApiError(401, "Invalid token payload");
      }

      // Find wallet by address
      const wallet = await Wallet.findOne({
        address: decoded.address,
        isActive: true,
      });

      if (!wallet) {
        throw new ApiError(404, "Wallet not found or inactive");
      }

      // Return wallet info (excluding sensitive data)
      return res.status(200).json({
        success: true,
        message: "Wallet info retrieved successfully",
        data: {
          walletAddress: wallet.address,
          publicKey: wallet.publicKey,
          email: wallet.email,
          socialType: wallet.socialType,
          userData: wallet.userData ? JSON.parse(wallet.userData) : null,
          isActive: wallet.isActive,
          appId: wallet.appId,
        },
      });
    } catch (error) {
      logger.error(`Error in getWalletByToken: ${error}`);

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
   * Validate token and return basic wallet status
   * @param req - Request object
   * @param res - Response object
   * @returns - Token validation result
   */
  public async validateToken(req: Request, res: Response): Promise<Response> {
    logger.info(`Token validation request received`);
    try {
      const token = req.headers["authorization"]?.split(" ")[1];

      if (!token) {
        throw new ApiError(401, "Authorization token required");
      }

      // Verify JWT token
      const decoded = verifyJWT(token) as { address: string };

      console.log("DECODED: ", decoded);
      if (!decoded?.address) {
        throw new ApiError(401, "Invalid token");
      }

      // Check if wallet exists and is active
      const wallet = await Wallet.findOne({
        address: decoded.address,
        isActive: true,
      });

      if (!wallet) {
        throw new ApiError(404, "Wallet not found or inactive");
      }

      return res.status(200).json({
        success: true,
        message: "Token is valid",
        data: {
          isValid: true,
          walletAddress: wallet.address,
          isActive: wallet.isActive,
        },
      });
    } catch (error) {
      logger.error(`Error in validateToken: ${error}`);

      if (error instanceof ApiError) {
        return res.status(error.statusCode).json({
          success: false,
          message: error.message,
          data: {
            isValid: false,
          },
        });
      }

      return res.status(500).json({
        success: false,
        message: "Internal server error",
        data: {
          isValid: false,
        },
      });
    }
  }

  /**
   * Get multiple wallets by app (for developers)
   * @param req - AuthenticatedRequest with developer_app
   * @param res - Response object
   * @returns - List of wallets for the app
   */
  public async getWalletsByApp(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<Response> {
    logger.info(`Get wallets by app request received`);
    try {
      const app = (req as any).developer_app;

      if (!app) {
        throw new ApiError(401, "App authentication required");
      }

      // Get query parameters for pagination
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const skip = (page - 1) * limit;

      // Find wallets for this app
      const wallets = await Wallet.find({
        appId: app.appId,
        isActive: true,
      })
        .select("-encryptedPrivateKey -encryptionSalt -otp -otpExpiry")
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 });

      const total = await Wallet.countDocuments({
        appId: app.appId,
        isActive: true,
      });

      // Parse userData for each wallet
      const walletsWithParsedData = wallets.map((wallet) => ({
        ...wallet.toObject(),
        userData: wallet.userData ? JSON.parse(wallet.userData) : null,
      }));

      return res.status(200).json({
        success: true,
        message: "Wallets retrieved successfully",
        data: {
          wallets: walletsWithParsedData,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
          },
        },
      });
    } catch (error) {
      logger.error(`Error in getWalletsByApp: ${error}`);

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
   * Logout endpoint (client-side token invalidation)
   * @param req - Request object
   * @param res - Response object
   * @returns - Logout confirmation
   */
  public async logout(req: Request, res: Response): Promise<Response> {
    logger.info(`Logout request received`);
    try {
      // Note: Since we're using stateless JWT, actual invalidation
      // would require a token blacklist. This just confirms logout.

      return res.status(200).json({
        success: true,
        message: "Logout successful. Please discard your token client-side.",
      });
    } catch (error) {
      logger.error(`Error in logout: ${error}`);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
}

export default new AuthController();
