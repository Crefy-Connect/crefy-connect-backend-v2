import { Document, Schema, model } from "mongoose";

interface IENSClaimable extends Document {
    rootName: string; // Reference to the root ENS
    subname: string; // e.g., "user123" (full name would be "user123.myplatform.eth")
    walletAddress: string; // The wallet that can claim this subname
    contractAddress: string; // The contract address created by the factory
    claimCode: string; // Unique code for claiming
    isClaimed: boolean;
    claimedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
    appId: string; // Reference to the App that created this claimable
}

const ENSClaimableSchema = new Schema<IENSClaimable>({
    rootName: {
        type: String,
        required: true,
        ref: 'ENSRoot'
    },
    subname: {
        type: String,
        required: true,
        validate: {
            validator: (v: string) => !v.includes('.') && !v.includes(' '),
            message: 'Subname cannot contain dots or spaces'
        }
    },
    walletAddress: {
        type: String,
        required: true,
        validate: {
            validator: (v: string) => /^0x[a-fA-F0-9]{40}$/.test(v),
            message: 'Invalid Ethereum address'
        }
    },
    contractAddress: {
        type: String,
        required: true,
        validate: {
            validator: (v: string) => /^0x[a-fA-F0-9]{40}$/.test(v),
            message: 'Invalid Ethereum address'
        }
    },
    claimCode: {
        type: String,
        required: true,
        unique: true
    },
    isClaimed: {
        type: Boolean,
        default: false
    },
    claimedAt: {
        type: Date,
        required: false
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    appId: {
        type: String,
        required: true,
        ref: 'App'
    },
});

// Compound index to ensure unique subnames per root
ENSClaimableSchema.index({ rootName: 1, subname: 1 }, { unique: true });

// Index for faster lookups by claim code
ENSClaimableSchema.index({ claimCode: 1 });

ENSClaimableSchema.pre<IENSClaimable>('save', function (next) {
    this.updatedAt = new Date();
    next();
});

export const ENSClaimable = model<IENSClaimable>('ENSClaimable', ENSClaimableSchema);