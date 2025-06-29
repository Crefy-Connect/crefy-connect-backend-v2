import { Router, RequestHandler, Request, Response, NextFunction } from 'express';
import SocialLoginsController from '../controllers/social.logins.controllers.js';
import { validateAppIdMiddleware, handleGoogleAuthSession } from '../middlewares/auth.middleware.js';
import passport from 'passport';
import { ResponseHandler } from '../utils/response.handler.js';

const router = Router();

// ********************************************************************************************************
// Email Wallet Social Login
// *****************************************************************************************************
router.post(
    '/email/:appId/email-login',
    validateAppIdMiddleware as RequestHandler,
    SocialLoginsController.emailWalletLogin as unknown as RequestHandler
);

router.post(
    '/email/:appId/wallet-verify',
    validateAppIdMiddleware as RequestHandler,
    SocialLoginsController.walletVerify as unknown as RequestHandler
);

router.post(
    '/email/:appId/resend-email-otp',
    validateAppIdMiddleware as RequestHandler,
    SocialLoginsController.resendEmailOTP as unknown as RequestHandler
);

// ***************************************************************************************************** //
// Google OAuth
// ***************************************************************************************************** //

router.get(
    '/google/:appId/initiate-google-auth',
    validateAppIdMiddleware as RequestHandler,
    handleGoogleAuthSession,
    passport.authenticate('google', {
        session: false,
        scope: ['profile', 'email'],
        prompt: 'select_account'
    })
);

// Enhanced Google OAuth callback handler
router.get('/google/callback',
    passport.authenticate('google', {
        session: false,
        failureRedirect: '/api/v1/oauth/google/failure'
    }),
    (req: Request, res: Response, next: NextFunction) => {
        try {
            const wallet = req.user as any;
            const sessionId = req.query.state as string;

            ResponseHandler.success(res, {
                message: 'Google authentication successful',
                wallet: {
                    address: wallet.address,
                    email: wallet.email,
                    publicKey: wallet.publicKey
                },
                sessionId
            });
        } catch (error) {
            next(error); // Proper error handling
        }
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

export default router;