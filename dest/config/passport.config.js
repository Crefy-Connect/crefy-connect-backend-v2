import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Wallet } from '../models/wallet.models.js';
import { ConnectionSession } from '../models/session.model.js';
import WalletGenerationService from '../services/wallet.generate.services.js';
import { server_config } from './index.js';
import crypto from 'crypto';
import logger from '../utils/logger.js';
import mongoose from 'mongoose';
const googleOAuthStrategy = new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: `${server_config.baseUrl}/api/v1/oauth/google/callback`,
    passReqToCallback: true,
    scope: ['profile', 'email'],
    state: true,
}, async (req, _accessToken, _refreshToken, profile, done) => {
    const transaction = await mongoose.startSession();
    transaction.startTransaction();
    try {
        const email = profile.emails?.[0]?.value;
        if (!email) {
            throw new Error('No email found in Google profile');
        }
        const appId = req.params.appId || req.query.appId || 'default';
        const sessionId = req.query.state;
        logger.info(`Google OAuth for email: ${email}, appId: ${appId}`);
        // Find or create wallet
        let wallet = await Wallet.findOne({ email, socialType: 'google' }).session(transaction);
        if (!wallet) {
            const { address, privateKey, publicKey } = await WalletGenerationService.generateAddress();
            const encryptionSalt = crypto.randomBytes(16).toString('hex');
            wallet = await Wallet.create([{
                    appId,
                    email,
                    socialType: 'google',
                    address,
                    publicKey,
                    encryptedPrivateKey: privateKey,
                    encryptionSalt,
                    userData: profile,
                    isActive: true
                }], { session: transaction });
            logger.info(`Created new wallet for Google user: ${address}`);
        }
        // Update session if exists
        if (sessionId) {
            await ConnectionSession.findOneAndUpdate({ sessionId }, {
                walletId: wallet?._id,
                status: 'connected',
                peerMeta: {
                    name: profile.displayName,
                    email: email,
                    profileImage: profile.photos?.[0]?.value
                },
                updatedAt: new Date()
            }, { session: transaction });
        }
        await transaction.commitTransaction();
        return done(null, wallet);
    }
    catch (error) {
        await transaction.abortTransaction();
        logger.error(`Google OAuth error: ${error}`);
        if (req.query.state) {
            await ConnectionSession.findOneAndUpdate({ sessionId: req.query.state }, { status: 'failed', error: error.message }, { session: transaction }).catch(e => logger.error('Session update error:', e));
        }
        return done(error);
    }
    finally {
        transaction.endSession();
    }
});
const configurePassport = () => {
    passport.use('google', googleOAuthStrategy);
    passport.serializeUser((wallet, done) => {
        done(null, wallet._id);
    });
    passport.deserializeUser(async (id, done) => {
        try {
            const wallet = await Wallet.findById(id);
            done(null, wallet);
        }
        catch (error) {
            done(error);
        }
    });
    return passport;
};
export const passportInstance = configurePassport();
export const passportInit = passportInstance.initialize();
export const passportSession = passportInstance.session();
export default passportInstance;
