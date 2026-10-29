import mongoose, { Document, Schema, Types } from 'mongoose';
import { tenantIsolationPlugin } from './plugins/tenantIsolation.plugin.js';
import { softDeletePlugin, SoftDeleteDocument } from './plugins/softDelete.plugin.js';

export type OnboardingStatus = 'not_started' | 'in_progress' | 'completed';

export interface IOnboardingStepsData {
  [key: string]: any;
  profile?: {
    schoolName?: string;
    phone?: string;
    address?: string;
    website?: string;
    timezone?: string;
    currency?: string;
    dateFormat?: string;
  };
  academic?: {
    sessionName?: string;
    startDate?: string;
    endDate?: string;
    termsCount?: number;
  };
  structure?: {
    classesCount?: number;
    sectionsCount?: number;
    subjectsCount?: number;
  };
  staff?: {
    importedCount?: number;
    manualCount?: number;
  };
  students?: {
    importedCount?: number;
    manualCount?: number;
    parentsLinkedCount?: number;
  };
}

export interface ISchoolOnboarding extends Document, SoftDeleteDocument {
  schoolId: Types.ObjectId;
  currentStep: number;
  completedSteps: number[];
  status: OnboardingStatus;
  stepsData: IOnboardingStepsData;
  completedAt?: Date | null;
  completedBy?: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const SchoolOnboardingSchema = new Schema<ISchoolOnboarding>(
  {
    schoolId: {
      type: Schema.Types.ObjectId,
      ref: 'School',
      required: [true, 'School reference is required'],
      unique: true,
      index: true,
    },
    currentStep: {
      type: Number,
      default: 1,
      min: [1, 'Step must be at least 1'],
      max: [6, 'Step cannot exceed 6'],
    },
    completedSteps: {
      type: [Number],
      default: [],
    },
    status: {
      type: String,
      enum: {
        values: ['not_started', 'in_progress', 'completed'],
        message: 'Invalid onboarding status',
      },
      default: 'not_started',
      index: true,
    },
    stepsData: {
      type: Schema.Types.Mixed,
      default: {},
    },
    completedAt: {
      type: Date,
      default: null,
    },
    completedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
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

SchoolOnboardingSchema.plugin(tenantIsolationPlugin);
SchoolOnboardingSchema.plugin(softDeletePlugin);

export const SchoolOnboarding = mongoose.model<ISchoolOnboarding>(
  'SchoolOnboarding',
  SchoolOnboardingSchema
);
