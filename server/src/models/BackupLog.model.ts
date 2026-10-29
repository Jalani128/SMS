import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export type BackupType = 'snapshot' | 'logical' | 'manual' | 'pitr';
export type BackupStatus = 'running' | 'completed' | 'failed' | 'verified';
export type VerificationStatus = 'unverified' | 'verified' | 'failed';
export type BackupScope = 'platform' | 'school';

export interface IBackupLog extends Document {
  backupId: string;
  backupType: BackupType;
  status: BackupStatus;
  scope: BackupScope;
  schoolId?: Types.ObjectId;
  startedAt: Date;
  completedAt?: Date;
  sizeBytes?: number;
  storageLocation: string;
  checksum?: string;
  collectionsCount?: number;
  recordsCount?: number;
  verificationStatus: VerificationStatus;
  verifiedAt?: Date;
  retentionEligible: boolean;
  retentionExpiresAt?: Date;
  errorMessage?: string;
  triggeredBy: {
    userId?: Types.ObjectId;
    userEmail?: string;
    triggerType: 'scheduled' | 'manual' | 'automated_pre_migration';
  };
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const BackupLogSchema = new Schema<IBackupLog>(
  {
    backupId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    backupType: {
      type: String,
      enum: ['snapshot', 'logical', 'manual', 'pitr'],
      required: true,
      default: 'logical',
    },
    status: {
      type: String,
      enum: ['running', 'completed', 'failed', 'verified'],
      required: true,
      default: 'running',
      index: true,
    },
    scope: {
      type: String,
      enum: ['platform', 'school'],
      default: 'platform',
      index: true,
    },
    schoolId: {
      type: Schema.Types.ObjectId,
      ref: 'School',
      required: false,
      index: true,
    },
    startedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    completedAt: {
      type: Date,
    },
    sizeBytes: {
      type: Number,
      min: 0,
    },
    storageLocation: {
      type: String,
      required: true,
      trim: true,
    },
    checksum: {
      type: String,
      trim: true,
    },
    collectionsCount: {
      type: Number,
      min: 0,
      default: 0,
    },
    recordsCount: {
      type: Number,
      min: 0,
      default: 0,
    },
    verificationStatus: {
      type: String,
      enum: ['unverified', 'verified', 'failed'],
      default: 'unverified',
      index: true,
    },
    verifiedAt: {
      type: Date,
    },
    retentionEligible: {
      type: Boolean,
      default: true,
      index: true,
    },
    retentionExpiresAt: {
      type: Date,
      index: true,
    },
    errorMessage: {
      type: String,
    },
    triggeredBy: {
      userId: { type: Schema.Types.ObjectId, ref: 'User' },
      userEmail: { type: String, trim: true },
      triggerType: {
        type: String,
        enum: ['scheduled', 'manual', 'automated_pre_migration'],
        default: 'manual',
      },
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        delete (ret as any).__v;
        return ret;
      },
    },
  }
);

// Compound indexes for administrative querying and retention lifecycle pruning
BackupLogSchema.index({ status: 1, startedAt: -1 });
BackupLogSchema.index({ verificationStatus: 1, startedAt: -1 });
BackupLogSchema.index({ retentionEligible: 1, retentionExpiresAt: 1 });

export const BackupLog: Model<IBackupLog> = mongoose.model<IBackupLog>('BackupLog', BackupLogSchema);
