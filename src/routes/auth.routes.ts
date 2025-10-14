// auth.routes.ts
import { Router, Request, Response } from "express";
import { RequestHandler } from "express";
import AuthController from "../controllers/auth.controllet.js";
import {
  checkWalletAuthenticated,
  validateApiKeyMiddleware,
  authenticateDeveloper,
} from "../middlewares/auth.middleware.js";

const router = Router();

// Public routes
router.get(
  "/validate-token",
  AuthController.validateToken as unknown as RequestHandler
);
router.get(
  "/wallet-by-token",
  AuthController.getWalletByToken as unknown as RequestHandler
);

// Protected wallet routes
router.get(
  "/wallet-info",
  checkWalletAuthenticated as RequestHandler,
  AuthController.getWalletInfo as unknown as RequestHandler
);
router.post(
  "/logout",
  checkWalletAuthenticated as RequestHandler,
  AuthController.logout as unknown as RequestHandler
);

// Developer-only routes (for app management)
router.get(
  "/app/wallets",
  validateApiKeyMiddleware as RequestHandler,
  AuthController.getWalletsByApp as unknown as RequestHandler
);

export default router;
