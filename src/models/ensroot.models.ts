import { Document, Schema, model } from "mongoose";

interface IENSRoot extends Document {
    ens_name: string; // e.g., "myplatform.eth"
    contractAddress?: string; // Made optional since it might not exist initially
    ownerAppId: string; // Reference to the App that owns this root ENS
    status: 'pending' | 'active' | 'failed';
    txHash?: string; // Store the transaction hash for tracking
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
        validate: {
            validator: (v: string) => /^0x[a-fA-F0-9]{40}$/.test(v),
            message: 'Invalid Ethereum address',
            required: function (this: IENSRoot) {
                return this.status === 'active'; // Required only when active
            }
        }
    },
    ownerAppId: {
        type: String,
        required: true,
        ref: 'App'
    },
    status: {
        type: String,
        enum: ['pending', 'active', 'failed'],
        default: 'pending'
    },
    txHash: {
        type: String,
        validate: {
            validator: (v: string) => /^0x[a-fA-F0-9]{64}$/.test(v),
            message: 'Invalid transaction hash'
        }
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
});

ENSRootSchema.pre<IENSRoot>('save', function (next) {
    this.updatedAt = new Date();
    next();
});

export const ENSRoot = model<IENSRoot>('ENSRoot', ENSRootSchema);