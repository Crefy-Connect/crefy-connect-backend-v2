import { Router } from "express";
import { checkWalletAuthenticated, validateApiKeyMiddleware, authenticateDeveloper, } from "../middlewares/auth.middleware.js";
import ENSController from "../controllers/ens.controller.js";
const router = Router();
const controller = new ENSController();
// Developer-only routes
router.post("/prepare-registrar", validateApiKeyMiddleware, authenticateDeveloper, controller.prepareCreateSubnameRegistrar.bind(controller));
router.post("/roots", validateApiKeyMiddleware, authenticateDeveloper, controller.registerRoot.bind(controller));
router.get("/name", validateApiKeyMiddleware, controller.getENSName.bind(controller));
// Wallet-authenticated routes
router.get("/subnames/check-availability", validateApiKeyMiddleware, checkWalletAuthenticated, controller.checkAvailability.bind(controller));
router.post("/subnames/claim", validateApiKeyMiddleware, checkWalletAuthenticated, controller.claimSubname.bind(controller));
// NameWrapper transfer route (Developer-only)
router.post("/namewrapper/prepare-transfer", validateApiKeyMiddleware, authenticateDeveloper, controller.prepareNameWrapperTransfer.bind(controller));
// Update root status (Developer-only)
router.post("/roots/update-status", validateApiKeyMiddleware, authenticateDeveloper, controller.updateENSRootStatus.bind(controller));
// Get all roots (Developer-only)
router.get("/roots", validateApiKeyMiddleware, authenticateDeveloper, controller.getAllRoots.bind(controller));
// New Resolver routes (Public read, Developer write)
router.get("/resolver/address", validateApiKeyMiddleware, controller.getResolverAddress.bind(controller));
router.post("/resolver/set-address", validateApiKeyMiddleware, authenticateDeveloper, controller.prepareSetResolverAddress.bind(controller));
// New Claimed Names routes (Developer-only)
router.get("/claimed-names", validateApiKeyMiddleware, authenticateDeveloper, controller.getClaimedNames.bind(controller));
router.get("/claimed-names/:walletAddress", validateApiKeyMiddleware, authenticateDeveloper, controller.getClaimedNameByWallet.bind(controller));
export default router;
