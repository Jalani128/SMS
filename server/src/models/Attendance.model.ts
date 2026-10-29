import mongoose, { Document, Schema, Types } from 'mongoose';
import { tenantIsolationPlugin } from './plugins/tenantIsolation.plugin.js';
import { softDeletePlugin, SoftDeleteDocument } from './plugins/softDelete.plugin.js';

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'leave';

export interface IAttendance extends Document, SoftDeleteDocument {
  schoolId: Types.ObjectId;
  studentId: Types.ObjectId;
  academicSessionId: Types.ObjectId;
  classId: Types.ObjectId;
  sectionId: Types.ObjectId;
  date: Date;
  attendanceDate?: Date;
  status: AttendanceStatus;
  remarks?: string;
  markedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const AttendanceSchema = new Schema<IAttendance>(
  {
    schoolId: {
      type: Schema.Types.ObjectId,
      ref: 'School',
      required: [true, 'School reference is required'],
      index: true,
    },
    studentId: {
      type: Schema.Types.ObjectId,
      ref: 'Student',
      required: [true, 'Student profile reference is required'],
      index: true,
    },
    academicSessionId: {
      type: Schema.Types.ObjectId,
      ref: 'AcademicSession',
      required: [true, 'Academic session reference is required'],
      index: true,
    },
    classId: {
      type: Schema.Types.ObjectId,
      ref: 'Class',
      required: [true, 'Class reference is required'],
      index: true,
    },
    sectionId: {
      type: Schema.Types.ObjectId,
      ref: 'Section',
      required: [true, 'Section reference is required'],
      index: true,
    },
    date: {
      type: Date,
      required: [true, 'Attendance date is required'],
      index: true,
    },
    status: {
      type: String,
      enum: {
        values: ['present', 'absent', 'late', 'leave'],
        message: 'Attendance status must be present, absent, late, or leave',
      },
      required: [true, 'Attendance status is required'],
      index: true,
    },
    remarks: {
      type: String,
      trim: true,
      maxlength: [300, 'Remarks cannot exceed 300 characters'],
    },
    markedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User who marked attendance is required'],
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        delete (ret as any).__v;
        return ret;
      },
    },
    toObject: { virtuals: true },
  }
);

// Virtual alias for attendanceDate mapping to date
AttendanceSchema.virtual('attendanceDate')
  .get(function () {
    return this.date;
  })
  .set(function (val: Date | string) {
    this.date = val instanceof Date ? val : new Date(val);
  });

// Pre-validate hook to sync attendanceDate to date and normalize to UTC midnight
AttendanceSchema.pre('validate', function (next) {
  if (!this.date && (this as any).attendanceDate) {
    const val = (this as any).attendanceDate;
    this.date = val instanceof Date ? val : new Date(val);
  }
  if (this.date) {
    const d = new Date(this.date);
    d.setUTCHours(0, 0, 0, 0);
    this.date = d;
  }
  next();
});

// Normalize date to UTC midnight before saving to ensure unique date equality
AttendanceSchema.pre('save', function (next) {
  if (this.date) {
    const d = new Date(this.date);
    d.setUTCHours(0, 0, 0, 0);
    this.date = d;
  }
  next();
});

/**
 * MANDATORY UNIQUE COMPOUND INDEX:
 * Enforces that a student cannot have more than one attendance record per school per calendar date.
 *
 * JUSTIFICATION:
 * - { schoolId: 1, studentId: 1, date: 1 } is the fundamental business uniqueness invariant.
 * - `academicSessionId`, `classId`, and `sectionId` are intentionally omitted from this uniqueness key
 *   because a student cannot be simultaneously marked in two different sessions or classes on the same date.
 * - However, those fields are indexed separately below to support fast class-roll aggregation queries.
 */
AttendanceSchema.index({ schoolId: 1, studentId: 1, date: 1 }, { unique: true });

// Additional query performance indexes
AttendanceSchema.index({ schoolId: 1, date: 1, status: 1 });
AttendanceSchema.index({ schoolId: 1, classId: 1, sectionId: 1, date: 1 });
AttendanceSchema.index({ schoolId: 1, academicSessionId: 1, studentId: 1 });
AttendanceSchema.index({ schoolId: 1, academicSessionId: 1, classId: 1, sectionId: 1, date: 1 });
AttendanceSchema.index({ schoolId: 1, studentId: 1, academicSessionId: 1, date: 1 });

AttendanceSchema.plugin(tenantIsolationPlugin);
AttendanceSchema.plugin(softDeletePlugin);

export const Attendance = mongoose.model<IAttendance>('Attendance', AttendanceSchema);
