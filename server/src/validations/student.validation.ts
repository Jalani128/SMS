import { z } from 'zod';
import mongoose from 'mongoose';

const objectIdString = z.string().refine((val) => mongoose.Types.ObjectId.isValid(val), {
  message: 'Invalid ObjectId format',
});

export const studentListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1).optional(),
  limit: z.coerce.number().int().positive().max(100).default(10).optional(),
  search: z.string().trim().optional(),
  classId: objectIdString.optional(),
  sectionId: objectIdString.optional(),
  academicSessionId: objectIdString.optional(),
  status: z.enum(['active', 'inactive', 'transferred', 'graduated', 'suspended']).optional(),
  gender: z.enum(['male', 'female', 'other', 'prefer_not_to_say']).optional(),
});

export const createStudentSchema = z.object({
  // User identity
  firstName: z.string().trim().min(1, 'First name is required').max(50),
  lastName: z.string().trim().min(1, 'Last name is required').max(50),
  email: z.string().email('Valid email address required').toLowerCase().trim(),
  phone: z.string().trim().max(25).optional(),
  avatarUrl: z.string().url('Invalid URL format').optional().or(z.literal('')),

  // Student specific
  admissionNumber: z.string().trim().max(50).optional(),
  rollNumber: z.string().trim().max(30).optional(),
  dateOfBirth: z.coerce.date().optional(),
  gender: z.enum(['male', 'female', 'other', 'prefer_not_to_say']).default('prefer_not_to_say').optional(),
  bloodGroup: z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'unknown']).default('unknown').optional(),
  medicalNotes: z.string().trim().max(1000).optional(),
  adminNotes: z.string().trim().max(2000).optional(),
  address: z.string().trim().max(300).optional(),
  admissionDate: z.coerce.date().optional(),
  emergencyContact: z
    .object({
      name: z.string().trim().max(100).optional(),
      relationship: z.string().trim().max(50).optional(),
      phone: z.string().trim().max(25).optional(),
    })
    .optional(),

  // Initial Enrollment (optional on registration)
  classId: objectIdString.optional(),
  sectionId: objectIdString.optional(),
  academicSessionId: objectIdString.optional(),

  // Initial Guardian Link (optional)
  parentProfileId: objectIdString.optional(),
  parentRelationship: z.enum(['father', 'mother', 'guardian', 'other']).optional(),
  isPrimaryGuardian: z.boolean().default(true).optional(),
});

export const updateStudentSchema = z.object({
  firstName: z.string().trim().min(1).max(50).optional(),
  lastName: z.string().trim().min(1).max(50).optional(),
  email: z.string().email().toLowerCase().trim().optional(),
  phone: z.string().trim().max(25).optional(),
  avatarUrl: z.string().url().optional().or(z.literal('')),
  rollNumber: z.string().trim().max(30).optional(),
  dateOfBirth: z.coerce.date().optional(),
  gender: z.enum(['male', 'female', 'other', 'prefer_not_to_say']).optional(),
  bloodGroup: z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'unknown']).optional(),
  medicalNotes: z.string().trim().max(1000).optional(),
  adminNotes: z.string().trim().max(2000).optional(),
  address: z.string().trim().max(300).optional(),
  emergencyContact: z
    .object({
      name: z.string().trim().max(100).optional(),
      relationship: z.string().trim().max(50).optional(),
      phone: z.string().trim().max(25).optional(),
    })
    .optional(),
  status: z.enum(['active', 'inactive', 'transferred', 'graduated', 'suspended']).optional(),
});

export const createEnrollmentSchema = z.object({
  academicSessionId: objectIdString,
  classId: objectIdString,
  sectionId: objectIdString,
  rollNumber: z.string().trim().max(30).optional(),
  remarks: z.string().trim().max(500).optional(),
});

export const archiveStudentSchema = z.object({
  reason: z.string().trim().max(500).optional(),
  status: z.enum(['inactive', 'transferred', 'graduated', 'suspended']).default('inactive').optional(),
});
