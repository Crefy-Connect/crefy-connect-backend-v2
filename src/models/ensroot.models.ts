import { Document, Schema, model } from "mongoose";

interface IENSRoot extends Document {
    ens_name: string; // e.g., "myplatform.eth"
    contractAddress: string;
    ownerAppId: string; // Reference to the App that owns this root ENS
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const ENSRootSchema = new Schema<IENSRoot>({
    ens_name: {
        type: String,
        required: true,
        unique: true,
        validate: {
            validator: (v: string) => v.endsWith('.eth'),
            message: 'ENS name must end with .eth'
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
    ownerAppId: {
        type: String,
        required: true,
        ref: 'App'
    },
    isActive: {
        type: Boolean,
        default: true
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
});

ENSRootSchema.pre<IENSRoot>('save', function (next) {
    this.updatedAt = new Date();
    next();
});

export const ENSRoot = model<IENSRoot>('ENSRoot', ENSRootSchema);