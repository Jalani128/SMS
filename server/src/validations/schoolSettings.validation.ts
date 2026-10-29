import { z } from 'zod';

export const isValidTimezone = (tz: string): boolean => {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
};

const hexColorRegex = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export const updateProfileSchema = z
  .object({
    schoolName: z.string().trim().min(2).max(150).optional(),
    shortName: z.string().trim().max(50).optional(),
    email: z.string().trim().email('Invalid email address format').optional(),
    phone: z.string().trim().max(25).optional(),
    website: z.string().trim().max(200).optional(),
    description: z.string().trim().max(500).optional(),
    address: z
      .object({
        street: z.string().trim().max(200).optional(),
        city: z.string().trim().max(100).optional(),
        state: z.string().trim().max(100).optional(),
        postalCode: z.string().trim().max(20).optional(),
        country: z.string().trim().max(100).optional(),
      })
      .optional(),
  })
  .strict(); // Rejects unknown / mass assignment fields

export const updateBrandingSchema = z
  .object({
    logoUrl: z.string().trim().max(500).optional(),
    faviconUrl: z.string().trim().max(500).optional(),
    primaryColor: z
      .string()
      .trim()
      .regex(hexColorRegex, 'Primary color must be a valid hex color code (e.g. #2563eb)')
      .optional(),
    secondaryColor: z
      .string()
      .trim()
      .regex(hexColorRegex, 'Secondary color must be a valid hex color code (e.g. #0f172a)')
      .optional(),
    reportCardHeader: z.string().trim().max(200).optional(),
    emailFooterText: z.string().trim().max(300).optional(),
  })
  .strict();

export const updateRegionalSchema = z
  .object({
    timezone: z
      .string()
      .trim()
      .refine(isValidTimezone, 'Timezone must be a valid IANA timezone identifier (e.g. America/New_York, UTC)')
      .optional(),
    dateFormat: z.enum(['YYYY-MM-DD', 'DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY/MM/DD']).optional(),
    timeFormat: z.enum(['12h', '24h']).optional(),
    weekStartDay: z.enum(['monday', 'sunday', 'saturday']).optional(),
    currencyCode: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z]{3}$/, 'Currency code must be a valid 3-letter ISO code (e.g. USD, EUR, GBP)')
      .optional(),
    currencySymbol: z.string().trim().max(5).optional(),
  })
  .strict();

export const holidaySchema = z
  .object({
    name: z.string().trim().min(1, 'Holiday name is required').max(100),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    type: z
      .enum(['public_holiday', 'vacation', 'exam_break', 'teacher_training', 'other'])
      .optional()
      .default('public_holiday'),
    description: z.string().trim().max(300).optional(),
  })
  .refine((data) => data.endDate >= data.startDate, {
    message: 'Holiday end date must be on or after start date',
    path: ['endDate'],
  });

export const updateAcademicSettingsSchema = z
  .object({
    activeSessionId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid session ID').optional(),
    workingDays: z
      .array(z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']))
      .min(1, 'At least one working day must be configured')
      .max(7)
      .optional(),
    termsCount: z.number().int().min(1).max(6).optional(),
  })
  .strict();

export const updateAttendancePolicySchema = z
  .object({
    supportedStatuses: z
      .array(z.enum(['present', 'absent', 'late', 'leave']))
      .min(1, 'At least one attendance status is required')
      .optional(),
    defaultWorkingDays: z
      .array(z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']))
      .min(1)
      .optional(),
    lateArrivalThresholdMinutes: z.number().int().min(0).max(120).optional(),
    absenceThresholdForAlert: z.number().int().min(1).max(30).optional(),
    minimumAttendancePercentage: z.number().min(0).max(100).optional(),
    dailyAlertEnabled: z.boolean().optional(),
  })
  .strict();

export const updateFeePolicySchema = z
  .object({
    defaultDueGraceDays: z.number().int().min(0).max(60).optional(),
    reminderScheduleDays: z.array(z.number().int().positive()).optional(),
    invoicePrefix: z.string().trim().toUpperCase().min(1).max(10).optional(),
    paymentInstructions: z.string().trim().max(500).optional(),
    receiptNotes: z.string().trim().max(500).optional(),
    allowPartialPayments: z.boolean().optional(),
    lateFeeEnabled: z.boolean().optional(),
    lateFeeAmount: z.number().min(0).optional(),
  })
  .strict();

export const updateNotificationSettingsSchema = z
  .object({
    attendanceAlertDefault: z.boolean().optional(),
    feeReminderDefault: z.boolean().optional(),
    homeworkReminderDefault: z.boolean().optional(),
    examNoticeDefault: z.boolean().optional(),
    resultNoticeDefault: z.boolean().optional(),
    schoolAnnouncementDefault: z.boolean().optional(),
    quietHoursEnabled: z.boolean().optional(),
    quietHoursStart: z.string().regex(/^\d{2}:\d{2}$/, 'Format must be HH:MM').optional(),
    quietHoursEnd: z.string().regex(/^\d{2}:\d{2}$/, 'Format must be HH:MM').optional(),
  })
  .strict();

export const gradeBandValidationSchema = z
  .object({
    grade: z.string().trim().min(1).max(10),
    minPercentage: z.number().min(0).max(100),
    maxPercentage: z.number().min(0).max(100),
    gradePoint: z.number().min(0).optional(),
    isPassing: z.boolean().default(true),
    description: z.string().trim().max(150).optional(),
  })
  .refine((b) => b.maxPercentage >= b.minPercentage, {
    message: 'maxPercentage must be greater than or equal to minPercentage',
    path: ['maxPercentage'],
  });

export const updateGradingScaleSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  description: z.string().trim().max(300).optional(),
  bands: z.array(gradeBandValidationSchema).min(1, 'At least one grade band is required'),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type UpdateBrandingInput = z.infer<typeof updateBrandingSchema>;
export type UpdateRegionalInput = z.infer<typeof updateRegionalSchema>;
export type HolidayInput = z.infer<typeof holidaySchema>;
export type UpdateAcademicSettingsInput = z.infer<typeof updateAcademicSettingsSchema>;
export type UpdateAttendancePolicyInput = z.infer<typeof updateAttendancePolicySchema>;
export type UpdateFeePolicyInput = z.infer<typeof updateFeePolicySchema>;
export type UpdateNotificationSettingsInput = z.infer<typeof updateNotificationSettingsSchema>;
export type UpdateGradingScaleInput = z.infer<typeof updateGradingScaleSchema>;
