import mongoose, { Document, Schema, Types } from 'mongoose';
import { tenantIsolationPlugin } from './plugins/tenantIsolation.plugin.js';
import { softDeletePlugin, SoftDeleteDocument } from './plugins/softDelete.plugin.js';

export type NotificationCategory =
  | 'academic'
  | 'finance'
  | 'attendance'
  | 'homework'
  | 'exams'
  | 'system'
  | 'notice'
  | 'announcement';

export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';
export type NotificationChannel = 'in_app' | 'email';
export type DeliveryStatusState = 'pending' | 'sent' | 'failed' | 'skipped';

export interface INotificationDeliveryStatus {
  emailStatus?: DeliveryStatusState;
  emailError?: string;
  emailSentAt?: Date;
  attempts?: number;
  lastAttemptAt?: Date;
}

export interface INotification extends Document, SoftDeleteDocument {
  schoolId: Types.ObjectId;
  recipientId: Types.ObjectId;
  category: NotificationCategory;
  title: string;
  content: string;
  channels: NotificationChannel[];
  isRead: boolean;
  readAt?: Date | null;
  priority: NotificationPriority;
  resourceType?: string;
  resourceId?: Types.ObjectId;
  actionUrl?: string;
  idempotencyKey?: string;
  deliveryStatus?: INotificationDeliveryStatus;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    schoolId: {
      type: Schema.Types.ObjectId,
      ref: 'School',
      required: [true, 'School reference is required'],
      index: true,
    },
    recipientId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Notification recipient reference is required'],
      index: true,
    },
    category: {
      type: String,
      enum: {
        values: [
          'academic',
          'finance',
          'attendance',
          'homework',
          'exams',
          'system',
          'notice',
          'announcement',
        ],
        message: 'Notification category must be academic, finance, attendance, homework, exams, system, notice, or announcement',
      },
      required: [true, 'Notification category is required'],
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Notification title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    content: {
      type: String,
      required: [true, 'Notification content is required'],
      trim: true,
      maxlength: [2000, 'Content cannot exceed 2000 characters'],
    },
    channels: {
      type: [String],
      enum: ['in_app', 'email'],
      default: ['in_app'],
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: {
      type: Date,
      default: null,
    },
    priority: {
      type: String,
      enum: ['low', 'normal', 'high', 'urgent'],
      default: 'normal',
    },
    resourceType: {
      type: String,
      trim: true,
      maxlength: [50, 'Resource type string cannot exceed 50 characters'],
    },
    resourceId: {
      type: Schema.Types.ObjectId,
    },
    actionUrl: {
      type: String,
      trim: true,
      maxlength: [500, 'Action URL cannot exceed 500 characters'],
    },
    idempotencyKey: {
      type: String,
      trim: true,
      maxlength: [120, 'Idempotency key cannot exceed 120 characters'],
    },
    deliveryStatus: {
      emailStatus: {
        type: String,
        enum: ['pending', 'sent', 'failed', 'skipped'],
        default: 'pending',
      },
      emailError: {
        type: String,
        default: null,
      },
      emailSentAt: {
        type: Date,
        default: null,
      },
      attempts: {
        type: Number,
        default: 0,
      },
      lastAttemptAt: {
        type: Date,
        default: null,
      },
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

// Compound indexes
NotificationSchema.index({ schoolId: 1, recipientId: 1, isRead: 1, createdAt: -1 });
NotificationSchema.index({ schoolId: 1, idempotencyKey: 1 }, { unique: true, sparse: true });
NotificationSchema.index({ schoolId: 1, 'deliveryStatus.emailStatus': 1, 'deliveryStatus.attempts': 1 });

NotificationSchema.plugin(tenantIsolationPlugin);
NotificationSchema.plugin(softDeletePlugin);

export const Notification = mongoose.model<INotification>('Notification', NotificationSchema);
