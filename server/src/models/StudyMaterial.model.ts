import mongoose, { Document, Schema, Types } from 'mongoose';
import { tenantIsolationPlugin } from './plugins/tenantIsolation.plugin.js';
import { softDeletePlugin, SoftDeleteDocument } from './plugins/softDelete.plugin.js';
import { IAttachmentMeta } from './Homework.model.js';

export type MaterialCategory =
  | 'notes'
  | 'pdf'
  | 'worksheet'
  | 'past_paper'
  | 'assignment_resource'
  | 'presentation'
  | 'video'
  | 'external_link'
  | 'syllabus'
  | 'reference'
  | 'other';

export type MaterialStatus = 'draft' | 'published' | 'archived';

export interface IStudyMaterial extends Document, SoftDeleteDocument {
  schoolId: Types.ObjectId;
  academicSessionId: Types.ObjectId;
  classId: Types.ObjectId;
  sectionId?: Types.ObjectId;
  subjectId: Types.ObjectId;
  uploadedBy: Types.ObjectId;
  title: string;
  description?: string;
  category: MaterialCategory;
  tags?: string[];
  fileUrl?: string;
  originalFileName?: string;
  mimeType?: string;
  fileSize?: number;
  storageKey?: string;
  externalUrl?: string;
  attachments: IAttachmentMeta[];
  status: MaterialStatus;
  publishedAt?: Date;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const StudyMaterialSchema = new Schema<IStudyMaterial>(
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
      index: true,
    },
    subjectId: {
      type: Schema.Types.ObjectId,
      ref: 'Subject',
      required: [true, 'Subject reference is required'],
      index: true,
    },
    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Uploader user reference is required'],
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Material title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    category: {
      type: String,
      enum: [
        'notes',
        'pdf',
        'worksheet',
        'past_paper',
        'assignment_resource',
        'presentation',
        'video',
        'external_link',
        'syllabus',
        'reference',
        'other',
      ],
      default: 'notes',
      index: true,
    },
    tags: [
      {
        type: String,
        trim: true,
        maxlength: [50, 'Tag cannot exceed 50 characters'],
      },
    ],
    fileUrl: {
      type: String,
      trim: true,
    },
    originalFileName: {
      type: String,
      trim: true,
    },
    mimeType: {
      type: String,
      trim: true,
    },
    fileSize: {
      type: Number,
      min: [0, 'File size cannot be negative'],
    },
    storageKey: {
      type: String,
      trim: true,
    },
    externalUrl: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['draft', 'published', 'archived'],
      default: 'published',
      index: true,
    },
    publishedAt: {
      type: Date,
      default: Date.now,
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
    isPublic: {
      type: Boolean,
      default: false,
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

StudyMaterialSchema.index({ schoolId: 1, classId: 1, subjectId: 1 });
StudyMaterialSchema.index({ schoolId: 1, academicSessionId: 1, status: 1 });
StudyMaterialSchema.index({ schoolId: 1, classId: 1, sectionId: 1, status: 1 });
StudyMaterialSchema.index({ schoolId: 1, category: 1, status: 1 });
StudyMaterialSchema.index({ title: 'text', description: 'text', tags: 'text' });

StudyMaterialSchema.plugin(tenantIsolationPlugin);
StudyMaterialSchema.plugin(softDeletePlugin);

export const StudyMaterial = mongoose.model<IStudyMaterial>('StudyMaterial', StudyMaterialSchema);
