import { z } from 'zod';

export const passwordValidation = z
  .string()
  .min(8, 'Password must be at least 8 characters long')
  .max(128, 'Password cannot exceed 128 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

export const registerSchoolSchema = z.object({
  // School details
  name: z.string().min(2, 'School name must be at least 2 characters').max(150),
  slug: z
    .string()
    .min(2, 'Slug must be at least 2 characters')
    .max(50)
    .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens'),
  code: z
    .string()
    .min(3, 'School code must be at least 3 characters')
    .max(20)
    .regex(/^[A-Za-z0-9-_]+$/, 'School code can only contain alphanumeric characters, hyphens, and underscores'),
  schoolEmail: z.string().email('Please enter a valid school email address').toLowerCase().trim(),
  phone: z.string().optional(),
  timezone: z.string().default('UTC').optional(),
  currency: z.string().length(3).default('USD').optional(),
  address: z
    .object({
      street: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      postalCode: z.string().optional(),
      country: z.string().optional(),
    })
    .optional(),

  // Initial Admin details
  adminName: z.string().min(2, 'Admin name must be at least 2 characters').max(100),
  adminEmail: z.string().email('Please enter a valid admin email address').toLowerCase().trim(),
  password: passwordValidation,
  adminPhone: z.string().optional(),
});

export const verifySchoolOtpSchema = z.object({
  email: z.string().email('Valid email address required').toLowerCase().trim(),
  otp: z.string().length(6, 'OTP must be exactly 6 digits').regex(/^\d{6}$/, 'OTP must be numeric'),
});

export const resendSchoolOtpSchema = z.object({
  email: z.string().email('Valid email address required').toLowerCase().trim(),
});

export const loginSchema = z.object({
  email: z.string().email('Valid email address required').toLowerCase().trim(),
  password: z.string().min(1, 'Password is required'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Valid email address required').toLowerCase().trim(),
});

export const resetPasswordSchema = z.object({
  email: z.string().email('Valid email address required').toLowerCase().trim(),
  token: z.string().min(6, 'Reset token is required'),
  newPassword: passwordValidation,
});

export type RegisterSchoolInput = z.infer<typeof registerSchoolSchema>;
export type VerifySchoolOtpInput = z.infer<typeof verifySchoolOtpSchema>;
export type ResendSchoolOtpInput = z.infer<typeof resendSchoolOtpSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
