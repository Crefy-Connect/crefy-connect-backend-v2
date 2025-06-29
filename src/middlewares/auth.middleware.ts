import { Request, Response, NextFunction } from 'express';
import { ConnectionSession } from '../models/session.model.js';
import { v4 as uuidv4 } from 'uuid';
import logger from "../utils/logger.js";
import { verifyJWT } from "../utils/auth.js";
import { Developer } from "../models/developer.models.js";
import { App } from "../models/app.modes.js";
import validationResult from "express-validator";
import { ApiError } from "../utils/apiError.js";
import { isJwtError, validateAppId } from "../utils/auth.js";

// Extend Express Request type
declare global {
    namespace Express {
        interface Request {
            user?: {
                id: string;
            };
            developer?: typeof Developer;
        }
    }
}

/**
 * Authenticate developer using JWT token
 * @param req - Express Request object
 * @param res - Express Response object
 * @param next - Express Next function
 */
export async function authenticateDeveloper(
    req: Request,
    res: Response,
    next: NextFunction
) {
    try {
        const token = req.headers['authorization']?.split(' ')[1];
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

        // Attach user to request
        req.user = { id: decoded.id };
        next();
    } catch (error: unknown) {
        if (isJwtError(error)) {
            return res.status(401).json({
                success: false,
                message: error.name === 'TokenExpiredError'
                    ? "Token has expired. Please login again."
                    : "Invalid token",
                error: error.name
            });
        }

        if (error instanceof ApiError) {
            return res.status(error.statusCode).json({
                success: false,
                message: error.message
            });
        }

        logger.error(`Authentication error: ${error}`);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
}

/**
 * Validate request body using express-validator
 * @param req - Express Request object
 * @param res - Express Response object
 * @param next - Express Next function
 */
export function validateRequest(
    req: Request,
    res: Response,
    next: NextFunction
) {
    // @ts-ignore
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const errorMessages = errors.array().map((err: any) => err.msg);
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
export async function validateAppIdMiddleware(
    req: Request,
    res: Response,
    next: NextFunction
) {
    try {
        const { appId } = req.params;
        const app = await App.findOne({ appId }).select('+clientSecret');
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
        (req as any).developer = developer;
        next();
    } catch (error) {
        if (error instanceof ApiError) {
            return res.status(error.statusCode).json({
                success: false,
                message: error.message,
                ...(error.errors && { errors: error.errors })
            });
        }

        logger.error(`App ID validation error: ${error}`);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
}

/**
 * Handle Google Auth Session
 * @param req - Express Request object
 * @param res - Express Response object
 * @param next - Express Next function
 */
export const handleGoogleAuthSession = async (req: Request, res: Response, next: NextFunction) => {
    try {
        // Generate a unique session ID
        const sessionId = uuidv4();

        // Create a new session in the database
        const session = new ConnectionSession({
            sessionId,
            status: 'pending',
            createdAt: new Date(),
            expiresAt: new Date(Date.now() + 3600000), // 1 hour expiration
        });

        await session.save();

        // Attach session ID to the request and response
        (req as any).sessionId = sessionId;
        res.locals.sessionId = sessionId;

        next();
    } catch (error) {
        console.error('Error creating Google auth session:', error);
        res.status(500).json({ error: 'Failed to initialize authentication session' });
    }
};


export const verifyGoogleAuthSession = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const sessionId = req.query.state || (req as any).sessionId;

        if (!sessionId) {
            return res.status(400).json({ error: 'Session ID is required' });
        }

        const session = await ConnectionSession.findOne({
            sessionId,
            status: 'pending',
            expiresAt: { $gt: new Date() }
        });

        if (!session) {
            return res.status(404).json({ error: 'Invalid or expired session' });
        }

        (req as any).sessionId = sessionId;
        next();
    } catch (error) {
        console.error('Error verifying Google auth session:', error);
        res.status(500).json({ error: 'Failed to verify authentication session' });
    }
};
