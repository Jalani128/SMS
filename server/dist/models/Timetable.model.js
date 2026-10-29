import mongoose, { Schema } from 'mongoose';
import { tenantIsolationPlugin } from './plugins/tenantIsolation.plugin.js';
import { softDeletePlugin } from './plugins/softDelete.plugin.js';
const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
const TimetableSchema = new Schema({
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
        required: [true, 'Section reference is required'],
        index: true,
    },
    subjectId: {
        type: Schema.Types.ObjectId,
        ref: 'Subject',
        index: true,
    },
    teacherId: {
        type: Schema.Types.ObjectId,
        ref: 'Teacher',
        index: true,
    },
    dayOfWeek: {
        type: String,
        enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
        required: [true, 'Day of week is required'],
        index: true,
    },
    startTime: {
        type: String,
        required: [true, 'Start time is required (HH:mm format)'],
        match: [timeRegex, 'Start time must be in 24-hour HH:mm format (e.g. 08:30)'],
    },
    endTime: {
        type: String,
        required: [true, 'End time is required (HH:mm format)'],
        match: [timeRegex, 'End time must be in 24-hour HH:mm format (e.g. 09:15)'],
        validate: {
            validator: function (val) {
                return !this.startTime || val > this.startTime;
            },
            message: 'End time must be after the start time',
        },
    },
    room: {
        type: String,
        required: [true, 'Room or laboratory identifier is required'],
        trim: true,
        maxlength: [50, 'Room identifier cannot exceed 50 characters'],
        index: true,
    },
    periodNumber: {
        type: Number,
        required: [true, 'Period number or display order is required'],
        min: [1, 'Period number must be at least 1'],
        default: 1,
        index: true,
    },
    entryType: {
        type: String,
        enum: ['lecture', 'lab', 'break', 'activity', 'assembly', 'other'],
        default: 'lecture',
        index: true,
    },
    notes: {
        type: String,
        trim: true,
        maxlength: [500, 'Notes cannot exceed 500 characters'],
    },
    status: {
        type: String,
        enum: ['active', 'cancelled', 'substituted', 'archived'],
        default: 'active',
        index: true,
    },
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
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
// Indexes supporting conflict detection across teachers, rooms, and sections:
// 1. Teacher double-booking conflict detection index
TimetableSchema.index({ schoolId: 1, academicSessionId: 1, teacherId: 1, dayOfWeek: 1, startTime: 1, endTime: 1 });
// 2. Room double-booking conflict detection index
TimetableSchema.index({ schoolId: 1, academicSessionId: 1, room: 1, dayOfWeek: 1, startTime: 1, endTime: 1 });
// 3. Section overlapping period conflict detection index
TimetableSchema.index({ schoolId: 1, academicSessionId: 1, sectionId: 1, dayOfWeek: 1, startTime: 1, endTime: 1 });
// 4. Period ordering index for class section schedule queries
TimetableSchema.index({ schoolId: 1, classId: 1, sectionId: 1, dayOfWeek: 1, periodNumber: 1 });
TimetableSchema.plugin(tenantIsolationPlugin);
TimetableSchema.plugin(softDeletePlugin);
export const Timetable = mongoose.model('Timetable', TimetableSchema);
