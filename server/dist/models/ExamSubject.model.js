import mongoose, { Schema } from 'mongoose';
import { tenantIsolationPlugin } from './plugins/tenantIsolation.plugin.js';
import { softDeletePlugin } from './plugins/softDelete.plugin.js';
const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
const ExamSubjectSchema = new Schema({
    schoolId: {
        type: Schema.Types.ObjectId,
        ref: 'School',
        required: [true, 'School reference is required'],
        index: true,
    },
    examId: {
        type: Schema.Types.ObjectId,
        ref: 'Exam',
        required: [true, 'Exam reference is required'],
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
        index: true,
    },
    subjectId: {
        type: Schema.Types.ObjectId,
        ref: 'Subject',
        required: [true, 'Subject reference is required'],
        index: true,
    },
    teacherId: {
        type: Schema.Types.ObjectId,
        ref: 'Teacher',
        index: true,
    },
    examDate: {
        type: Date,
        required: [true, 'Exam date is required'],
        index: true,
    },
    startTime: {
        type: String,
        required: [true, 'Start time is required (HH:mm format)'],
        match: [timeRegex, 'Start time must be in 24-hour HH:mm format (e.g. 09:00)'],
    },
    endTime: {
        type: String,
        required: [true, 'End time is required (HH:mm format)'],
        match: [timeRegex, 'End time must be in 24-hour HH:mm format (e.g. 12:00)'],
        validate: {
            validator: function (val) {
                return !this.startTime || val > this.startTime;
            },
            message: 'End time must be after the start time',
        },
    },
    maxMarks: {
        type: Number,
        required: [true, 'Maximum marks is required'],
        min: [1, 'Maximum marks must be at least 1'],
    },
    passMarks: {
        type: Number,
        required: [true, 'Passing marks is required'],
        min: [0, 'Passing marks cannot be negative'],
        validate: {
            validator: function (val) {
                return !this.maxMarks || val <= this.maxMarks;
            },
            message: 'Passing marks cannot exceed maximum marks',
        },
    },
    room: {
        type: String,
        trim: true,
        maxlength: [50, 'Room identifier cannot exceed 50 characters'],
    },
    instructions: {
        type: String,
        trim: true,
        maxlength: [1000, 'Instructions cannot exceed 1000 characters'],
    },
    status: {
        type: String,
        enum: ['scheduled', 'completed', 'cancelled'],
        default: 'scheduled',
        index: true,
    },
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
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
// Compound unique index ensuring one exam slot per subject per class within an examination
ExamSubjectSchema.index({ schoolId: 1, examId: 1, classId: 1, subjectId: 1 }, { unique: true });
ExamSubjectSchema.index({ schoolId: 1, examDate: 1 });
ExamSubjectSchema.index({ schoolId: 1, teacherId: 1, examDate: 1 });
ExamSubjectSchema.index({ schoolId: 1, room: 1, examDate: 1 });
ExamSubjectSchema.plugin(tenantIsolationPlugin);
ExamSubjectSchema.plugin(softDeletePlugin);
export const ExamSubject = mongoose.model('ExamSubject', ExamSubjectSchema);
