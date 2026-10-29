export interface SchoolAddress {
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

export interface SchoolProfileSettings {
  schoolName: string;
  shortName?: string;
  code: string;
  email: string;
  phone?: string;
  website?: string;
  description?: string;
  address: SchoolAddress;
}

export interface SchoolBrandingSettings {
  logoUrl?: string;
  faviconUrl?: string;
  primaryColor: string;
  secondaryColor: string;
  reportCardHeader?: string;
  emailFooterText?: string;
}

export interface SchoolRegionalSettings {
  timezone: string;
  dateFormat: string;
  timeFormat: '12h' | '24h';
  weekStartDay: 'monday' | 'sunday' | 'saturday';
  currencyCode: string;
  currencySymbol: string;
}

export interface AcademicHoliday {
  _id?: string;
  name: string;
  startDate: string;
  endDate: string;
  type: 'public_holiday' | 'vacation' | 'exam_break' | 'teacher_training' | 'other';
  description?: string;
}

export interface SchoolAcademicSettings {
  activeSessionId?: string;
  workingDays: string[];
  holidays: AcademicHoliday[];
  termsCount: number;
}

export interface SchoolAttendanceSettings {
  supportedStatuses: string[];
  defaultWorkingDays: string[];
  lateArrivalThresholdMinutes: number;
  absenceThresholdForAlert: number;
  minimumAttendancePercentage: number;
  dailyAlertEnabled: boolean;
}

export interface SchoolFeeSettings {
  defaultDueGraceDays: number;
  reminderScheduleDays: number[];
  invoicePrefix: string;
  paymentInstructions?: string;
  receiptNotes?: string;
  allowPartialPayments: boolean;
  lateFeeEnabled: boolean;
  lateFeeAmount: number;
}

export interface SchoolNotificationSettings {
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

export interface SchoolSettingsData {
  _id?: string;
  schoolId: string;
  profile: SchoolProfileSettings;
  branding: SchoolBrandingSettings;
  regional: SchoolRegionalSettings;
  academic: SchoolAcademicSettings;
  attendance: SchoolAttendanceSettings;
  fees: SchoolFeeSettings;
  notifications: SchoolNotificationSettings;
  updatedAt?: string;
}

export interface GradeBand {
  grade: string;
  minPercentage: number;
  maxPercentage: number;
  gradePoint?: number;
  isPassing: boolean;
  description?: string;
}

export interface GradingScaleData {
  _id?: string;
  name: string;
  description?: string;
  isDefault: boolean;
  bands: GradeBand[];
}
