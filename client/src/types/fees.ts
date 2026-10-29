/**
 * Phase 8: Fees Management Client Types
 */

export type FeeFrequency = 'one_time' | 'annual' | 'half_yearly' | 'quarterly' | 'term' | 'monthly';
export type ConcessionType = 'percentage' | 'fixed';
export type InvoiceStatus = 'draft' | 'issued' | 'partially_paid' | 'paid' | 'overdue' | 'cancelled';
export type PaymentMethod = 'cash' | 'card' | 'bank_transfer' | 'cheque' | 'online' | 'other';
export type PaymentStatus = 'pending' | 'successful' | 'failed' | 'refunded';

export interface FeeLineItem {
  name: string;
  amount: number | string;
  frequency?: FeeFrequency;
  isOptional?: boolean;
  description?: string;
}

export interface FeeConcessionTemplate {
  name: string;
  type: ConcessionType;
  value: number | string;
  criteria?: string;
}

export interface FeeStructureItem {
  _id: string;
  schoolId: string;
  academicSessionId: string | { _id: string; name: string; code: string; isCurrent?: boolean };
  classId: string | { _id: string; name: string; code: string };
  sectionId?: string | { _id: string; name: string };
  name: string;
  currency?: string;
  frequency?: FeeFrequency;
  effectiveStartDate?: string;
  effectiveEndDate?: string;
  lineItems: FeeLineItem[];
  concessions?: FeeConcessionTemplate[];
  dueDateRule?: {
    dayOfMonth: number;
    graceDays: number;
  };
  lateFeePolicy?: {
    enabled: boolean;
    type: 'fixed' | 'percentage';
    amount: number | string;
    graceDays: number;
  };
  status: 'active' | 'archived';
  createdBy?: string | { _id: string; name: string; email: string };
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceItem {
  _id: string;
  schoolId: string;
  studentId: {
    _id: string;
    admissionNumber: string;
    rollNumber?: string;
    userId?: {
      name: string;
      email: string;
      avatar?: string;
      phone?: string;
    };
  };
  parentId?: string;
  academicSessionId: string | { _id: string; name: string; code: string };
  feeStructureId?: string | { _id: string; name: string };
  classId?: string | { _id: string; name: string; code: string };
  sectionId?: string | { _id: string; name: string };
  feePeriod: string;
  invoiceNumber: string;
  lineItems: Array<{
    name: string;
    amount: string | number;
    quantity: number;
    total: string | number;
  }>;
  totalAmount: string;
  discountAmount: string;
  lateFee?: string;
  paidAmount: string;
  balanceAmount: string;
  netPayable?: string;
  dueDate: string;
  status: InvoiceStatus;
  issuedAt?: string;
  paidAt?: string;
  cancelledAt?: string;
  cancelledBy?: string | { _id: string; name: string };
  cancelReason?: string;
  isOverdue?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentItem {
  _id: string;
  schoolId: string;
  invoiceId:
    | string
    | {
        _id: string;
        invoiceNumber: string;
        totalAmount: string;
        discountAmount: string;
        dueDate: string;
        status: InvoiceStatus;
      };
  studentId: {
    _id: string;
    admissionNumber: string;
    rollNumber?: string;
    userId?: {
      name: string;
      email: string;
    };
  };
  paymentNumber: string;
  idempotencyKey: string;
  amount: string;
  currency: string;
  method: PaymentMethod;
  provider: string;
  providerReference?: string;
  status: PaymentStatus;
  paidAt: string;
  recordedBy?: {
    _id: string;
    name: string;
    email: string;
    role: string;
  };
  notes?: string;
  isReversed?: boolean;
  reversedAt?: string;
  reversedBy?: string;
  reversalReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StudentConcessionItem {
  _id: string;
  schoolId: string;
  studentId: {
    _id: string;
    admissionNumber: string;
    rollNumber?: string;
    userId?: {
      name: string;
      email: string;
    };
  };
  academicSessionId: string | { _id: string; name: string; code: string };
  feeStructureId?: string | { _id: string; name: string };
  name: string;
  type: ConcessionType;
  value: string;
  reason: string;
  effectiveStartDate?: string;
  effectiveEndDate?: string;
  status: 'active' | 'inactive' | 'revoked';
  createdBy?: {
    _id: string;
    name: string;
    email: string;
    role: string;
  };
  approvedBy?: {
    _id: string;
    name: string;
    email: string;
    role: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface FeeDashboardMetrics {
  currency: string;
  totalInvoiced: string;
  totalDiscounts: string;
  netPayable: string;
  totalCollected: string;
  totalOutstanding: string;
  totalOverdue: string;
  unpaidCount: number;
  overdueCount: number;
  totalInvoices: number;
  collectionRate: number;
}

export interface InvoicePreviewResult {
  feeStructureName: string;
  feePeriod: string;
  totalEligibleStudents: number;
  newInvoicesCount: number;
  alreadyInvoicedCount: number;
  estimatedGrossTotal: string;
  estimatedDiscountTotal: string;
  estimatedNetRevenue: string;
  previewItems: Array<{
    studentId: string;
    admissionNumber: string;
    studentName: string;
    className: string;
    sectionName?: string;
    grossAmount: string;
    discountAmount: string;
    netPayable: string;
    concessionApplied?: string | null;
    alreadyInvoiced: boolean;
    existingInvoiceNumber?: string | null;
  }>;
}

export interface InvoiceQuery {
  page?: number;
  limit?: number;
  studentId?: string;
  classId?: string;
  sectionId?: string;
  academicSessionId?: string;
  feePeriod?: string;
  status?: InvoiceStatus;
  isOverdue?: boolean;
  search?: string;
}

export interface PaymentQuery {
  page?: number;
  limit?: number;
  invoiceId?: string;
  studentId?: string;
  method?: PaymentMethod;
  status?: PaymentStatus;
  startDate?: string;
  endDate?: string;
}
