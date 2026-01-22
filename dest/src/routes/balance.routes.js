import { Router } from "express";
import BalanceController from "../controllers/balance.controller.js";
import { checkWalletAuthenticated, validateApiKeyMiddleware, } from "../middlewares/auth.middleware.js";
const router = Router();
// Get balances for authenticated user (uses wallet from middleware)
router.get("/my/balances", checkWalletAuthenticated, BalanceController.getMyBalances);
// Get specific network balance for authenticated user
router.get("/my/network/:network/balance", checkWalletAuthenticated, BalanceController.getNetworkBalance);
// Get balances for specific wallet address (admin/developer endpoint)
router.get("/wallet/:walletAddress/balances", validateApiKeyMiddleware, BalanceController.getWalletBalancesByAddress);
// Get specific network balance for wallet address (admin/developer endpoint)
router.get("/wallet/:walletAddress/network/:network/balance", validateApiKeyMiddleware, BalanceController.getNetworkBalance);
export default router;
