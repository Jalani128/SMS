import mongoose, { Document, Schema, Types } from 'mongoose';
import { tenantIsolationPlugin } from './plugins/tenantIsolation.plugin.js';
import { softDeletePlugin, SoftDeleteDocument } from './plugins/softDelete.plugin.js';

export type PaymentMethod = 'cash' | 'card' | 'bank_transfer' | 'cheque' | 'online' | 'other';
export type PaymentStatus = 'pending' | 'successful' | 'failed' | 'refunded';

export interface IPayment extends Document, SoftDeleteDocument {
  schoolId: Types.ObjectId;
  invoiceId: Types.ObjectId;
  studentId: Types.ObjectId;
  paymentNumber: string;
  idempotencyKey: string;
  amount: Types.Decimal128;
  currency: string;
  method: PaymentMethod;
  provider: string;
  providerReference?: string;
  status: PaymentStatus;
  paidAt: Date;
  recordedBy: Types.ObjectId;
  notes?: string;
  receiptUrl?: string;
  isReversed?: boolean;
  reversedAt?: Date;
  reversedBy?: Types.ObjectId;
  reversalReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema = new Schema<IPayment>(
  {
    schoolId: {
      type: Schema.Types.ObjectId,
      ref: 'School',
      required: [true, 'School reference is required'],
      index: true,
    },
    invoiceId: {
      type: Schema.Types.ObjectId,
      ref: 'Invoice',
      required: [true, 'Invoice reference is required'],
      index: true,
    },
    studentId: {
      type: Schema.Types.ObjectId,
      ref: 'Student',
      required: [true, 'Student profile reference is required'],
      index: true,
    },
    paymentNumber: {
      type: String,
      required: [true, 'Payment number is required'],
      trim: true,
      uppercase: true,
      maxlength: [50, 'Payment number cannot exceed 50 characters'],
    },
    idempotencyKey: {
      type: String,
      required: [true, 'Payment idempotency key is required to guarantee duplicate prevention'],
      trim: true,
      maxlength: [100, 'Idempotency key cannot exceed 100 characters'],
    },
    amount: {
      type: Schema.Types.Decimal128,
      required: [true, 'Payment amount is required as Decimal128'],
    },
    currency: {
      type: String,
      default: 'USD',
      uppercase: true,
      trim: true,
      minlength: 3,
      maxlength: 3,
    },
    method: {
      type: String,
      enum: {
        values: ['cash', 'card', 'bank_transfer', 'cheque', 'online', 'other'],
        message: 'Payment method must be cash, card, bank_transfer, cheque, online, or other',
      },
      required: [true, 'Payment method is required'],
      index: true,
    },
    provider: {
      type: String,
      default: 'manual',
      trim: true,
      maxlength: [50, 'Provider name cannot exceed 50 characters'],
    },
    providerReference: {
      type: String,
      trim: true,
      maxlength: [150, 'Provider reference cannot exceed 150 characters'],
    },
    status: {
      type: String,
      enum: {
        values: ['pending', 'successful', 'failed', 'refunded'],
        message: 'Payment status must be pending, successful, failed, or refunded',
      },
      default: 'pending',
      index: true,
    },
    paidAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    recordedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User who recorded payment is required'],
      index: true,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [500, 'Notes cannot exceed 500 characters'],
    },
    receiptUrl: {
      type: String,
      trim: true,
    },
    isReversed: {
      type: Boolean,
      default: false,
      index: true,
    },
    reversedAt: {
      type: Date,
      default: null,
    },
    reversedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    reversalReason: {
      type: String,
      trim: true,
      maxlength: [300, 'Reversal reason cannot exceed 300 characters'],
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: any) => {
        delete ret.__v;
        if (ret.amount) ret.amount = ret.amount.toString();
        return ret;
      },
    },
    toObject: { virtuals: true },
  }
);

// Virtual for receiptNumber alias
PaymentSchema.virtual('receiptNumber').get(function (this: IPayment) {
  return this.paymentNumber;
});

// Idempotency: enforce unique idempotencyKey per school to guarantee exactly-once payment processing
PaymentSchema.index({ schoolId: 1, idempotencyKey: 1 }, { unique: true });
PaymentSchema.index({ schoolId: 1, paymentNumber: 1 }, { unique: true });
PaymentSchema.index({ schoolId: 1, invoiceId: 1, status: 1 });
PaymentSchema.index({ schoolId: 1, studentId: 1, paidAt: -1 });
PaymentSchema.index({ schoolId: 1, paidAt: -1, status: 1 });

PaymentSchema.plugin(tenantIsolationPlugin);
PaymentSchema.plugin(softDeletePlugin);

export const Payment = mongoose.model<IPayment>('Payment', PaymentSchema);
