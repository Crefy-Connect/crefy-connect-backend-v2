import { Document, Schema, model } from "mongoose";

interface IConnectionSession extends Document {
    walletId: Schema.Types.ObjectId;
    sessionId: string;
    status: 'pending' | 'connected' | 'disconnected';
    peerMeta?: any;
    chainId?: number;
    handshakeTopic?: string;
    socketId?: string;
    createdAt: Date;
    updatedAt: Date;
    expiresAt?: Date;
}

const ConnectionSessionSchema = new Schema<IConnectionSession>({
    walletId: { type: Schema.Types.ObjectId, ref: 'Wallet' },
    sessionId: { type: String, required: true, unique: true, index: true },
    status: { type: String, enum: ['pending', 'connected', 'disconnected'], default: 'pending' },
    peerMeta: { type: Schema.Types.Mixed },
    chainId: { type: Number },
    handshakeTopic: { type: String },
    socketId: { type: String },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 86400 // Auto-delete after 24 hours
    },
    expiresAt: { type: Date }
});

export const ConnectionSession = model<IConnectionSession>('ConnectionSession', ConnectionSessionSchema);   