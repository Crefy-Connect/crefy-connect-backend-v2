// Change the routes file to:
import express from 'express';
import smsLoginController from '../controllers/sms.login.controller.js';
import { checkNotAuthenticated, validateApiKeyMiddleware } from '../middlewares/auth.middleware.js';
const router = express.Router();
router.post('/login', validateApiKeyMiddleware, checkNotAuthenticated, smsLoginController.smsWalletLogin.bind(smsLoginController));
router.post('/verify', validateApiKeyMiddleware, checkNotAuthenticated, smsLoginController.walletVerify.bind(smsLoginController));
router.post('/resend-otp', validateApiKeyMiddleware, checkNotAuthenticated, smsLoginController.resendSmsOTP.bind(smsLoginController));
export default router;
