import { Schema, model } from "mongoose";
const DeveloperSchema = new Schema({
    name: { type: String, required: true },
    email: { type: String, required: true },
    password: { type: String, required: true },
    apiKey: { type: String, required: true },
    isActive: { type: Boolean, default: false },
    otp: { type: Number, required: false },
    otpExpiresAt: { type: Date, required: false },
    passwordResetToken: { type: String, required: false },
    passwordResetExpires: { type: Date, required: false },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
});
DeveloperSchema.pre('save', function (next) {
    this.updatedAt = new Date();
    next();
});
export const Developer = model('Developer', DeveloperSchema);
