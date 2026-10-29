import mongoose, { Document, Schema, Types } from 'mongoose';
import { tenantIsolationPlugin } from './plugins/tenantIsolation.plugin.js';
import { softDeletePlugin, SoftDeleteDocument } from './plugins/softDelete.plugin.js';

export type ParentRelationship = 'father' | 'mother' | 'guardian' | 'other';

export interface IParentChildLink {
  studentProfileId: Types.ObjectId;
  relationship: ParentRelationship;
  isPrimary: boolean;
}

export interface IParent extends Document, SoftDeleteDocument {
  userId: Types.ObjectId;
  schoolId: Types.ObjectId;
  children: IParentChildLink[];
  occupation?: string;
  alternatePhone?: string;
  address?: string;
  emergencyContact?: {
    name: string;
    relationship: string;
    phone: string;
  };
  adminNotes?: string;
  status: 'active' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
}

const ParentSchema = new Schema<IParent>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required for parent profile'],
      unique: true,
      index: true,
    },
    schoolId: {
      type: Schema.Types.ObjectId,
      ref: 'School',
      required: [true, 'School reference is required'],
      index: true,
    },
    children: [
      {
        studentProfileId: {
          type: Schema.Types.ObjectId,
          ref: 'Student',
          required: [true, 'Student profile reference is required'],
        },
        relationship: {
          type: String,
          enum: ['father', 'mother', 'guardian', 'other'],
          required: true,
        },
        isPrimary: {
          type: Boolean,
          default: false,
        },
      },
    ],
    occupation: {
      type: String,
      trim: true,
      maxlength: [100, 'Occupation cannot exceed 100 characters'],
    },
    alternatePhone: {
      type: String,
      trim: true,
      maxlength: [25, 'Alternate phone cannot exceed 25 characters'],
    },
    address: {
      type: String,
      trim: true,
      maxlength: [300, 'Address cannot exceed 300 characters'],
    },
    emergencyContact: {
      name: { type: String, trim: true },
      relationship: { type: String, trim: true },
      phone: { type: String, trim: true },
    },
    adminNotes: {
      type: String,
      trim: true,
      maxlength: [2000, 'Admin notes cannot exceed 2000 characters'],
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
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
ParentSchema.index({ schoolId: 1, userId: 1 }, { unique: true });
ParentSchema.index({ schoolId: 1, 'children.studentProfileId': 1 });

ParentSchema.plugin(tenantIsolationPlugin);
ParentSchema.plugin(softDeletePlugin);

export const Parent = mongoose.model<IParent>('Parent', ParentSchema);
