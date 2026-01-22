// auth.routes.ts
import { Router } from "express";
import AuthController from "../controllers/auth.controllet.js";
import { checkWalletAuthenticated, validateApiKeyMiddleware, } from "../middlewares/auth.middleware.js";
const router = Router();
// Public routes
router.get("/validate-token", AuthController.validateToken);
router.get("/wallet-by-token", AuthController.getWalletByToken);
// Protected wallet routes
router.get("/wallet-info", checkWalletAuthenticated, AuthController.getWalletInfo);
router.post("/logout", checkWalletAuthenticated, AuthController.logout);
// Developer-only routes (for app management)
router.get("/app/wallets", validateApiKeyMiddleware, AuthController.getWalletsByApp);
export default router;
