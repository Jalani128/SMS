import mongoose, { Document, Schema, Types } from 'mongoose';
import { tenantIsolationPlugin } from './plugins/tenantIsolation.plugin.js';
import { softDeletePlugin, SoftDeleteDocument } from './plugins/softDelete.plugin.js';

export interface ISection extends Document, SoftDeleteDocument {
  schoolId: Types.ObjectId;
  classId: Types.ObjectId;
  academicSessionId?: Types.ObjectId;
  name: string;
  code: string;
  capacity: number;
  classTeacherId?: Types.ObjectId;
  roomNumber?: string;
  status: 'active' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
}

const SectionSchema = new Schema<ISection>(
  {
    schoolId: {
      type: Schema.Types.ObjectId,
      ref: 'School',
      required: [true, 'School reference is required'],
      index: true,
    },
    classId: {
      type: Schema.Types.ObjectId,
      ref: 'Class',
      required: [true, 'Parent class reference is required'],
      index: true,
    },
    academicSessionId: {
      type: Schema.Types.ObjectId,
      ref: 'AcademicSession',
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Section name is required (e.g. Section A)'],
      trim: true,
      maxlength: [50, 'Section name cannot exceed 50 characters'],
    },
    code: {
      type: String,
      required: [true, 'Section code is required (e.g. A)'],
      trim: true,
      uppercase: true,
      maxlength: [20, 'Section code cannot exceed 20 characters'],
    },
    capacity: {
      type: Number,
      required: [true, 'Classroom capacity is required'],
      min: [1, 'Capacity must be at least 1 student'],
      max: [200, 'Capacity cannot exceed 200 students'],
      default: 35,
    },
    classTeacherId: {
      type: Schema.Types.ObjectId,
      ref: 'Teacher',
      index: true,
    },
    roomNumber: {
      type: String,
      trim: true,
      maxlength: [50, 'Room number cannot exceed 50 characters'],
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

// Compound unique indexes ensuring section code and section name are unique within a specific class of a school
SectionSchema.index({ schoolId: 1, classId: 1, code: 1 }, { unique: true });
SectionSchema.index({ schoolId: 1, classId: 1, name: 1 }, { unique: true });

SectionSchema.plugin(tenantIsolationPlugin);
SectionSchema.plugin(softDeletePlugin);

export const Section = mongoose.model<ISection>('Section', SectionSchema);
