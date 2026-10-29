import mongoose, { Schema } from 'mongoose';
import { tenantIsolationPlugin } from './plugins/tenantIsolation.plugin.js';
import { softDeletePlugin } from './plugins/softDelete.plugin.js';
const EnrollmentSchema = new Schema({
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
    classId: {
        type: Schema.Types.ObjectId,
        ref: 'Class',
        required: [true, 'Class reference is required'],
        index: true,
    },
    sectionId: {
        type: Schema.Types.ObjectId,
        ref: 'Section',
        required: [true, 'Section reference is required'],
        index: true,
    },
    rollNumber: {
        type: String,
        trim: true,
        maxlength: [30, 'Roll number cannot exceed 30 characters'],
    },
    enrollmentDate: {
        type: Date,
        default: Date.now,
    },
    status: {
        type: String,
        enum: ['enrolled', 'promoted', 'transferred', 'dropped', 'graduated'],
        default: 'enrolled',
        index: true,
    },
    promotedToEnrollmentId: {
        type: Schema.Types.ObjectId,
        ref: 'Enrollment',
    },
    remarks: {
        type: String,
        trim: true,
        maxlength: [500, 'Remarks cannot exceed 500 characters'],
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
// Compound unique index guaranteeing only one active enrollment per student per academic session
EnrollmentSchema.index({ schoolId: 1, studentId: 1, academicSessionId: 1 }, { unique: true });
EnrollmentSchema.index({ schoolId: 1, academicSessionId: 1, classId: 1, sectionId: 1 });
EnrollmentSchema.plugin(tenantIsolationPlugin);
EnrollmentSchema.plugin(softDeletePlugin);
export const Enrollment = mongoose.model('Enrollment', EnrollmentSchema);
