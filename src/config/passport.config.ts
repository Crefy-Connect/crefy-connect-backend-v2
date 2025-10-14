import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Wallet } from "../models/wallet.models.js";
import { ConnectionSession } from "../models/session.model.js";
import WalletGenerationService from "../services/wallet.generate.services.js";
import { server_config } from "./index.js";
import crypto from "crypto";
import logger from "../utils/logger.js";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import { URL } from "url";

interface GoogleProfile {
  id: string;
  displayName: string;
  emails?: Array<{ value: string; verified?: boolean }>;
  photos?: Array<{ value: string }>;
}

interface AuthPayload {
  type: string;
  payload: {
    wallet: {
      address: string;
      email?: string;
      publicKey: string;
      socialType: string;
    };
    token: string;
    sessionId: string;
  };
}

interface StateParams {
  sessionId: string;
  frontendOrigin: string;
  appId?: string;
  socketAuthId?: string; // Add this
}

// Enhanced JWT Token Generation
const generateAuthToken = (wallet: any): string => {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not defined in environment variables");
  }

  return jwt.sign(
    {
      id: wallet._id,
      address: wallet.address,
      publicKey: wallet.publicKey,
      socialType: wallet.socialType,
      iat: Math.floor(Date.now() / 1000),
    },
    process.env.JWT_SECRET,
    { expiresIn: "1h" }
  );
};

// More robust state parameter parsing - UPDATED
const parseState = (state: string): StateParams => {
  try {
    const decoded = Buffer.from(state, "base64").toString();
    const parsed = JSON.parse(decoded) as StateParams;

    // Validate required fields
    if (!parsed.sessionId || !parsed.frontendOrigin) {
      throw new Error("Invalid state structure");
    }

    return parsed;
  } catch (e) {
    logger.error("Invalid state parameter:", state, e);
    return {
      sessionId: crypto.randomUUID(),
      frontendOrigin: server_config.baseUrl,
      socketAuthId: `auth-${Date.now()}`,
    };
  }
};

// Generate state parameter - NEW FUNCTION
const generateState = (params: StateParams): string => {
  return Buffer.from(JSON.stringify(params)).toString("base64");
};

// Enhanced Google Strategy with socketAuthId support
const googleOAuthStrategy = new GoogleStrategy(
  {
    clientID: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    callbackURL: new URL(
      "/api/v1/oauth/google/callback",
      server_config.baseUrl
    ).toString(),
    passReqToCallback: true,
    scope: ["profile", "email"],
    state: false,
  },
  async (
    req: any,
    accessToken: string,
    refreshToken: string,
    profile: GoogleProfile,
    done: Function
  ) => {
    console.log("🔐 Google OAuth callback - START");
    console.log("Profile received:", {
      id: profile.id,
      displayName: profile.displayName,
      email: profile.emails?.[0]?.value,
      photos: profile.photos?.[0]?.value,
    });

    const transaction = await mongoose.startSession();
    transaction.startTransaction();

    try {
      const email = profile.emails?.[0]?.value;
      if (!email) {
        throw new Error("No verified email found in Google profile");
      }

      // Enhanced state validation with better error handling
      if (!req.query.state) {
        logger.error("Missing state parameter in Google OAuth callback");
        throw new Error("Missing state parameter");
      }

      const state = parseState(req.query.state as string);
      const {
        sessionId,
        frontendOrigin,
        appId = "default",
        socketAuthId,
      } = state;

      logger.info(`Processing Google OAuth for email: ${email}`, {
        appId,
        sessionId,
        socketAuthId,
      });

      // Find or create wallet
      let wallet = await Wallet.findOne({
        email,
        socialType: "google",
      }).session(transaction);

      if (!wallet) {
        logger.info("Creating new wallet for Google user", { email });
        const { address, privateKey, publicKey } =
          await WalletGenerationService.generateAddress();
        const encryptionSalt = crypto.randomBytes(16).toString("hex");

        [wallet] = await Wallet.create(
          [
            {
              appId,
              email,
              socialType: "google",
              address,
              publicKey,
              encryptedPrivateKey: privateKey,
              encryptionSalt,
              userData: JSON.stringify({
                id: profile.id,
                displayName: profile.displayName,
                email: email,
                photo: profile.photos?.[0]?.value,
                provider: "google",
              }),
              isActive: true,
              oauthTokens: {
                accessToken,
                refreshToken,
              },
            },
          ],
          { session: transaction }
        );

        logger.info(`Created new wallet for Google user: ${address}`);
      } else {
        logger.info("Found existing wallet for Google user", {
          address: wallet.address,
        });
        // Update OAuth tokens and user data
        wallet.oauthTokens = {
          accessToken,
          refreshToken,
        };
        wallet.userData = JSON.stringify({
          id: profile.id,
          displayName: profile.displayName,
          email: email,
          photo: profile.photos?.[0]?.value,
          provider: "google",
        });
        await wallet.save({ session: transaction });
      }

      // Generate JWT token
      const token = generateAuthToken(wallet);

      // Enhanced auth payload with complete user data
      const authPayload = {
        token: token,
        data: {
          walletAddress: wallet.address,
          publicKey: wallet.publicKey,
          socialType: wallet.socialType,
          userData: wallet.userData,
          email: wallet.email,
        },
      };

      // Update session with socketAuthId
      if (sessionId) {
        await ConnectionSession.findOneAndUpdate(
          { sessionId },
          {
            walletId: wallet._id,
            status: "connected",
            peerMeta: {
              name: profile.displayName,
              email: email,
              profileImage: profile.photos?.[0]?.value,
            },
            socketAuthId: socketAuthId,
            authPayload: authPayload, // Store auth payload in session
            updatedAt: new Date(),
          },
          {
            session: transaction,
            upsert: true,
            new: true,
          }
        );
      }

      await transaction.commitTransaction();
      logger.info("Google OAuth transaction committed successfully");

      // Enhanced user data for passport
      const userData = {
        _id: wallet._id,
        address: wallet.address,
        email: wallet.email,
        socialType: wallet.socialType,
        publicKey: wallet.publicKey,
        userData: wallet.userData,
        token: token,
        payload: authPayload,
        frontendOrigin,
        sessionId,
        socketAuthId, // Ensure socketAuthId is included
        accessToken,
        refreshToken,
      };

      // Store socketAuthId in session for callback route
      if (req.session) {
        (req.session as any).socketAuthId = socketAuthId;
        (req.session as any).oauthState = req.query.state; // Store original state
        logger.debug("Stored socketAuthId in session:", socketAuthId);
      }

      return done(null, userData);
    } catch (error) {
      await transaction.abortTransaction();
      console.log("🔐 Google OAuth callback - ABORTED");
      console.log("Error details:", error);

      // Update session with failure
      if (req.query.state) {
        const state = parseState(req.query.state as string);
        try {
          await ConnectionSession.findOneAndUpdate(
            { sessionId: state.sessionId },
            {
              status: "failed",
              error: (error as Error).message,
              updatedAt: new Date(),
            }
          );
        } catch (sessionError) {
          logger.error("Failed to update session status", { sessionError });
        }
      }

      return done(error);
    } finally {
      transaction.endSession();
    }
  }
);

// Enhanced Passport configuration
const configurePassport = () => {
  // Clean any existing strategies to avoid duplicates
  passport.unuse("google");

  // Use the enhanced strategy
  passport.use("google", googleOAuthStrategy);

  // Enhanced serialization - INCLUDE SOCKET AUTH ID
  passport.serializeUser((user: any, done) => {
    try {
      const serialized = {
        id: user._id,
        payload: user.payload,
        frontendOrigin: user.frontendOrigin,
        sessionId: user.sessionId,
        socketAuthId: user.socketAuthId, // Include socketAuthId
        accessToken: user.accessToken,
        refreshToken: user.refreshToken,
      };
      done(null, serialized);
    } catch (error) {
      logger.error("Serialization error:", error);
      done(error);
    }
  });

  // Enhanced deserialization - INCLUDE SOCKET AUTH ID
  passport.deserializeUser(async (serialized: any, done) => {
    try {
      if (!serialized?.id) {
        logger.warn("Deserialization attempted with invalid serialized data", {
          serialized,
        });
        return done(null, false);
      }

      const wallet = await Wallet.findById(serialized.id);
      if (!wallet) {
        logger.warn("Wallet not found during deserialization", {
          walletId: serialized.id,
        });

        if (serialized.sessionId) {
          await ConnectionSession.deleteOne({
            sessionId: serialized.sessionId,
          });
        }

        return done(null, false);
      }

      const user = {
        ...wallet.toObject(),
        payload: serialized.payload,
        frontendOrigin: serialized.frontendOrigin,
        sessionId: serialized.sessionId,
        socketAuthId: serialized.socketAuthId, // Include socketAuthId
        accessToken: serialized.accessToken,
        refreshToken: serialized.refreshToken,
      };

      done(null, user);
    } catch (error) {
      logger.error("Deserialization error:", error);
      done(null, false);
    }
  });

  return passport;
};

// Export the generateState function for use in routes
export { generateState, parseState };

export const passportInstance = configurePassport();
export const passportInit = passportInstance.initialize();
export const passportSession = passportInstance.session();

export default passportInstance;
