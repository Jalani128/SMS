import { z } from 'zod';
import { Types } from 'mongoose';
const objectIdSchema = z
    .string()
    .refine((val) => Types.ObjectId.isValid(val), { message: 'Invalid ObjectId format' });
const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
export const createExamSchema = z
    .object({
    name: z.string().min(2, 'Exam name must be at least 2 characters').max(150),
    academicSessionId: objectIdSchema,
    examType: z
        .enum(['monthly_test', 'midterm', 'final', 'quiz', 'practical', 'other'])
        .default('midterm'),
    classId: objectIdSchema.optional(),
    sectionId: objectIdSchema.optional(),
    term: z.string().max(50).optional(),
    startDate: z.string().or(z.date()).transform((val) => new Date(val)),
    endDate: z.string().or(z.date()).transform((val) => new Date(val)),
    description: z.string().max(500).optional(),
    instructions: z.string().max(1000).optional(),
    status: z
        .enum(['draft', 'scheduled', 'ongoing', 'completed', 'published', 'cancelled', 'archived'])
        .default('draft'),
})
    .refine((data) => data.endDate >= data.startDate, {
    message: 'End date must be on or after the start date',
    path: ['endDate'],
});
export const updateExamSchema = z
    .object({
    name: z.string().min(2).max(150).optional(),
    academicSessionId: objectIdSchema.optional(),
    examType: z
        .enum(['monthly_test', 'midterm', 'final', 'quiz', 'practical', 'other'])
        .optional(),
    classId: objectIdSchema.optional().nullable(),
    sectionId: objectIdSchema.optional().nullable(),
    term: z.string().max(50).optional(),
    startDate: z.string().or(z.date()).transform((val) => new Date(val)).optional(),
    endDate: z.string().or(z.date()).transform((val) => new Date(val)).optional(),
    description: z.string().max(500).optional(),
    instructions: z.string().max(1000).optional(),
    status: z
        .enum(['draft', 'scheduled', 'ongoing', 'completed', 'published', 'cancelled', 'archived'])
        .optional(),
})
    .refine((data) => {
    if (data.startDate && data.endDate) {
        return data.endDate >= data.startDate;
    }
    return true;
}, {
    message: 'End date must be on or after start date',
    path: ['endDate'],
});
export const createExamSubjectSchema = z
    .object({
    examId: objectIdSchema,
    classId: objectIdSchema,
    sectionId: objectIdSchema.optional(),
    subjectId: objectIdSchema,
    teacherId: objectIdSchema.optional(),
    examDate: z.string().or(z.date()).transform((val) => new Date(val)),
    startTime: z.string().regex(timeRegex, 'Start time must be in HH:mm 24-hour format'),
    endTime: z.string().regex(timeRegex, 'End time must be in HH:mm 24-hour format'),
    maxMarks: z.number().int().min(1, 'Maximum marks must be at least 1'),
    passMarks: z.number().int().min(0, 'Passing marks cannot be negative'),
    room: z.string().max(50).optional(),
    instructions: z.string().max(1000).optional(),
    status: z.enum(['scheduled', 'completed', 'cancelled']).default('scheduled'),
})
    .refine((data) => data.startTime < data.endTime, {
    message: 'End time must be after the start time',
    path: ['endTime'],
})
    .refine((data) => data.passMarks <= data.maxMarks, {
    message: 'Passing marks cannot exceed maximum marks',
    path: ['passMarks'],
});
export const updateExamSubjectSchema = z
    .object({
    classId: objectIdSchema.optional(),
    sectionId: objectIdSchema.optional().nullable(),
    subjectId: objectIdSchema.optional(),
    teacherId: objectIdSchema.optional().nullable(),
    examDate: z.string().or(z.date()).transform((val) => new Date(val)).optional(),
    startTime: z.string().regex(timeRegex).optional(),
    endTime: z.string().regex(timeRegex).optional(),
    maxMarks: z.number().int().min(1).optional(),
    passMarks: z.number().int().min(0).optional(),
    room: z.string().max(50).optional().nullable(),
    instructions: z.string().max(1000).optional(),
    status: z.enum(['scheduled', 'completed', 'cancelled']).optional(),
})
    .refine((data) => {
    if (data.startTime && data.endTime) {
        return data.startTime < data.endTime;
    }
    return true;
}, {
    message: 'End time must be after start time',
    path: ['endTime'],
})
    .refine((data) => {
    if (data.maxMarks !== undefined && data.passMarks !== undefined) {
        return data.passMarks <= data.maxMarks;
    }
    return true;
}, {
    message: 'Passing marks cannot exceed maximum marks',
    path: ['passMarks'],
});
export const singleStudentMarkSchema = z.object({
    studentId: objectIdSchema,
    marksObtained: z.number().min(0, 'Marks cannot be negative').optional().nullable(),
    isAbsent: z.boolean().default(false),
    isExempt: z.boolean().default(false),
    remarks: z.string().max(300).optional(),
});
export const bulkMarksEntrySchema = z.object({
    marks: z.array(singleStudentMarkSchema).min(1, 'At least one student mark record is required'),
    saveAs: z.enum(['draft', 'submitted']).default('draft'),
});
export const correctMarkSchema = z.object({
    marksObtained: z.number().min(0, 'Marks cannot be negative').optional().nullable(),
    isAbsent: z.boolean().optional(),
    isExempt: z.boolean().optional(),
    reason: z.string().min(3, 'A reason for correcting the mark is required').max(500),
    remarks: z.string().max(300).optional(),
});
export const gradeBandItemSchema = z.object({
    grade: z.string().min(1).max(10),
    minPercentage: z.number().min(0).max(100),
    maxPercentage: z.number().min(0).max(100),
    gradePoint: z.number().min(0).max(10).optional(),
    isPassing: z.boolean().default(true),
    description: z.string().max(150).optional(),
});
export const createGradingScaleSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters').max(100),
    description: z.string().max(300).optional(),
    isDefault: z.boolean().default(false),
    bands: z.array(gradeBandItemSchema).min(1, 'At least one grade band is required'),
});
export const queryExamSchema = z.object({
    academicSessionId: objectIdSchema.optional(),
    classId: objectIdSchema.optional(),
    sectionId: objectIdSchema.optional(),
    examType: z.enum(['monthly_test', 'midterm', 'final', 'quiz', 'practical', 'other']).optional(),
    status: z.enum(['draft', 'scheduled', 'ongoing', 'completed', 'published', 'cancelled', 'archived']).optional(),
    search: z.string().optional(),
});
