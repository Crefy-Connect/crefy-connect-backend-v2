import { Schema, model } from "mongoose";
const TransactionSchema = new Schema({
    walletId: {
        type: Schema.Types.ObjectId,
        ref: 'Wallet',
        required: true
    },
    sessionId: {
        type: String,
        required: true,
        index: true
    },
    txHash: {
        type: String,
        index: true
    },
    chainId: { type: Number, required: true },
    rawTransaction: { type: String },
    transactionData: { type: Schema.Types.Mixed },
    status: {
        type: String,
        enum: ['pending', 'signed', 'rejected', 'broadcast', 'confirmed'],
        default: 'pending'
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});
TransactionSchema.index({ txHash: 1 }, { unique: true, sparse: true });
TransactionSchema.pre('save', function (next) {
    this.updatedAt = new Date();
    next();
});
export const Transaction = model('Transaction', TransactionSchema);
