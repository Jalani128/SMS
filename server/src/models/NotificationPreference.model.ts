import mongoose, { Document, Schema, Types } from 'mongoose';
import { tenantIsolationPlugin } from './plugins/tenantIsolation.plugin.js';
import { softDeletePlugin, SoftDeleteDocument } from './plugins/softDelete.plugin.js';

export interface IChannelPreferences {
  academic: boolean;
  finance: boolean;
  attendance: boolean;
  homework: boolean;
  exams: boolean;
  announcements: boolean;
}

export interface INotificationPreference extends Document, SoftDeleteDocument {
  schoolId: Types.ObjectId;
  userId: Types.ObjectId;
  inApp: IChannelPreferences;
  email: IChannelPreferences;
  createdAt: Date;
  updatedAt: Date;
}

const ChannelPreferenceSchema = new Schema(
  {
    academic: { type: Boolean, default: true },
    finance: { type: Boolean, default: true },
    attendance: { type: Boolean, default: true },
    homework: { type: Boolean, default: true },
    exams: { type: Boolean, default: true },
    announcements: { type: Boolean, default: true },
  },
  { _id: false }
);

const NotificationPreferenceSchema = new Schema<INotificationPreference>(
  {
    schoolId: {
      type: Schema.Types.ObjectId,
      ref: 'School',
      required: [true, 'School reference is required'],
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
      index: true,
    },
    inApp: {
      type: ChannelPreferenceSchema,
      default: () => ({
        academic: true,
        finance: true,
        attendance: true,
        homework: true,
        exams: true,
        announcements: true,
      }),
    },
    email: {
      type: ChannelPreferenceSchema,
      default: () => ({
        academic: true,
        finance: true,
        attendance: true,
        homework: true,
        exams: true,
        announcements: true,
      }),
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

// Compound unique index for school + user scope
NotificationPreferenceSchema.index({ schoolId: 1, userId: 1 }, { unique: true });

NotificationPreferenceSchema.plugin(tenantIsolationPlugin);
NotificationPreferenceSchema.plugin(softDeletePlugin);

export const NotificationPreference = mongoose.model<INotificationPreference>(
  'NotificationPreference',
  NotificationPreferenceSchema
);
