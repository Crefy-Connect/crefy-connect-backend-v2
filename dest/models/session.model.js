import { Schema, model } from "mongoose";
const ConnectionSessionSchema = new Schema({
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
export const ConnectionSession = model('ConnectionSession', ConnectionSessionSchema);
