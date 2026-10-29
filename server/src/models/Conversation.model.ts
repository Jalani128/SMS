import mongoose, { Document, Schema, Types } from 'mongoose';
import { tenantIsolationPlugin } from './plugins/tenantIsolation.plugin.js';
import { softDeletePlugin, SoftDeleteDocument } from './plugins/softDelete.plugin.js';

export type ConversationType = 'direct' | 'group' | 'class_channel';

export interface IConversationParticipant {
  userId: Types.ObjectId;
  role?: string;
  joinedAt: Date;
  lastReadAt?: Date;
}

export interface IConversation extends Document, SoftDeleteDocument {
  schoolId: Types.ObjectId;
  type: ConversationType;
  title?: string;
  directKey?: string;
  participants: IConversationParticipant[];
  createdBy?: Types.ObjectId;
  lastMessage?: string;
  lastMessageAt?: Date;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Computes deterministic sorted key for direct conversation participants
 */
export const getDirectConversationKey = (
  userA: string | Types.ObjectId,
  userB: string | Types.ObjectId
): string => {
  const strA = userA.toString();
  const strB = userB.toString();
  return strA < strB ? `${strA}_${strB}` : `${strB}_${strA}`;
};

const ConversationSchema = new Schema<IConversation>(
  {
    schoolId: {
      type: Schema.Types.ObjectId,
      ref: 'School',
      required: [true, 'School reference is required'],
      index: true,
    },
    type: {
      type: String,
      enum: ['direct', 'group', 'class_channel'],
      default: 'direct',
      index: true,
    },
    title: {
      type: String,
      trim: true,
      maxlength: [100, 'Conversation title cannot exceed 100 characters'],
    },
    directKey: {
      type: String,
      trim: true,
      index: true,
    },
    participants: [
      {
        userId: {
          type: Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        role: { type: String, trim: true },
        joinedAt: { type: Date, default: Date.now },
        lastReadAt: { type: Date, default: null },
      },
    ],
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    lastMessage: {
      type: String,
      trim: true,
      maxlength: 300,
    },
    lastMessageAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    isArchived: {
      type: Boolean,
      default: false,
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

// Indexes
ConversationSchema.index({ schoolId: 1, 'participants.userId': 1 });
ConversationSchema.index({ schoolId: 1, lastMessageAt: -1 });
ConversationSchema.index(
  { schoolId: 1, directKey: 1 },
  { unique: true, sparse: true }
);

ConversationSchema.plugin(tenantIsolationPlugin);
ConversationSchema.plugin(softDeletePlugin);

export const Conversation = mongoose.model<IConversation>('Conversation', ConversationSchema);
