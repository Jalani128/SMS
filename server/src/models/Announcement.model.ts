import mongoose, { Document, Schema, Types } from 'mongoose';
import { tenantIsolationPlugin } from './plugins/tenantIsolation.plugin.js';
import { softDeletePlugin, SoftDeleteDocument } from './plugins/softDelete.plugin.js';
import { IAttachmentMeta } from './Homework.model.js';

export type AudienceType = 'all' | 'teachers' | 'students' | 'parents' | 'class';
export type AnnouncementStatus = 'draft' | 'published' | 'archived';

export interface IAnnouncement extends Document, SoftDeleteDocument {
  schoolId: Types.ObjectId;
  title: string;
  content: string;
  targetAudience: AudienceType;
  targetClassId?: Types.ObjectId;
  targetSectionId?: Types.ObjectId;
  authorId: Types.ObjectId;
  publishedAt?: Date;
  expiresAt?: Date;
  status: AnnouncementStatus;
  attachments: IAttachmentMeta[];
  createdAt: Date;
  updatedAt: Date;
}

const AnnouncementSchema = new Schema<IAnnouncement>(
  {
    schoolId: {
      type: Schema.Types.ObjectId,
      ref: 'School',
      required: [true, 'School reference is required'],
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Announcement title is required'],
      trim: true,
      maxlength: [250, 'Title cannot exceed 250 characters'],
    },
    content: {
      type: String,
      required: [true, 'Announcement content is required'],
      trim: true,
    },
    targetAudience: {
      type: String,
      enum: {
        values: ['all', 'teachers', 'students', 'parents', 'class'],
        message: 'Target audience must be all, teachers, students, parents, or class',
      },
      required: [true, 'Target audience is required'],
      index: true,
    },
    targetClassId: {
      type: Schema.Types.ObjectId,
      ref: 'Class',
      index: true,
    },
    targetSectionId: {
      type: Schema.Types.ObjectId,
      ref: 'Section',
      index: true,
    },
    authorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Author user reference is required'],
      index: true,
    },
    publishedAt: {
      type: Date,
      default: null,
      index: true,
    },
    expiresAt: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ['draft', 'published', 'archived'],
      default: 'draft',
      index: true,
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

AnnouncementSchema.index({ schoolId: 1, status: 1, publishedAt: -1 });

AnnouncementSchema.plugin(tenantIsolationPlugin);
AnnouncementSchema.plugin(softDeletePlugin);

export const Announcement = mongoose.model<IAnnouncement>('Announcement', AnnouncementSchema);
