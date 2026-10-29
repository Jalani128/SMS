import mongoose, { Document, Schema, Types } from 'mongoose';
import { softDeletePlugin, SoftDeleteDocument } from './plugins/softDelete.plugin.js';

export type SchoolStatus = 'pending' | 'active' | 'suspended';
export type EmailVerificationStatus = 'unverified' | 'pending' | 'verified';

export interface ISchoolAddress {
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

export interface ISchoolSettings {
  academicYear?: string;
  currency?: string;
  timezone?: string;
  attendanceThreshold?: number; // e.g. 75% minimum
  feeDueGraceDays?: number; // e.g. 7 days
  dateFormat?: string;
}

export interface ISchool extends Document, SoftDeleteDocument {
  name: string;
  slug: string;
  code: string;
  email: string;
  phone?: string;
  address?: ISchoolAddress;
  logo?: string;
  status: SchoolStatus;
  emailVerificationStatus: EmailVerificationStatus;
  timezone: string;
  currency: string;
  settings: ISchoolSettings;
  activatedAt?: Date | null;
  suspendedAt?: Date | null;
  suspendedReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SchoolSchema = new Schema<ISchool>(
  {
    name: {
      type: String,
      required: [true, 'School name is required'],
      trim: true,
      minlength: [2, 'School name must be at least 2 characters'],
      maxlength: [150, 'School name cannot exceed 150 characters'],
    },
    slug: {
      type: String,
      required: [true, 'School slug identifier is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[a-z0-9-]+$/, 'Slug can only contain lowercase alphanumeric characters and hyphens'],
      index: true,
    },
    code: {
      type: String,
      required: [true, 'School unique code is required'],
      unique: true,
      trim: true,
      uppercase: true,
      minlength: [3, 'School code must be at least 3 characters'],
      maxlength: [20, 'School code cannot exceed 20 characters'],
      index: true,
    },
    email: {
      type: String,
      required: [true, 'School contact email is required'],
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid school email address'],
      index: true,
    },
    phone: {
      type: String,
      trim: true,
      maxlength: [25, 'Phone number cannot exceed 25 characters'],
    },
    address: {
      street: { type: String, trim: true, maxlength: 200 },
      city: { type: String, trim: true, maxlength: 100 },
      state: { type: String, trim: true, maxlength: 100 },
      postalCode: { type: String, trim: true, maxlength: 20 },
      country: { type: String, trim: true, maxlength: 100 },
    },
    logo: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: {
        values: ['pending', 'active', 'suspended'],
        message: 'School status must be pending, active, or suspended',
      },
      default: 'pending',
      index: true,
    },
    emailVerificationStatus: {
      type: String,
      enum: {
        values: ['unverified', 'pending', 'verified'],
        message: 'Email verification status must be unverified, pending, or verified',
      },
      default: 'unverified',
      index: true,
    },
    timezone: {
      type: String,
      default: 'UTC',
      trim: true,
    },
    currency: {
      type: String,
      default: 'USD',
      uppercase: true,
      trim: true,
      minlength: 3,
      maxlength: 3,
    },
    settings: {
      academicYear: { type: String, default: '2026-2027' },
      currency: { type: String, default: 'USD' },
      timezone: { type: String, default: 'UTC' },
      attendanceThreshold: { type: Number, default: 75, min: 0, max: 100 },
      feeDueGraceDays: { type: Number, default: 7, min: 0, max: 60 },
      dateFormat: { type: String, default: 'YYYY-MM-DD' },
    },
    activatedAt: {
      type: Date,
      default: null,
    },
    suspendedAt: {
      type: Date,
      default: null,
    },
    suspendedReason: {
      type: String,
      trim: true,
      maxlength: 500,
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
    toObject: {
      virtuals: true,
    },
  }
);

// Attach soft-delete plugin
SchoolSchema.plugin(softDeletePlugin);

export const School = mongoose.model<ISchool>('School', SchoolSchema);
