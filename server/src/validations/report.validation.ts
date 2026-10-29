import { z } from 'zod';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;
const objectIdSchema = z.string().regex(objectIdRegex, 'Invalid 24-character hexadecimal ObjectId');

export const reportQuerySchema = z.object({
  academicSessionId: objectIdSchema.optional(),
  classId: objectIdSchema.optional(),
  sectionId: objectIdSchema.optional(),
  subjectId: objectIdSchema.optional(),
  examId: objectIdSchema.optional(),
  studentId: objectIdSchema.optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  timeframe: z.enum(['today', 'week', 'month', 'term', 'year', 'custom']).optional().default('month'),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  format: z.enum(['json', 'csv']).optional().default('json'),
  comparePrevious: z.coerce.boolean().optional().default(true),
});

export const studentReportParamsSchema = z.object({
  studentId: objectIdSchema,
});
