import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as TwitterStrategy } from "passport-twitter";
import { Wallet } from "../models/wallet.models.js";
import { ConnectionSession } from "../models/session.model.js";
import WalletGenerationService from "../services/wallet.generate.services.js";
import { server_config } from "./index.js";
import crypto from "crypto";
import logger from "../utils/logger.js";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import { URL } from "url";
// Enhanced JWT Token Generation
const generateAuthToken = (wallet) => {
    if (!process.env.JWT_SECRET) {
        throw new Error("JWT_SECRET is not defined in environment variables");
    }
    return jwt.sign({
        id: wallet._id,
        address: wallet.address,
        publicKey: wallet.publicKey,
        socialType: wallet.socialType,
        iat: Math.floor(Date.now() / 1000),
    }, process.env.JWT_SECRET, { expiresIn: "1h" });
};
// More robust state parameter parsing
const parseState = (state) => {
    try {
        const decoded = Buffer.from(state, "base64").toString();
        const parsed = JSON.parse(decoded);
        if (!parsed.sessionId || !parsed.frontendOrigin) {
            throw new Error("Invalid state structure");
        }
        return parsed;
    }
    catch (e) {
        logger.error("Invalid state parameter:", state, e);
        return {
            sessionId: crypto.randomUUID(),
            frontendOrigin: server_config.baseUrl,
            socketAuthId: `auth-${Date.now()}`,
        };
    }
};
// Generate state parameter
const generateState = (params) => {
    return Buffer.from(JSON.stringify(params)).toString("base64");
};
// Enhanced Google Strategy with socketAuthId support
const googleOAuthStrategy = new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: new URL("/api/v1/oauth/google/callback", server_config.baseUrl).toString(),
    passReqToCallback: true,
    scope: ["profile", "email"],
    state: false,
}, async (req, accessToken, refreshToken, profile, done) => {
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
        if (!req.query.state) {
            logger.error("Missing state parameter in Google OAuth callback");
            throw new Error("Missing state parameter");
        }
        const state = parseState(req.query.state);
        const { sessionId, frontendOrigin, appId = "default", socketAuthId, } = state;
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
            const { address, privateKey, publicKey } = await WalletGenerationService.generateAddress();
            const encryptionSalt = crypto.randomBytes(16).toString("hex");
            [wallet] = await Wallet.create([
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
            ], { session: transaction });
            logger.info(`Created new wallet for Google user: ${address}`);
        }
        else {
            logger.info("Found existing wallet for Google user", {
                address: wallet.address,
            });
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
        const jwtToken = generateAuthToken(wallet);
        // Enhanced auth payload with complete user data
        const authPayload = {
            token: jwtToken,
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
            await ConnectionSession.findOneAndUpdate({ sessionId }, {
                walletId: wallet._id,
                status: "connected",
                peerMeta: {
                    name: profile.displayName,
                    email: email,
                    profileImage: profile.photos?.[0]?.value,
                },
                socketAuthId: socketAuthId,
                authPayload: authPayload,
                updatedAt: new Date(),
            }, {
                session: transaction,
                upsert: true,
                new: true,
            });
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
            token: jwtToken,
            payload: authPayload,
            frontendOrigin,
            sessionId,
            socketAuthId,
            accessToken,
            refreshToken,
        };
        // Store socketAuthId in session for callback route
        if (req.session) {
            req.session.socketAuthId = socketAuthId;
            req.session.oauthState = req.query.state;
            logger.debug("Stored socketAuthId in session:", socketAuthId);
        }
        return done(null, userData);
    }
    catch (error) {
        await transaction.abortTransaction();
        console.log("🔐 Google OAuth callback - ABORTED");
        console.log("Error details:", error);
        if (req.query.state) {
            const state = parseState(req.query.state);
            try {
                await ConnectionSession.findOneAndUpdate({ sessionId: state.sessionId }, {
                    status: "failed",
                    error: error.message,
                    updatedAt: new Date(),
                });
            }
            catch (sessionError) {
                logger.error("Failed to update session status", { sessionError });
            }
        }
        return done(error);
    }
    finally {
        transaction.endSession();
    }
});
// Twitter OAuth Strategy - UPDATED WITH YOUR CREDENTIALS
const twitterOAuthStrategy = new TwitterStrategy({
    consumerKey: process.env.TWITTER_CONSUMER_KEY,
    consumerSecret: process.env.TWITTER_CONSUMER_SECRET,
    callbackURL: new URL("/api/v1/oauth/twitter/callback", server_config.baseUrl).toString(),
    passReqToCallback: true,
    includeEmail: true, // Request email permission
    userProfileURL: "https://api.twitter.com/1.1/account/verify_credentials.json?include_email=true",
}, async (req, twitterToken, tokenSecret, profile, done) => {
    console.log("🐦 Twitter OAuth callback - START");
    console.log("Twitter profile received:", {
        id: profile.id,
        username: profile.username,
        displayName: profile.displayName,
        email: profile.emails?.[0]?.value,
    });
    const transaction = await mongoose.startSession();
    transaction.startTransaction();
    try {
        const username = profile.username;
        // Use actual email from Twitter if available, otherwise fallback
        const email = profile.emails?.[0]?.value || `${username}@twitter.com`;
        if (!req.query.state) {
            logger.error("Missing state parameter in Twitter OAuth callback");
            throw new Error("Missing state parameter");
        }
        const state = parseState(req.query.state);
        const { sessionId, frontendOrigin, appId = "default", socketAuthId, } = state;
        logger.info(`Processing Twitter OAuth for user: ${username}`, {
            appId,
            sessionId,
            socketAuthId,
            email,
        });
        // Find or create wallet - using twitterId for lookup
        let wallet = await Wallet.findOne({
            $or: [
                { email, socialType: "twitter" },
                { "userData.twitterId": profile.id, socialType: "twitter" },
            ],
        }).session(transaction);
        if (!wallet) {
            logger.info("Creating new wallet for Twitter user", {
                username,
                email,
            });
            const { address, privateKey, publicKey } = await WalletGenerationService.generateAddress();
            const encryptionSalt = crypto.randomBytes(16).toString("hex");
            [wallet] = await Wallet.create([
                {
                    appId,
                    email,
                    socialType: "twitter",
                    address,
                    publicKey,
                    encryptedPrivateKey: privateKey,
                    encryptionSalt,
                    userData: JSON.stringify({
                        twitterId: profile.id,
                        username: profile.username,
                        displayName: profile.displayName,
                        email: email,
                        photo: profile.photos?.[0]?.value,
                        provider: "twitter",
                        profileUrl: `https://twitter.com/${profile.username}`,
                    }),
                    isActive: true,
                    oauthTokens: {
                        accessToken: twitterToken,
                        refreshToken: tokenSecret,
                    },
                },
            ], { session: transaction });
            logger.info(`Created new wallet for Twitter user: ${address}`);
        }
        else {
            logger.info("Found existing wallet for Twitter user", {
                address: wallet.address,
            });
            // Update OAuth tokens and user data
            wallet.oauthTokens = {
                accessToken: twitterToken,
                refreshToken: tokenSecret,
            };
            wallet.userData = JSON.stringify({
                twitterId: profile.id,
                username: profile.username,
                displayName: profile.displayName,
                email: email,
                photo: profile.photos?.[0]?.value,
                provider: "twitter",
                profileUrl: `https://twitter.com/${profile.username}`,
            });
            await wallet.save({ session: transaction });
        }
        // Generate JWT token
        const jwtToken = generateAuthToken(wallet);
        // Enhanced auth payload with complete user data
        const authPayload = {
            token: jwtToken,
            data: {
                walletAddress: wallet.address,
                publicKey: wallet.publicKey,
                socialType: wallet.socialType,
                userData: wallet.userData,
                email: wallet.email,
                username: username,
            },
        };
        // Update session with socketAuthId
        if (sessionId) {
            await ConnectionSession.findOneAndUpdate({ sessionId }, {
                walletId: wallet._id,
                status: "connected",
                peerMeta: {
                    name: profile.displayName,
                    username: profile.username,
                    email: email,
                    profileImage: profile.photos?.[0]?.value,
                    profileUrl: `https://twitter.com/${profile.username}`,
                },
                socketAuthId: socketAuthId,
                authPayload: authPayload,
                updatedAt: new Date(),
            }, {
                session: transaction,
                upsert: true,
                new: true,
            });
        }
        await transaction.commitTransaction();
        logger.info("Twitter OAuth transaction committed successfully");
        // Enhanced user data for passport
        const userData = {
            _id: wallet._id,
            address: wallet.address,
            email: wallet.email,
            socialType: wallet.socialType,
            publicKey: wallet.publicKey,
            userData: wallet.userData,
            token: jwtToken,
            payload: authPayload,
            frontendOrigin,
            sessionId,
            socketAuthId,
            accessToken: twitterToken,
            refreshToken: tokenSecret,
            username: username,
            profileUrl: `https://twitter.com/${profile.username}`,
        };
        // Store socketAuthId in session for callback route
        if (req.session) {
            req.session.socketAuthId = socketAuthId;
            req.session.oauthState = req.query.state;
            logger.debug("Stored socketAuthId in session:", socketAuthId);
        }
        return done(null, userData);
    }
    catch (error) {
        await transaction.abortTransaction();
        console.log("🐦 Twitter OAuth callback - ABORTED");
        console.log("Error details:", error);
        if (req.query.state) {
            const state = parseState(req.query.state);
            try {
                await ConnectionSession.findOneAndUpdate({ sessionId: state.sessionId }, {
                    status: "failed",
                    error: error.message,
                    updatedAt: new Date(),
                });
            }
            catch (sessionError) {
                logger.error("Failed to update session status", { sessionError });
            }
        }
        return done(error);
    }
    finally {
        transaction.endSession();
    }
});
// Enhanced Passport configuration
const configurePassport = () => {
    passport.unuse("google");
    passport.unuse("twitter");
    passport.use("google", googleOAuthStrategy);
    passport.use("twitter", twitterOAuthStrategy);
    passport.serializeUser((user, done) => {
        try {
            const serialized = {
                id: user._id,
                payload: user.payload,
                frontendOrigin: user.frontendOrigin,
                sessionId: user.sessionId,
                socketAuthId: user.socketAuthId,
                accessToken: user.accessToken,
                refreshToken: user.refreshToken,
                username: user.username,
            };
            done(null, serialized);
        }
        catch (error) {
            logger.error("Serialization error:", error);
            done(error);
        }
    });
    passport.deserializeUser(async (serialized, done) => {
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
                socketAuthId: serialized.socketAuthId,
                accessToken: serialized.accessToken,
                refreshToken: serialized.refreshToken,
                username: serialized.username,
            };
            done(null, user);
        }
        catch (error) {
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
