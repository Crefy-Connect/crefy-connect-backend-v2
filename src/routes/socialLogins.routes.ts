import {
  Router,
  RequestHandler,
  Request,
  Response,
  NextFunction,
} from "express";
import SocialLoginsController from "../controllers/social.logins.controllers.js";
import {
  validateAppIdMiddleware,
  handleGoogleAuthSession,
  checkNotAuthenticated,
  validateApiKeyMiddleware,
} from "../middlewares/auth.middleware.js";
import passport from "passport";
import { ResponseHandler } from "../utils/response.handler.js";
import SocketManager from "../services/socket.manager.js";

const router = Router();
const socketManager = SocketManager.getInstance();

// ********************************************************************************************************
// Email Wallet Social Login
// *****************************************************************************************************
router.post(
  "/email/email-login",
  validateApiKeyMiddleware as RequestHandler,
  checkNotAuthenticated as RequestHandler,
  SocialLoginsController.emailWalletLogin as unknown as RequestHandler
);

router.post(
  "/email/wallet-verify",
  validateApiKeyMiddleware as RequestHandler,
  SocialLoginsController.walletVerify as unknown as RequestHandler
);

router.post(
  "/email/resend-email-otp",
  validateApiKeyMiddleware as RequestHandler,
  SocialLoginsController.resendEmailOTP as unknown as RequestHandler
);

// ***************************************************************************************************** //
// Google OAuth
// ***************************************************************************************************** //

router.get(
  "/google/:appId/initiate-google-auth",
  handleGoogleAuthSession,
  (req: Request, res: Response, next: NextFunction) => {
    // Store session ID for socket communication
    if (req.session) {
      (req.session as any).socketAuthId =
        (req.query.socketAuthId as string) || `auth-${Date.now()}`;
    }
    next();
  },
  passport.authenticate("google", {
    session: true,
    scope: ["profile", "email"],
    prompt: "select_account",
  })
);

// Enhanced Google OAuth callback handler with socket integration
router.get(
  "/google/callback",
  passport.authenticate("google", {
    session: true,
    failureRedirect: "/api/v1/oauth/google/failure",
  }),
  (req: Request, res: Response) => {
    console.log("Successful authentication, user:", req.user);

    // Send real-time success notification via socket
    if (req.session?.socketAuthId) {
      const successData = {
        status: "success",
        user: req.user,
        timestamp: new Date().toISOString(),
      };

      const emitted = socketManager.emitToSession(
        req.session.socketAuthId,
        "auth-success",
        successData
      );

      if (emitted) {
        console.log(
          `Auth success sent via socket for session: ${req.session.socketAuthId}`
        );
      }
    }

    // For direct browser requests, redirect to success page
    if (req.headers.accept?.includes("text/html")) {
      return res.redirect("/auth/success");
    }

    // For API requests, return JSON response
    res.json({
      success: true,
      user: req.user,
      socketNotified: !!req.session?.socketAuthId,
    });
  }
);

// Google OAuth failure handler with socket integration
router.get("/google/failure", (req: Request, res: Response) => {
  const error = req.query.error || "Authentication failed";
  const errorDescription =
    req.query.error_description || "Unknown error occurred";

  // Send real-time failure notification via socket
  if (req.session?.socketAuthId) {
    const failureData = {
      status: "error",
      error,
      errorDescription,
      timestamp: new Date().toISOString(),
    };

    const emitted = socketManager.emitToSession(
      req.session.socketAuthId,
      "auth-error",
      failureData
    );

    if (emitted) {
      console.log(
        `Auth failure sent via socket for session: ${req.session.socketAuthId}`
      );
    }
  }

  // For direct browser requests, redirect to failure page
  if (req.headers.accept?.includes("text/html")) {
    return res.redirect("/auth/error");
  }

  // For API requests, return error response
  ResponseHandler.error(
    res,
    {
      message: "Google authentication failed",
      error,
      errorDescription,
      socketNotified: !!req.session?.socketAuthId,
    },
    401
  );
});

// Additional endpoint to check auth status via socket
router.get(
  "/google/auth-status/:socketAuthId",
  (req: Request, res: Response) => {
    const { socketAuthId } = req.params;

    // This endpoint can be polled by clients waiting for socket notifications
    res.json({
      status: "waiting",
      socketAuthId,
      message: "Listening for socket authentication events",
    });
  }
);

export default router;
