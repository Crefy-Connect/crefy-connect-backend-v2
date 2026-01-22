import { Schema, model } from "mongoose";
const ENSRootSchema = new Schema({
    ens_name: {
        type: String,
        required: true,
        unique: true,
        validate: {
            validator: (v) => v.endsWith('.eth'),
            message: 'ENS name must end with .eth'
        }
    },
    contractAddress: {
        type: String,
        validate: {
            validator: (v) => /^0x[a-fA-F0-9]{40}$/.test(v),
            message: 'Invalid Ethereum address',
            required: function () {
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
            validator: (v) => /^0x[a-fA-F0-9]{64}$/.test(v),
            message: 'Invalid transaction hash'
        }
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
});
ENSRootSchema.pre('save', function (next) {
    this.updatedAt = new Date();
    next();
});
export const ENSRoot = model('ENSRoot', ENSRootSchema);
