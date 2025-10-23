import { RequestHandler, Router } from "express";
import BalanceController from "../controllers/balance.controller.js";
import {
  checkWalletAuthenticated,
  validateApiKeyMiddleware,
} from "../middlewares/auth.middleware.js";

const router = Router();

// Get balances for authenticated user (uses wallet from middleware)
router.get(
  "/my/balances",
  checkWalletAuthenticated as RequestHandler,
  BalanceController.getMyBalances as unknown as RequestHandler
);

// Get specific network balance for authenticated user
router.get(
  "/my/network/:network/balance",
  checkWalletAuthenticated as RequestHandler,
  BalanceController.getNetworkBalance as unknown as RequestHandler
);

// Get balances for specific wallet address (admin/developer endpoint)
router.get(
  "/wallet/:walletAddress/balances",
  validateApiKeyMiddleware as RequestHandler,
  BalanceController.getWalletBalancesByAddress as unknown as RequestHandler
);

// Get specific network balance for wallet address (admin/developer endpoint)
router.get(
  "/wallet/:walletAddress/network/:network/balance",
  validateApiKeyMiddleware as RequestHandler,
  BalanceController.getNetworkBalance as unknown as RequestHandler
);

export default router;
