import { Types } from 'mongoose';
import { Notification } from '../models/Notification.model.js';
import { logger } from './logger.js';

/**
 * Converts a string, number, or Decimal128 money value to exact integer minor units (e.g. cents, paise).
 * Eliminates binary floating point inaccuracy.
 */
export const toMinorUnits = (val: string | number | Types.Decimal128 | null | undefined): number => {
  if (val === null || val === undefined) return 0;
  const str = typeof val === 'object' && 'toString' in val ? val.toString() : String(val);
  const num = parseFloat(str);
  if (isNaN(num)) return 0;
  return Math.round(num * 100);
};

/**
 * Converts integer minor units to standard 2-decimal string (e.g. 1250 cents -> "12.50").
 */
export const fromMinorUnits = (minorUnits: number): string => {
  return (minorUnits / 100).toFixed(2);
};

/**
 * Converts integer minor units to Mongoose Decimal128 instance.
 */
export const toDecimal128 = (minorUnits: number): Types.Decimal128 => {
  return Types.Decimal128.fromString(fromMinorUnits(minorUnits));
};

/**
 * Computes invoice gross, concession discount, net payable, and initial balance in integer minor units.
 * Guarantees net payable cannot be negative (floor at 0).
 */
export const calculateInvoiceTotals = (
  lineItems: Array<{ amount: string | number | Types.Decimal128; quantity?: number }>,
  concessionDiscountCents: number = 0,
  lateFeeCents: number = 0
): {
  grossCents: number;
  discountCents: number;
  lateFeeCents: number;
  netPayableCents: number;
  grossDecimal: Types.Decimal128;
  discountDecimal: Types.Decimal128;
  lateFeeDecimal: Types.Decimal128;
  netPayableDecimal: Types.Decimal128;
} => {
  let grossCents = 0;
  for (const item of lineItems) {
    const itemAmountCents = toMinorUnits(item.amount);
    const qty = Math.max(1, item.quantity || 1);
    grossCents += itemAmountCents * qty;
  }

  // Ensure discount does not exceed gross amount
  const validDiscountCents = Math.min(Math.max(0, concessionDiscountCents), grossCents);
  const validLateFeeCents = Math.max(0, lateFeeCents);
  const netPayableCents = Math.max(0, grossCents - validDiscountCents + validLateFeeCents);

  return {
    grossCents,
    discountCents: validDiscountCents,
    lateFeeCents: validLateFeeCents,
    netPayableCents,
    grossDecimal: toDecimal128(grossCents),
    discountDecimal: toDecimal128(validDiscountCents),
    lateFeeDecimal: toDecimal128(validLateFeeCents),
    netPayableDecimal: toDecimal128(netPayableCents),
  };
};

/**
 * Generates a human-readable, school-unique invoice number.
 * Format: INV-{YEAR}-{TIMESTAMP_HASH}-{RANDOM}
 */
export const generateInvoiceNumber = (schoolCode: string = 'SMS'): string => {
  const year = new Date().getFullYear();
  const timeHex = Date.now().toString(36).toUpperCase().slice(-4);
  const rand = Math.floor(1000 + Math.random() * 9000);
  const prefix = schoolCode.replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(0, 4) || 'INV';
  return `${prefix}-${year}-${timeHex}${rand}`;
};

/**
 * Generates a human-readable unique receipt number.
 * Format: REC-{YEAR}-{RANDOM}
 */
export const generateReceiptNumber = (schoolCode: string = 'SMS'): string => {
  const year = new Date().getFullYear();
  const rand = Math.floor(100000 + Math.random() * 900000);
  const prefix = schoolCode.replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(0, 3) || 'REC';
  return `${prefix}-${year}-${rand}`;
};

/**
 * Determines whether an invoice is overdue based on due date and balance amount.
 */
export const isInvoiceOverdue = (
  dueDate: Date,
  balanceCents: number,
  currentStatus: string
): boolean => {
  if (currentStatus === 'paid' || currentStatus === 'cancelled') return false;
  if (balanceCents <= 0) return false;

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const due = new Date(dueDate);
  due.setUTCHours(0, 0, 0, 0);

  return due.getTime() < today.getTime();
};

/**
 * Sanitizes CSV field to prevent formula injection / DDE attacks.
 * Neutralizes values starting with '=', '+', '-', or '@'.
 */
export const sanitizeCsvCell = (value: unknown): string => {
  if (value === null || value === undefined) {
    return '""';
  }

  let str = String(value).trim();

  // CSV Injection defense: prepend single quote if cell begins with dangerous formula triggers
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }

  // Escape any embedded double quotes by doubling them
  const escaped = str.replace(/"/g, '""');
  return `"${escaped}"`;
};

/**
 * Dispatches non-blocking in-app notification for fee events.
 */
export const triggerFeeNotification = async (
  schoolId: Types.ObjectId,
  recipientUserId: Types.ObjectId,
  title: string,
  content: string,
  resourceType: 'Invoice' | 'Payment',
  resourceId: Types.ObjectId
): Promise<void> => {
  try {
    await Notification.create({
      schoolId,
      recipientId: recipientUserId,
      category: 'finance',
      title,
      content,
      isRead: false,
      priority: 'high',
      resourceType,
      resourceId,
    });
  } catch (err) {
    logger.warn('[FeeNotification] Non-blocking fee notification failed to dispatch:', err);
  }
};
