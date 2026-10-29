import mongoose, { Document, Schema, Types } from 'mongoose';
import { tenantIsolationPlugin } from './plugins/tenantIsolation.plugin.js';
import { softDeletePlugin, SoftDeleteDocument } from './plugins/softDelete.plugin.js';

export interface ISchoolProfileSettings {
  schoolName: string;
  shortName?: string;
  code: string;
  email: string;
  phone?: string;
  website?: string;
  description?: string;
  address: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
}

export interface ISchoolBrandingSettings {
  logoUrl?: string;
  faviconUrl?: string;
  primaryColor: string;
  secondaryColor: string;
  reportCardHeader?: string;
  emailFooterText?: string;
}

export interface ISchoolRegionalSettings {
  timezone: string;
  dateFormat: string;
  timeFormat: '12h' | '24h';
  weekStartDay: 'monday' | 'sunday' | 'saturday';
  currencyCode: string;
  currencySymbol: string;
}

export interface IAcademicHoliday {
  _id?: Types.ObjectId;
  name: string;
  startDate: Date;
  endDate: Date;
  type: 'public_holiday' | 'vacation' | 'exam_break' | 'teacher_training' | 'other';
  description?: string;
}

export interface ISchoolAcademicSettings {
  activeSessionId?: Types.ObjectId;
  workingDays: string[];
  holidays: IAcademicHoliday[];
  termsCount: number;
}

export interface ISchoolAttendanceSettings {
  supportedStatuses: string[];
  defaultWorkingDays: string[];
  lateArrivalThresholdMinutes: number;
  absenceThresholdForAlert: number;
  minimumAttendancePercentage: number;
  dailyAlertEnabled: boolean;
}

export interface ISchoolFeeSettings {
  defaultDueGraceDays: number;
  reminderScheduleDays: number[];
  invoicePrefix: string;
  paymentInstructions?: string;
  receiptNotes?: string;
  allowPartialPayments: boolean;
  lateFeeEnabled: boolean;
  lateFeeAmount: number;
}

export interface ISchoolNotificationSettings {
  attendanceAlertDefault: boolean;
  feeReminderDefault: boolean;
  homeworkReminderDefault: boolean;
  examNoticeDefault: boolean;
  resultNoticeDefault: boolean;
  schoolAnnouncementDefault: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
}

export interface ISchoolSettingsDoc extends Document, SoftDeleteDocument {
  schoolId: Types.ObjectId;
  profile: ISchoolProfileSettings;
  branding: ISchoolBrandingSettings;
  regional: ISchoolRegionalSettings;
  academic: ISchoolAcademicSettings;
  attendance: ISchoolAttendanceSettings;
  fees: ISchoolFeeSettings;
  notifications: ISchoolNotificationSettings;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const AcademicHolidaySchema = new Schema<IAcademicHoliday>({
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

const SchoolSettingsSchema = new Schema<ISchoolSettingsDoc>(
  {
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
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        delete (ret as any).__v;
        return ret;
      },
    },
    toObject: { virtuals: true },
  }
);

SchoolSettingsSchema.plugin(tenantIsolationPlugin);
SchoolSettingsSchema.plugin(softDeletePlugin);

export const SchoolSettings = mongoose.model<ISchoolSettingsDoc>('SchoolSettings', SchoolSettingsSchema);
