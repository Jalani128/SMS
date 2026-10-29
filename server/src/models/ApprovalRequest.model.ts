import mongoose, { Document, Schema, Types } from 'mongoose';
import { tenantIsolationPlugin } from './plugins/tenantIsolation.plugin.js';
import { softDeletePlugin, SoftDeleteDocument } from './plugins/softDelete.plugin.js';

export type ApprovalType =
  | 'staff_activation'
  | 'student_record_correction'
  | 'fee_concession'
  | 'exam_mark_correction'
  | 'general_request';

export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';
export type ApprovalPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface IApprovalRequest extends Document, SoftDeleteDocument {
  schoolId: Types.ObjectId;
  type: ApprovalType;
  title: string;
  description?: string;
  reason: string;
  status: ApprovalStatus;
  priority: ApprovalPriority;
  requestedBy: Types.ObjectId;
  targetModel?: 'User' | 'Student' | 'Invoice' | 'Mark' | 'StudentConcession' | 'Other';
  targetId?: string;
  payload?: Record<string, any>;
  reviewedBy?: Types.ObjectId | null;
  reviewedAt?: Date | null;
  reviewNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ApprovalRequestSchema = new Schema<IApprovalRequest>(
  {
    schoolId: {
      type: Schema.Types.ObjectId,
      ref: 'School',
      required: [true, 'School reference is required'],
      index: true,
    },
    type: {
      type: String,
      enum: {
        values: [
          'staff_activation',
          'student_record_correction',
          'fee_concession',
          'exam_mark_correction',
          'general_request',
        ],
        message: 'Invalid approval type',
      },
      required: [true, 'Approval type is required'],
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Approval request title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
      default: '',
    },
    reason: {
      type: String,
      required: [true, 'Justification / reason is required for administrative requests'],
      trim: true,
      maxlength: [1000, 'Reason cannot exceed 1000 characters'],
    },
    status: {
      type: String,
      enum: {
        values: ['pending', 'approved', 'rejected', 'cancelled'],
        message: 'Invalid approval status',
      },
      default: 'pending',
      index: true,
    },
    priority: {
      type: String,
      enum: {
        values: ['low', 'medium', 'high', 'urgent'],
        message: 'Invalid priority',
      },
      default: 'medium',
      index: true,
    },
    requestedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Requester user ID is required'],
      index: true,
    },
    targetModel: {
      type: String,
      enum: ['User', 'Student', 'Invoice', 'Mark', 'StudentConcession', 'Other'],
      default: 'Other',
    },
    targetId: {
      type: String,
      trim: true,
    },
    payload: {
      type: Schema.Types.Mixed,
      default: {},
    },
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    reviewedAt: {
      type: Date,
    },
    reviewNotes: {
      type: String,
      trim: true,
      maxlength: [1000, 'Review notes cannot exceed 1000 characters'],
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
  }
);

ApprovalRequestSchema.index({ schoolId: 1, status: 1, createdAt: -1 });
ApprovalRequestSchema.index({ schoolId: 1, targetModel: 1, targetId: 1, status: 1 });
ApprovalRequestSchema.index({ schoolId: 1, requestedBy: 1, status: 1 });

ApprovalRequestSchema.plugin(tenantIsolationPlugin);
ApprovalRequestSchema.plugin(softDeletePlugin);

export const ApprovalRequest = mongoose.model<IApprovalRequest>(
  'ApprovalRequest',
  ApprovalRequestSchema
);
