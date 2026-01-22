import { ConnectionSession } from "../models/session.model.js";
import { v4 as uuidv4 } from "uuid";
import logger from "../utils/logger.js";
import { verifyJWT } from "../utils/auth.js";
import { Developer } from "../models/developer.models.js";
import { App } from "../models/app.models.js";
import validationResult from "express-validator";
import { ApiError } from "../utils/apiError.js";
import { isJwtError } from "../utils/auth.js";
import { Wallet } from "../models/wallet.models.js";
import jwt from "jsonwebtoken";
import { jwt_config } from "../config/index.js";
/**
 * Authenticate developer using JWT token
 * @param req - Express Request object
 * @param res - Express Response object
 * @param next - Express Next function
 */
export async function authenticateDeveloper(req, res, next) {
    try {
        const token = req.headers["authorization"]?.split(" ")[1];
        console.log("TOKEN: ", token);
        if (!token) {
            throw new ApiError(401, "Authorization token required");
        }
        // Verify JWT token
        const decoded = verifyJWT(token);
        if (!decoded?.id) {
            throw new ApiError(401, "Invalid token");
        }
        // Check if developer exists and is active
        const developer = await Developer.findById(decoded.id);
        if (!developer) {
            throw new ApiError(404, "Developer account not found");
        }
        if (!developer.isActive) {
            throw new ApiError(403, "Developer account is not active");
        }
        console.log(decoded);
        // Attach user to request
        req.user = { id: decoded.id };
        next();
    }
    catch (error) {
        if (isJwtError(error)) {
            return res.status(401).json({
                success: false,
                message: error.name === "TokenExpiredError"
                    ? "Token has expired. Please login again."
                    : "Invalid token",
                error: error.name,
            });
        }
        if (error instanceof ApiError) {
            return res.status(error.statusCode).json({
                success: false,
                message: error.message,
            });
        }
        logger.error(`Authentication error: ${error}`);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
}
/**
 * Validate request body using express-validator
 * @param req - Express Request object
 * @param res - Express Response object
 * @param next - Express Next function
 */
export function validateRequest(req, res, next) {
    // @ts-ignore
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const errorMessages = errors.array().map((err) => err.msg);
        throw new ApiError(400, "Validation failed", errorMessages);
    }
    next();
}
/**
 * Validate 32-character hex appId in request params
 * @param req - Express Request object
 * @param res - Express Response object
 * @param next - Express Next function
 */
export async function validateAppIdMiddleware(req, res, next) {
    try {
        const { appId } = req.params;
        const app = await App.findOne({ appId }).select("+clientSecret");
        if (!app) {
            throw new ApiError(404, "Application not found");
        }
        const developer = await Developer.findById(app.developerId);
        if (!developer) {
            throw new ApiError(404, "Developer not found for this application");
        }
        if (!developer.isActive) {
            throw new ApiError(403, "Developer account is not active");
        }
        // Attach developer to request
        req.developer = developer;
        next();
    }
    catch (error) {
        if (error instanceof ApiError) {
            return res.status(error.statusCode).json({
                success: false,
                message: error.message,
                ...(error.errors && { errors: error.errors }),
            });
        }
        logger.error(`App ID validation error: ${error}`);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
}
/**
 * Handle Google Auth Session
 * @param req - Express Request object
 * @param res - Express Response object
 * @param next - Express Next function
 */
export const handleGoogleAuthSession = async (req, res, next) => {
    try {
        // Generate a unique session ID
        const sessionId = uuidv4();
        // Create a new session in the database
        const session = new ConnectionSession({
            sessionId,
            status: "pending",
            createdAt: new Date(),
            expiresAt: new Date(Date.now() + 3600000), // 1 hour expiration
        });
        await session.save();
        // Attach session ID to the request and response
        req.sessionId = sessionId;
        console.log("SESSION ID: ", sessionId);
        res.locals.sessionId = sessionId;
        next();
    }
    catch (error) {
        console.error("Error creating Google auth session:", error);
        res
            .status(500)
            .json({ error: "Failed to initialize authentication session" });
    }
};
export const verifyGoogleAuthSession = async (req, res, next) => {
    try {
        const sessionId = req.query.state || req.sessionId;
        if (!sessionId) {
            return res.status(400).json({ error: "Session ID is required" });
        }
        const session = await ConnectionSession.findOne({
            sessionId,
            status: "pending",
            expiresAt: { $gt: new Date() },
        });
        if (!session) {
            return res.status(404).json({ error: "Invalid or expired session" });
        }
        req.sessionId = sessionId;
        next();
    }
    catch (error) {
        console.error("Error verifying Google auth session:", error);
        res.status(500).json({ error: "Failed to verify authentication session" });
    }
};
export const checkNotAuthenticated = async (req, res, next) => {
    try {
        // Check for JWT token in Authorization header
        const token = req.header("Authorization")?.replace("Bearer ", "");
        if (!token) {
            return next(); // No token, proceed to route handler
        }
        // Verify token
        const decoded = verifyJWT(token);
        const wallet = await Wallet.findOne({
            address: decoded.walletAddress,
            isActive: true,
        });
        if (wallet) {
            throw new ApiError(403, "You are already logged in");
        }
        next();
    }
    catch (error) {
        next(); // If token is invalid, proceed to route handler
    }
};
export const checkWalletAuthenticated = async (req, res, next) => {
    try {
        logger.info(`Checking wallet authenticated: ${req.headers["authorization"]}`);
        const token = req.headers["authorization"]?.split(" ")[1];
        console.log("TOKEN: ", token);
        if (!token) {
            throw new ApiError(401, "Authorization token required");
        }
        // Verify token and handle JWT-specific errors
        const decoded = jwt.verify(token, jwt_config.secret);
        console.log("DECODED: ", decoded);
        // Validate decoded payload
        if (!decoded.address) {
            throw new ApiError(401, "Invalid token payload");
        }
        // Check wallet existence
        const wallet = await Wallet.findOne({
            address: decoded.address,
            isActive: true,
        });
        if (!wallet) {
            throw new ApiError(401, "Wallet not found");
        }
        req.wallet = wallet;
        next();
    }
    catch (error) {
        // Handle specific JWT errors
        if (error.name === "TokenExpiredError") {
            logger.error(`Authentication middleware error: Token expired`);
            return res.status(401).json({ error: "Token expired" });
        }
        if (error.name === "JsonWebTokenError") {
            logger.error(`Authentication middleware error: Invalid token`);
            return res.status(401).json({ error: "Invalid token" });
        }
        if (error instanceof ApiError) {
            return res.status(error.statusCode).json({ error: error.message });
        }
        // Fallback for unexpected errors
        logger.error(`Authentication middleware error: ${error}`);
        return res.status(500).json({ error: "Internal server error" });
    }
};
/**
 * Validate app using x-api-key header
 */
export async function validateApiKeyMiddleware(req, res, next) {
    try {
        const apiKey = req.headers["x-api-key"];
        if (!apiKey) {
            throw new ApiError(401, "API key required");
        }
        // Convert Mongoose document to plain object before attaching to req
        const app = await App.findOne({ appId: apiKey })
            .select("+clientSecret")
            .lean();
        if (!app) {
            throw new ApiError(404, "Application not found");
        }
        const developer = await Developer.findById(app.developerId).lean();
        if (!developer) {
            throw new ApiError(404, "Developer not found for this application");
        }
        if (!developer.isActive) {
            throw new ApiError(403, "Developer account is not active");
        }
        // Attach as plain objects
        req.developer_app = app;
        req.developer = developer;
        next();
    }
    catch (error) {
        if (error instanceof ApiError) {
            return res.status(error.statusCode).json({
                success: false,
                message: error.message,
                ...(error.errors && { errors: error.errors }),
            });
        }
        logger.error(`API key validation error: ${error}`);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
}
