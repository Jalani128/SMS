import mongoose, { Document, Schema, Types } from 'mongoose';
import { tenantIsolationPlugin } from './plugins/tenantIsolation.plugin.js';
import { softDeletePlugin, SoftDeleteDocument } from './plugins/softDelete.plugin.js';
import { IAttachmentMeta } from './Homework.model.js';

export type SubmissionStatus = 'submitted' | 'late' | 'graded' | 'resubmitted' | 'returned';

export interface ISubmissionRevision {
  revisionNumber: number;
  submittedAt: Date;
  submissionText?: string;
  attachments: IAttachmentMeta[];
  status: SubmissionStatus;
  marksObtained?: number;
  teacherFeedback?: string;
}

export interface IAssignmentSubmission extends Document, SoftDeleteDocument {
  schoolId: Types.ObjectId;
  homeworkId: Types.ObjectId;
  studentId: Types.ObjectId;
  submittedAt: Date;
  submissionText?: string;
  attachments: IAttachmentMeta[];
  status: SubmissionStatus;
  isLate: boolean;
  marksObtained?: number;
  teacherFeedback?: string;
  gradedBy?: Types.ObjectId;
  gradedAt?: Date;
  isGradeReleased: boolean;
  releasedAt?: Date;
  revisionNumber: number;
  history: ISubmissionRevision[];
  createdAt: Date;
  updatedAt: Date;
}

const AssignmentSubmissionSchema = new Schema<IAssignmentSubmission>(
  {
    schoolId: {
      type: Schema.Types.ObjectId,
      ref: 'School',
      required: [true, 'School reference is required'],
      index: true,
    },
    homeworkId: {
      type: Schema.Types.ObjectId,
      ref: 'Homework',
      required: [true, 'Homework reference is required'],
      index: true,
    },
    studentId: {
      type: Schema.Types.ObjectId,
      ref: 'Student',
      required: [true, 'Student profile reference is required'],
      index: true,
    },
    submittedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    submissionText: {
      type: String,
      trim: true,
      maxlength: [10000, 'Submission text cannot exceed 10000 characters'],
    },
    attachments: [
      {
        name: { type: String, required: true, trim: true },
        url: { type: String, required: true, trim: true },
        fileType: { type: String, required: true, trim: true },
        sizeBytes: { type: Number, required: true },
        storageKey: { type: String, trim: true },
      },
    ],
    status: {
      type: String,
      enum: ['submitted', 'late', 'graded', 'resubmitted', 'returned'],
      default: 'submitted',
      index: true,
    },
    isLate: {
      type: Boolean,
      default: false,
    },
    marksObtained: {
      type: Number,
      min: [0, 'Marks obtained cannot be negative'],
    },
    teacherFeedback: {
      type: String,
      trim: true,
      maxlength: [2000, 'Teacher feedback cannot exceed 2000 characters'],
    },
    gradedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    gradedAt: {
      type: Date,
    },
    isGradeReleased: {
      type: Boolean,
      default: false,
      index: true,
    },
    releasedAt: {
      type: Date,
    },
    revisionNumber: {
      type: Number,
      default: 1,
      min: 1,
    },
    history: [
      {
        revisionNumber: { type: Number, required: true },
        submittedAt: { type: Date, required: true },
        submissionText: { type: String, trim: true },
        attachments: [
          {
            name: { type: String, required: true },
            url: { type: String, required: true },
            fileType: { type: String, required: true },
            sizeBytes: { type: Number, required: true },
            storageKey: { type: String },
          },
        ],
        status: { type: String, required: true },
        marksObtained: { type: Number },
        teacherFeedback: { type: String },
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

// Compound unique index ensuring only one active submission record per student per homework assignment
AssignmentSubmissionSchema.index({ schoolId: 1, homeworkId: 1, studentId: 1 }, { unique: true });
AssignmentSubmissionSchema.index({ schoolId: 1, homeworkId: 1, status: 1 });
AssignmentSubmissionSchema.index({ schoolId: 1, studentId: 1, status: 1 });
AssignmentSubmissionSchema.index({ schoolId: 1, submittedAt: -1 });

AssignmentSubmissionSchema.plugin(tenantIsolationPlugin);
AssignmentSubmissionSchema.plugin(softDeletePlugin);

export const AssignmentSubmission = mongoose.model<IAssignmentSubmission>(
  'AssignmentSubmission',
  AssignmentSubmissionSchema
);
