import mongoose, { Document, Schema, Types } from 'mongoose';
import bcrypt from 'bcryptjs';

export type OTPPurpose =
  | 'email_verification'
  | 'password_reset'
  | 'login_2fa'
  | 'school_activation'
  | 'account_activation';

export interface IOTPVerification extends Document {
  schoolId?: Types.ObjectId;
  identifier: string; // Email or phone number
  hashedOTP: string;
  purpose: OTPPurpose;
  expiresAt: Date;
  isUsed: boolean;
  verifiedAt?: Date | null;
  attempts: number;
  maxAttempts: number;
  verifyCandidateOTP(candidateOTP: string): Promise<boolean>;
  createdAt: Date;
  updatedAt: Date;
}

const OTPVerificationSchema = new Schema<IOTPVerification>(
  {
    schoolId: {
      type: Schema.Types.ObjectId,
      ref: 'School',
      index: true,
    },
    identifier: {
      type: String,
      required: [true, 'Identifier (email or phone) is required'],
      trim: true,
      lowercase: true,
      index: true,
    },
    hashedOTP: {
      type: String,
      required: [true, 'Hashed OTP is required. Raw OTPs must never be stored.'],
      select: false, // Never return in default query projections
    },
    purpose: {
      type: String,
      enum: {
        values: [
          'email_verification',
          'password_reset',
          'login_2fa',
          'school_activation',
          'account_activation',
        ],
        message: 'Invalid OTP purpose',
      },
      required: [true, 'OTP purpose is required'],
      index: true,
    },
    expiresAt: {
      type: Date,
      required: [true, 'Expiration timestamp is required'],
      index: true,
    },
    isUsed: {
      type: Boolean,
      default: false,
      index: true,
    },
    verifiedAt: {
      type: Date,
      default: null,
    },
    attempts: {
      type: Number,
      default: 0,
      min: 0,
    },
    maxAttempts: {
      type: Number,
      default: 5,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret) => {
        delete (ret as any).hashedOTP;
        delete (ret as any).__v;
        return ret;
      },
    },
  }
);

// Compound index for finding valid active OTP records
OTPVerificationSchema.index({ identifier: 1, purpose: 1, isUsed: 1, expiresAt: 1 });

// Method to verify candidate raw OTP against the bcrypt hash
OTPVerificationSchema.methods.verifyCandidateOTP = async function (
  candidateOTP: string
): Promise<boolean> {
  if (this.isUsed) return false;
  if (new Date() > this.expiresAt) return false;
  if (this.attempts >= this.maxAttempts) return false;

  this.attempts += 1;
  const isMatch = await bcrypt.compare(candidateOTP, this.hashedOTP);

  if (isMatch) {
    this.isUsed = true;
    this.verifiedAt = new Date();
  }

  if (this.db?.readyState === 1) {
    await this.save();
  }
  return isMatch;
};

// Static helper to create a hashed OTP record
OTPVerificationSchema.statics.hashOTP = async function (rawOTP: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(rawOTP, salt);
};

export const OTPVerification = mongoose.model<IOTPVerification>(
  'OTPVerification',
  OTPVerificationSchema
);
