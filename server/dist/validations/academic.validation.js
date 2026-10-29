import { z } from 'zod';
import mongoose from 'mongoose';
const objectIdString = z.string().refine((val) => mongoose.Types.ObjectId.isValid(val), {
    message: 'Invalid ObjectId format',
});
// Academic Session Schemas
export const createAcademicSessionSchema = z
    .object({
    name: z.string().trim().min(2, 'Session name is required').max(100),
    code: z
        .string()
        .trim()
        .min(2, 'Session code is required')
        .max(50)
        .toUpperCase(),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    isCurrent: z.boolean().default(false).optional(),
    status: z.enum(['upcoming', 'active', 'completed', 'archived']).default('upcoming').optional(),
    terms: z
        .array(z.object({
        name: z.string().trim().min(1),
        startDate: z.coerce.date(),
        endDate: z.coerce.date(),
    }))
        .optional(),
})
    .refine((data) => data.endDate > data.startDate, {
    message: 'Session end date must be strictly after the start date',
    path: ['endDate'],
});
export const updateAcademicSessionSchema = z
    .object({
    name: z.string().trim().min(2).max(100).optional(),
    code: z.string().trim().min(2).max(50).toUpperCase().optional(),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
    status: z.enum(['upcoming', 'active', 'completed', 'archived']).optional(),
    terms: z
        .array(z.object({
        name: z.string().trim().min(1),
        startDate: z.coerce.date(),
        endDate: z.coerce.date(),
    }))
        .optional(),
})
    .refine((data) => {
    if (data.startDate && data.endDate) {
        return data.endDate > data.startDate;
    }
    return true;
}, {
    message: 'Session end date must be strictly after the start date',
    path: ['endDate'],
});
// Class Schemas
export const createClassSchema = z.object({
    name: z.string().trim().min(1, 'Class name is required').max(100),
    code: z.string().trim().min(1, 'Class code is required').max(30).toUpperCase(),
    order: z.coerce.number().min(0, 'Order must be 0 or greater').default(0),
    description: z.string().trim().max(300).optional(),
    academicSessionId: objectIdString.optional(),
    status: z.enum(['active', 'inactive']).default('active').optional(),
});
export const updateClassSchema = z.object({
    name: z.string().trim().min(1).max(100).optional(),
    code: z.string().trim().min(1).max(30).toUpperCase().optional(),
    order: z.coerce.number().min(0).optional(),
    description: z.string().trim().max(300).optional(),
    status: z.enum(['active', 'inactive']).optional(),
});
// Section Schemas
export const createSectionSchema = z.object({
    classId: objectIdString,
    name: z.string().trim().min(1, 'Section name is required').max(50),
    code: z.string().trim().min(1, 'Section code is required').max(20).toUpperCase(),
    capacity: z.coerce.number().int().min(1, 'Capacity must be at least 1 student').max(200).default(35),
    classTeacherId: objectIdString.optional(),
    roomNumber: z.string().trim().max(50).optional(),
    academicSessionId: objectIdString.optional(),
    status: z.enum(['active', 'inactive']).default('active').optional(),
});
export const updateSectionSchema = z.object({
    name: z.string().trim().min(1).max(50).optional(),
    code: z.string().trim().min(1).max(20).toUpperCase().optional(),
    capacity: z.coerce.number().int().min(1).max(200).optional(),
    classTeacherId: objectIdString.optional().nullable(),
    roomNumber: z.string().trim().max(50).optional(),
    status: z.enum(['active', 'inactive']).optional(),
});
// Subject Schemas
export const createSubjectSchema = z.object({
    name: z.string().trim().min(1, 'Subject name is required').max(100),
    code: z.string().trim().min(1, 'Subject code is required').max(30).toUpperCase(),
    type: z.enum(['core', 'elective', 'optional', 'vocational']).default('core'),
    department: z.string().trim().min(1, 'Department is required').max(100),
    creditHours: z.coerce.number().min(0).default(1),
    description: z.string().trim().max(500).optional(),
    status: z.enum(['active', 'inactive']).default('active').optional(),
});
export const updateSubjectSchema = z.object({
    name: z.string().trim().min(1).max(100).optional(),
    code: z.string().trim().min(1).max(30).toUpperCase().optional(),
    type: z.enum(['core', 'elective', 'optional', 'vocational']).optional(),
    department: z.string().trim().min(1).max(100).optional(),
    creditHours: z.coerce.number().min(0).optional(),
    description: z.string().trim().max(500).optional(),
    status: z.enum(['active', 'inactive']).optional(),
});
// Subject & Teacher Assignment Schemas
export const createSubjectAssignmentSchema = z.object({
    academicSessionId: objectIdString,
    classId: objectIdString,
    sectionId: objectIdString.optional(),
    subjectId: objectIdString,
    teacherId: objectIdString,
    periodsPerWeek: z.coerce.number().int().min(1).max(50).default(5).optional(),
    status: z.enum(['active', 'inactive', 'archived']).default('active').optional(),
});
export const updateSubjectAssignmentSchema = z.object({
    teacherId: objectIdString.optional(),
    periodsPerWeek: z.coerce.number().int().min(1).max(50).optional(),
    status: z.enum(['active', 'inactive', 'archived']).optional(),
});
// Student Enrollment & Transfer Schemas
export const enrollStudentSchema = z.object({
    studentId: objectIdString,
    academicSessionId: objectIdString,
    classId: objectIdString,
    sectionId: objectIdString,
    rollNumber: z.string().trim().max(30).optional(),
    remarks: z.string().trim().max(500).optional(),
});
export const transferStudentSchema = z.object({
    targetClassId: objectIdString,
    targetSectionId: objectIdString,
    targetRollNumber: z.string().trim().max(30).optional(),
    reason: z.string().trim().min(2, 'Transfer reason is required').max(500),
});
