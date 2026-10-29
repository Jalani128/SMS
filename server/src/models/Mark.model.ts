import mongoose, { Document, Schema, Types } from 'mongoose';
import { tenantIsolationPlugin } from './plugins/tenantIsolation.plugin.js';
import { softDeletePlugin, SoftDeleteDocument } from './plugins/softDelete.plugin.js';

export type MarkPublicationStatus = 'draft' | 'submitted' | 'verified' | 'published';

export interface IMarkCorrection {
  correctedBy: Types.ObjectId;
  previousMarks?: number;
  newMarks?: number;
  previousStatus?: string;
  newStatus?: string;
  reason: string;
  correctedAt: Date;
}

export interface IMark extends Document, SoftDeleteDocument {
  schoolId: Types.ObjectId;
  examId: Types.ObjectId;
  examSubjectId: Types.ObjectId;
  academicSessionId: Types.ObjectId;
  studentId: Types.ObjectId;
  enrollmentId: Types.ObjectId;
  marksObtained?: number;
  maxMarksSnapshot?: number;
  percentage?: number;
  grade?: string;
  isPassed?: boolean;
  isAbsent: boolean;
  isExempt: boolean;
  remarks?: string;
  enteredBy: Types.ObjectId;
  verifiedBy?: Types.ObjectId;
  verifiedAt?: Date;
  publicationStatus: MarkPublicationStatus;
  correctionHistory?: IMarkCorrection[];
  createdAt: Date;
  updatedAt: Date;
}

const MarkSchema = new Schema<IMark>(
  {
    schoolId: {
      type: Schema.Types.ObjectId,
      ref: 'School',
      required: [true, 'School reference is required'],
      index: true,
    },
    examId: {
      type: Schema.Types.ObjectId,
      ref: 'Exam',
      required: [true, 'Exam reference is required'],
      index: true,
    },
    examSubjectId: {
      type: Schema.Types.ObjectId,
      ref: 'ExamSubject',
      required: [true, 'Exam subject reference is required'],
      index: true,
    },
    academicSessionId: {
      type: Schema.Types.ObjectId,
      ref: 'AcademicSession',
      required: [true, 'Academic session reference is required'],
      index: true,
    },
    studentId: {
      type: Schema.Types.ObjectId,
      ref: 'Student',
      required: [true, 'Student profile reference is required'],
      index: true,
    },
    enrollmentId: {
      type: Schema.Types.ObjectId,
      ref: 'Enrollment',
      required: [true, 'Enrollment reference is required'],
      index: true,
    },
    marksObtained: {
      type: Number,
      min: [0, 'Marks obtained cannot be negative'],
    },
    maxMarksSnapshot: {
      type: Number,
      min: [1, 'Maximum marks snapshot must be positive'],
    },
    percentage: {
      type: Number,
      min: [0, 'Percentage cannot be negative'],
    },
    grade: {
      type: String,
      trim: true,
      uppercase: true,
      maxlength: [10, 'Grade string cannot exceed 10 characters'],
    },
    isPassed: {
      type: Boolean,
    },
    isAbsent: {
      type: Boolean,
      default: false,
    },
    isExempt: {
      type: Boolean,
      default: false,
    },
    remarks: {
      type: String,
      trim: true,
      maxlength: [300, 'Remarks cannot exceed 300 characters'],
    },
    enteredBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User who entered marks is required'],
      index: true,
    },
    verifiedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    verifiedAt: {
      type: Date,
    },
    publicationStatus: {
      type: String,
      enum: {
        values: ['draft', 'submitted', 'verified', 'published'],
        message: 'Publication status must be draft, submitted, verified, or published',
      },
      default: 'draft',
      index: true,
    },
    correctionHistory: [
      {
        correctedBy: {
          type: Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        previousMarks: Number,
        newMarks: Number,
        previousStatus: String,
        newStatus: String,
        reason: {
          type: String,
          required: true,
          trim: true,
        },
        correctedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
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

/**
 * MANDATORY UNIQUE COMPOUND INDEX:
 * Enforces exactly one mark entry per student per exam subject.
 */
MarkSchema.index({ schoolId: 1, examSubjectId: 1, studentId: 1 }, { unique: true });
MarkSchema.index({ schoolId: 1, examId: 1, publicationStatus: 1 });
MarkSchema.index({ schoolId: 1, publicationStatus: 1, percentage: 1 });
MarkSchema.index({ schoolId: 1, studentId: 1, academicSessionId: 1 });

MarkSchema.plugin(tenantIsolationPlugin);
MarkSchema.plugin(softDeletePlugin);

export const Mark = mongoose.model<IMark>('Mark', MarkSchema);
