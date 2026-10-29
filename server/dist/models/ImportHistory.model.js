import mongoose, { Schema } from 'mongoose';
import { tenantIsolationPlugin } from './plugins/tenantIsolation.plugin.js';
import { softDeletePlugin } from './plugins/softDelete.plugin.js';
const ImportHistorySchema = new Schema({
    schoolId: {
        type: Schema.Types.ObjectId,
        ref: 'School',
        required: [true, 'School reference is required'],
        index: true,
    },
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'User reference is required'],
        index: true,
    },
    batchId: {
        type: String,
        required: [true, 'Import batch identifier is required'],
        unique: true,
        index: true,
        trim: true,
    },
    importType: {
        type: String,
        enum: {
            values: ['teachers', 'students', 'parents'],
            message: 'Import type must be teachers, students, or parents',
        },
        required: [true, 'Import type is required'],
        index: true,
    },
    filename: {
        type: String,
        required: [true, 'Filename is required'],
        trim: true,
        maxlength: [255, 'Filename cannot exceed 255 characters'],
    },
    status: {
        type: String,
        enum: {
            values: ['preview', 'completed', 'partial', 'failed'],
            message: 'Invalid import status',
        },
        default: 'preview',
        index: true,
    },
    totalRows: {
        type: Number,
        default: 0,
        min: 0,
    },
    validRows: {
        type: Number,
        default: 0,
        min: 0,
    },
    invalidRows: {
        type: Number,
        default: 0,
        min: 0,
    },
    importedRows: {
        type: Number,
        default: 0,
        min: 0,
    },
    failedRows: {
        type: Number,
        default: 0,
        min: 0,
    },
    duplicateRows: {
        type: Number,
        default: 0,
        min: 0,
    },
    rowErrors: [
        {
            row: { type: Number, required: true },
            identifier: { type: String, trim: true },
            field: { type: String, trim: true },
            message: { type: String, required: true, trim: true },
        },
    ],
    summary: {
        type: String,
        default: '',
        trim: true,
    },
    stagedData: {
        type: Schema.Types.Mixed,
        default: [],
        select: false, // Omit from default query to prevent memory bloat
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
ImportHistorySchema.plugin(tenantIsolationPlugin);
ImportHistorySchema.plugin(softDeletePlugin);
// Compound index for querying imports by school ordered by creation date
ImportHistorySchema.index({ schoolId: 1, createdAt: -1 });
export const ImportHistory = mongoose.model('ImportHistory', ImportHistorySchema);
