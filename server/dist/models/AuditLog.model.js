import mongoose, { Schema } from 'mongoose';
const AuditLogSchema = new Schema({
    actorId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        index: true,
    },
    actorRole: {
        type: String,
        trim: true,
    },
    schoolId: {
        type: Schema.Types.ObjectId,
        ref: 'School',
        index: true,
    },
    action: {
        type: String,
        required: [true, 'Audit action is required'],
        trim: true,
        uppercase: true,
        index: true,
    },
    targetResource: {
        type: String,
        required: [true, 'Target resource name is required'],
        trim: true,
        index: true,
    },
    targetResourceId: {
        type: Schema.Types.Mixed,
        index: true,
    },
    ipAddress: {
        type: String,
        trim: true,
    },
    userAgent: {
        type: String,
        trim: true,
    },
    metadata: {
        type: Schema.Types.Mixed,
        default: {},
    },
    timestamp: {
        type: Date,
        default: Date.now,
        index: true,
    },
}, {
    timestamps: { createdAt: true, updatedAt: false }, // Audit logs are immutable append-only records
    toJSON: {
        transform: (_doc, ret) => {
            delete ret.__v;
            return ret;
        },
    },
});
/**
 * Audit log sanitization hook:
 * Guaranteed exclusion of passwords, hashes, tokens, OTPs, or API secrets from audit metadata.
 * Explicitly does not persist AI raw prompt/output dumps by default.
 */
AuditLogSchema.pre('save', function (next) {
    if (this.metadata && typeof this.metadata === 'object') {
        const sensitiveKeys = [
            'password',
            'passwordHash',
            'hashedOTP',
            'otp',
            'token',
            'accessToken',
            'refreshToken',
            'secret',
            'apiKey',
            'aiPrompt',
            'aiOutput',
        ];
        const cleanObject = (obj) => {
            if (!obj || typeof obj !== 'object')
                return obj;
            if (Array.isArray(obj))
                return obj.map(cleanObject);
            const cleaned = {};
            for (const [key, value] of Object.entries(obj)) {
                if (sensitiveKeys.some((k) => key.toLowerCase().includes(k.toLowerCase()))) {
                    cleaned[key] = '[REDACTED_SENSITIVE_DATA]';
                }
                else if (typeof value === 'object') {
                    cleaned[key] = cleanObject(value);
                }
                else {
                    cleaned[key] = value;
                }
            }
            return cleaned;
        };
        this.metadata = cleanObject(this.metadata);
    }
    next();
});
AuditLogSchema.index({ schoolId: 1, timestamp: -1 });
AuditLogSchema.index({ schoolId: 1, targetResource: 1, targetResourceId: 1 });
export const AuditLog = mongoose.model('AuditLog', AuditLogSchema);
