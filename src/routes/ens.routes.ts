// ens.routes.ts
import { RequestHandler, Router } from "express";
import { checkWalletAuthenticated, validateApiKeyMiddleware } from "../middlewares/auth.middleware.js";
import ENSController from "../controllers/ens.controller.js"; // Updated import

const router = Router();
const controller = new ENSController();

// Register ENS Root
router.post(
    "/roots",
    validateApiKeyMiddleware as RequestHandler,
    checkWalletAuthenticated as RequestHandler,
    controller.registerRoot.bind(controller) as unknown as RequestHandler
);

router.get(
    "/subnames/check-availability",
    validateApiKeyMiddleware as RequestHandler,
    checkWalletAuthenticated as RequestHandler,
    controller.checkAvailability.bind(controller) as unknown as RequestHandler
);


export default router;