import mongoose, { Schema } from 'mongoose';
import { tenantIsolationPlugin } from './plugins/tenantIsolation.plugin.js';
import { softDeletePlugin } from './plugins/softDelete.plugin.js';
const GradeBandSchema = new Schema({
    grade: {
        type: String,
        required: [true, 'Grade label is required (e.g., A+, B, C)'],
        trim: true,
        uppercase: true,
        maxlength: [10, 'Grade cannot exceed 10 characters'],
    },
    minPercentage: {
        type: Number,
        required: [true, 'Minimum percentage boundary is required'],
        min: [0, 'Minimum percentage cannot be negative'],
        max: [100, 'Minimum percentage cannot exceed 100'],
    },
    maxPercentage: {
        type: Number,
        required: [true, 'Maximum percentage boundary is required'],
        min: [0, 'Maximum percentage cannot be negative'],
        max: [100, 'Maximum percentage cannot exceed 100'],
    },
    gradePoint: {
        type: Number,
        min: [0, 'Grade point cannot be negative'],
    },
    isPassing: {
        type: Boolean,
        default: true,
    },
    description: {
        type: String,
        trim: true,
        maxlength: [150, 'Description cannot exceed 150 characters'],
    },
}, { _id: false });
const GradingScaleSchema = new Schema({
    schoolId: {
        type: Schema.Types.ObjectId,
        ref: 'School',
        required: [true, 'School reference is required'],
        index: true,
    },
    name: {
        type: String,
        required: [true, 'Grading scale name is required'],
        trim: true,
        maxlength: [100, 'Scale name cannot exceed 100 characters'],
    },
    description: {
        type: String,
        trim: true,
        maxlength: [300, 'Description cannot exceed 300 characters'],
    },
    isDefault: {
        type: Boolean,
        default: false,
        index: true,
    },
    bands: [
        {
            grade: {
                type: String,
                required: [true, 'Grade label is required'],
                trim: true,
                uppercase: true,
                maxlength: 10,
            },
            minPercentage: {
                type: Number,
                required: [true, 'Minimum percentage boundary is required'],
                min: 0,
                max: 100,
            },
            maxPercentage: {
                type: Number,
                required: [true, 'Maximum percentage boundary is required'],
                min: 0,
                max: 100,
            },
            gradePoint: {
                type: Number,
                min: 0,
            },
            isPassing: {
                type: Boolean,
                default: true,
            },
            description: {
                type: String,
                trim: true,
                maxlength: 150,
            },
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
GradingScaleSchema.index({ schoolId: 1, name: 1 }, { unique: true });
GradingScaleSchema.index({ schoolId: 1, isDefault: 1 });
GradingScaleSchema.plugin(tenantIsolationPlugin);
GradingScaleSchema.plugin(softDeletePlugin);
export const GradingScale = mongoose.model('GradingScale', GradingScaleSchema);
