import { Document, Schema, model } from "mongoose";

export interface IWallet extends Document {
    appId: string;
    email: string;
    socialType: string;
    address: string;
    publicKey: string;
    encryptedPrivateKey: string;
    encryptionSalt: string;
    userData: string;
    createdAt: Date;
    updatedAt: Date;
    isActive: boolean;
    otp: string;
    otpExpiry: Date;
    oauthTokens?: {
        accessToken?: string;
        refreshToken?: string;
    };
}

const WalletSchema = new Schema<IWallet>({
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
    oauthTokens: {
        accessToken: { type: String },
        refreshToken: { type: String }
    },
});

WalletSchema.index({ appId: 1, address: 1 }, { unique: true });

WalletSchema.pre<IWallet>('save', function (next) {
    this.updatedAt = new Date();
    next();
});

export const Wallet = model<IWallet>('Wallet', WalletSchema);