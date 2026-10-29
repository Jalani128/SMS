import { z } from 'zod';
import mongoose from 'mongoose';

const objectIdString = z.string().refine((val) => mongoose.Types.ObjectId.isValid(val), {
  message: 'Invalid ObjectId format',
});

export const attendanceStatusEnum = z.enum(['present', 'absent', 'late', 'leave']);

// Single attendance marking schema
export const markAttendanceSchema = z.object({
  studentId: objectIdString,
  academicSessionId: objectIdString,
  classId: objectIdString,
  sectionId: objectIdString,
  date: z.string().min(1, 'Date is required'),
  status: attendanceStatusEnum,
  remarks: z.string().trim().max(300, 'Remarks cannot exceed 300 characters').optional(),
});

// Bulk attendance submission schema
export const bulkAttendanceRecordItem = z.object({
  studentId: objectIdString,
  status: attendanceStatusEnum,
  remarks: z.string().trim().max(300, 'Remarks cannot exceed 300 characters').optional(),
});

export const bulkAttendanceSchema = z.object({
  academicSessionId: objectIdString,
  classId: objectIdString,
  sectionId: objectIdString,
  date: z.string().min(1, 'Attendance date is required'),
  records: z.array(bulkAttendanceRecordItem).min(1, 'At least one student attendance record is required'),
});

// Update / correction schema with mandatory audit reason
export const updateAttendanceSchema = z.object({
  status: attendanceStatusEnum,
  remarks: z.string().trim().max(300, 'Remarks cannot exceed 300 characters').optional(),
  reason: z.string().trim().min(2, 'Administrative correction reason is required for audit logs').max(300),
});

// Query parameters validation schemas
export const dailyAttendanceQuerySchema = z.object({
  classId: objectIdString,
  sectionId: objectIdString,
  date: z.string().min(1, 'Date is required'),
  academicSessionId: objectIdString.optional(),
});

export const attendanceListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20).optional(),
  academicSessionId: objectIdString.optional(),
  classId: objectIdString.optional(),
  sectionId: objectIdString.optional(),
  studentId: objectIdString.optional(),
  date: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  status: attendanceStatusEnum.optional(),
});

export const studentAttendanceQuerySchema = z.object({
  academicSessionId: objectIdString.optional(),
  month: z.coerce.number().int().min(1).max(12).optional(),
  year: z.coerce.number().int().min(2000).max(2100).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(31).optional(),
});

export const classSummaryQuerySchema = z.object({
  classId: objectIdString,
  sectionId: objectIdString,
  date: z.string().min(1, 'Date is required'),
  academicSessionId: objectIdString.optional(),
});

export const monthlyReportQuerySchema = z.object({
  academicSessionId: objectIdString.optional(),
  classId: objectIdString.optional(),
  sectionId: objectIdString.optional(),
  studentId: objectIdString.optional(),
  month: z.coerce.number().int().min(1).max(12).optional(),
  year: z.coerce.number().int().min(2000).max(2100).optional(),
  format: z.enum(['json', 'csv']).default('json').optional(),
});
