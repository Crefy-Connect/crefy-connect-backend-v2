import { Router, RequestHandler, Request, Response, NextFunction } from 'express';
import SocialLoginsController from '../controllers/social.logins.controllers.js';
import { validateAppIdMiddleware, handleGoogleAuthSession, checkNotAuthenticated, validateApiKeyMiddleware } from '../middlewares/auth.middleware.js';
import passport from 'passport';
import { ResponseHandler } from '../utils/response.handler.js';
import SocketManager from '../services/socket.manager.js';

const router = Router();

// ********************************************************************************************************
// Email Wallet Social Login
// *****************************************************************************************************
router.post(
    '/email/email-login',
    validateApiKeyMiddleware as RequestHandler,
    checkNotAuthenticated as RequestHandler,
    SocialLoginsController.emailWalletLogin as unknown as RequestHandler
);

router.post(
    '/email/wallet-verify',
    validateApiKeyMiddleware as RequestHandler,
    SocialLoginsController.walletVerify as unknown as RequestHandler
);

router.post(
    '/email/resend-email-otp',
    validateApiKeyMiddleware as RequestHandler,
    SocialLoginsController.resendEmailOTP as unknown as RequestHandler
);

// ***************************************************************************************************** //
// Google OAuth
// ***************************************************************************************************** //

router.get(
    '/google/:appId/initiate-google-auth',
    handleGoogleAuthSession,
    passport.authenticate('google', {
        session: true,
        scope: ['profile', 'email'],
        prompt: 'select_account'
    })
);

// Enhanced Google OAuth callback handler
router.get('/google/callback',
    passport.authenticate('google', {
        session: true,
        failureRedirect: '/api/v1/oauth/google/failure'
    }),
    (req: Request, res: Response) => {
        console.log('Successful authentication, user:', req.user);
        res.json({ success: true, user: req.user });
    }
);

// Google OAuth failure handler
router.get('/google/failure', (req: Request, res: Response) => {
    const error = req.query.error || 'Authentication failed';
    const errorDescription = req.query.error_description || 'Unknown error occurred';

    ResponseHandler.error(res, {
        message: 'Google authentication failed',
        error,
        errorDescription
    }, 401);
});

// Test non-passport google Oauth
router.get('/loginwithgoogle', SocialLoginsController.loginWithGoogle as unknown as RequestHandler)

export default router;
