import mongoose, { Document, Schema, Types } from 'mongoose';
import { tenantIsolationPlugin } from './plugins/tenantIsolation.plugin.js';
import { softDeletePlugin, SoftDeleteDocument } from './plugins/softDelete.plugin.js';

export type SessionStatus = 'upcoming' | 'active' | 'completed' | 'archived';

export interface IAcademicSession extends Document, SoftDeleteDocument {
  schoolId: Types.ObjectId;
  name: string;
  code: string;
  startDate: Date;
  endDate: Date;
  isCurrent: boolean;
  status: SessionStatus;
  terms?: {
    name: string;
    startDate: Date;
    endDate: Date;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

const AcademicSessionSchema = new Schema<IAcademicSession>(
  {
    schoolId: {
      type: Schema.Types.ObjectId,
      ref: 'School',
      required: [true, 'School reference is required'],
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Academic session name is required (e.g. 2026-2027)'],
      trim: true,
      maxlength: [100, 'Session name cannot exceed 100 characters'],
    },
    code: {
      type: String,
      required: [true, 'Session unique code is required (e.g. AY-2026-2027)'],
      trim: true,
      uppercase: true,
      maxlength: [50, 'Session code cannot exceed 50 characters'],
    },
    startDate: {
      type: Date,
      required: [true, 'Session start date is required'],
    },
    endDate: {
      type: Date,
      required: [true, 'Session end date is required'],
      validate: {
        validator: function (this: IAcademicSession, val: Date) {
          return !this.startDate || val > this.startDate;
        },
        message: 'End date must be strictly after the start date',
      },
    },
    isCurrent: {
      type: Boolean,
      default: false,
      index: true,
    },
    status: {
      type: String,
      enum: ['upcoming', 'active', 'completed', 'archived'],
      default: 'upcoming',
      index: true,
    },
    terms: [
      {
        name: { type: String, required: true, trim: true },
        startDate: { type: Date, required: true },
        endDate: { type: Date, required: true },
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

// Compound unique index for session code and session name per school
AcademicSessionSchema.index({ schoolId: 1, code: 1 }, { unique: true });
AcademicSessionSchema.index({ schoolId: 1, name: 1 }, { unique: true });

// Enforce at database level that only one session per school can have isCurrent: true
AcademicSessionSchema.index(
  { schoolId: 1, isCurrent: 1 },
  { unique: true, partialFilterExpression: { isCurrent: true } }
);

AcademicSessionSchema.plugin(tenantIsolationPlugin);
AcademicSessionSchema.plugin(softDeletePlugin);

export const AcademicSession = mongoose.model<IAcademicSession>('AcademicSession', AcademicSessionSchema);
