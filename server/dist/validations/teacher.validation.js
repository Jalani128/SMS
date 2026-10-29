import { z } from 'zod';
export const teacherListQuerySchema = z.object({
    page: z.coerce.number().int().positive().default(1).optional(),
    limit: z.coerce.number().int().positive().max(100).default(10).optional(),
    search: z.string().trim().optional(),
    department: z.string().trim().optional(),
    designation: z.string().trim().optional(),
    status: z.enum(['active', 'on_leave', 'resigned', 'terminated', 'retired']).optional(),
});
export const createTeacherSchema = z.object({
    firstName: z.string().trim().min(1, 'First name is required').max(50),
    lastName: z.string().trim().min(1, 'Last name is required').max(50),
    email: z.string().email('Valid email address required').toLowerCase().trim(),
    phone: z.string().trim().max(25).optional(),
    avatarUrl: z.string().url().optional().or(z.literal('')),
    employeeId: z.string().trim().max(50).optional(),
    department: z.string().trim().min(1, 'Department is required').max(100),
    designation: z.string().trim().max(100).default('Faculty').optional(),
    qualification: z.string().trim().max(200).optional(),
    specializations: z.array(z.string().trim()).default([]).optional(),
    joiningDate: z.coerce.date().optional(),
    experienceYears: z.coerce.number().min(0, 'Experience years cannot be negative').default(0).optional(),
    bio: z.string().trim().max(1000).optional(),
    adminNotes: z.string().trim().max(2000).optional(),
    status: z.enum(['active', 'on_leave', 'resigned', 'terminated', 'retired']).default('active').optional(),
});
export const updateTeacherSchema = z.object({
    firstName: z.string().trim().min(1).max(50).optional(),
    lastName: z.string().trim().min(1).max(50).optional(),
    email: z.string().email().toLowerCase().trim().optional(),
    phone: z.string().trim().max(25).optional(),
    avatarUrl: z.string().url().optional().or(z.literal('')),
    department: z.string().trim().min(1).max(100).optional(),
    designation: z.string().trim().max(100).optional(),
    qualification: z.string().trim().max(200).optional(),
    specializations: z.array(z.string().trim()).optional(),
    experienceYears: z.coerce.number().min(0).optional(),
    bio: z.string().trim().max(1000).optional(),
    adminNotes: z.string().trim().max(2000).optional(),
    status: z.enum(['active', 'on_leave', 'resigned', 'terminated', 'retired']).optional(),
});
export const archiveTeacherSchema = z.object({
    reason: z.string().trim().max(500).optional(),
    status: z.enum(['on_leave', 'resigned', 'terminated', 'retired']).default('resigned').optional(),
});
