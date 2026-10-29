import { z } from 'zod';
/**
 * Strict password policy regex:
 * - At least 8 characters
 * - At least 1 uppercase letter
 * - At least 1 lowercase letter
 * - At least 1 digit
 * - At least 1 special character (!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?~)
 */
export const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?~`]).{8,128}$/;
export const changePasswordSchema = z
    .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z
        .string()
        .min(8, 'New password must be at least 8 characters')
        .max(128, 'New password cannot exceed 128 characters')
        .regex(passwordRegex, 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
    confirmPassword: z.string().min(1, 'Password confirmation is required'),
})
    .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'New password and confirmation do not match',
    path: ['confirmPassword'],
})
    .refine((data) => data.currentPassword !== data.newPassword, {
    message: 'New password must be different from current password',
    path: ['newPassword'],
});
/**
 * Common User fields that can be updated across all roles.
 * Strictly ignores or rejects privileged fields (role, schoolId, isActive, emailVerified, tokenVersion).
 */
export const updateProfileSchema = z.object({
    name: z.string().trim().min(2).max(100).optional(),
    firstName: z.string().trim().max(50).optional(),
    lastName: z.string().trim().max(50).optional(),
    phone: z.string().trim().max(25).optional(),
    // Teacher-specific permitted fields
    qualification: z.string().trim().max(200).optional(),
    specializations: z.array(z.string().trim().max(50)).max(20).optional(),
    bio: z.string().trim().max(1000).optional(),
    experienceYears: z.number().min(0).max(80).optional(),
    // Student-specific permitted fields
    address: z.string().trim().max(300).optional(),
    dateOfBirth: z.string().datetime().or(z.date()).optional(),
    gender: z.enum(['male', 'female', 'other', 'prefer_not_to_say']).optional(),
    bloodGroup: z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'unknown']).optional(),
    medicalNotes: z.string().trim().max(1000).optional(),
    // Parent-specific permitted fields
    occupation: z.string().trim().max(100).optional(),
    alternatePhone: z.string().trim().max(25).optional(),
    // Emergency contact (Students & Parents)
    emergencyContact: z
        .object({
        name: z.string().trim().max(100).optional(),
        relationship: z.string().trim().max(50).optional(),
        phone: z.string().trim().max(25).optional(),
    })
        .optional(),
});
/**
 * Avatar Upload Payload Schema
 */
export const avatarUploadSchema = z.object({
    name: z.string().min(1, 'Image filename is required'),
    mimetype: z.string().min(1, 'MIME type is required'),
    size: z.number().nonnegative('Size must be non-negative'),
    base64Data: z.string().optional(),
});
