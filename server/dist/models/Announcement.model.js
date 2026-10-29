import mongoose, { Schema } from 'mongoose';
import { tenantIsolationPlugin } from './plugins/tenantIsolation.plugin.js';
import { softDeletePlugin } from './plugins/softDelete.plugin.js';
const AnnouncementSchema = new Schema({
    schoolId: {
        type: Schema.Types.ObjectId,
        ref: 'School',
        required: [true, 'School reference is required'],
        index: true,
    },
    title: {
        type: String,
        required: [true, 'Announcement title is required'],
        trim: true,
        maxlength: [250, 'Title cannot exceed 250 characters'],
    },
    content: {
        type: String,
        required: [true, 'Announcement content is required'],
        trim: true,
    },
    targetAudience: {
        type: String,
        enum: {
            values: ['all', 'teachers', 'students', 'parents', 'class'],
            message: 'Target audience must be all, teachers, students, parents, or class',
        },
        required: [true, 'Target audience is required'],
        index: true,
    },
    targetClassId: {
        type: Schema.Types.ObjectId,
        ref: 'Class',
        index: true,
    },
    targetSectionId: {
        type: Schema.Types.ObjectId,
        ref: 'Section',
        index: true,
    },
    authorId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Author user reference is required'],
        index: true,
    },
    publishedAt: {
        type: Date,
        default: null,
        index: true,
    },
    expiresAt: {
        type: Date,
        default: null,
    },
    status: {
        type: String,
        enum: ['draft', 'published', 'archived'],
        default: 'draft',
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
AnnouncementSchema.index({ schoolId: 1, status: 1, publishedAt: -1 });
AnnouncementSchema.plugin(tenantIsolationPlugin);
AnnouncementSchema.plugin(softDeletePlugin);
export const Announcement = mongoose.model('Announcement', AnnouncementSchema);
