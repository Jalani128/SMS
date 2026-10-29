import mongoose, { Schema } from 'mongoose';
import { tenantIsolationPlugin } from './plugins/tenantIsolation.plugin.js';
import { softDeletePlugin } from './plugins/softDelete.plugin.js';
const MessageSchema = new Schema({
    schoolId: {
        type: Schema.Types.ObjectId,
        ref: 'School',
        required: [true, 'School reference is required'],
        index: true,
    },
    conversationId: {
        type: Schema.Types.ObjectId,
        ref: 'Conversation',
        required: [true, 'Conversation reference is required'],
        index: true,
    },
    senderId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Message sender reference is required'],
        index: true,
    },
    content: {
        type: String,
        required: [true, 'Message content is required'],
        trim: true,
        maxlength: [5000, 'Message cannot exceed 5000 characters'],
    },
    messageType: {
        type: String,
        enum: ['text', 'system'],
        default: 'text',
        index: true,
    },
    attachments: [
        {
            name: { type: String, required: true, trim: true },
            url: { type: String, required: true, trim: true },
            fileType: { type: String, required: true, trim: true },
            sizeBytes: { type: Number, required: true },
            storageKey: { type: String, trim: true },
        },
    ],
    readBy: [
        {
            userId: {
                type: Schema.Types.ObjectId,
                ref: 'User',
                required: true,
            },
            readAt: {
                type: Date,
                default: Date.now,
            },
        },
    ],
    idempotencyKey: {
        type: String,
        trim: true,
        index: true,
    },
    editedAt: {
        type: Date,
        default: null,
    },
    deletedAt: {
        type: Date,
        default: null,
    },
}, {
    timestamps: true,
    toJSON: {
        virtuals: true,
        transform: (_doc, ret) => {
            delete ret.__v;
            return ret;
        },
    },
    toObject: { virtuals: true },
});
// Indexes for chronological retrieval and deduplication
MessageSchema.index({ schoolId: 1, conversationId: 1, createdAt: 1 });
MessageSchema.index({ schoolId: 1, conversationId: 1, createdAt: -1 });
MessageSchema.index({ schoolId: 1, conversationId: 1, idempotencyKey: 1 }, { sparse: true });
MessageSchema.plugin(tenantIsolationPlugin);
MessageSchema.plugin(softDeletePlugin);
export const Message = mongoose.model('Message', MessageSchema);
