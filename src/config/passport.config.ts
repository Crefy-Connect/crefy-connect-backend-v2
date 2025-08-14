import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Wallet } from '../models/wallet.models.js';
import { ConnectionSession } from '../models/session.model.js';
import WalletGenerationService from '../services/wallet.generate.services.js';
import { server_config } from './index.js';
import crypto from 'crypto';
import logger from '../utils/logger.js';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { URL } from 'url';

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
}

// Enhanced JWT Token Generation
const generateAuthToken = (wallet: any): string => {
    if (!process.env.JWT_SECRET) {
        throw new Error('JWT_SECRET is not defined in environment variables');
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
        { expiresIn: '1h' }
    );
};

// More robust state parameter parsing
const parseState = (state: string): StateParams => {
    try {
        const parsed = JSON.parse(state) as StateParams;

        // Validate required fields
        if (!parsed.sessionId || !parsed.frontendOrigin) {
            throw new Error('Invalid state structure');
        }

        return parsed;
    } catch (e) {
        logger.error('Invalid state parameter:', state, e);
        return {
            sessionId: crypto.randomUUID(),
            frontendOrigin: server_config.baseUrl
        };
    }
};

// Enhanced Google Strategy with better error handling
const googleOAuthStrategy = new GoogleStrategy(
    {
        clientID: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        callbackURL: new URL('/api/v1/oauth/google/callback', server_config.baseUrl).toString(),
        passReqToCallback: true,
        scope: ['profile', 'email'],
        state: true
    },
    async (req: any, accessToken: string, refreshToken: string, profile: GoogleProfile, done: Function) => {
        logger.info('Google OAuth callback initiated', {
            profileId: profile.id,
            email: profile.emails?.[0]?.value
        });

        const transaction = await mongoose.startSession();
        transaction.startTransaction();

        try {
            // Enhanced profile logging
            logger.debug('Google OAuth profile:', {
                id: profile.id,
                name: profile.displayName,
                email: profile.emails?.[0]?.value,
                photo: profile.photos?.[0]?.value
            });

            const email = profile.emails?.[0]?.value;
            if (!email) {
                throw new Error('No verified email found in Google profile');
            }

            // State validation
            if (!req.query.state) {
                throw new Error('Missing state parameter');
            }

            const state = parseState(req.query.state as string);
            const { sessionId, frontendOrigin, appId = 'default' } = state;

            logger.info(`Processing Google OAuth for email: ${email}`, {
                appId,
                sessionId
            });

            // Find or create wallet with transaction
            let wallet = await Wallet.findOne({ email, socialType: 'google' }).session(transaction);

            if (!wallet) {
                logger.info('Creating new wallet for Google user', { email });
                const { address, privateKey, publicKey } = await WalletGenerationService.generateAddress();
                const encryptionSalt = crypto.randomBytes(16).toString('hex');

                [wallet] = await Wallet.create([{
                    appId,
                    email,
                    socialType: 'google',
                    address,
                    publicKey,
                    encryptedPrivateKey: privateKey,
                    encryptionSalt,
                    userData: JSON.stringify(profile),
                    isActive: true,
                    oauthTokens: {
                        accessToken,
                        refreshToken
                    }
                }], { session: transaction });

                logger.info(`Created new wallet for Google user: ${address}`);
            } else {
                logger.info('Found existing wallet for Google user', {
                    address: wallet.address
                });

            }

            // Generate JWT token
            const token = generateAuthToken(wallet);
            logger.debug('Generated JWT token for wallet', {
                walletId: wallet._id,
                token: token.substring(0, 10) + '...'
            });

            // Prepare auth payload for frontend
            const payload: AuthPayload = {
                type: 'AUTH_SUCCESS',
                payload: {
                    wallet: {
                        address: wallet.address,
                        email: wallet.email,
                        publicKey: wallet.publicKey,
                        socialType: wallet.socialType
                    },
                    token,
                    sessionId
                }
            };

            // Update session if exists
            if (sessionId) {
                await ConnectionSession.findOneAndUpdate(
                    { sessionId },
                    {
                        walletId: wallet._id,
                        status: 'connected',
                        peerMeta: {
                            name: profile.displayName,
                            email: email,
                            profileImage: profile.photos?.[0]?.value
                        },
                        updatedAt: new Date()
                    },
                    {
                        session: transaction,
                        upsert: true
                    }
                );
            }

            await transaction.commitTransaction();
            logger.info('Google OAuth transaction committed successfully');

            // Pass additional data to callback
            return done(null, {
                ...wallet.toObject(),
                payload,
                frontendOrigin,
                sessionId,
                accessToken,
                refreshToken
            });

        } catch (error) {
            await transaction.abortTransaction();
            logger.error('Google OAuth transaction failed', {
                error: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : undefined
            });

            if (req.query.state) {
                const state = parseState(req.query.state as string);
                try {
                    await ConnectionSession.findOneAndUpdate(
                        { sessionId: state.sessionId },
                        {
                            status: 'failed',
                            error: (error as Error).message,
                            updatedAt: new Date()
                        }
                    );
                } catch (sessionError) {
                    logger.error('Failed to update session status', {
                        sessionError
                    });
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
    passport.unuse('google');

    // Use the enhanced strategy
    passport.use('google', googleOAuthStrategy);

    // Enhanced serialization
    passport.serializeUser((user: any, done) => {
        try {
            const serialized = {
                id: user._id,
                payload: user.payload,
                frontendOrigin: user.frontendOrigin,
                sessionId: user.sessionId,
                accessToken: user.accessToken,
                refreshToken: user.refreshToken
            };
            done(null, serialized);
        } catch (error) {
            logger.error('Serialization error:', error);
            done(error);
        }
    });

    // Enhanced deserialization
    passport.deserializeUser(async (serialized: any, done) => {
        try {
            if (!serialized?.id) {
                logger.warn('Deserialization attempted with invalid serialized data', { serialized });
                return done(null, false); // Indicate no user found without error
            }

            const wallet = await Wallet.findById(serialized.id);
            if (!wallet) {
                logger.warn('Wallet not found during deserialization', { walletId: serialized.id });

                // Optionally clean up the session
                if (serialized.sessionId) {
                    await ConnectionSession.deleteOne({ sessionId: serialized.sessionId });
                }

                return done(null, false); // Indicate no user found without error
            }

            const user = {
                ...wallet.toObject(),
                payload: serialized.payload,
                frontendOrigin: serialized.frontendOrigin,
                sessionId: serialized.sessionId,
                accessToken: serialized.accessToken,
                refreshToken: serialized.refreshToken
            };

            done(null, user);
        } catch (error) {
            logger.error('Deserialization error:', error);
            done(null, false); // Fail gracefully
        }
    });

    return passport;
};

export const passportInstance = configurePassport();
export const passportInit = passportInstance.initialize();
export const passportSession = passportInstance.session();

export default passportInstance;