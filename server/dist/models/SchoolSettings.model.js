import mongoose, { Schema } from 'mongoose';
import { tenantIsolationPlugin } from './plugins/tenantIsolation.plugin.js';
import { softDeletePlugin } from './plugins/softDelete.plugin.js';
const AcademicHolidaySchema = new Schema({
    name: { type: String, required: true, trim: true, maxlength: 100 },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    type: {
        type: String,
        enum: ['public_holiday', 'vacation', 'exam_break', 'teacher_training', 'other'],
        default: 'public_holiday',
    },
    description: { type: String, trim: true, maxlength: 300 },
});
const SchoolSettingsSchema = new Schema({
    schoolId: {
        type: Schema.Types.ObjectId,
        ref: 'School',
        required: [true, 'School reference is required'],
        unique: true,
        index: true,
    },
    profile: {
        schoolName: { type: String, required: true, trim: true, maxlength: 150 },
        shortName: { type: String, trim: true, maxlength: 50 },
        code: { type: String, required: true, trim: true, uppercase: true, maxlength: 20 },
        email: { type: String, required: true, trim: true, lowercase: true },
        phone: { type: String, trim: true, maxlength: 25 },
        website: { type: String, trim: true, maxlength: 200 },
        description: { type: String, trim: true, maxlength: 500 },
        address: {
            street: { type: String, trim: true, maxlength: 200 },
            city: { type: String, trim: true, maxlength: 100 },
            state: { type: String, trim: true, maxlength: 100 },
            postalCode: { type: String, trim: true, maxlength: 20 },
            country: { type: String, trim: true, maxlength: 100 },
        },
    },
    branding: {
        logoUrl: { type: String, trim: true },
        faviconUrl: { type: String, trim: true },
        primaryColor: { type: String, default: '#2563eb', trim: true },
        secondaryColor: { type: String, default: '#0f172a', trim: true },
        reportCardHeader: { type: String, trim: true, maxlength: 200 },
        emailFooterText: { type: String, trim: true, maxlength: 300 },
    },
    regional: {
        timezone: { type: String, default: 'UTC', trim: true },
        dateFormat: { type: String, default: 'YYYY-MM-DD', trim: true },
        timeFormat: { type: String, enum: ['12h', '24h'], default: '12h' },
        weekStartDay: {
            type: String,
            enum: ['monday', 'sunday', 'saturday'],
            default: 'monday',
        },
        currencyCode: { type: String, default: 'USD', uppercase: true, trim: true, minlength: 3, maxlength: 3 },
        currencySymbol: { type: String, default: '$', trim: true, maxlength: 5 },
    },
    academic: {
        activeSessionId: { type: Schema.Types.ObjectId, ref: 'AcademicSession' },
        workingDays: {
            type: [String],
            default: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
        },
        holidays: [AcademicHolidaySchema],
        termsCount: { type: Number, default: 2, min: 1, max: 6 },
    },
    attendance: {
        supportedStatuses: {
            type: [String],
            default: ['present', 'absent', 'late', 'leave'],
        },
        defaultWorkingDays: {
            type: [String],
            default: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
        },
        lateArrivalThresholdMinutes: { type: Number, default: 15, min: 0, max: 120 },
        absenceThresholdForAlert: { type: Number, default: 3, min: 1, max: 30 },
        minimumAttendancePercentage: { type: Number, default: 75, min: 0, max: 100 },
        dailyAlertEnabled: { type: Boolean, default: true },
    },
    fees: {
        defaultDueGraceDays: { type: Number, default: 7, min: 0, max: 60 },
        reminderScheduleDays: { type: [Number], default: [7, 3, 1] },
        invoicePrefix: { type: String, default: 'INV', uppercase: true, trim: true, maxlength: 10 },
        paymentInstructions: { type: String, trim: true, maxlength: 500 },
        receiptNotes: { type: String, trim: true, maxlength: 500 },
        allowPartialPayments: { type: Boolean, default: true },
        lateFeeEnabled: { type: Boolean, default: false },
        lateFeeAmount: { type: Number, default: 0, min: 0 },
    },
    notifications: {
        attendanceAlertDefault: { type: Boolean, default: true },
        feeReminderDefault: { type: Boolean, default: true },
        homeworkReminderDefault: { type: Boolean, default: true },
        examNoticeDefault: { type: Boolean, default: true },
        resultNoticeDefault: { type: Boolean, default: true },
        schoolAnnouncementDefault: { type: Boolean, default: true },
        quietHoursEnabled: { type: Boolean, default: false },
        quietHoursStart: { type: String, default: '22:00' },
        quietHoursEnd: { type: String, default: '07:00' },
    },
    updatedBy: {
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
SchoolSettingsSchema.plugin(tenantIsolationPlugin);
SchoolSettingsSchema.plugin(softDeletePlugin);
export const SchoolSettings = mongoose.model('SchoolSettings', SchoolSettingsSchema);
