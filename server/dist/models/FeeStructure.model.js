import mongoose, { Schema, Types } from 'mongoose';
import { tenantIsolationPlugin } from './plugins/tenantIsolation.plugin.js';
import { softDeletePlugin } from './plugins/softDelete.plugin.js';
const FeeStructureSchema = new Schema({
    schoolId: {
        type: Schema.Types.ObjectId,
        ref: 'School',
        required: [true, 'School reference is required'],
        index: true,
    },
    academicSessionId: {
        type: Schema.Types.ObjectId,
        ref: 'AcademicSession',
        required: [true, 'Academic session reference is required'],
        index: true,
    },
    classId: {
        type: Schema.Types.ObjectId,
        ref: 'Class',
        required: [true, 'Class reference is required'],
        index: true,
    },
    sectionId: {
        type: Schema.Types.ObjectId,
        ref: 'Section',
        default: null,
        index: true,
    },
    name: {
        type: String,
        required: [true, 'Fee structure name is required'],
        trim: true,
        maxlength: [150, 'Fee structure name cannot exceed 150 characters'],
    },
    currency: {
        type: String,
        default: 'USD',
        trim: true,
        uppercase: true,
    },
    frequency: {
        type: String,
        enum: ['one_time', 'annual', 'half_yearly', 'quarterly', 'term', 'monthly'],
        default: 'term',
    },
    effectiveStartDate: {
        type: Date,
        default: null,
    },
    effectiveEndDate: {
        type: Date,
        default: null,
    },
    lineItems: [
        {
            name: { type: String, required: true, trim: true },
            amount: {
                type: Schema.Types.Decimal128,
                required: [true, 'Fee head amount is required as Decimal128'],
            },
            frequency: {
                type: String,
                enum: ['one_time', 'annual', 'half_yearly', 'quarterly', 'term', 'monthly'],
                default: 'term',
            },
            isOptional: { type: Boolean, default: false },
            description: { type: String, trim: true },
        },
    ],
    concessions: [
        {
            name: { type: String, required: true, trim: true },
            type: { type: String, enum: ['percentage', 'fixed'], required: true },
            value: { type: Schema.Types.Decimal128, required: true },
            criteria: { type: String, trim: true },
        },
    ],
    lateFeePolicy: {
        enabled: { type: Boolean, default: false },
        type: { type: String, enum: ['fixed', 'percentage'], default: 'fixed' },
        amount: { type: Schema.Types.Decimal128, default: () => Types.Decimal128.fromString('0.00') },
        graceDays: { type: Number, default: 7 },
    },
    dueDateRule: {
        dayOfMonth: { type: Number, min: 1, max: 31, default: 10 },
        graceDays: { type: Number, min: 0, max: 60, default: 7 },
    },
    status: {
        type: String,
        enum: ['active', 'archived'],
        default: 'active',
        index: true,
    },
    createdBy: {
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
FeeStructureSchema.index({ schoolId: 1, academicSessionId: 1, classId: 1, status: 1 });
FeeStructureSchema.plugin(tenantIsolationPlugin);
FeeStructureSchema.plugin(softDeletePlugin);
export const FeeStructure = mongoose.model('FeeStructure', FeeStructureSchema);
