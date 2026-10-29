import { z } from 'zod';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;
const objectIdSchema = z.string().regex(objectIdRegex, 'Invalid 24-character hexadecimal ObjectId');

export const chatSchema = z.object({
  message: z
    .string()
    .min(1, 'Message cannot be empty')
    .max(2000, 'Message cannot exceed 2000 characters'),
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant', 'system']),
        content: z.string().max(2000, 'History entry content cannot exceed 2000 characters'),
      })
    )
    .max(20, 'History cannot exceed 20 entries')
    .optional(),
});

export const homeworkHelpSchema = z.object({
  question: z
    .string()
    .min(3, 'Question must be at least 3 characters')
    .max(1000, 'Question cannot exceed 1000 characters'),
  subjectId: objectIdSchema.optional(),
  topic: z.string().max(200).optional(),
  studyMaterialId: objectIdSchema.optional(),
});

export const quizGeneratorSchema = z.object({
  subjectId: objectIdSchema,
  classId: objectIdSchema,
  sectionId: objectIdSchema.optional(),
  topic: z
    .string()
    .min(2, 'Topic must be at least 2 characters')
    .max(200, 'Topic cannot exceed 200 characters'),
  questionCount: z
    .number()
    .int('Question count must be an integer')
    .min(1, 'At least 1 question is required')
    .max(20, 'Maximum 20 questions can be generated at once')
    .default(5),
  difficulty: z.enum(['easy', 'medium', 'hard']).default('medium'),
  questionType: z
    .enum(['multiple_choice', 'true_false', 'short_answer'])
    .default('multiple_choice'),
  marksPerQuestion: z
    .number()
    .int('Marks must be an integer')
    .min(1, 'Marks must be at least 1')
    .max(100, 'Marks cannot exceed 100')
    .optional()
    .default(1),
  studyMaterialId: objectIdSchema.optional(),
});

export const reportCardCommentSchema = z.object({
  studentId: objectIdSchema,
  subjectId: objectIdSchema.optional(),
  academicSessionId: objectIdSchema.optional(),
  strengths: z.array(z.string().max(100)).max(5).optional(),
  areasForImprovement: z.array(z.string().max(100)).max(5).optional(),
  tone: z.enum(['encouraging', 'formal', 'constructive']).optional().default('encouraging'),
  length: z.enum(['short', 'medium', 'detailed']).optional().default('medium'),
});

export const feeReminderSchema = z.object({
  invoiceId: objectIdSchema,
  tone: z.enum(['gentle', 'standard', 'urgent']).optional().default('standard'),
  additionalInstructions: z.string().max(500).optional(),
});

export const noticeGeneratorSchema = z.object({
  title: z
    .string()
    .min(3, 'Notice title must be at least 3 characters')
    .max(200, 'Notice title cannot exceed 200 characters'),
  eventType: z.enum([
    'notice',
    'parent_announcement',
    'event_invitation',
    'event_schedule',
    'holiday_notice',
    'meeting_reminder',
    'academic_plan',
  ]),
  targetAudience: z.enum(['all', 'students', 'teachers', 'parents']),
  date: z.string().max(100).optional(),
  location: z.string().max(200).optional(),
  instructions: z.string().max(1000).optional(),
  tone: z.enum(['formal', 'warm', 'urgent']).optional().default('formal'),
});

export const schoolInsightsSchema = z.object({
  insightType: z.enum([
    'attendance_trends',
    'fee_collection',
    'outstanding_fees',
    'enrollment_counts',
    'academic_performance',
    'homework_completion',
  ]),
  classId: objectIdSchema.optional(),
  academicSessionId: objectIdSchema.optional(),
});
