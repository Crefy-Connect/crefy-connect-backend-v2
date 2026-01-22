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
import { server_config } from "../config/index.js";

const router = Router();
const socketManager = SocketManager.getInstance();

// ********************************************************************************************************
// Email Wallet Social Login
// *****************************************************************************************************
router.post(
  "/email/email-login",
  validateApiKeyMiddleware as RequestHandler,
  checkNotAuthenticated as RequestHandler,
  SocialLoginsController.emailWalletLogin as unknown as RequestHandler,
);

router.post(
  "/email/wallet-verify",
  validateApiKeyMiddleware as RequestHandler,
  SocialLoginsController.walletVerify as unknown as RequestHandler,
);

router.post(
  "/email/resend-email-otp",
  validateApiKeyMiddleware as RequestHandler,
  SocialLoginsController.resendEmailOTP as unknown as RequestHandler,
);

// ***************************************************************************************************** //
// Google OAuth
// ***************************************************************************************************** //

// Enhanced Google OAuth initiation
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
      appId: req.params.appId as string,
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
      "https://accounts.google.com/o/oauth2/v2/auth",
    );
    googleAuthUrl.searchParams.set("client_id", process.env.GOOGLE_CLIENT_ID!);
    googleAuthUrl.searchParams.set(
      "redirect_uri",
      new URL(
        "/api/v1/oauth/google/callback",
        server_config.baseUrl,
      ).toString(),
    );
    googleAuthUrl.searchParams.set("response_type", "code");
    googleAuthUrl.searchParams.set("scope", "profile email");
    googleAuthUrl.searchParams.set("prompt", "select_account");
    googleAuthUrl.searchParams.set("state", state); // Use our custom state
    googleAuthUrl.searchParams.set("access_type", "offline");

    console.log("Redirecting to Google OAuth URL:", googleAuthUrl.toString());

    res.redirect(googleAuthUrl.toString());
  },
);

// Enhanced Google OAuth callback with state verification
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
          server_config.baseUrl,
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
      },
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
            socketAuthId,
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
              finalSocketAuthId,
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
                successData,
              );

              console.log(
                "Socket emission result:",
                emitted ? "✅ Success" : "❌ Failed",
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
      },
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
  socketAuthId: string | null = null,
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
    401,
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
        failureData,
      );
      console.log(
        "Socket emission result:",
        emitted ? "✅ Success" : "❌ Failed",
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
      `/auth/error?error=${encodeURIComponent(error as string)}`,
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
    401,
  );
});

// Add a debug endpoint to check session and socket status
router.get("/google/debug/:socketAuthId", (req: Request, res: Response) => {
  const { socketAuthId } = req.params as { socketAuthId: string };

  const sessionExists = socketManager.hasSession(socketAuthId);
  const sessionInfo = socketManager.getSessionInfo(socketAuthId);

  res.json({
    socketAuthId,
    sessionExists,
    sessionInfo,
    message: sessionExists ? "Session active" : "Session not found",
  });
});

// ***************************************************************************************************** //
// Twitter OAuth
// ***************************************************************************************************** //

// Twitter OAuth initiation
// Twitter OAuth initiation - COMPLETE FIX
router.get(
  "/twitter/:appId/initiate-twitter-auth",
  handleGoogleAuthSession,
  (req: Request, res: Response, next: NextFunction) => {
    console.log("🐦 Initiating Twitter OAuth flow");

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
      appId: req.params.appId as string,
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
    try {
      socketManager.emitToSession(socketAuthId, "twitter-auth-initiated", {
        message: "Twitter auth initiated",
        socketAuthId: socketAuthId,
        state: state,
      });
    } catch (socketError) {
      console.log("Socket not available yet, will emit later:", socketError);
    }

    console.log("Generated state parameter for Twitter:", state);

    // Determine if this is a web or desktop app flow
    const isDesktopApp =
      req.headers["user-agent"]?.includes("Electron") ||
      req.query.platform === "desktop" ||
      !req.headers.origin; // No origin usually means desktop app

    if (isDesktopApp) {
      console.log("🐦 Using OOB flow for desktop application");
      // For desktop apps, use OOB flow
      passport.authenticate("twitter", {
        callbackURL: "oob", // Out-of-band for desktop apps
      } as any)(req, res, (err: any) => {
        if (err) {
          console.error("❌ Twitter OAuth initiation error:", err);
          return handleTwitterAuthFailure(req, res, err.message, socketAuthId);
        }
      });
    } else {
      console.log("🐦 Using web flow with callback URL");
      // For web apps, use callback URL
      const callbackUrl = new URL(
        "/api/v1/oauth/twitter/callback",
        server_config.baseUrl,
      );

      passport.authenticate("twitter", {
        callbackURL: callbackUrl.toString(),
      } as any)(req, res, (err: any) => {
        if (err) {
          console.error("❌ Twitter OAuth initiation error:", err);
          return handleTwitterAuthFailure(req, res, err.message, socketAuthId);
        }
      });
    }
  },
);

// Twitter OAuth callback - ENHANCED VERSION
router.get("/twitter/callback", ((
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  console.log("🐦 Twitter OAuth callback initiated");

  const oauthToken = req.query.oauth_token as string;
  const oauthVerifier = req.query.oauth_verifier as string;
  const denied = req.query.denied as string;
  const receivedState = req.query.state as string;

  if (denied) {
    console.error("❌ User denied Twitter authorization");
    return handleTwitterAuthFailure(
      req,
      res,
      "User denied authorization",
      null,
    );
  }

  // Check if this is an OOB flow (PIN-based)
  if (oauthToken && !oauthVerifier) {
    console.log("🐦 OOB flow detected - rendering PIN entry page");
    return renderPinEntryPage(req, res, oauthToken);
  }

  if (!oauthToken || !oauthVerifier) {
    console.error("❌ Missing OAuth token or verifier");
    return handleTwitterAuthFailure(req, res, "Missing OAuth parameters", null);
  }

  // STATE VERIFICATION for web flow
  if (receivedState) {
    const sessionState = (req.session as any)?.oauthState;
    if (!sessionState || receivedState !== sessionState) {
      console.error("❌ Twitter State parameter mismatch");

      let socketAuthId = null;
      try {
        const stateObj = parseState(receivedState);
        socketAuthId = stateObj.socketAuthId;
      } catch (error) {
        console.error("Error parsing state for socketAuthId:", error);
      }

      if (socketAuthId) {
        socketManager.emitToSession(socketAuthId, "auth-error", {
          status: "error",
          error: "Authentication failed",
          errorDescription: "Security verification failed. Please try again.",
          timestamp: new Date().toISOString(),
        });
      }

      return res.redirect("/api/v1/oauth/twitter/failure");
    }

    // Clear the state from session after use
    if (req.session) {
      (req.session as any).oauthState = null;
    }
  }

  // Process authentication
  passport.authenticate(
    "twitter",
    {
      failureRedirect: "/api/v1/oauth/twitter/failure",
      failureMessage: true,
    },
    (err: any, user: any, info: any) => {
      if (err) {
        console.error("❌ Twitter authentication error:", err);
        return handleTwitterAuthFailure(
          req,
          res,
          err.message,
          user?.socketAuthId,
        );
      }

      if (!user) {
        console.error("❌ No user returned from Twitter authentication");
        return handleTwitterAuthFailure(
          req,
          res,
          "Authentication failed",
          null,
        );
      }

      handleTwitterSuccess(req, res, user);
    },
  )(req, res, next);
}) as RequestHandler);

// Helper function to render PIN entry page
function renderPinEntryPage(req: Request, res: Response, oauthToken: string) {
  const pinHtml = `
  <!DOCTYPE html>
  <html lang="en">
  <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Twitter PIN Verification - Crefy</title>
      <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
              background: linear-gradient(135deg, #1da1f2 0%, #0d8bd9 100%);
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
              padding: 20px;
          }
          .pin-container {
              background: white;
              border-radius: 20px;
              padding: 40px;
              text-align: center;
              box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
              max-width: 400px;
              width: 100%;
          }
          .twitter-icon {
              width: 80px;
              height: 80px;
              background: #1da1f2;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              margin: 0 auto 20px;
          }
          .twitter-icon svg {
              width: 40px;
              height: 40px;
              color: white;
          }
          h1 { color: #1f2937; font-size: 24px; font-weight: 600; margin-bottom: 10px; }
          p { color: #6b7280; font-size: 16px; line-height: 1.5; margin-bottom: 30px; }
          .pin-input {
              width: 100%;
              padding: 15px;
              border: 2px solid #e5e7eb;
              border-radius: 10px;
              font-size: 18px;
              text-align: center;
              margin-bottom: 20px;
              transition: border-color 0.2s ease;
          }
          .pin-input:focus {
              outline: none;
              border-color: #1da1f2;
          }
          .verify-button {
              background: #1da1f2;
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
          .verify-button:hover { background: #0d8bd9; transform: translateY(-1px); }
          .instructions {
              background: #f8fafc;
              border-radius: 10px;
              padding: 15px;
              margin: 20px 0;
              text-align: left;
              font-size: 14px;
              color: #6b7280;
          }
          @keyframes fadeIn {
              from { opacity: 0; transform: translateY(10px); }
              to { opacity: 1; transform: translateY(0); }
          }
          .pin-container { animation: fadeIn 0.5s ease-out; }
      </style>
  </head>
  <body>
      <div class="pin-container">
          <div class="twitter-icon">
              <svg fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
              </svg>
          </div>
          
          <h1>Twitter PIN Verification</h1>
          <p>Please enter the PIN provided by Twitter to complete authentication.</p>
          
          <div class="instructions">
              <strong>Instructions:</strong><br>
              1. Check your Twitter app or browser for the PIN<br>
              2. Enter the 7-digit PIN below<br>
              3. Click Verify to complete authentication
          </div>
          
          <input type="text" class="pin-input" placeholder="Enter PIN" maxlength="7" id="pinInput">
          <button class="verify-button" onclick="verifyPin()">Verify PIN</button>
      </div>
  
      <script>
          function verifyPin() {
              const pin = document.getElementById('pinInput').value.trim();
              if (!pin) {
                  alert('Please enter the PIN');
                  return;
              }
              
              // Redirect to complete OAuth flow with PIN
              window.location.href = '/api/v1/oauth/twitter/pin-verify?oauth_token=${oauthToken}&oauth_verifier=' + pin;
          }
          
          // Allow Enter key to submit
          document.getElementById('pinInput').addEventListener('keypress', function(e) {
              if (e.key === 'Enter') {
                  verifyPin();
              }
          });
          
          // Auto-focus on input
          document.getElementById('pinInput').focus();
      </script>
  </body>
  </html>
    `;
  return res.send(pinHtml);
}

// PIN verification endpoint
router.get("/twitter/pin-verify", ((
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const oauthToken = req.query.oauth_token as string;
  const oauthVerifier = req.query.oauth_verifier as string;

  if (!oauthToken || !oauthVerifier) {
    return handleTwitterAuthFailure(
      req,
      res,
      "Missing PIN verification parameters",
      null,
    );
  }

  console.log("🐦 Processing PIN verification");

  // Continue with the normal OAuth flow using the PIN as verifier
  passport.authenticate(
    "twitter",
    {
      failureRedirect: "/api/v1/oauth/twitter/failure",
      failureMessage: true,
    },
    (err: any, user: any, info: any) => {
      if (err) {
        console.error("❌ Twitter PIN verification error:", err);
        return handleTwitterAuthFailure(
          req,
          res,
          err.message,
          user?.socketAuthId,
        );
      }

      if (!user) {
        console.error("❌ No user returned from Twitter PIN verification");
        return handleTwitterAuthFailure(
          req,
          res,
          "PIN verification failed",
          null,
        );
      }

      handleTwitterSuccess(req, res, user);
    },
  )(req, res, next);
}) as RequestHandler);

// Helper function to handle Twitter success
function handleTwitterSuccess(req: Request, res: Response, user: any) {
  console.log("✅ User successfully logged in via Twitter:", user);

  const finalSocketAuthId = user.socketAuthId;

  if (finalSocketAuthId) {
    console.log(
      "📡 Emitting auth-success for socketAuthId:",
      finalSocketAuthId,
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
          username: user.username,
        },
      },
      timestamp: new Date().toISOString(),
      socketAuthId: finalSocketAuthId,
    };

    try {
      const emitted = socketManager.emitToSession(
        finalSocketAuthId,
        "auth-success",
        successData,
      );
      console.log(
        "Socket emission result:",
        emitted ? "✅ Success" : "❌ Failed",
      );
    } catch (socketError) {
      console.error("❌ Socket emission error:", socketError);
    }
  }

  // RENDER HTML SUCCESS PAGE FOR TWITTER
  const userDataParsed = JSON.parse(user.userData || "{}");
  const successHtml = `
  <!DOCTYPE html>
  <html lang="en">
  <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Authentication Successful - Crefy</title>
      <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
              background: linear-gradient(135deg, #1da1f2 0%, #0d8bd9 100%);
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
          h1 { color: #1f2937; font-size: 24px; font-weight: 600; margin-bottom: 10px; }
          p { color: #6b7280; font-size: 16px; line-height: 1.5; margin-bottom: 30px; }
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
          .user-info-item:last-child { margin-bottom: 0; }
          .label { color: #6b7280; font-weight: 500; }
          .value { color: #1f2937; font-weight: 600; }
          .close-button {
              background: #1da1f2;
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
          .close-button:hover { background: #0d8bd9; transform: translateY(-1px); }
          .auto-close { color: #9ca3af; font-size: 14px; margin-top: 15px; }
          @keyframes fadeIn {
              from { opacity: 0; transform: translateY(10px); }
              to { opacity: 1; transform: translateY(0); }
          }
          .success-container { animation: fadeIn 0.5s ease-out; }
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
          <p>You have successfully signed in with Twitter. You can safely close this window.</p>
          
          <div class="user-info">
              <div class="user-info-item">
                  <span class="label">Username:</span>
                  <span class="value">@${
                    userDataParsed.username || user.username
                  }</span>
              </div>
              <div class="user-info-item">
                  <span class="label">Name:</span>
                  <span class="value">${
                    userDataParsed.displayName || user.email
                  }</span>
              </div>
              <div class="user-info-item">
                  <span class="label">Method:</span>
                  <span class="value">Twitter</span>
              </div>
          </div>
          
          <button class="close-button" onclick="window.close()">Close Window</button>
          <div class="auto-close">This window will close automatically in 3 seconds...</div>
      </div>
  
      <script>
          setTimeout(() => { window.close(); }, 3000);
          window.addEventListener('beforeunload', () => {
              console.log('Closing authentication window...');
          });
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
                      username: user.username,
                    },
                  })}
              }, '*');
          }
      </script>
  </body>
  </html>
    `;

  return res.send(successHtml);
}

// Helper function for Twitter auth failures
function handleTwitterAuthFailure(
  req: Request,
  res: Response,
  error: string,
  socketAuthId: string | null = null,
) {
  if (socketAuthId) {
    socketManager.emitToSession(socketAuthId, "auth-error", {
      status: "error",
      error: "Twitter authentication failed",
      errorDescription: error,
      timestamp: new Date().toISOString(),
    });
  }

  if (req.headers.accept?.includes("text/html")) {
    return res.redirect("/api/v1/oauth/twitter/failure");
  }

  return ResponseHandler.error(
    res,
    {
      message: "Twitter authentication failed",
      error: error,
      socketNotified: !!socketAuthId,
      socketAuthId: socketAuthId,
    },
    401,
  );
}

// Twitter failure handler
router.get("/twitter/failure", (req: Request, res: Response) => {
  const error = req.query.error || "Authentication failed";
  const errorDescription =
    req.query.error_description || "Unknown error occurred";

  console.log("❌ Twitter OAuth failure:", error, errorDescription);

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
        failureData,
      );
      console.log(
        "Socket emission result:",
        emitted ? "✅ Success" : "❌ Failed",
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
      `/auth/error?error=${encodeURIComponent(error as string)}`,
    );
  }

  // For API requests, return error response
  ResponseHandler.error(
    res,
    {
      message: "Twitter authentication failed",
      error,
      errorDescription,
      socketNotified: !!socketAuthId,
      socketAuthId: socketAuthId,
    },
    401,
  );
});

// Twitter debug endpoint
router.get("/twitter/debug/:socketAuthId", (req: Request, res: Response) => {
  const { socketAuthId } = req.params as { socketAuthId: string };

  const sessionExists = socketManager.hasSession(socketAuthId);
  const sessionInfo = socketManager.getSessionInfo(socketAuthId);

  res.json({
    socketAuthId,
    sessionExists,
    sessionInfo,
    message: sessionExists ? "Session active" : "Session not found",
  });
});

// ***************************************************************************************************** //
// Generic Social OAuth Routes
// ***************************************************************************************************** //

// Generic social OAuth success handler
router.get("/success", ((req: Request, res: Response) => {
  if (!req.user) {
    return res.redirect("/api/v1/oauth/failure");
  }

  const user = req.user as any;
  const socialType = user.socialType || "social";

  // Return JSON response for API calls
  if (!req.headers.accept?.includes("text/html")) {
    return res.json({
      success: true,
      message: `${
        socialType.charAt(0).toUpperCase() + socialType.slice(1)
      } authentication successful`,
      data: {
        walletAddress: user.address,
        publicKey: user.publicKey,
        socialType: user.socialType,
        userData: user.userData,
        email: user.email,
        username: user.username,
      },
      token: user.token,
    });
  }

  // Render HTML success page for browser
  res.render("social-success.html", { user });
}) as RequestHandler);

// Generic social OAuth failure handler
router.get("/failure", ((req: Request, res: Response) => {
  const error = req.query.error || "Authentication failed";
  const errorDescription =
    req.query.error_description || "Unknown error occurred";
  const provider = req.query.provider || "social";

  // Return JSON response for API calls
  if (!req.headers.accept?.includes("text/html")) {
    return ResponseHandler.error(
      res,
      {
        message: `${provider} OAuth failed`,
        error,
        errorDescription,
      },
      401,
    );
  }

  // Redirect to error page for browser
  res.redirect(
    `/auth/error?error=${encodeURIComponent(
      error as string,
    )}&provider=${provider}`,
  );
}) as RequestHandler);

export default router;
