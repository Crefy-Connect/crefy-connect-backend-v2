import { Router, RequestHandler } from "express";
import developerController, { DeveloperController } from "../controllers/developer.controller.js";
import { authenticateDeveloper } from "../middlewares/auth.middleware.js";

const router = Router();

/**
 * Developer Management Routes
 * 
 * All routes follow RESTful conventions and include proper error handling
 * Protected routes require valid JWT in Authorization header
 */
router.post('/register', developerController.registerDeveloper as unknown as RequestHandler);
router.post('/verify-otp', developerController.verifyOTP as unknown as RequestHandler);
router.post('/resend-otp', developerController.resendOTP as unknown as RequestHandler);
router.post('/login', developerController.loginDeveloper as unknown as RequestHandler);
router.post('/forgot-password', developerController.forgotPassword as unknown as RequestHandler);
router.get('/verify-reset-token', DeveloperController.verifyResetToken as unknown as RequestHandler);
router.post('/reset-password', DeveloperController.resetPassword as unknown as RequestHandler);


router.get('/profile', authenticateDeveloper as RequestHandler, developerController.getDeveloperProfile as unknown as RequestHandler);
router.delete('/', authenticateDeveloper as RequestHandler, developerController.deleteDeveloper as unknown as RequestHandler);

export default router;