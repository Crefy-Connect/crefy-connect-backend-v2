import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { jwt_config } from '../config/index.js';
/**
 * Generate a secure API key
 */
export function generateApiKey() {
    return crypto.randomBytes(32).toString('hex');
}
/**
 * Generate a hashed version of the API key for storage
 */
export function hashApiKey(apiKey) {
    return crypto
        .createHash('sha256')
        .update(apiKey)
        .digest('hex');
}
/**
 * Generate a 6-digit OTP
 */
export function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000);
}
/**
 * Expire the OTP after 4hours
 */
export function expireOTP(otp) {
    const now = new Date();
    now.setHours(now.getHours() + 4);
    return now;
}
/**
 * Hash a password
 */
export function hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
}
/**
 * Compare a password with a hashed password
 */
export function comparePassword(password, hashedPassword) {
    return crypto.createHash('sha256').update(password).digest('hex') === hashedPassword;
}
/**
 * Generate a JWT token
 */
export function generateJWT(payload) {
    return jwt.sign(payload, jwt_config.secret, { expiresIn: jwt_config.expiresIn });
}
/**
 * Verify a JWT token
 */
export function verifyJWT(token) {
    return jwt.verify(token, jwt_config.secret);
}
/**
 * Decode a JWT token
 */
export function decodeJWT(token) {
    return jwt.decode(token);
}
/**
 * Validate email format
 */
export function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}
/**
 * Generate a client secret
 */
export function generateClientSecret() {
    return crypto.randomBytes(32).toString('hex');
}
/**
 * Validate URLs
 */
export function validateUrls(urls) {
    return urls.every(url => url.startsWith('https://') || url.startsWith('http://'));
}
/**
 * Generate a unique app ID
 */
export function generateAppId() {
    return crypto.randomBytes(32).toString('hex');
}
/**
 * Validate a 64-character hex app ID
 */
export function validateAppId(appId) {
    return /^[a-f0-9]{64}$/.test(appId);
}
/**
 * isJwtError
 */
export function isJwtError(error) {
    return error.name && (error.name === 'TokenExpiredError' || error.name === 'JsonWebTokenError');
}
