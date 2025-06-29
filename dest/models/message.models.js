import { Schema, model } from "mongoose";
const MessageSchema = new Schema({
    sessionId: {
        type: String,
        required: true,
        index: true
    },
    topic: { type: String, required: true },
    message: { type: String, required: true },
    type: {
        type: String,
        enum: ['pub', 'sub'],
        required: true
    },
    timestamp: {
        type: Date,
        default: Date.now,
        expires: 3600 // Auto-delete after 1 hour
    }
});
MessageSchema.index({ sessionId: 1, topic: 1 });
export const Message = model('Message', MessageSchema);
