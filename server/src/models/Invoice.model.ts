import mongoose, { Document, Schema, Types } from 'mongoose';
import { tenantIsolationPlugin } from './plugins/tenantIsolation.plugin.js';
import { softDeletePlugin, SoftDeleteDocument } from './plugins/softDelete.plugin.js';

export type InvoiceStatus = 'draft' | 'issued' | 'partially_paid' | 'paid' | 'overdue' | 'cancelled';

export interface IInvoiceLineItem {
  name: string;
  amount: Types.Decimal128;
  quantity: number;
  total: Types.Decimal128;
}

export interface IInvoice extends Document, SoftDeleteDocument {
  schoolId: Types.ObjectId;
  studentId: Types.ObjectId;
  parentId?: Types.ObjectId;
  academicSessionId: Types.ObjectId;
  feeStructureId?: Types.ObjectId;
  classId?: Types.ObjectId;
  sectionId?: Types.ObjectId;
  feePeriod?: string;
  invoiceNumber: string;
  lineItems: IInvoiceLineItem[];
  totalAmount: Types.Decimal128;
  discountAmount: Types.Decimal128;
  lateFee?: Types.Decimal128;
  paidAmount: Types.Decimal128;
  balanceAmount: Types.Decimal128; // Virtual derived balance
  dueDate: Date;
  status: InvoiceStatus;
  concessionId?: Types.ObjectId;
  issuedAt?: Date;
  paidAt?: Date;
  cancelledAt?: Date;
  cancelledBy?: Types.ObjectId;
  cancelReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const InvoiceSchema = new Schema<IInvoice>(
  {
    schoolId: {
      type: Schema.Types.ObjectId,
      ref: 'School',
      required: [true, 'School reference is required'],
      index: true,
    },
    studentId: {
      type: Schema.Types.ObjectId,
      ref: 'Student',
      required: [true, 'Student profile reference is required'],
      index: true,
    },
    parentId: {
      type: Schema.Types.ObjectId,
      ref: 'Parent',
      default: null,
      index: true,
    },
    academicSessionId: {
      type: Schema.Types.ObjectId,
      ref: 'AcademicSession',
      required: [true, 'Academic session reference is required'],
      index: true,
    },
    feeStructureId: {
      type: Schema.Types.ObjectId,
      ref: 'FeeStructure',
      index: true,
    },
    classId: {
      type: Schema.Types.ObjectId,
      ref: 'Class',
      default: null,
      index: true,
    },
    sectionId: {
      type: Schema.Types.ObjectId,
      ref: 'Section',
      default: null,
      index: true,
    },
    feePeriod: {
      type: String,
      trim: true,
      default: null,
      index: true,
    },
    concessionId: {
      type: Schema.Types.ObjectId,
      ref: 'StudentConcession',
      default: null,
    },
    invoiceNumber: {
      type: String,
      required: [true, 'Invoice number is required'],
      trim: true,
      uppercase: true,
      maxlength: [50, 'Invoice number cannot exceed 50 characters'],
    },
    lineItems: [
      {
        name: { type: String, required: true, trim: true },
        amount: { type: Schema.Types.Decimal128, required: true },
        quantity: { type: Number, default: 1, min: 1 },
        total: { type: Schema.Types.Decimal128, required: true },
      },
    ],
    totalAmount: {
      type: Schema.Types.Decimal128,
      required: [true, 'Total invoice amount is required as Decimal128'],
    },
    discountAmount: {
      type: Schema.Types.Decimal128,
      default: () => Types.Decimal128.fromString('0.00'),
    },
    lateFee: {
      type: Schema.Types.Decimal128,
      default: () => Types.Decimal128.fromString('0.00'),
    },
    paidAmount: {
      type: Schema.Types.Decimal128,
      default: () => Types.Decimal128.fromString('0.00'),
    },
    dueDate: {
      type: Date,
      required: [true, 'Invoice due date is required'],
      index: true,
    },
    status: {
      type: String,
      enum: {
        values: ['draft', 'issued', 'partially_paid', 'paid', 'overdue', 'cancelled'],
        message: 'Invoice status must be draft, issued, partially_paid, paid, overdue, or cancelled',
      },
      default: 'draft',
      index: true,
    },
    issuedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    paidAt: {
      type: Date,
      default: null,
    },
    cancelledAt: {
      type: Date,
      default: null,
    },
    cancelledBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    cancelReason: {
      type: String,
      trim: true,
      maxlength: [300, 'Cancel reason cannot exceed 300 characters'],
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: any) => {
        delete ret.__v;
        // Transform Decimal128 fields to strings for clean JSON serialization
        if (ret.totalAmount) ret.totalAmount = ret.totalAmount.toString();
        if (ret.discountAmount) ret.discountAmount = ret.discountAmount.toString();
        if (ret.lateFee) ret.lateFee = ret.lateFee.toString();
        if (ret.paidAmount) ret.paidAmount = ret.paidAmount.toString();
        if (ret.balanceAmount) ret.balanceAmount = ret.balanceAmount.toString();
        return ret;
      },
    },
    toObject: { virtuals: true },
  }
);

// Virtual for issueDate alias
InvoiceSchema.virtual('issueDate')
  .get(function (this: IInvoice) {
    return this.issuedAt || this.createdAt;
  })
  .set(function (this: IInvoice, val: Date) {
    this.issuedAt = val;
  });

// Virtual for netPayable
InvoiceSchema.virtual('netPayable').get(function (this: IInvoice) {
  const total = parseFloat(this.totalAmount ? this.totalAmount.toString() : '0');
  const discount = parseFloat(this.discountAmount ? this.discountAmount.toString() : '0');
  return Types.Decimal128.fromString(Math.max(0, total - discount).toFixed(2));
});

// Virtual for deriving outstanding balance without floating point arithmetic
InvoiceSchema.virtual('balanceAmount').get(function (this: IInvoice) {
  const total = parseFloat(this.totalAmount ? this.totalAmount.toString() : '0');
  const discount = parseFloat(this.discountAmount ? this.discountAmount.toString() : '0');
  const paid = parseFloat(this.paidAmount ? this.paidAmount.toString() : '0');
  const balance = Math.max(0, total - discount - paid);
  return Types.Decimal128.fromString(balance.toFixed(2));
});

// Compound unique index ensuring invoiceNumber uniqueness per school
InvoiceSchema.index({ schoolId: 1, invoiceNumber: 1 }, { unique: true });
InvoiceSchema.index({ schoolId: 1, studentId: 1, status: 1 });
InvoiceSchema.index({ schoolId: 1, status: 1, dueDate: 1 });
InvoiceSchema.index({ schoolId: 1, academicSessionId: 1, dueDate: 1 });
InvoiceSchema.index(
  { schoolId: 1, studentId: 1, feePeriod: 1, feeStructureId: 1 },
  { unique: true, sparse: true }
);

InvoiceSchema.plugin(tenantIsolationPlugin);
InvoiceSchema.plugin(softDeletePlugin);

export const Invoice = mongoose.model<IInvoice>('Invoice', InvoiceSchema);
