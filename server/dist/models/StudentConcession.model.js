import mongoose, { Schema } from 'mongoose';
import { tenantIsolationPlugin } from './plugins/tenantIsolation.plugin.js';
import { softDeletePlugin } from './plugins/softDelete.plugin.js';
const StudentConcessionSchema = new Schema({
    schoolId: {
        type: Schema.Types.ObjectId,
        ref: 'School',
        required: [true, 'School reference is required'],
        index: true,
    },
    studentId: {
        type: Schema.Types.ObjectId,
        ref: 'Student',
        required: [true, 'Student profile reference is required'],
        index: true,
    },
    academicSessionId: {
        type: Schema.Types.ObjectId,
        ref: 'AcademicSession',
        required: [true, 'Academic session reference is required'],
        index: true,
    },
    feeStructureId: {
        type: Schema.Types.ObjectId,
        ref: 'FeeStructure',
        default: null,
        index: true,
    },
    name: {
        type: String,
        required: [true, 'Concession name or title is required'],
        trim: true,
        maxlength: [150, 'Concession title cannot exceed 150 characters'],
    },
    type: {
        type: String,
        enum: {
            values: ['percentage', 'fixed'],
            message: 'Concession type must be percentage or fixed',
        },
        required: [true, 'Concession type is required'],
    },
    value: {
        type: Schema.Types.Decimal128,
        required: [true, 'Concession value is required as Decimal128'],
    },
    reason: {
        type: String,
        required: [true, 'Administrative reason or justification is required'],
        trim: true,
        maxlength: [500, 'Reason cannot exceed 500 characters'],
    },
    effectiveStartDate: {
        type: Date,
        default: null,
    },
    effectiveEndDate: {
        type: Date,
        default: null,
    },
    status: {
        type: String,
        enum: ['active', 'inactive', 'revoked'],
        default: 'active',
        index: true,
    },
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Creator user reference is required'],
        index: true,
    },
    approvedBy: {
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
            if (ret.value)
                ret.value = ret.value.toString();
            return ret;
        },
    },
    toObject: { virtuals: true },
});
StudentConcessionSchema.index({ schoolId: 1, studentId: 1, academicSessionId: 1, status: 1 });
StudentConcessionSchema.plugin(tenantIsolationPlugin);
StudentConcessionSchema.plugin(softDeletePlugin);
export const StudentConcession = mongoose.model('StudentConcession', StudentConcessionSchema);
