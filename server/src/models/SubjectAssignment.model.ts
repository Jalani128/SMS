import mongoose, { Document, Schema, Types } from 'mongoose';
import { tenantIsolationPlugin } from './plugins/tenantIsolation.plugin.js';
import { softDeletePlugin, SoftDeleteDocument } from './plugins/softDelete.plugin.js';

export type SubjectAssignmentStatus = 'active' | 'inactive' | 'archived';

export interface ISubjectAssignment extends Document, SoftDeleteDocument {
  schoolId: Types.ObjectId;
  academicSessionId: Types.ObjectId;
  classId: Types.ObjectId;
  sectionId?: Types.ObjectId;
  subjectId: Types.ObjectId;
  teacherId: Types.ObjectId;
  periodsPerWeek?: number;
  status: SubjectAssignmentStatus;
  createdAt: Date;
  updatedAt: Date;
}

const SubjectAssignmentSchema = new Schema<ISubjectAssignment>(
  {
    schoolId: {
      type: Schema.Types.ObjectId,
      ref: 'School',
      required: [true, 'School reference is required'],
      index: true,
    },
    academicSessionId: {
      type: Schema.Types.ObjectId,
      ref: 'AcademicSession',
      required: [true, 'Academic session reference is required'],
      index: true,
    },
    classId: {
      type: Schema.Types.ObjectId,
      ref: 'Class',
      required: [true, 'Class reference is required'],
      index: true,
    },
    sectionId: {
      type: Schema.Types.ObjectId,
      ref: 'Section',
      index: true,
    },
    subjectId: {
      type: Schema.Types.ObjectId,
      ref: 'Subject',
      required: [true, 'Subject reference is required'],
      index: true,
    },
    teacherId: {
      type: Schema.Types.ObjectId,
      ref: 'Teacher',
      required: [true, 'Teacher reference is required'],
      index: true,
    },
    periodsPerWeek: {
      type: Number,
      min: [1, 'Must have at least 1 period per week'],
      max: [50, 'Cannot exceed 50 periods per week'],
      default: 5,
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'archived'],
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

// Compound unique index preventing duplicate active combinations of class, section, and subject in the same session
SubjectAssignmentSchema.index(
  { schoolId: 1, academicSessionId: 1, classId: 1, sectionId: 1, subjectId: 1 },
  { unique: true }
);

SubjectAssignmentSchema.index({ schoolId: 1, teacherId: 1, academicSessionId: 1 });
SubjectAssignmentSchema.index({ schoolId: 1, academicSessionId: 1, classId: 1, status: 1 });

SubjectAssignmentSchema.plugin(tenantIsolationPlugin);
SubjectAssignmentSchema.plugin(softDeletePlugin);

export const SubjectAssignment = mongoose.model<ISubjectAssignment>('SubjectAssignment', SubjectAssignmentSchema);
