import mongoose, { Document, Schema, Types } from 'mongoose';
import bcrypt from 'bcryptjs';
import { tenantIsolationPlugin } from './plugins/tenantIsolation.plugin.js';
import { softDeletePlugin, SoftDeleteDocument } from './plugins/softDelete.plugin.js';

export type UserRole = 'super_admin' | 'admin' | 'teacher' | 'student' | 'parent';

export interface IUser extends Document, SoftDeleteDocument {
  name: string;
  firstName?: string;
  lastName?: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  schoolId?: Types.ObjectId;
  isActive: boolean;
  emailVerified: boolean;
  tokenVersion: number;
  lastLoginAt?: Date | null;
  lastLoginIp?: string;
  lastLoginUserAgent?: string;
  passwordChangedAt?: Date | null;
  phone?: string;
  avatarUrl?: string;
  comparePassword(candidatePassword: string): Promise<boolean>;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, 'User full name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    firstName: {
      type: String,
      trim: true,
      maxlength: 50,
    },
    lastName: {
      type: String,
      trim: true,
      maxlength: 50,
    },
    email: {
      type: String,
      required: [true, 'Email address is required'],
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
      index: true,
    },
    passwordHash: {
      type: String,
      required: [true, 'Password hash is required'],
      select: false, // Never return in default query projections
    },
    role: {
      type: String,
      enum: {
        values: ['super_admin', 'admin', 'teacher', 'student', 'parent'],
        message: 'Role must be super_admin, admin, teacher, student, or parent',
      },
      required: [true, 'User role is required'],
      index: true,
    },
    schoolId: {
      type: Schema.Types.ObjectId,
      ref: 'School',
      required: function (this: IUser) {
        // Required for all roles except platform super_admin
        return this.role !== 'super_admin';
      },
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    tokenVersion: {
      type: Number,
      default: 0,
      index: true,
    },
    lastLoginAt: {
      type: Date,
      default: null,
    },
    lastLoginIp: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    lastLoginUserAgent: {
      type: String,
      trim: true,
      maxlength: 300,
    },
    passwordChangedAt: {
      type: Date,
      default: null,
    },
    phone: {
      type: String,
      trim: true,
      maxlength: 25,
    },
    avatarUrl: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        delete (ret as any).passwordHash;
        delete (ret as any).__v;
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      transform: (_doc, ret) => {
        delete (ret as any).passwordHash;
        delete (ret as any).__v;
        return ret;
      },
    },
  }
);

// Compound index guaranteeing email uniqueness within each tenant school
UserSchema.index({ schoolId: 1, email: 1 }, { unique: true, sparse: true });
UserSchema.index({ schoolId: 1, role: 1, status: 1 });

// Attach plugins
UserSchema.plugin(tenantIsolationPlugin);
UserSchema.plugin(softDeletePlugin);

// Synchronize firstName/lastName with name if provided
UserSchema.pre('save', function (next) {
  if (this.isModified('name') && !this.firstName && !this.lastName) {
    const parts = this.name.trim().split(/\s+/);
    this.firstName = parts[0] || '';
    this.lastName = parts.slice(1).join(' ') || '';
  } else if (!this.name && (this.firstName || this.lastName)) {
    this.name = `${this.firstName || ''} ${this.lastName || ''}`.trim();
  }
  next();
});

// Compare candidate password against stored bcrypt hash
UserSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  if (!this.passwordHash) return false;
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

// Static helper to hash passwords
UserSchema.statics.hashPassword = async function (plainPassword: string): Promise<string> {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(plainPassword, salt);
};

export const User = mongoose.model<IUser>('User', UserSchema);
