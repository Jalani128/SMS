import mongoose, { Schema } from 'mongoose';
import { tenantIsolationPlugin } from './plugins/tenantIsolation.plugin.js';
import { softDeletePlugin } from './plugins/softDelete.plugin.js';
const SubjectSchema = new Schema({
    schoolId: {
        type: Schema.Types.ObjectId,
        ref: 'School',
        required: [true, 'School reference is required'],
        index: true,
    },
    name: {
        type: String,
        required: [true, 'Subject name is required'],
        trim: true,
        maxlength: [100, 'Subject name cannot exceed 100 characters'],
    },
    code: {
        type: String,
        required: [true, 'Subject code is required (e.g. PHY-101)'],
        trim: true,
        uppercase: true,
        maxlength: [30, 'Subject code cannot exceed 30 characters'],
    },
    type: {
        type: String,
        enum: ['core', 'elective', 'optional', 'vocational'],
        default: 'core',
        index: true,
    },
    department: {
        type: String,
        required: [true, 'Department name is required'],
        trim: true,
        maxlength: [100, 'Department cannot exceed 100 characters'],
        index: true,
    },
    creditHours: {
        type: Number,
        default: 1,
        min: [0, 'Credit hours cannot be negative'],
    },
    description: {
        type: String,
        trim: true,
        maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active',
        index: true,
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
// Compound unique index ensuring subject code uniqueness per school
SubjectSchema.index({ schoolId: 1, code: 1 }, { unique: true });
SubjectSchema.index({ schoolId: 1, department: 1 });
SubjectSchema.plugin(tenantIsolationPlugin);
SubjectSchema.plugin(softDeletePlugin);
export const Subject = mongoose.model('Subject', SubjectSchema);
