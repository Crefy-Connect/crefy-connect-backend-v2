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
import crypto from "crypto";
import { generateState, parseState } from "../config/passport.config.js";
import { server_config } from "src/config/index.js";

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

// Enhanced Google OAuth initiation - FIXED VERSION
// Enhanced Google OAuth initiation - COMPLETELY MANUAL STATE MANAGEMENT
router.get(
  "/google/:appId/initiate-google-auth",
  handleGoogleAuthSession,
  (req: Request, res: Response, next: NextFunction) => {
    console.log("Initiating Google OAuth flow");

    const socketAuthId =
      (req.query.socketAuthId as string) ||
      `auth-${Date.now()}-${crypto.randomBytes(8).toString("hex")}`;

    // Enhanced session setup
    if (req.session) {
      (req.session as any).socketAuthId = socketAuthId;
      (req.session as any).appId = req.params.appId;
      console.log("Setting socketAuthId in session:", socketAuthId);
    }

    // Generate state parameter
    const stateParams = {
      sessionId: crypto.randomUUID(),
      frontendOrigin:
        req.headers.origin || "https://mutually-factual-weevil.ngrok-free.app",
      appId: req.params.appId,
      socketAuthId: socketAuthId,
      timestamp: Date.now(),
    };

    const state = generateState(stateParams);

    // Store state in session for verification
    if (req.session) {
      (req.session as any).oauthState = state;
      console.log("Stored oauthState in session:", state);
    }

    // Immediately notify frontend that auth was initiated
    socketManager.emitToSession(socketAuthId, "google-auth-initiated", {
      message: "Google auth initiated",
      socketAuthId: socketAuthId,
      state: state,
    });

    console.log("Generated state parameter:", state);

    // Build the Google OAuth URL manually to bypass Passport's state handling
    const googleAuthUrl = new URL(
      "https://accounts.google.com/o/oauth2/v2/auth"
    );
    googleAuthUrl.searchParams.set("client_id", process.env.GOOGLE_CLIENT_ID!);
    googleAuthUrl.searchParams.set(
      "redirect_uri",
      new URL("/api/v1/oauth/google/callback", server_config.baseUrl).toString()
    );
    googleAuthUrl.searchParams.set("response_type", "code");
    googleAuthUrl.searchParams.set("scope", "profile email");
    googleAuthUrl.searchParams.set("prompt", "select_account");
    googleAuthUrl.searchParams.set("state", state); // Use our custom state
    googleAuthUrl.searchParams.set("access_type", "offline");

    console.log("Redirecting to Google OAuth URL:", googleAuthUrl.toString());

    res.redirect(googleAuthUrl.toString());
  }
);

// Enhanced Google OAuth callback with state verification - FIXED TYPE
router.get("/google/callback", (async (req: Request, res: Response) => {
  console.log("🔐 Google OAuth callback initiated");

  // STATE VERIFICATION - Check if state matches
  const receivedState = req.query.state as string;
  const sessionState = (req.session as any)?.oauthState;
  const authCode = req.query.code as string;

  if (!receivedState || !sessionState || receivedState !== sessionState) {
    console.error("❌ State parameter mismatch or missing");

    let socketAuthId = null;
    if (receivedState) {
      try {
        const stateObj = parseState(receivedState);
        socketAuthId = stateObj.socketAuthId;
      } catch (error) {
        console.error("Error parsing state for socketAuthId:", error);
      }
    }

    // Emit error via socket
    if (socketAuthId) {
      socketManager.emitToSession(socketAuthId, "auth-error", {
        status: "error",
        error: "Authentication failed",
        errorDescription: "Security verification failed. Please try again.",
        timestamp: new Date().toISOString(),
      });
    }

    return res.redirect("/api/v1/oauth/google/failure");
  }

  if (!authCode) {
    console.error("❌ No authorization code received");
    return handleAuthFailure(req, res, "No authorization code received");
  }

  let socketAuthId = null;

  // Get socketAuthId from state parameter
  if (receivedState) {
    try {
      const stateObj = parseState(receivedState);
      socketAuthId = stateObj.socketAuthId;
      console.log("Retrieved socketAuthId from state:", socketAuthId);
    } catch (error) {
      console.error("Error decoding state:", error);
    }
  }

  // Clear the state from session after use (security best practice)
  if (req.session) {
    (req.session as any).oauthState = null;
  }

  try {
    console.log("🔄 Exchanging authorization code for access token...");

    // Manually exchange the authorization code for tokens
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        code: authCode,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: new URL(
          "/api/v1/oauth/google/callback",
          server_config.baseUrl
        ).toString(),
        grant_type: "authorization_code",
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error("❌ Token exchange failed:", errorText);
      throw new Error(`Token exchange failed: ${tokenResponse.status}`);
    }

    const tokens = await tokenResponse.json();
    console.log("✅ Successfully obtained tokens");

    // Get user profile using the access token
    const profileResponse = await fetch(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      {
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
        },
      }
    );

    if (!profileResponse.ok) {
      throw new Error("Failed to fetch user profile");
    }

    const profileData = await profileResponse.json();

    // TRANSFORM THE PROFILE DATA TO MATCH PASSPORT'S EXPECTED FORMAT
    const transformedProfile = {
      id: profileData.id,
      displayName: profileData.name,
      name: {
        givenName: profileData.given_name,
        familyName: profileData.family_name,
      },
      emails: [
        {
          value: profileData.email,
          verified: profileData.verified_email,
        },
      ],
      photos: [{ value: profileData.picture }],
      provider: "google",
      _raw: JSON.stringify(profileData),
      _json: profileData,
    };

    // Now call your existing Passport verification logic
    const strategy = (passport as any)._strategies.google as any;

    if (!strategy) {
      throw new Error("Google strategy not found");
    }

    // Manually call the strategy's user callback
    strategy._verify(
      req,
      tokens.access_token,
      tokens.refresh_token,
      transformedProfile,
      async (err: any, user: any) => {
        if (err) {
          console.error("❌ Strategy verification failed:", err);
          return handleAuthFailure(req, res, err.message, socketAuthId);
        }

        if (!user) {
          console.error("❌ No user returned from strategy");
          return handleAuthFailure(
            req,
            res,
            "Authentication failed",
            socketAuthId
          );
        }

        // Manually log in the user
        req.logIn(user, (loginErr) => {
          if (loginErr) {
            console.error("❌ Login error:", loginErr);
            return handleAuthFailure(req, res, loginErr.message, socketAuthId);
          }

          console.log("✅ User successfully logged in:", user);

          const finalSocketAuthId = user.socketAuthId || socketAuthId;

          console.log("finalSocketAuthId", finalSocketAuthId);
          if (finalSocketAuthId) {
            console.log(
              "📡 Emitting auth-success for socketAuthId:",
              finalSocketAuthId
            );

            const successData = {
              status: "success",
              user: {
                token: user.token,
                data: {
                  walletAddress: user.address,
                  publicKey: user.publicKey,
                  socialType: user.socialType,
                  userData: user.userData,
                  email: user.email,
                },
              },
              timestamp: new Date().toISOString(),
              socketAuthId: finalSocketAuthId,
            };

            try {
              const emitted = socketManager.emitToSession(
                finalSocketAuthId,
                "auth-success",
                successData
              );

              console.log(
                "Socket emission result:",
                emitted ? "✅ Success" : "❌ Failed"
              );
            } catch (socketError) {
              console.error("❌ Socket emission error:", socketError);
            }
          }

          // RENDER HTML SUCCESS PAGE INSTEAD OF REDIRECTING
          const successHtml = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Authentication Successful - Crefy</title>
        <style>
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 20px;
            }
            
            .success-container {
                background: white;
                border-radius: 20px;
                padding: 40px;
                text-align: center;
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
                max-width: 400px;
                width: 100%;
            }
            
            .success-icon {
                width: 80px;
                height: 80px;
                background: #10b981;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 0 auto 20px;
            }
            
            .success-icon svg {
                width: 40px;
                height: 40px;
                color: white;
            }
            
            h1 {
                color: #1f2937;
                font-size: 24px;
                font-weight: 600;
                margin-bottom: 10px;
            }
            
            p {
                color: #6b7280;
                font-size: 16px;
                line-height: 1.5;
                margin-bottom: 30px;
            }
            
            .user-info {
                background: #f8fafc;
                border-radius: 10px;
                padding: 15px;
                margin: 20px 0;
                text-align: left;
            }
            
            .user-info-item {
                display: flex;
                justify-content: space-between;
                margin-bottom: 8px;
                font-size: 14px;
            }
            
            .user-info-item:last-child {
                margin-bottom: 0;
            }
            
            .label {
                color: #6b7280;
                font-weight: 500;
            }
            
            .value {
                color: #1f2937;
                font-weight: 600;
            }
            
            .close-button {
                background: #3b82f6;
                color: white;
                border: none;
                padding: 12px 30px;
                border-radius: 10px;
                font-size: 16px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s ease;
                width: 100%;
            }
            
            .close-button:hover {
                background: #2563eb;
                transform: translateY(-1px);
            }
            
            .auto-close {
                color: #9ca3af;
                font-size: 14px;
                margin-top: 15px;
            }
            
            @keyframes fadeIn {
                from { opacity: 0; transform: translateY(10px); }
                to { opacity: 1; transform: translateY(0); }
            }
            
            .success-container {
                animation: fadeIn 0.5s ease-out;
            }
        </style>
    </head>
    <body>
        <div class="success-container">
            <div class="success-icon">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                </svg>
            </div>
            
            <h1>Authentication Successful!</h1>
            <p>You have successfully signed in with Google. You can safely close this window.</p>
            
            <div class="user-info">
                <div class="user-info-item">
                    <span class="label">Name:</span>
                    <span class="value">${
                      user.userData?.name || user.email
                    }</span>
                </div>
                <div class="user-info-item">
                    <span class="label">Email:</span>
                    <span class="value">${user.email}</span>
                </div>
                <div class="user-info-item">
                    <span class="label">Method:</span>
                    <span class="value">Google</span>
                </div>
            </div>
            
            <button class="close-button" onclick="window.close()">Close Window</button>
            <div class="auto-close">This window will close automatically in 3 seconds...</div>
        </div>
    
        <script>
            // Auto-close after 3 seconds
            setTimeout(() => {
                window.close();
            }, 3000);
            
            // Fallback: if window.close doesn't work, show message
            window.addEventListener('beforeunload', () => {
                console.log('Closing authentication window...');
            });
            
            // Send message to opener if available (for embedded scenarios)
            if (window.opener) {
                window.opener.postMessage({
                    type: 'oauth-success',
                    user: ${JSON.stringify({
                      token: user.token,
                      data: {
                        walletAddress: user.address,
                        publicKey: user.publicKey,
                        socialType: user.socialType,
                        userData: user.userData,
                        email: user.email,
                      },
                    })}
                }, '*');
            }
        </script>
    </body>
    </html>
                `;

          return res.send(successHtml);
        });
      }
    );
  } catch (error) {
    console.error("❌ OAuth callback error:", error);
    return handleAuthFailure(req, res, (error as Error).message, socketAuthId);
  }
}) as RequestHandler);

// Helper function for auth failures
function handleAuthFailure(
  req: Request,
  res: Response,
  error: string,
  socketAuthId: string | null = null
) {
  if (socketAuthId) {
    socketManager.emitToSession(socketAuthId, "auth-error", {
      status: "error",
      error: "Authentication failed",
      errorDescription: error,
      timestamp: new Date().toISOString(),
    });
  }

  if (req.headers.accept?.includes("text/html")) {
    return res.redirect("/api/v1/oauth/google/failure");
  }

  return ResponseHandler.error(
    res,
    {
      message: "Google authentication failed",
      error: error,
      socketNotified: !!socketAuthId,
      socketAuthId: socketAuthId,
    },
    401
  );
}

// success handler
router.get("/google/success", (req: Request, res: Response) => {
  res.render("google-success.html");
});

// Enhanced failure handler
router.get("/google/failure", (req: Request, res: Response) => {
  const error = req.query.error || "Authentication failed";
  const errorDescription =
    req.query.error_description || "Unknown error occurred";

  console.log("❌ Google OAuth failure:", error, errorDescription);

  let socketAuthId = null;

  // Try to get socketAuthId from state parameter first
  if (req.query.state) {
    try {
      const stateObj = parseState(req.query.state as string);
      socketAuthId = stateObj.socketAuthId;
      console.log("Retrieved socketAuthId from state (failure):", socketAuthId);
    } catch (error) {
      console.error("Error decoding state parameter (failure):", error);
    }
  }

  // Fallback to session
  if (!socketAuthId && req.session) {
    socketAuthId = (req.session as any).socketAuthId;
    console.log("Fallback to session socketAuthId (failure):", socketAuthId);
  }

  if (socketAuthId) {
    console.log("📡 Emitting auth-error for socketAuthId:", socketAuthId);

    const failureData = {
      status: "error",
      error: error,
      errorDescription: errorDescription,
      timestamp: new Date().toISOString(),
      socketAuthId: socketAuthId,
    };

    try {
      const emitted = socketManager.emitToSession(
        socketAuthId,
        "auth-error",
        failureData
      );
      console.log(
        "Socket emission result:",
        emitted ? "✅ Success" : "❌ Failed"
      );
    } catch (socketError) {
      console.error("❌ Failed to emit auth-error via socket:", socketError);
    }
  } else {
    console.error("❌ No socketAuthId found for failure emission");
  }

  // For direct browser requests, redirect to failure page
  if (req.headers.accept?.includes("text/html")) {
    return res.redirect(
      `/auth/error?error=${encodeURIComponent(error as string)}`
    );
  }

  // For API requests, return error response
  ResponseHandler.error(
    res,
    {
      message: "Google authentication failed",
      error,
      errorDescription,
      socketNotified: !!socketAuthId,
      socketAuthId: socketAuthId,
    },
    401
  );
});

// Add a debug endpoint to check session and socket status
router.get("/google/debug/:socketAuthId", (req: Request, res: Response) => {
  const { socketAuthId } = req.params;

  const sessionExists = socketManager.hasSession(socketAuthId);
  const sessionInfo = socketManager.getSessionInfo(socketAuthId);

  res.json({
    socketAuthId,
    sessionExists,
    sessionInfo,
    message: sessionExists ? "Session active" : "Session not found",
  });
});

export default router;
