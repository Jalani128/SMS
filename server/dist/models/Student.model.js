import mongoose, { Schema } from 'mongoose';
import { tenantIsolationPlugin } from './plugins/tenantIsolation.plugin.js';
import { softDeletePlugin } from './plugins/softDelete.plugin.js';
const StudentSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'User reference is required for student profile'],
        unique: true,
        index: true,
    },
    schoolId: {
        type: Schema.Types.ObjectId,
        ref: 'School',
        required: [true, 'School reference is required'],
        index: true,
    },
    admissionNumber: {
        type: String,
        required: [true, 'Admission number is required'],
        trim: true,
        uppercase: true,
        maxlength: [50, 'Admission number cannot exceed 50 characters'],
    },
    rollNumber: {
        type: String,
        trim: true,
        maxlength: [30, 'Roll number cannot exceed 30 characters'],
    },
    currentSessionId: {
        type: Schema.Types.ObjectId,
        ref: 'AcademicSession',
        index: true,
    },
    currentClassId: {
        type: Schema.Types.ObjectId,
        ref: 'Class',
        index: true,
    },
    currentSectionId: {
        type: Schema.Types.ObjectId,
        ref: 'Section',
        index: true,
    },
    dateOfBirth: {
        type: Date,
    },
    gender: {
        type: String,
        enum: ['male', 'female', 'other', 'prefer_not_to_say'],
        default: 'prefer_not_to_say',
    },
    bloodGroup: {
        type: String,
        enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'unknown'],
        default: 'unknown',
    },
    medicalNotes: {
        type: String,
        trim: true,
        maxlength: [1000, 'Medical notes cannot exceed 1000 characters'],
    },
    adminNotes: {
        type: String,
        trim: true,
        maxlength: [2000, 'Admin notes cannot exceed 2000 characters'],
    },
    address: {
        type: String,
        trim: true,
        maxlength: [300, 'Address cannot exceed 300 characters'],
    },
    admissionDate: {
        type: Date,
        default: Date.now,
    },
    emergencyContact: {
        name: { type: String, trim: true },
        relationship: { type: String, trim: true },
        phone: { type: String, trim: true },
    },
    guardians: [
        {
            parentProfileId: {
                type: Schema.Types.ObjectId,
                ref: 'Parent',
                required: true,
            },
            userId: {
                type: Schema.Types.ObjectId,
                ref: 'User',
            },
            relationship: {
                type: String,
                enum: ['father', 'mother', 'guardian', 'other'],
                required: true,
            },
            isPrimary: {
                type: Boolean,
                default: false,
            },
            canPickup: {
                type: Boolean,
                default: true,
            },
        },
    ],
    status: {
        type: String,
        enum: ['active', 'inactive', 'transferred', 'graduated', 'suspended'],
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
// Compound unique index ensuring unique admissionNumber per school
StudentSchema.index({ schoolId: 1, admissionNumber: 1 }, { unique: true });
StudentSchema.index({ schoolId: 1, currentClassId: 1, currentSectionId: 1 });
StudentSchema.index({ schoolId: 1, status: 1 });
StudentSchema.index({ schoolId: 1, admissionDate: -1 });
StudentSchema.index({ schoolId: 1, 'guardians.parentProfileId': 1 });
StudentSchema.plugin(tenantIsolationPlugin);
StudentSchema.plugin(softDeletePlugin);
export const Student = mongoose.model('Student', StudentSchema);
