import mongoose, { Document, Schema, Types } from 'mongoose';
import { tenantIsolationPlugin } from './plugins/tenantIsolation.plugin.js';
import { softDeletePlugin, SoftDeleteDocument } from './plugins/softDelete.plugin.js';

export type HomeworkStatus = 'draft' | 'published' | 'closed' | 'archived';
export type AssignmentType = 'homework' | 'classwork' | 'project' | 'other';

export interface IAttachmentMeta {
  name: string;
  url: string;
  fileType: string;
  sizeBytes: number;
  storageKey?: string;
}

export interface IResourceLink {
  title: string;
  url: string;
}

export interface ISubmissionSettings {
  allowLateSubmission: boolean;
  latePenaltyPercent: number;
  allowResubmission: boolean;
  maxSubmissions: number;
  cutoffDate?: Date;
}

export interface IHomework extends Document, SoftDeleteDocument {
  schoolId: Types.ObjectId;
  academicSessionId: Types.ObjectId;
  classId: Types.ObjectId;
  sectionId: Types.ObjectId;
  subjectId: Types.ObjectId;
  teacherId: Types.ObjectId;
  title: string;
  description?: string;
  instructions: string;
  assignmentType: AssignmentType;
  assignedDate: Date;
  publishDate?: Date;
  dueDate: Date;
  maxMarks: number;
  isGraded: boolean;
  attachments: IAttachmentMeta[];
  resourceLinks: IResourceLink[];
  submissionSettings: ISubmissionSettings;
  status: HomeworkStatus;
  archiveReason?: string;
  archivedBy?: Types.ObjectId;
  archivedAt?: Date;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  readonly isOverdue?: boolean;
}

const HomeworkSchema = new Schema<IHomework>(
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
    subjectId: {
      type: Schema.Types.ObjectId,
      ref: 'Subject',
      required: [true, 'Subject reference is required'],
      index: true,
    },
    teacherId: {
      type: Schema.Types.ObjectId,
      ref: 'Teacher',
      required: [true, 'Teacher reference is required'],
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Homework title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    instructions: {
      type: String,
      required: [true, 'Homework instructions are required'],
      trim: true,
      maxlength: [5000, 'Instructions cannot exceed 5000 characters'],
    },
    assignmentType: {
      type: String,
      enum: ['homework', 'classwork', 'project', 'other'],
      default: 'homework',
      index: true,
    },
    assignedDate: {
      type: Date,
      default: Date.now,
    },
    publishDate: {
      type: Date,
      default: Date.now,
    },
    dueDate: {
      type: Date,
      required: [true, 'Homework due date is required'],
      index: true,
    },
    maxMarks: {
      type: Number,
      default: 100,
      min: [0, 'Max marks cannot be negative'],
    },
    isGraded: {
      type: Boolean,
      default: true,
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
    resourceLinks: [
      {
        title: { type: String, required: true, trim: true },
        url: { type: String, required: true, trim: true },
      },
    ],
    submissionSettings: {
      allowLateSubmission: { type: Boolean, default: true },
      latePenaltyPercent: { type: Number, default: 0, min: 0, max: 100 },
      allowResubmission: { type: Boolean, default: false },
      maxSubmissions: { type: Number, default: 3, min: 1, max: 10 },
      cutoffDate: { type: Date },
    },
    status: {
      type: String,
      enum: ['draft', 'published', 'closed', 'archived'],
      default: 'draft',
      index: true,
    },
    archiveReason: {
      type: String,
      trim: true,
      maxlength: [500, 'Archive reason cannot exceed 500 characters'],
    },
    archivedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    archivedAt: {
      type: Date,
    },
    version: {
      type: Number,
      default: 1,
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

// Virtual property indicating whether assignment is currently past due
HomeworkSchema.virtual('isOverdue').get(function (this: IHomework) {
  if (this.status !== 'published') return false;
  return new Date().getTime() > new Date(this.dueDate).getTime();
});

// Indexes for query performance and school isolation
HomeworkSchema.index({ schoolId: 1, classId: 1, sectionId: 1, dueDate: 1 });
HomeworkSchema.index({ schoolId: 1, teacherId: 1, status: 1 });
HomeworkSchema.index({ schoolId: 1, status: 1, dueDate: 1 });

HomeworkSchema.plugin(tenantIsolationPlugin);
HomeworkSchema.plugin(softDeletePlugin);

export const Homework = mongoose.model<IHomework>('Homework', HomeworkSchema);
