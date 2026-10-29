import mongoose, { Schema } from 'mongoose';
import { tenantIsolationPlugin } from './plugins/tenantIsolation.plugin.js';
import { softDeletePlugin } from './plugins/softDelete.plugin.js';
const ClassSchema = new Schema({
    schoolId: {
        type: Schema.Types.ObjectId,
        ref: 'School',
        required: [true, 'School reference is required'],
        index: true,
    },
    academicSessionId: {
        type: Schema.Types.ObjectId,
        ref: 'AcademicSession',
        index: true,
    },
    name: {
        type: String,
        required: [true, 'Class name is required (e.g. Grade 10)'],
        trim: true,
        maxlength: [100, 'Class name cannot exceed 100 characters'],
    },
    code: {
        type: String,
        required: [true, 'Class code is required (e.g. G10)'],
        trim: true,
        uppercase: true,
        maxlength: [30, 'Class code cannot exceed 30 characters'],
    },
    order: {
        type: Number,
        required: [true, 'Class display/progression order is required'],
        min: 0,
        index: true,
    },
    description: {
        type: String,
        trim: true,
        maxlength: [300, 'Description cannot exceed 300 characters'],
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
// Unique class code and class name per school
ClassSchema.index({ schoolId: 1, code: 1 }, { unique: true });
ClassSchema.index({ schoolId: 1, name: 1 }, { unique: true });
ClassSchema.index({ schoolId: 1, order: 1 });
ClassSchema.plugin(tenantIsolationPlugin);
ClassSchema.plugin(softDeletePlugin);
export const Class = mongoose.model('Class', ClassSchema);
