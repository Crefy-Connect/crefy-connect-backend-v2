// Change the routes file to:
import express, { RequestHandler } from 'express';
import smsLoginController from '../controllers/sms.login.controller.js';
import { validateAppIdMiddleware, checkNotAuthenticated, validateApiKeyMiddleware } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.post('/login',
    validateApiKeyMiddleware as RequestHandler,
    checkNotAuthenticated as RequestHandler,
    smsLoginController.smsWalletLogin.bind(smsLoginController) as unknown as RequestHandler
);
router.post('/verify',
    validateApiKeyMiddleware as RequestHandler,
    checkNotAuthenticated as RequestHandler,
    smsLoginController.walletVerify.bind(smsLoginController) as unknown as RequestHandler
);

router.post('/resend-otp',
    validateApiKeyMiddleware as RequestHandler,
    checkNotAuthenticated as RequestHandler,
    smsLoginController.resendSmsOTP.bind(smsLoginController) as unknown as RequestHandler
);

export default router;