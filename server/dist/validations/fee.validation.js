import { z } from 'zod';
const objectIdRegex = /^[0-9a-fA-F]{24}$/;
const objectIdSchema = z.string().regex(objectIdRegex, 'Invalid 24-character hexadecimal ObjectId');
// 1. Fee Structure Validation
export const feeLineItemSchema = z.object({
    name: z.string().min(1, 'Line item name is required').max(150),
    amount: z.number().min(0, 'Component amount must be non-negative'),
    frequency: z.enum(['one_time', 'annual', 'half_yearly', 'quarterly', 'term', 'monthly']).optional(),
    isOptional: z.boolean().optional(),
    description: z.string().max(250).optional(),
});
export const feeConcessionTemplateSchema = z.object({
    name: z.string().min(1, 'Concession template name is required').max(150),
    type: z.enum(['percentage', 'fixed']),
    value: z.number().min(0, 'Concession value must be non-negative'),
    criteria: z.string().max(250).optional(),
});
export const createFeeStructureSchema = z.object({
    name: z.string().min(2, 'Fee structure name must be at least 2 characters').max(150),
    academicSessionId: objectIdSchema,
    classId: objectIdSchema,
    sectionId: objectIdSchema.optional().nullable(),
    currency: z.string().length(3).optional(),
    frequency: z.enum(['one_time', 'annual', 'half_yearly', 'quarterly', 'term', 'monthly']).optional(),
    effectiveStartDate: z.string().datetime().optional().nullable(),
    effectiveEndDate: z.string().datetime().optional().nullable(),
    lineItems: z.array(feeLineItemSchema).min(1, 'At least one fee line item component is required'),
    concessions: z.array(feeConcessionTemplateSchema).optional(),
    dueDateRule: z
        .object({
        dayOfMonth: z.number().min(1).max(31).optional(),
        graceDays: z.number().min(0).max(60).optional(),
    })
        .optional(),
    lateFeePolicy: z
        .object({
        enabled: z.boolean(),
        type: z.enum(['fixed', 'percentage']),
        amount: z.number().min(0),
        graceDays: z.number().min(0).max(60),
    })
        .optional(),
});
export const updateFeeStructureSchema = createFeeStructureSchema.partial().extend({
    status: z.enum(['active', 'archived']).optional(),
});
// 2. Invoice Generation Validation
export const createSingleInvoiceSchema = z.object({
    studentId: objectIdSchema,
    academicSessionId: objectIdSchema,
    feeStructureId: objectIdSchema.optional().nullable(),
    feePeriod: z.string().min(1, 'Fee period label is required (e.g. "Term 1", "2026-10")').max(50),
    dueDate: z.string().min(1, 'Due date is required'),
    lineItems: z.array(feeLineItemSchema).min(1, 'At least one line item is required').optional(),
    discountAmount: z.number().min(0, 'Discount amount must be non-negative').optional(),
    lateFee: z.number().min(0, 'Late fee must be non-negative').optional(),
    notes: z.string().max(300).optional(),
});
export const previewInvoiceSchema = z.object({
    academicSessionId: objectIdSchema,
    feeStructureId: objectIdSchema,
    feePeriod: z.string().min(1, 'Fee period is required').max(50),
    classId: objectIdSchema,
    sectionId: objectIdSchema.optional().nullable(),
    studentId: objectIdSchema.optional().nullable(),
});
export const bulkInvoiceSchema = z.object({
    academicSessionId: objectIdSchema,
    feeStructureId: objectIdSchema,
    feePeriod: z.string().min(1, 'Fee period label is required').max(50),
    classId: objectIdSchema,
    sectionId: objectIdSchema.optional().nullable(),
    dueDate: z.string().min(1, 'Invoice due date is required'),
    notes: z.string().max(300).optional(),
});
export const cancelInvoiceSchema = z.object({
    reason: z.string().min(3, 'Administrative cancellation reason must be at least 3 characters').max(300),
});
// 3. Payment Recording Validation
export const recordPaymentSchema = z.object({
    invoiceId: objectIdSchema,
    studentId: objectIdSchema,
    amount: z.number().positive('Payment amount must be greater than zero'),
    method: z.enum(['cash', 'card', 'bank_transfer', 'cheque', 'online', 'other']),
    idempotencyKey: z
        .string()
        .min(5, 'Idempotency key must be at least 5 characters')
        .max(100, 'Idempotency key cannot exceed 100 characters'),
    paidAt: z.string().optional(),
    provider: z.string().max(50).optional(),
    providerReference: z.string().max(150).optional(),
    notes: z.string().max(500).optional(),
});
export const reversePaymentSchema = z.object({
    reason: z.string().min(5, 'Administrative reversal reason must be at least 5 characters').max(300),
});
// 4. Student Concession Validation
export const createStudentConcessionSchema = z.object({
    studentId: objectIdSchema,
    academicSessionId: objectIdSchema,
    feeStructureId: objectIdSchema.optional().nullable(),
    name: z.string().min(2, 'Concession name must be at least 2 characters').max(150),
    type: z.enum(['percentage', 'fixed']),
    value: z.number().positive('Concession value must be greater than 0'),
    reason: z.string().min(3, 'Justification reason is required').max(500),
    effectiveStartDate: z.string().optional().nullable(),
    effectiveEndDate: z.string().optional().nullable(),
});
// 5. Query Filter Schemas
export const invoiceQuerySchema = z.object({
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(100).default(20),
    studentId: objectIdSchema.optional(),
    classId: objectIdSchema.optional(),
    sectionId: objectIdSchema.optional(),
    academicSessionId: objectIdSchema.optional(),
    feePeriod: z.string().optional(),
    status: z.enum(['draft', 'issued', 'partially_paid', 'paid', 'overdue', 'cancelled']).optional(),
    isOverdue: z.coerce.boolean().optional(),
    search: z.string().optional(),
});
export const paymentQuerySchema = z.object({
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(100).default(20),
    invoiceId: objectIdSchema.optional(),
    studentId: objectIdSchema.optional(),
    method: z.enum(['cash', 'card', 'bank_transfer', 'cheque', 'online', 'other']).optional(),
    status: z.enum(['pending', 'successful', 'failed', 'refunded']).optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
});
