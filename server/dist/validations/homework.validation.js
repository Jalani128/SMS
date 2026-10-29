import { z } from 'zod';
const objectIdRegex = /^[0-9a-fA-F]{24}$/;
const objectIdSchema = z.string().regex(objectIdRegex, 'Invalid ObjectId format');
const attachmentSchema = z.object({
    name: z.string().min(1, 'Attachment name is required').max(150),
    url: z.string().url('Attachment URL must be valid'),
    fileType: z.string().min(1),
    sizeBytes: z.number().int().positive('Size must be positive'),
    storageKey: z.string().optional(),
});
const resourceLinkSchema = z.object({
    title: z.string().min(1, 'Resource title is required').max(150),
    url: z.string().url('Resource link must be a valid URL'),
});
const submissionSettingsSchema = z.object({
    allowLateSubmission: z.boolean().default(true),
    latePenaltyPercent: z.number().min(0).max(100).default(0),
    allowResubmission: z.boolean().default(false),
    maxSubmissions: z.number().int().min(1).max(10).default(3),
    cutoffDate: z.string().datetime().or(z.string().date()).optional().nullable(),
});
export const createHomeworkSchema = z
    .object({
    title: z.string().min(3, 'Title must be at least 3 characters').max(200),
    description: z.string().max(1000).optional(),
    instructions: z.string().min(5, 'Instructions must be at least 5 characters').max(5000),
    academicSessionId: objectIdSchema,
    classId: objectIdSchema,
    sectionId: objectIdSchema,
    subjectId: objectIdSchema,
    teacherId: objectIdSchema.optional(),
    assignmentType: z.enum(['homework', 'classwork', 'project', 'other']).default('homework'),
    assignedDate: z.string().datetime().or(z.string().date()).optional(),
    publishDate: z.string().datetime().or(z.string().date()).optional(),
    dueDate: z.string().datetime().or(z.string().date()),
    maxMarks: z.number().min(0).default(100),
    isGraded: z.boolean().default(true),
    status: z.enum(['draft', 'published']).default('draft'),
    attachments: z.array(attachmentSchema).max(5, 'Cannot exceed 5 attachments').default([]),
    resourceLinks: z.array(resourceLinkSchema).max(10).default([]),
    submissionSettings: submissionSettingsSchema.optional(),
})
    .refine((data) => {
    if (data.isGraded && data.maxMarks <= 0) {
        return false;
    }
    return true;
}, {
    message: 'Maximum marks must be greater than zero when grading is enabled',
    path: ['maxMarks'],
})
    .refine((data) => {
    const due = new Date(data.dueDate).getTime();
    const pub = data.publishDate
        ? new Date(data.publishDate).getTime()
        : data.assignedDate
            ? new Date(data.assignedDate).getTime()
            : Date.now() - 60000; // grace 1 minute
    return due > pub;
}, {
    message: 'Due date must be after the publish / assignment date',
    path: ['dueDate'],
});
export const updateHomeworkSchema = z
    .object({
    title: z.string().min(3).max(200).optional(),
    description: z.string().max(1000).optional(),
    instructions: z.string().min(5).max(5000).optional(),
    dueDate: z.string().datetime().or(z.string().date()).optional(),
    maxMarks: z.number().min(0).optional(),
    isGraded: z.boolean().optional(),
    assignmentType: z.enum(['homework', 'classwork', 'project', 'other']).optional(),
    attachments: z.array(attachmentSchema).max(5).optional(),
    resourceLinks: z.array(resourceLinkSchema).max(10).optional(),
    submissionSettings: submissionSettingsSchema.optional(),
    status: z.enum(['draft', 'published', 'closed', 'archived']).optional(),
})
    .refine((data) => {
    if (data.isGraded === true && data.maxMarks !== undefined && data.maxMarks <= 0) {
        return false;
    }
    return true;
}, {
    message: 'Maximum marks must be positive when grading is enabled',
    path: ['maxMarks'],
});
export const publishHomeworkSchema = z.object({
    publishDate: z.string().datetime().or(z.string().date()).optional(),
});
export const archiveHomeworkSchema = z.object({
    archiveReason: z
        .string()
        .min(3, 'Archive reason must be at least 3 characters')
        .max(500, 'Archive reason cannot exceed 500 characters'),
});
export const createSubmissionSchema = z
    .object({
    submissionText: z.string().max(10000).optional(),
    attachments: z.array(attachmentSchema).max(5, 'Maximum 5 files allowed').default([]),
})
    .refine((data) => (data.submissionText && data.submissionText.trim().length > 0) || data.attachments.length > 0, {
    message: 'Submission must contain either text notes or at least one attachment',
    path: ['submissionText'],
});
export const gradeSubmissionSchema = z.object({
    marksObtained: z.number().min(0, 'Marks cannot be negative'),
    teacherFeedback: z.string().max(2000).optional(),
    releaseGrade: z.boolean().default(false),
});
export const releaseGradeSchema = z.object({
    submissionIds: z.array(objectIdSchema).optional(),
});
export const returnSubmissionSchema = z.object({
    teacherFeedback: z
        .string()
        .min(3, 'Feedback explaining revision requirements is required')
        .max(2000),
});
export const queryHomeworkSchema = z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
    academicSessionId: objectIdSchema.optional(),
    classId: objectIdSchema.optional(),
    sectionId: objectIdSchema.optional(),
    subjectId: objectIdSchema.optional(),
    teacherId: objectIdSchema.optional(),
    status: z.enum(['draft', 'published', 'closed', 'archived', 'all']).optional(),
    assignmentType: z.enum(['homework', 'classwork', 'project', 'other', 'all']).optional(),
    search: z.string().optional(),
});
