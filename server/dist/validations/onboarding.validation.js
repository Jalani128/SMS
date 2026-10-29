import { z } from 'zod';
export const saveStepSchema = z.object({
    step: z
        .number()
        .int('Step must be an integer')
        .min(1, 'Step must be between 1 and 6')
        .max(6, 'Step must be between 1 and 6'),
    data: z.record(z.string(), z.any()).optional().default({}),
});
export const previewImportSchema = z.object({
    importType: z.enum(['teachers', 'students', 'parents'], {
        message: 'Import type must be teachers, students, or parents',
    }),
    csvContent: z
        .string()
        .min(10, 'CSV content is too short or empty')
        .max(5 * 1024 * 1024, 'CSV content exceeds maximum 5 MB limit'),
    filename: z.string().max(255).optional().default('import.csv'),
});
export const confirmImportSchema = z.object({
    batchId: z.string().min(1, 'Import batch identifier is required'),
    importType: z.enum(['teachers', 'students', 'parents'], {
        message: 'Import type must be teachers, students, or parents',
    }),
});
