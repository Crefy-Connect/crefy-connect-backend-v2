import { Request, Response } from "express";
import { Wallet } from "../models/wallet.models.js";
import BalanceService from "../services/balance.service.js";
import logger from "../utils/logger.js";
import { ApiError } from "../utils/apiError.js";

class BalanceController {
  /**
   * Get wallet balances for all supported networks
   * Now uses authenticated wallet from middleware
   */
  public async getWalletBalances(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const app = (req as any).developer_app;
      const wallet = (req as any).wallet;

      // Use the authenticated wallet from middleware
      const walletAddress = wallet.address;

      // Verify the wallet belongs to the current app
      if (wallet.appId !== app.appId) {
        throw new ApiError(403, "Wallet does not belong to this application");
      }

      // Get all balances
      const balances = await BalanceService.getAllBalances(walletAddress);

      return res.status(200).json({
        success: true,
        message: "Balances fetched successfully",
        data: {
          walletAddress,
          balances,
        },
      });
    } catch (error) {
      logger.error(`Error in getWalletBalances: ${error}`);
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
   * Get balances for authenticated user
   * Simplified since wallet is already authenticated
   */
  public async getMyBalances(req: Request, res: Response): Promise<Response> {
    try {
      const wallet = (req as any).wallet;
      const walletAddress = wallet.address;

      // Get all balances
      const balances = await BalanceService.getAllBalances(walletAddress);

      return res.status(200).json({
        success: true,
        message: "Balances fetched successfully",
        data: {
          walletAddress,
          balances,
        },
      });
    } catch (error) {
      logger.error(`Error in getMyBalances: ${error}`);
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
   * Get specific network balance for authenticated user
   */
  public async getNetworkBalance(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const wallet = (req as any).wallet;
      const { network } = req.params;
      const { token, tokenAddress } = req.query;

      const walletAddress = wallet.address;

      if (!network) {
        throw new ApiError(400, "Network is required");
      }

      let balance;
      if (token === "usdt") {
        balance = await BalanceService.getUSDTBalance(walletAddress, network);
      } else if (tokenAddress && typeof tokenAddress === "string") {
        balance = await BalanceService.getTokenBalance(
          walletAddress,
          network,
          tokenAddress
        );
      } else {
        balance = await BalanceService.getNativeBalance(walletAddress, network);
      }

      return res.status(200).json({
        success: true,
        message: "Balance fetched successfully",
        data: {
          walletAddress,
          network,
          balance,
        },
      });
    } catch (error) {
      logger.error(`Error in getNetworkBalance: ${error}`);
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
   * Get balances for specific wallet address (admin/developer only)
   * Requires app authentication and wallet belongs to the app
   */
  public async getWalletBalancesByAddress(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const app = (req as any).developer_app;
      const { walletAddress } = req.params;

      // Validate wallet address
      if (!walletAddress) {
        throw new ApiError(400, "Wallet address is required");
      }

      // Check if wallet exists and belongs to the app
      const wallet = await Wallet.findOne({
        address: walletAddress,
        appId: app.appId,
      });

      if (!wallet) {
        throw new ApiError(404, "Wallet not found for this application");
      }

      // Get all balances
      const balances = await BalanceService.getAllBalances(walletAddress);

      return res.status(200).json({
        success: true,
        message: "Balances fetched successfully",
        data: {
          walletAddress,
          balances,
        },
      });
    } catch (error) {
      logger.error(`Error in getWalletBalancesByAddress: ${error}`);
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
   * NEW: Get token balance for any ERC20 token
   */
  public async getTokenBalance(req: Request, res: Response): Promise<Response> {
    try {
      const wallet = (req as any).wallet;
      const { network, tokenAddress } = req.params;

      const walletAddress = wallet.address;

      if (!network || !tokenAddress) {
        throw new ApiError(400, "Network and token address are required");
      }

      const balance = await BalanceService.getTokenBalance(
        walletAddress,
        network,
        tokenAddress
      );

      return res.status(200).json({
        success: true,
        message: "Token balance fetched successfully",
        data: {
          walletAddress,
          network,
          tokenAddress,
          balance,
        },
      });
    } catch (error) {
      logger.error(`Error in getTokenBalance: ${error}`);
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
}

export default new BalanceController();
