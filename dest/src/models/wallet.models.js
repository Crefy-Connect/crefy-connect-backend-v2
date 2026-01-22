import { Schema, model } from "mongoose";
const WalletSchema = new Schema({
    appId: { type: String, required: true },
    email: {
        type: String,
        required: false,
        index: true,
        validate: {
            validator: function (v) {
                // Only validate if both email and phoneNumber are missing
                if (!v && !this.phoneNumber) {
                    return false;
                }
                return true;
            },
            message: "Either email or phoneNumber must be provided",
        },
    },
    phoneNumber: {
        type: String,
        required: false,
        index: true,
        validate: {
            validator: function (v) {
                // Only validate if both email and phoneNumber are missing
                if (!v && !this.email) {
                    return false;
                }
                return true;
            },
            message: "Either email or phoneNumber must be provided",
        },
    },
    subname: { type: String, required: false },
    socialType: { type: String, required: true },
    address: { type: String, required: true, index: true },
    publicKey: { type: String, required: true },
    encryptedPrivateKey: { type: String, required: true },
    encryptionSalt: { type: String, required: true },
    userData: { type: String, required: false },
    createdAt: { type: Date, default: Date.now },
    isActive: { type: Boolean, default: false },
    otp: { type: String, required: false },
    otpExpiry: { type: Date, required: false },
    updatedAt: { type: Date, default: Date.now },
    oauthTokens: {
        accessToken: { type: String },
        refreshToken: { type: String },
    },
});
// Updated index to include phoneNumber
WalletSchema.index({ appId: 1, address: 1 }, { unique: true });
// Corrected indexes
WalletSchema.index({ appId: 1, address: 1 }, { unique: true });
// Email index - only applies when email exists
WalletSchema.index({ appId: 1, email: 1 }, {
    unique: true,
    partialFilterExpression: {
        email: { $exists: true, $ne: null },
    },
});
// PhoneNumber index - only applies when phoneNumber exists
WalletSchema.index({ appId: 1, phoneNumber: 1 }, {
    unique: true,
    partialFilterExpression: {
        phoneNumber: { $exists: true, $ne: null },
    },
});
WalletSchema.pre("save", function (next) {
    this.updatedAt = new Date();
    if (!this.email) {
        this.email = undefined;
    }
    if (!this.phoneNumber) {
        this.phoneNumber = undefined;
    }
    next();
});
export const Wallet = model("Wallet", WalletSchema);
