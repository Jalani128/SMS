import mongoose, { Schema } from 'mongoose';
import { tenantIsolationPlugin } from './plugins/tenantIsolation.plugin.js';
import { softDeletePlugin } from './plugins/softDelete.plugin.js';
const SchoolOnboardingSchema = new Schema({
    schoolId: {
        type: Schema.Types.ObjectId,
        ref: 'School',
        required: [true, 'School reference is required'],
        unique: true,
        index: true,
    },
    currentStep: {
        type: Number,
        default: 1,
        min: [1, 'Step must be at least 1'],
        max: [6, 'Step cannot exceed 6'],
    },
    completedSteps: {
        type: [Number],
        default: [],
    },
    status: {
        type: String,
        enum: {
            values: ['not_started', 'in_progress', 'completed'],
            message: 'Invalid onboarding status',
        },
        default: 'not_started',
        index: true,
    },
    stepsData: {
        type: Schema.Types.Mixed,
        default: {},
    },
    completedAt: {
        type: Date,
        default: null,
    },
    completedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
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
SchoolOnboardingSchema.plugin(tenantIsolationPlugin);
SchoolOnboardingSchema.plugin(softDeletePlugin);
export const SchoolOnboarding = mongoose.model('SchoolOnboarding', SchoolOnboardingSchema);
