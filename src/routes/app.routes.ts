import { Router, RequestHandler } from "express";
import { authenticateDeveloper } from "../middlewares/auth.middleware.js";
import AppController from "../controllers/app.controller.js";

// Actual routes implementation
const router = Router();

router.post('/', authenticateDeveloper as RequestHandler, AppController.createApp as unknown as RequestHandler);
router.get('/', authenticateDeveloper as RequestHandler, AppController.getAllApps as unknown as RequestHandler);
router.get('/:appId', authenticateDeveloper as RequestHandler, AppController.getApp as unknown as RequestHandler);
router.put('/:appId', authenticateDeveloper as RequestHandler, AppController.updateApp as unknown as RequestHandler);
router.delete('/:appId', authenticateDeveloper as RequestHandler, AppController.deleteApp as unknown as RequestHandler);

export default router;