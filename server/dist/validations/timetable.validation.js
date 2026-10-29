import { z } from 'zod';
const objectIdRegex = /^[0-9a-fA-F]{24}$/;
const objectIdSchema = z.string().regex(objectIdRegex, 'Invalid ObjectId format');
const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
const timeSchema = z.string().regex(timeRegex, 'Must be in 24-hour HH:mm format (e.g. 08:30)');
export const dayOfWeekSchema = z.enum([
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
    'sunday',
]);
export const entryTypeSchema = z.enum([
    'lecture',
    'lab',
    'break',
    'activity',
    'assembly',
    'other',
]);
export const createTimetableSlotSchema = z
    .object({
    academicSessionId: objectIdSchema,
    classId: objectIdSchema,
    sectionId: objectIdSchema,
    subjectId: objectIdSchema.optional().nullable(),
    teacherId: objectIdSchema.optional().nullable(),
    dayOfWeek: dayOfWeekSchema,
    startTime: timeSchema,
    endTime: timeSchema,
    room: z.string().min(1, 'Room identifier is required').max(50),
    periodNumber: z.coerce.number().int().min(1, 'Period number must be at least 1').default(1),
    entryType: entryTypeSchema.default('lecture'),
    notes: z.string().max(500).optional(),
    status: z.enum(['active', 'cancelled', 'substituted', 'archived']).default('active'),
})
    .refine((data) => {
    return data.startTime < data.endTime;
}, {
    message: 'End time must be after the start time',
    path: ['endTime'],
})
    .refine((data) => {
    // Ordinary lessons (not breaks) must have subjectId and teacherId
    if (data.entryType !== 'break' && data.entryType !== 'assembly') {
        return !!data.subjectId && !!data.teacherId;
    }
    return true;
}, {
    message: 'Subject and teacher are required for instructional periods',
    path: ['subjectId'],
});
export const updateTimetableSlotSchema = z
    .object({
    subjectId: objectIdSchema.optional().nullable(),
    teacherId: objectIdSchema.optional().nullable(),
    dayOfWeek: dayOfWeekSchema.optional(),
    startTime: timeSchema.optional(),
    endTime: timeSchema.optional(),
    room: z.string().min(1).max(50).optional(),
    periodNumber: z.coerce.number().int().min(1).optional(),
    entryType: entryTypeSchema.optional(),
    notes: z.string().max(500).optional(),
    status: z.enum(['active', 'cancelled', 'substituted', 'archived']).optional(),
})
    .refine((data) => {
    if (data.startTime && data.endTime) {
        return data.startTime < data.endTime;
    }
    return true;
}, {
    message: 'End time must be after start time',
    path: ['endTime'],
});
export const copyDaySchema = z
    .object({
    academicSessionId: objectIdSchema,
    sectionId: objectIdSchema,
    sourceDay: dayOfWeekSchema,
    targetDay: dayOfWeekSchema,
    overwriteExisting: z.boolean().default(false),
    previewOnly: z.boolean().default(false),
})
    .refine((data) => data.sourceDay !== data.targetDay, {
    message: 'Source and target days must be different',
    path: ['targetDay'],
});
export const duplicateTimetableSchema = z
    .object({
    academicSessionId: objectIdSchema,
    sourceSectionId: objectIdSchema,
    targetSectionId: objectIdSchema,
    targetClassId: objectIdSchema,
    previewOnly: z.boolean().default(false),
})
    .refine((data) => data.sourceSectionId !== data.targetSectionId, {
    message: 'Source and target sections must be different',
    path: ['targetSectionId'],
});
export const queryTimetableSchema = z.object({
    academicSessionId: objectIdSchema.optional(),
    classId: objectIdSchema.optional(),
    sectionId: objectIdSchema.optional(),
    teacherId: objectIdSchema.optional(),
    dayOfWeek: dayOfWeekSchema.or(z.literal('all')).optional(),
    room: z.string().optional(),
    status: z.enum(['active', 'cancelled', 'substituted', 'archived', 'all']).optional(),
});
