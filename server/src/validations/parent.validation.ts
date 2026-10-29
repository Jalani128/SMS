import { z } from 'zod';
import mongoose from 'mongoose';

const objectIdString = z.string().refine((val) => mongoose.Types.ObjectId.isValid(val), {
  message: 'Invalid ObjectId format',
});

export const parentListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1).optional(),
  limit: z.coerce.number().int().positive().max(100).default(10).optional(),
  search: z.string().trim().optional(),
  status: z.enum(['active', 'inactive']).optional(),
});

export const createParentSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required').max(50),
  lastName: z.string().trim().min(1, 'Last name is required').max(50),
  email: z.string().email('Valid email address required').toLowerCase().trim(),
  phone: z.string().trim().max(25).optional(),
  avatarUrl: z.string().url().optional().or(z.literal('')),
  occupation: z.string().trim().max(100).optional(),
  alternatePhone: z.string().trim().max(25).optional(),
  address: z.string().trim().max(300).optional(),
  emergencyContact: z
    .object({
      name: z.string().trim().max(100).optional(),
      relationship: z.string().trim().max(50).optional(),
      phone: z.string().trim().max(25).optional(),
    })
    .optional(),
  status: z.enum(['active', 'inactive']).default('active').optional(),
  adminNotes: z.string().trim().max(2000).optional(),
  children: z
    .array(
      z.object({
        studentProfileId: objectIdString,
        relationship: z.enum(['father', 'mother', 'guardian', 'other']),
        isPrimary: z.boolean().default(false).optional(),
      })
    )
    .optional(),
});

export const updateParentSchema = z.object({
  firstName: z.string().trim().min(1).max(50).optional(),
  lastName: z.string().trim().min(1).max(50).optional(),
  email: z.string().email().toLowerCase().trim().optional(),
  phone: z.string().trim().max(25).optional(),
  avatarUrl: z.string().url().optional().or(z.literal('')),
  occupation: z.string().trim().max(100).optional(),
  alternatePhone: z.string().trim().max(25).optional(),
  address: z.string().trim().max(300).optional(),
  emergencyContact: z
    .object({
      name: z.string().trim().max(100).optional(),
      relationship: z.string().trim().max(50).optional(),
      phone: z.string().trim().max(25).optional(),
    })
    .optional(),
  status: z.enum(['active', 'inactive']).optional(),
  adminNotes: z.string().trim().max(2000).optional(),
});

export const updateParentChildrenSchema = z.object({
  action: z.enum(['sync', 'add', 'remove']).default('sync').optional(),
  children: z
    .array(
      z.object({
        studentProfileId: objectIdString,
        relationship: z.enum(['father', 'mother', 'guardian', 'other']),
        isPrimary: z.boolean().default(false).optional(),
      })
    )
    .optional(),
  // For single add/remove action
  studentProfileId: objectIdString.optional(),
  relationship: z.enum(['father', 'mother', 'guardian', 'other']).optional(),
  isPrimary: z.boolean().default(false).optional(),
});
