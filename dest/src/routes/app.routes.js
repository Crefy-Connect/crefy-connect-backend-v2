import { Router } from "express";
import { authenticateDeveloper } from "../middlewares/auth.middleware.js";
import AppController from "../controllers/app.controller.js";
// Actual routes implementation
const router = Router();
router.post('/', authenticateDeveloper, AppController.createApp);
router.get('/', authenticateDeveloper, AppController.getAllApps);
router.get('/:appId', authenticateDeveloper, AppController.getApp);
router.put('/:appId', authenticateDeveloper, AppController.updateApp);
router.delete('/:appId', authenticateDeveloper, AppController.deleteApp);
export default router;
