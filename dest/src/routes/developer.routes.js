import { Router } from "express";
import developerController, { DeveloperController } from "../controllers/developer.controller.js";
import { authenticateDeveloper } from "../middlewares/auth.middleware.js";
const router = Router();
/**
 * Developer Management Routes
 *
 * All routes follow RESTful conventions and include proper error handling
 * Protected routes require valid JWT in Authorization header
 */
router.post('/register', developerController.registerDeveloper);
router.post('/verify-otp', developerController.verifyOTP);
router.post('/resend-otp', developerController.resendOTP);
router.post('/login', developerController.loginDeveloper);
router.post('/forgot-password', developerController.forgotPassword);
router.get('/verify-reset-token', DeveloperController.verifyResetToken);
router.post('/reset-password', DeveloperController.resetPassword);
router.get('/profile', authenticateDeveloper, developerController.getDeveloperProfile);
router.delete('/', authenticateDeveloper, developerController.deleteDeveloper);
export default router;
