import { Schema, model } from "mongoose";
const WalletSchema = new Schema({
    appId: { type: String, required: true },
    email: { type: String, required: true, },
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
});
WalletSchema.index({ appId: 1, address: 1 }, { unique: true });
WalletSchema.pre('save', function (next) {
    this.updatedAt = new Date();
    next();
});
export const Wallet = model('Wallet', WalletSchema);
