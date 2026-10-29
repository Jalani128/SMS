import mongoose, { Document, Schema, Types } from 'mongoose';
import { tenantIsolationPlugin } from './plugins/tenantIsolation.plugin.js';
import { softDeletePlugin, SoftDeleteDocument } from './plugins/softDelete.plugin.js';

export type ExamStatus = 'draft' | 'scheduled' | 'ongoing' | 'completed' | 'published' | 'cancelled' | 'archived';
export type ExamType = 'monthly_test' | 'midterm' | 'final' | 'quiz' | 'practical' | 'other';

export interface IExam extends Document, SoftDeleteDocument {
  schoolId: Types.ObjectId;
  academicSessionId: Types.ObjectId;
  name: string;
  examType: ExamType;
  classId?: Types.ObjectId;
  sectionId?: Types.ObjectId;
  term?: string;
  startDate: Date;
  endDate: Date;
  description?: string;
  instructions?: string;
  status: ExamStatus;
  createdBy?: Types.ObjectId;
  publishedBy?: Types.ObjectId;
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ExamSchema = new Schema<IExam>(
  {
    schoolId: {
      type: Schema.Types.ObjectId,
      ref: 'School',
      required: [true, 'School reference is required'],
      index: true,
    },
    academicSessionId: {
      type: Schema.Types.ObjectId,
      ref: 'AcademicSession',
      required: [true, 'Academic session reference is required'],
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Examination name is required'],
      trim: true,
      maxlength: [150, 'Exam name cannot exceed 150 characters'],
    },
    examType: {
      type: String,
      enum: ['monthly_test', 'midterm', 'final', 'quiz', 'practical', 'other'],
      default: 'midterm',
      index: true,
    },
    classId: {
      type: Schema.Types.ObjectId,
      ref: 'Class',
      index: true,
    },
    sectionId: {
      type: Schema.Types.ObjectId,
      ref: 'Section',
      index: true,
    },
    term: {
      type: String,
      trim: true,
      maxlength: [50, 'Term name cannot exceed 50 characters'],
    },
    startDate: {
      type: Date,
      required: [true, 'Exam start date is required'],
    },
    endDate: {
      type: Date,
      required: [true, 'Exam end date is required'],
      validate: {
        validator: function (this: IExam, val: Date) {
          return !this.startDate || val >= this.startDate;
        },
        message: 'Exam end date must be on or after the start date',
      },
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    instructions: {
      type: String,
      trim: true,
      maxlength: [1000, 'Instructions cannot exceed 1000 characters'],
    },
    status: {
      type: String,
      enum: ['draft', 'scheduled', 'ongoing', 'completed', 'published', 'cancelled', 'archived'],
      default: 'draft',
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    publishedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    publishedAt: {
      type: Date,
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

ExamSchema.index({ schoolId: 1, academicSessionId: 1, status: 1 });
ExamSchema.index({ schoolId: 1, academicSessionId: 1, name: 1 });
ExamSchema.index({ schoolId: 1, classId: 1, status: 1 });

ExamSchema.plugin(tenantIsolationPlugin);
ExamSchema.plugin(softDeletePlugin);

export const Exam = mongoose.model<IExam>('Exam', ExamSchema);
