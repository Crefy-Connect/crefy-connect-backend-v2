import { Document, Schema, model } from "mongoose";

interface ITransaction extends Document {
    walletId: Schema.Types.ObjectId;
    sessionId: string;
    txHash?: string;
    chainId: number;
    rawTransaction?: string;
    transactionData?: any;
    status: 'pending' | 'signed' | 'rejected' | 'broadcast' | 'confirmed';
    createdAt: Date;
    updatedAt: Date;
}

const TransactionSchema = new Schema<ITransaction>({
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

TransactionSchema.pre<ITransaction>('save', function (next) {
    this.updatedAt = new Date();
    next();
});

export const Transaction = model<ITransaction>('Transaction', TransactionSchema);