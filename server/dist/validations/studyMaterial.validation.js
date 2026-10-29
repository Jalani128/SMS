import { z } from 'zod';
import { Types } from 'mongoose';
import { validateExternalUrl } from '../utils/materialUpload.util.js';
const objectIdSchema = z
    .string()
    .refine((val) => Types.ObjectId.isValid(val), { message: 'Invalid ObjectId format' });
const categories = [
    'notes',
    'pdf',
    'worksheet',
    'past_paper',
    'assignment_resource',
    'presentation',
    'video',
    'external_link',
    'syllabus',
    'reference',
    'other',
];
export const createStudyMaterialSchema = z
    .object({
    title: z.string().min(2, 'Title must be at least 2 characters').max(200),
    description: z.string().max(2000).optional(),
    academicSessionId: objectIdSchema,
    classId: objectIdSchema,
    sectionId: objectIdSchema.optional().nullable(),
    subjectId: objectIdSchema,
    category: z.enum(categories).default('notes'),
    tags: z
        .array(z.string().trim().max(50))
        .max(10, 'Cannot exceed 10 tags')
        .optional()
        .default([]),
    externalUrl: z.string().optional().nullable(),
    status: z.enum(['draft', 'published', 'archived']).default('published'),
})
    .refine((data) => {
    if (data.externalUrl) {
        return validateExternalUrl(data.externalUrl).valid;
    }
    return true;
}, {
    message: 'Invalid or prohibited external URL format (must be http:// or https://)',
    path: ['externalUrl'],
});
export const updateStudyMaterialSchema = z
    .object({
    title: z.string().min(2).max(200).optional(),
    description: z.string().max(2000).optional(),
    academicSessionId: objectIdSchema.optional(),
    classId: objectIdSchema.optional(),
    sectionId: objectIdSchema.optional().nullable(),
    subjectId: objectIdSchema.optional(),
    category: z.enum(categories).optional(),
    tags: z.array(z.string().trim().max(50)).max(10).optional(),
    externalUrl: z.string().optional().nullable(),
    status: z.enum(['draft', 'published', 'archived']).optional(),
})
    .refine((data) => {
    if (data.externalUrl) {
        return validateExternalUrl(data.externalUrl).valid;
    }
    return true;
}, {
    message: 'Invalid or prohibited external URL format',
    path: ['externalUrl'],
});
export const queryStudyMaterialSchema = z.object({
    academicSessionId: objectIdSchema.optional(),
    classId: objectIdSchema.optional(),
    sectionId: objectIdSchema.optional(),
    subjectId: objectIdSchema.optional(),
    category: z.enum(categories).optional(),
    status: z.enum(['draft', 'published', 'archived']).optional(),
    search: z.string().optional(),
    page: z
        .string()
        .optional()
        .transform((val) => (val ? Math.max(1, parseInt(val, 10)) : 1)),
    limit: z
        .string()
        .optional()
        .transform((val) => (val ? Math.min(100, Math.max(1, parseInt(val, 10))) : 20)),
});
