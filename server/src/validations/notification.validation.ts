import { z } from 'zod';

export const notificationQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  category: z
    .enum([
      'academic',
      'finance',
      'attendance',
      'homework',
      'exams',
      'system',
      'notice',
      'announcement',
    ])
    .optional(),
  isRead: z
    .string()
    .transform((val) => val === 'true')
    .optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
});

export const notificationIdParamSchema = z.object({
  id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid notification ID format'),
});

const channelPreferenceSchema = z.object({
  academic: z.boolean().optional(),
  finance: z.boolean().optional(),
  attendance: z.boolean().optional(),
  homework: z.boolean().optional(),
  exams: z.boolean().optional(),
  announcements: z.boolean().optional(),
});

export const updatePreferencesSchema = z.object({
  inApp: channelPreferenceSchema.optional(),
  email: channelPreferenceSchema.optional(),
});

export const manualTriggerSchema = z.object({
  type: z.enum(['attendance', 'fee', 'homework', 'exam', 'results', 'announcement', 'retry']),
  targetId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid target ID format').optional(),
  reminderType: z.enum(['due_soon', 'overdue', 'newly_published', 'deadline_approaching']).optional(),
  attendanceStatus: z.enum(['present', 'absent', 'late', 'leave']).optional(),
  attendanceDate: z.string().optional(),
});

export type NotificationQueryInput = z.infer<typeof notificationQuerySchema>;
export type NotificationIdParamInput = z.infer<typeof notificationIdParamSchema>;
export type UpdatePreferencesInput = z.infer<typeof updatePreferencesSchema>;
export type ManualTriggerInput = z.infer<typeof manualTriggerSchema>;
