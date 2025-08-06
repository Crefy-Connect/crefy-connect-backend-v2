import { RequestHandler, Router } from "express";
import { checkWalletAuthenticated, validateApiKeyMiddleware, authenticateDeveloper } from "../middlewares/auth.middleware.js";
import ENSController from "../controllers/ens.controller.js";

const router = Router();
const controller = new ENSController();

// Developer-only routes
router.post(
    "/prepare-registrar",
    validateApiKeyMiddleware as RequestHandler,
    authenticateDeveloper as RequestHandler,
    controller.prepareCreateSubnameRegistrar.bind(controller) as unknown as RequestHandler
);

router.post(
    "/roots",
    validateApiKeyMiddleware as RequestHandler,
    authenticateDeveloper as RequestHandler,
    controller.registerRoot.bind(controller) as unknown as RequestHandler
);

router.get(
    "/name",
    validateApiKeyMiddleware as RequestHandler,
    controller.getENSName.bind(controller) as unknown as RequestHandler
);

// Wallet-authenticated routes
router.get(
    "/subnames/check-availability",
    validateApiKeyMiddleware as RequestHandler,
    checkWalletAuthenticated as RequestHandler,
    controller.checkAvailability.bind(controller) as unknown as RequestHandler
);

router.post(
    "/subnames/claim",
    validateApiKeyMiddleware as RequestHandler,
    checkWalletAuthenticated as RequestHandler,
    controller.claimSubname.bind(controller) as unknown as RequestHandler
);

// New NameWrapper transfer route
router.post(
    "/namewrapper/prepare-transfer",
    validateApiKeyMiddleware as RequestHandler,
    authenticateDeveloper as RequestHandler,
    controller.prepareNameWrapperTransfer.bind(controller) as unknown as RequestHandler
);

// update root status
router.post(
    "/roots/update-status",
    validateApiKeyMiddleware as RequestHandler,
    authenticateDeveloper as RequestHandler,
    controller.updateENSRootStatus.bind(controller) as unknown as RequestHandler
);

router.get(
    "/roots",
    validateApiKeyMiddleware as RequestHandler,
    authenticateDeveloper as RequestHandler,
    controller.getAllRoots.bind(controller) as unknown as RequestHandler
);

export default router;