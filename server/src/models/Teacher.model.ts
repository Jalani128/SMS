import mongoose, { Document, Schema, Types } from 'mongoose';
import { tenantIsolationPlugin } from './plugins/tenantIsolation.plugin.js';
import { softDeletePlugin, SoftDeleteDocument } from './plugins/softDelete.plugin.js';

export type TeacherStatus = 'active' | 'on_leave' | 'resigned' | 'terminated' | 'retired';

export interface ITeacher extends Document, SoftDeleteDocument {
  userId: Types.ObjectId;
  schoolId: Types.ObjectId;
  employeeId: string;
  department: string;
  designation: string;
  qualification?: string;
  specializations: string[];
  joiningDate?: Date;
  experienceYears?: number;
  assignedClassIds?: Types.ObjectId[];
  assignedSubjectIds?: Types.ObjectId[];
  bio?: string;
  adminNotes?: string;
  status: TeacherStatus;
  createdAt: Date;
  updatedAt: Date;
}

const TeacherSchema = new Schema<ITeacher>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required for teacher profile'],
      unique: true,
      index: true,
    },
    schoolId: {
      type: Schema.Types.ObjectId,
      ref: 'School',
      required: [true, 'School reference is required'],
      index: true,
    },
    employeeId: {
      type: String,
      required: [true, 'Employee code is required'],
      trim: true,
      uppercase: true,
      maxlength: [50, 'Employee code cannot exceed 50 characters'],
    },
    department: {
      type: String,
      required: [true, 'Department is required'],
      trim: true,
      maxlength: [100, 'Department cannot exceed 100 characters'],
      index: true,
    },
    designation: {
      type: String,
      default: 'Faculty',
      trim: true,
      maxlength: [100, 'Designation cannot exceed 100 characters'],
    },
    qualification: {
      type: String,
      trim: true,
      maxlength: [200, 'Qualification description cannot exceed 200 characters'],
    },
    specializations: [
      {
        type: String,
        trim: true,
      },
    ],
    joiningDate: {
      type: Date,
      default: Date.now,
    },
    experienceYears: {
      type: Number,
      min: [0, 'Experience years cannot be negative'],
      default: 0,
    },
    assignedClassIds: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Class',
      },
    ],
    assignedSubjectIds: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Subject',
      },
    ],
    bio: {
      type: String,
      trim: true,
      maxlength: [1000, 'Bio cannot exceed 1000 characters'],
    },
    adminNotes: {
      type: String,
      trim: true,
      maxlength: [2000, 'Admin notes cannot exceed 2000 characters'],
    },
    status: {
      type: String,
      enum: ['active', 'on_leave', 'resigned', 'terminated', 'retired'],
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

// Compound unique index ensuring unique employeeId per school
TeacherSchema.index({ schoolId: 1, employeeId: 1 }, { unique: true });
TeacherSchema.index({ schoolId: 1, status: 1 });
TeacherSchema.index({ schoolId: 1, department: 1, status: 1 });

TeacherSchema.plugin(tenantIsolationPlugin);
TeacherSchema.plugin(softDeletePlugin);

export const Teacher = mongoose.model<ITeacher>('Teacher', TeacherSchema);
