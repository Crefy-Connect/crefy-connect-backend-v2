import { Document, Schema, model } from "mongoose";
import { generateAppId, generateClientSecret } from "../utils/auth.js";

interface IApp extends Document {
    developerId: Schema.Types.ObjectId;
    name: string;
    appId: string;
    description?: string;
    redirectUrls: string[];  // Changed to array for multiple URLs
    iconUrl?: string;
    clientSecret: string;   // Changed to camelCase for consistency
    createdAt: Date;
    updatedAt: Date;
}

const AppSchema = new Schema<IApp>({
    developerId: {
        type: Schema.Types.ObjectId,
        ref: 'Developer',
        required: true
    },
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100
    },
    appId: {
        type: String,
        required: true,
        unique: true,
        index: true,
        default: function () {
            return generateAppId(); // Generate default value
        },
        validate: {
            validator: (v: string) => /^[a-f0-9]{64}$/.test(v),
            message: 'App ID must be a 64-character hex string'
        }
    },
    description: {
        type: String,
        required: false,
        trim: true,
        maxlength: 500
    },
    redirectUrls: [{  // Changed to array of strings
        type: String,
        required: true,
        validate: {
            validator: function (urls: string[]) {
                return urls.length > 0; // At least one redirect URL required
            },
            message: 'At least one redirect URL is required'
        }
    }],
    iconUrl: {
        type: String,
        required: false,
        trim: true,
        validate: {
            validator: (v: string) => v.startsWith('https://') || v.startsWith('http://'),
            message: 'Icon URL must start with http:// or https://'
        }
    },
    clientSecret: {
        type: String,
        required: true,
        select: false,
        default: function () {
            return generateClientSecret(); // Generate default value
        }
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Auto-update timestamp
AppSchema.pre<IApp>('save', function (next) {
    this.updatedAt = new Date();
    next();
});

// Indexes for better query performance
AppSchema.index({ developerId: 1 });
AppSchema.index({ appId: 1 }, { unique: true });

export const App = model<IApp>('App', AppSchema);