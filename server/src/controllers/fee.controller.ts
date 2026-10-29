import { Request, Response } from 'express';
import { Types } from 'mongoose';
import {
  FeeStructure,
  Invoice,
  Payment,
  StudentConcession,
  Student,
  Parent,
  Enrollment,
  School,
  AuditLog,
} from '../models/index.js';
import { ApiError } from '../utils/apiError.js';
import { ApiResponse } from '../utils/apiResponse.js';
import {
  toMinorUnits,
  fromMinorUnits,
  toDecimal128,
  calculateInvoiceTotals,
  generateInvoiceNumber,
  generateReceiptNumber,
  sanitizeCsvCell,
  triggerFeeNotification,
} from '../utils/fee.util.js';
import {
  createFeeStructureSchema,
  updateFeeStructureSchema,
  createSingleInvoiceSchema,
  previewInvoiceSchema,
  bulkInvoiceSchema,
  cancelInvoiceSchema,
  recordPaymentSchema,
  reversePaymentSchema,
  createStudentConcessionSchema,
  invoiceQuerySchema,
  paymentQuerySchema,
} from '../validations/fee.validation.js';

// ============================================================================
// 1. FEE STRUCTURE CONTROLLERS
// ============================================================================

/**
 * GET /api/fees/structures
 * List fee structures with optional filters for session, class, status, frequency.
 */
export const getFeeStructures = async (req: Request, res: Response): Promise<Response> => {
  const schoolId = req.schoolId;
  const { academicSessionId, classId, sectionId, status, frequency } = req.query;

  const filter: any = { schoolId };
  if (academicSessionId) filter.academicSessionId = new Types.ObjectId(academicSessionId as string);
  if (classId) filter.classId = new Types.ObjectId(classId as string);
  if (sectionId) filter.sectionId = new Types.ObjectId(sectionId as string);
  if (status) filter.status = status;
  if (frequency) filter.frequency = frequency;

  const structures = await FeeStructure.find(filter)
    .populate('academicSessionId', 'name code isCurrent')
    .populate('classId', 'name code')
    .populate('sectionId', 'name')
    .populate('createdBy', 'name email role')
    .sort({ createdAt: -1 });

  return ApiResponse.success(res, structures, 'Fee structures retrieved successfully');
};

/**
 * GET /api/fees/structures/:id
 * Retrieve a single fee structure by ID.
 */
export const getFeeStructureById = async (req: Request, res: Response): Promise<Response> => {
  const schoolId = req.schoolId;
  const { id } = req.params;

  const structure = await FeeStructure.findOne({ _id: id, schoolId })
    .populate('academicSessionId', 'name code isCurrent')
    .populate('classId', 'name code')
    .populate('sectionId', 'name')
    .populate('createdBy', 'name email role');

  if (!structure) {
    throw ApiError.notFound('Fee structure not found');
  }

  return ApiResponse.success(res, structure, 'Fee structure retrieved successfully');
};

/**
 * POST /api/fees/structures
 * Create a new fee structure scoped to school, session, and class.
 */
export const createFeeStructure = async (req: Request, res: Response): Promise<Response> => {
  const schoolId = req.schoolId;
  const validated = createFeeStructureSchema.parse(req.body);

  // Prevent duplicate active fee structure with identical name for same session & class
  const existing = await FeeStructure.findOne({
    schoolId,
    academicSessionId: validated.academicSessionId,
    classId: validated.classId,
    name: validated.name.trim(),
    status: 'active',
  });

  if (existing) {
    throw ApiError.conflict(
      `An active fee structure named "${validated.name}" already exists for this class and academic session.`
    );
  }

  // Convert line item amounts to Decimal128
  const formattedLineItems = validated.lineItems.map((item) => ({
    name: item.name.trim(),
    amount: toDecimal128(toMinorUnits(item.amount)),
    frequency: item.frequency || validated.frequency || 'term',
    isOptional: item.isOptional || false,
    description: item.description,
  }));

  // Convert concession template values to Decimal128
  const formattedConcessions = (validated.concessions || []).map((c) => ({
    name: c.name.trim(),
    type: c.type,
    value: toDecimal128(toMinorUnits(c.value)),
    criteria: c.criteria,
  }));

  const creatorId = req.user?.userId ? new Types.ObjectId(req.user.userId) : null;

  const structure = await FeeStructure.create({
    schoolId,
    academicSessionId: validated.academicSessionId,
    classId: validated.classId,
    sectionId: validated.sectionId || null,
    name: validated.name.trim(),
    currency: validated.currency || req.school?.currency || 'USD',
    frequency: validated.frequency || 'term',
    effectiveStartDate: validated.effectiveStartDate ? new Date(validated.effectiveStartDate) : null,
    effectiveEndDate: validated.effectiveEndDate ? new Date(validated.effectiveEndDate) : null,
    lineItems: formattedLineItems,
    concessions: formattedConcessions,
    dueDateRule: validated.dueDateRule || { dayOfMonth: 10, graceDays: 7 },
    lateFeePolicy: validated.lateFeePolicy
      ? {
          enabled: validated.lateFeePolicy.enabled,
          type: validated.lateFeePolicy.type,
          amount: toDecimal128(toMinorUnits(validated.lateFeePolicy.amount)),
          graceDays: validated.lateFeePolicy.graceDays,
        }
      : undefined,
    status: 'active',
    createdBy: creatorId,
  });

  return ApiResponse.created(res, structure, 'Fee structure created successfully');
};

/**
 * PATCH /api/fees/structures/:id
 * Edit fee structure. Does not alter existing issued invoices.
 */
export const updateFeeStructure = async (req: Request, res: Response): Promise<Response> => {
  const schoolId = req.schoolId;
  const { id } = req.params;
  const validated = updateFeeStructureSchema.parse(req.body);

  const structure = await FeeStructure.findOne({ _id: id, schoolId });
  if (!structure) {
    throw ApiError.notFound('Fee structure not found');
  }

  if (validated.name) structure.name = validated.name.trim();
  if (validated.currency) structure.currency = validated.currency;
  if (validated.frequency) structure.frequency = validated.frequency as any;
  if (validated.status) structure.status = validated.status;
  if (validated.sectionId !== undefined) {
    structure.sectionId = validated.sectionId ? new Types.ObjectId(validated.sectionId) : undefined;
  }
  if (validated.effectiveStartDate !== undefined) {
    structure.effectiveStartDate = validated.effectiveStartDate ? new Date(validated.effectiveStartDate) : undefined;
  }
  if (validated.effectiveEndDate !== undefined) {
    structure.effectiveEndDate = validated.effectiveEndDate ? new Date(validated.effectiveEndDate) : undefined;
  }

  if (validated.lineItems) {
    structure.lineItems = validated.lineItems.map((item) => ({
      name: item.name.trim(),
      amount: toDecimal128(toMinorUnits(item.amount)),
      frequency: (item.frequency || structure.frequency || 'term') as any,
      isOptional: item.isOptional || false,
      description: item.description,
    })) as any;
  }

  if (validated.dueDateRule) {
    structure.dueDateRule = {
      dayOfMonth: validated.dueDateRule.dayOfMonth || structure.dueDateRule?.dayOfMonth || 10,
      graceDays: validated.dueDateRule.graceDays || structure.dueDateRule?.graceDays || 7,
    };
  }

  if (validated.lateFeePolicy) {
    structure.lateFeePolicy = {
      enabled: validated.lateFeePolicy.enabled,
      type: validated.lateFeePolicy.type,
      amount: toDecimal128(toMinorUnits(validated.lateFeePolicy.amount)),
      graceDays: validated.lateFeePolicy.graceDays,
    };
  }

  await structure.save();

  return ApiResponse.success(res, structure, 'Fee structure updated successfully');
};

/**
 * PATCH /api/fees/structures/:id/archive
 * Soft-archive a fee structure.
 */
export const archiveFeeStructure = async (req: Request, res: Response): Promise<Response> => {
  const schoolId = req.schoolId;
  const { id } = req.params;

  const structure = await FeeStructure.findOneAndUpdate(
    { _id: id, schoolId },
    { status: 'archived' },
    { new: true }
  );

  if (!structure) {
    throw ApiError.notFound('Fee structure not found');
  }

  return ApiResponse.success(res, structure, 'Fee structure archived successfully');
};

// ============================================================================
// 2. INVOICE CONTROLLERS
// ============================================================================

/**
 * GET /api/fees/invoices
 * List invoices with filters, search, and pagination.
 */
export const getInvoices = async (req: Request, res: Response): Promise<Response> => {
  const schoolId = req.schoolId;
  const user = req.user;
  const query = invoiceQuerySchema.parse(req.query);

  const filter: any = { schoolId };

  // Role-based scoping
  if (user?.role === 'student') {
    const student = await Student.findOne({ userId: user.userId, schoolId });
    if (!student) throw ApiError.notFound('Student profile not found');
    filter.studentId = student._id;
  } else if (user?.role === 'parent') {
    const parent = await Parent.findOne({ userId: user.userId, schoolId });
    if (!parent) throw ApiError.notFound('Parent profile not found');
    const wardIds = parent.children.map((c) => c.studentProfileId);
    if (query.studentId) {
      if (!wardIds.some((id) => id.toString() === query.studentId)) {
        throw ApiError.forbidden('Access denied: Selected student is not linked to your parent account');
      }
      filter.studentId = new Types.ObjectId(query.studentId);
    } else {
      filter.studentId = { $in: wardIds };
    }
  } else if (query.studentId) {
    filter.studentId = new Types.ObjectId(query.studentId);
  }

  if (query.academicSessionId) filter.academicSessionId = new Types.ObjectId(query.academicSessionId);
  if (query.classId) filter.classId = new Types.ObjectId(query.classId);
  if (query.sectionId) filter.sectionId = new Types.ObjectId(query.sectionId);
  if (query.feePeriod) filter.feePeriod = query.feePeriod;
  if (query.status) filter.status = query.status;

  if (query.search) {
    const searchRegex = new RegExp(query.search.trim(), 'i');
    const matchedStudents = await Student.find({
      schoolId,
      $or: [{ admissionNumber: searchRegex }, { rollNumber: searchRegex }],
    }).select('_id');
    const studentIds = matchedStudents.map((s) => s._id);

    filter.$or = [
      { invoiceNumber: searchRegex },
      { studentId: { $in: studentIds } },
    ];
  }

  const page = query.page || 1;
  const limit = query.limit || 20;
  const skip = (page - 1) * limit;

  const [invoices, total] = await Promise.all([
    Invoice.find(filter)
      .populate({
        path: 'studentId',
        select: 'admissionNumber rollNumber userId',
        populate: { path: 'userId', select: 'name email avatar' },
      })
      .populate('classId', 'name code')
      .populate('sectionId', 'name')
      .populate('academicSessionId', 'name code')
      .populate('feeStructureId', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Invoice.countDocuments(filter),
  ]);

  // Dynamically evaluate overdue status for unpaid / partially_paid invoices past dueDate
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const formattedInvoices = invoices.map((inv) => {
    const invObj: any = inv.toObject();
    const balance = toMinorUnits(inv.balanceAmount);
    if (invObj.status !== 'cancelled' && invObj.status !== 'paid' && balance > 0) {
      if (new Date(invObj.dueDate).getTime() < today.getTime()) {
        invObj.isOverdue = true;
      }
    }
    return invObj;
  });

  return ApiResponse.success(
    res,
    {
      invoices: formattedInvoices,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    },
    'Invoices retrieved successfully'
  );
};

/**
 * GET /api/fees/invoices/:id
 * Retrieve single invoice details with payments.
 */
export const getInvoiceById = async (req: Request, res: Response): Promise<Response> => {
  const schoolId = req.schoolId;
  const user = req.user;
  const { id } = req.params;

  const invoice = await Invoice.findOne({ _id: id, schoolId })
    .populate({
      path: 'studentId',
      select: 'admissionNumber rollNumber userId guardians',
      populate: { path: 'userId', select: 'name email phone avatar' },
    })
    .populate('classId', 'name code')
    .populate('sectionId', 'name')
    .populate('academicSessionId', 'name code')
    .populate('feeStructureId', 'name lineItems currency')
    .populate('parentId', 'userId relationship');

  if (!invoice) {
    throw ApiError.notFound('Invoice not found');
  }

  // Access control
  if (user?.role === 'student') {
    const student = await Student.findOne({ userId: user.userId, schoolId });
    if (!student || student._id.toString() !== (invoice.studentId as any)._id.toString()) {
      throw ApiError.forbidden('Access denied: You can only view your own invoices');
    }
  } else if (user?.role === 'parent') {
    const parent = await Parent.findOne({ userId: user.userId, schoolId });
    if (!parent) throw ApiError.notFound('Parent profile not found');
    const isLinked = parent.children.some(
      (c) => c.studentProfileId.toString() === (invoice.studentId as any)._id.toString()
    );
    if (!isLinked) {
      throw ApiError.forbidden('Access denied: This invoice does not belong to your registered ward');
    }
  }

  // Fetch associated payments
  const payments = await Payment.find({
    schoolId,
    invoiceId: invoice._id,
    status: 'successful',
  }).sort({ paidAt: -1 });

  return ApiResponse.success(
    res,
    {
      invoice,
      payments,
    },
    'Invoice details retrieved successfully'
  );
};

/**
 * POST /api/fees/invoices/preview
 * Preview bulk or single invoice generation before committing to the database.
 */
export const previewInvoiceGeneration = async (req: Request, res: Response): Promise<Response> => {
  const schoolId = req.schoolId;
  const validated = previewInvoiceSchema.parse(req.body);

  const feeStructure = await FeeStructure.findOne({
    _id: validated.feeStructureId,
    schoolId,
    status: 'active',
  });

  if (!feeStructure) {
    throw ApiError.notFound('Active fee structure not found for invoice preview');
  }

  // Query eligible enrollments
  const enrollmentFilter: any = {
    schoolId,
    academicSessionId: validated.academicSessionId,
    classId: validated.classId,
    status: 'enrolled',
  };
  if (validated.sectionId) enrollmentFilter.sectionId = validated.sectionId;
  if (validated.studentId) enrollmentFilter.studentId = validated.studentId;

  const enrollments = await Enrollment.find(enrollmentFilter)
    .populate({
      path: 'studentId',
      select: 'admissionNumber rollNumber userId guardians',
      populate: { path: 'userId', select: 'name email' },
    })
    .populate('classId', 'name code')
    .populate('sectionId', 'name');

  const studentIds = enrollments.map((e) => (e.studentId as any)._id);

  // Check which students already have an invoice for this fee period and structure
  const existingInvoices = await Invoice.find({
    schoolId,
    studentId: { $in: studentIds },
    feePeriod: validated.feePeriod.trim(),
    feeStructureId: feeStructure._id,
    status: { $ne: 'cancelled' },
  }).select('studentId invoiceNumber totalAmount status');

  const existingMap = new Map<string, any>();
  existingInvoices.forEach((inv) => {
    existingMap.set(inv.studentId.toString(), inv);
  });

  // Fetch active student concessions
  const concessions = await StudentConcession.find({
    schoolId,
    studentId: { $in: studentIds },
    academicSessionId: validated.academicSessionId,
    status: 'active',
  });

  const concessionMap = new Map<string, any>();
  concessions.forEach((c) => {
    concessionMap.set(c.studentId.toString(), c);
  });

  const previewItems: any[] = [];
  let totalGrossCents = 0;
  let totalDiscountCents = 0;
  let totalNetPayableCents = 0;

  for (const enr of enrollments) {
    const student = enr.studentId as any;
    const sId = student._id.toString();
    const isAlreadyInvoiced = existingMap.has(sId);

    // Calculate gross
    let studentGrossCents = 0;
    for (const item of feeStructure.lineItems) {
      studentGrossCents += toMinorUnits(item.amount);
    }

    // Calculate concession
    let studentDiscountCents = 0;
    const studentConcession = concessionMap.get(sId);
    if (studentConcession) {
      if (studentConcession.type === 'percentage') {
        const pct = parseFloat(studentConcession.value ? studentConcession.value.toString() : '0');
        studentDiscountCents = Math.round((studentGrossCents * pct) / 100);
      } else {
        studentDiscountCents = toMinorUnits(studentConcession.value);
      }
    }

    const totals = calculateInvoiceTotals(
      feeStructure.lineItems.map((li) => ({ amount: li.amount, quantity: 1 })),
      studentDiscountCents,
      0
    );

    if (!isAlreadyInvoiced) {
      totalGrossCents += totals.grossCents;
      totalDiscountCents += totals.discountCents;
      totalNetPayableCents += totals.netPayableCents;
    }

    previewItems.push({
      studentId: sId,
      admissionNumber: student.admissionNumber,
      studentName: student.userId?.name || 'Unknown',
      className: (enr.classId as any)?.name,
      sectionName: (enr.sectionId as any)?.name,
      grossAmount: fromMinorUnits(totals.grossCents),
      discountAmount: fromMinorUnits(totals.discountCents),
      netPayable: fromMinorUnits(totals.netPayableCents),
      concessionApplied: studentConcession ? studentConcession.name : null,
      alreadyInvoiced: isAlreadyInvoiced,
      existingInvoiceNumber: isAlreadyInvoiced ? existingMap.get(sId).invoiceNumber : null,
    });
  }

  return ApiResponse.success(
    res,
    {
      feeStructureName: feeStructure.name,
      feePeriod: validated.feePeriod,
      totalEligibleStudents: enrollments.length,
      newInvoicesCount: enrollments.length - existingInvoices.length,
      alreadyInvoicedCount: existingInvoices.length,
      estimatedGrossTotal: fromMinorUnits(totalGrossCents),
      estimatedDiscountTotal: fromMinorUnits(totalDiscountCents),
      estimatedNetRevenue: fromMinorUnits(totalNetPayableCents),
      previewItems,
    },
    'Invoice generation preview calculated successfully'
  );
};

/**
 * POST /api/fees/invoices
 * Generate single invoice for a student.
 */
export const createSingleInvoice = async (req: Request, res: Response): Promise<Response> => {
  const schoolId = req.schoolId;
  const validated = createSingleInvoiceSchema.parse(req.body);

  // Verify student belongs to school and has active enrollment
  const enrollment = await Enrollment.findOne({
    schoolId,
    studentId: validated.studentId,
    academicSessionId: validated.academicSessionId,
    status: 'enrolled',
  }).populate('classId', 'name code').populate('sectionId', 'name');

  if (!enrollment) {
    throw ApiError.badRequest('Student does not have an active enrollment in this academic session.');
  }

  // Prevent duplicate invoice for same student + feePeriod + feeStructure
  const duplicate = await Invoice.findOne({
    schoolId,
    studentId: validated.studentId,
    feePeriod: validated.feePeriod.trim(),
    feeStructureId: validated.feeStructureId || null,
    status: { $ne: 'cancelled' },
  });

  if (duplicate) {
    throw ApiError.conflict(
      `An active invoice (#${duplicate.invoiceNumber}) already exists for this student for period "${validated.feePeriod}".`
    );
  }

  // Determine line items
  let lineItems: any[] = [];
  if (validated.lineItems && validated.lineItems.length > 0) {
    lineItems = validated.lineItems.map((li) => ({
      name: li.name.trim(),
      amount: toDecimal128(toMinorUnits(li.amount)),
      quantity: 1,
      total: toDecimal128(toMinorUnits(li.amount)),
    }));
  } else if (validated.feeStructureId) {
    const feeStructure = await FeeStructure.findOne({
      _id: validated.feeStructureId,
      schoolId,
      status: 'active',
    });
    if (!feeStructure) throw ApiError.notFound('Referenced fee structure is not active or found');
    lineItems = feeStructure.lineItems.map((li) => ({
      name: li.name.trim(),
      amount: li.amount,
      quantity: 1,
      total: li.amount,
    }));
  } else {
    throw ApiError.badRequest('Line items or a valid fee structure reference is required.');
  }

  // Check concessions
  let discountCents = toMinorUnits(validated.discountAmount || 0);
  let appliedConcessionId: Types.ObjectId | null = null;
  if (!validated.discountAmount) {
    const studentConcession = await StudentConcession.findOne({
      schoolId,
      studentId: validated.studentId,
      academicSessionId: validated.academicSessionId,
      status: 'active',
    });
    if (studentConcession) {
      appliedConcessionId = studentConcession._id;
      const grossTemp = lineItems.reduce((acc, li) => acc + toMinorUnits(li.amount), 0);
      if (studentConcession.type === 'percentage') {
        const pct = parseFloat(studentConcession.value ? studentConcession.value.toString() : '0');
        discountCents = Math.round((grossTemp * pct) / 100);
      } else {
        discountCents = toMinorUnits(studentConcession.value);
      }
    }
  }

  const totals = calculateInvoiceTotals(lineItems, discountCents, toMinorUnits(validated.lateFee || 0));

  const school = await School.findById(schoolId);
  const invoiceNumber = generateInvoiceNumber(school?.code || 'SMS');

  const invoice = await Invoice.create({
    schoolId,
    studentId: validated.studentId,
    academicSessionId: validated.academicSessionId,
    feeStructureId: validated.feeStructureId || null,
    classId: (enrollment.classId as any)._id,
    sectionId: (enrollment.sectionId as any)._id,
    feePeriod: validated.feePeriod.trim(),
    concessionId: appliedConcessionId,
    invoiceNumber,
    lineItems,
    totalAmount: totals.grossDecimal,
    discountAmount: totals.discountDecimal,
    lateFee: totals.lateFeeDecimal,
    paidAmount: toDecimal128(0),
    dueDate: new Date(validated.dueDate),
    status: 'issued',
    issuedAt: new Date(),
  });

  // Non-blocking notification
  const student = await Student.findById(validated.studentId);
  if (student?.userId) {
    triggerFeeNotification(
      new Types.ObjectId(schoolId),
      student.userId,
      `New Fee Invoice Issued (#${invoiceNumber})`,
      `An invoice for ${validated.feePeriod} amounting to ${school?.currency || 'USD'} ${fromMinorUnits(
        totals.netPayableCents
      )} is due on ${new Date(validated.dueDate).toLocaleDateString()}.`,
      'Invoice',
      invoice._id
    );
  }

  return ApiResponse.created(res, invoice, `Invoice #${invoiceNumber} issued successfully`);
};

/**
 * POST /api/fees/invoices/bulk
 * Generate invoices for an entire eligible cohort (class / section).
 */
export const bulkGenerateInvoices = async (req: Request, res: Response): Promise<Response> => {
  const schoolId = req.schoolId;
  const validated = bulkInvoiceSchema.parse(req.body);

  const feeStructure = await FeeStructure.findOne({
    _id: validated.feeStructureId,
    schoolId,
    status: 'active',
  });
  if (!feeStructure) throw ApiError.notFound('Active fee structure not found');

  const enrollmentFilter: any = {
    schoolId,
    academicSessionId: validated.academicSessionId,
    classId: validated.classId,
    status: 'enrolled',
  };
  if (validated.sectionId) enrollmentFilter.sectionId = validated.sectionId;

  const enrollments = await Enrollment.find(enrollmentFilter);
  if (enrollments.length === 0) {
    throw ApiError.badRequest('No active enrollments found for the specified cohort.');
  }

  const studentIds = enrollments.map((e) => e.studentId);

  // Check already invoiced students
  const existingInvoices = await Invoice.find({
    schoolId,
    studentId: { $in: studentIds },
    feePeriod: validated.feePeriod.trim(),
    feeStructureId: feeStructure._id,
    status: { $ne: 'cancelled' },
  }).select('studentId');

  const existingStudentIdSet = new Set(existingInvoices.map((inv) => inv.studentId.toString()));

  // Active concessions
  const concessions = await StudentConcession.find({
    schoolId,
    studentId: { $in: studentIds },
    academicSessionId: validated.academicSessionId,
    status: 'active',
  });
  const concessionMap = new Map<string, any>();
  concessions.forEach((c) => concessionMap.set(c.studentId.toString(), c));

  const school = await School.findById(schoolId);
  const schoolCode = school?.code || 'SMS';

  const lineItemsSnapshot = feeStructure.lineItems.map((li) => ({
    name: li.name.trim(),
    amount: li.amount,
    quantity: 1,
    total: li.amount,
  }));

  const invoicesToCreate: any[] = [];
  let skippedCount = 0;

  for (const enr of enrollments) {
    const sId = enr.studentId.toString();
    if (existingStudentIdSet.has(sId)) {
      skippedCount++;
      continue;
    }

    let discountCents = 0;
    let concessionId: Types.ObjectId | null = null;
    const studentConcession = concessionMap.get(sId);
    if (studentConcession) {
      concessionId = studentConcession._id;
      const grossTemp = lineItemsSnapshot.reduce((acc, li) => acc + toMinorUnits(li.amount), 0);
      if (studentConcession.type === 'percentage') {
        const pct = parseFloat(studentConcession.value ? studentConcession.value.toString() : '0');
        discountCents = Math.round((grossTemp * pct) / 100);
      } else {
        discountCents = toMinorUnits(studentConcession.value);
      }
    }

    const totals = calculateInvoiceTotals(lineItemsSnapshot, discountCents, 0);
    const invoiceNumber = generateInvoiceNumber(schoolCode);

    invoicesToCreate.push({
      schoolId,
      studentId: enr.studentId,
      academicSessionId: validated.academicSessionId,
      feeStructureId: feeStructure._id,
      classId: enr.classId,
      sectionId: enr.sectionId,
      feePeriod: validated.feePeriod.trim(),
      concessionId,
      invoiceNumber,
      lineItems: lineItemsSnapshot,
      totalAmount: totals.grossDecimal,
      discountAmount: totals.discountDecimal,
      lateFee: toDecimal128(0),
      paidAmount: toDecimal128(0),
      dueDate: new Date(validated.dueDate),
      status: 'issued',
      issuedAt: new Date(),
    });
  }

  if (invoicesToCreate.length > 0) {
    await Invoice.insertMany(invoicesToCreate);
  }

  return ApiResponse.created(
    res,
    {
      generatedCount: invoicesToCreate.length,
      skippedCount,
      totalEligible: enrollments.length,
    },
    `Successfully generated ${invoicesToCreate.length} invoice(s) (Skipped ${skippedCount} duplicate(s))`
  );
};

/**
 * PATCH /api/fees/invoices/:id/cancel
 * Cancel an issued invoice with mandatory administrative reason.
 */
export const cancelInvoice = async (req: Request, res: Response): Promise<Response> => {
  const schoolId = req.schoolId;
  const { id } = req.params;
  const validated = cancelInvoiceSchema.parse(req.body);

  const invoice = await Invoice.findOne({ _id: id, schoolId });
  if (!invoice) throw ApiError.notFound('Invoice not found');

  if (invoice.status === 'cancelled') {
    throw ApiError.badRequest('Invoice is already cancelled');
  }

  // Reject cancellation if invoice has successful payments recorded
  const hasSuccessfulPayments = await Payment.exists({
    schoolId,
    invoiceId: invoice._id,
    status: 'successful',
    isReversed: { $ne: true },
  });

  if (hasSuccessfulPayments) {
    throw ApiError.badRequest(
      'Cannot cancel an invoice with active payments. Please refund or reverse payments before cancelling.'
    );
  }

  const cancelUserId = req.user?.userId ? new Types.ObjectId(req.user.userId) : undefined;
  invoice.status = 'cancelled';
  invoice.cancelledAt = new Date();
  invoice.cancelledBy = cancelUserId;
  invoice.cancelReason = validated.reason.trim();
  await invoice.save();

  // Audit Log
  await AuditLog.create({
    actorId: cancelUserId,
    actorRole: req.user?.role,
    schoolId: new Types.ObjectId(schoolId),
    action: 'INVOICE_CANCELLED',
    targetResource: 'Invoice',
    targetResourceId: invoice._id,
    metadata: {
      invoiceNumber: invoice.invoiceNumber,
      reason: validated.reason,
      priorStatus: invoice.status,
    },
    timestamp: new Date(),
  });

  return ApiResponse.success(res, invoice, `Invoice #${invoice.invoiceNumber} cancelled successfully`);
};

// ============================================================================
// 3. PAYMENT CONTROLLERS
// ============================================================================

/**
 * GET /api/fees/payments
 * List payments with filters.
 */
export const getPayments = async (req: Request, res: Response): Promise<Response> => {
  const schoolId = req.schoolId;
  const user = req.user;
  const query = paymentQuerySchema.parse(req.query);

  const filter: any = { schoolId };

  if (user?.role === 'student') {
    const student = await Student.findOne({ userId: user.userId, schoolId });
    if (!student) throw ApiError.notFound('Student profile not found');
    filter.studentId = student._id;
  } else if (user?.role === 'parent') {
    const parent = await Parent.findOne({ userId: user.userId, schoolId });
    if (!parent) throw ApiError.notFound('Parent profile not found');
    const wardIds = parent.children.map((c) => c.studentProfileId);
    filter.studentId = { $in: wardIds };
  } else if (query.studentId) {
    filter.studentId = new Types.ObjectId(query.studentId);
  }

  if (query.invoiceId) filter.invoiceId = new Types.ObjectId(query.invoiceId);
  if (query.method) filter.method = query.method;
  if (query.status) filter.status = query.status;

  const page = query.page || 1;
  const limit = query.limit || 20;
  const skip = (page - 1) * limit;

  const [payments, total] = await Promise.all([
    Payment.find(filter)
      .populate('invoiceId', 'invoiceNumber totalAmount discountAmount dueDate status')
      .populate({
        path: 'studentId',
        select: 'admissionNumber rollNumber userId',
        populate: { path: 'userId', select: 'name email' },
      })
      .populate('recordedBy', 'name email role')
      .sort({ paidAt: -1 })
      .skip(skip)
      .limit(limit),
    Payment.countDocuments(filter),
  ]);

  return ApiResponse.success(
    res,
    {
      payments,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    },
    'Payments retrieved successfully'
  );
};

/**
 * GET /api/fees/payments/:id
 * Retrieve single payment receipt.
 */
export const getPaymentById = async (req: Request, res: Response): Promise<Response> => {
  const schoolId = req.schoolId;
  const user = req.user;
  const { id } = req.params;

  const payment = await Payment.findOne({ _id: id, schoolId })
    .populate('invoiceId')
    .populate({
      path: 'studentId',
      select: 'admissionNumber rollNumber userId',
      populate: { path: 'userId', select: 'name email' },
    })
    .populate('recordedBy', 'name email role');

  if (!payment) throw ApiError.notFound('Payment record not found');

  if (user?.role === 'student') {
    const student = await Student.findOne({ userId: user.userId, schoolId });
    if (!student || student._id.toString() !== (payment.studentId as any)._id.toString()) {
      throw ApiError.forbidden('Access denied');
    }
  }

  return ApiResponse.success(res, payment, 'Payment receipt retrieved successfully');
};

/**
 * POST /api/fees/payments
 * Record a payment against an invoice (idempotent, server-side balance recalculation).
 */
export const recordPayment = async (req: Request, res: Response): Promise<Response> => {
  const schoolId = req.schoolId;
  const validated = recordPaymentSchema.parse(req.body);

  // Idempotency check: if key already exists, return existing payment
  const existingPayment = await Payment.findOne({
    schoolId,
    idempotencyKey: validated.idempotencyKey.trim(),
  });

  if (existingPayment) {
    return ApiResponse.success(
      res,
      existingPayment,
      'Duplicate submission intercepted. Existing payment receipt returned.'
    );
  }

  const invoice = await Invoice.findOne({ _id: validated.invoiceId, schoolId });
  if (!invoice) throw ApiError.notFound('Invoice not found');

  if (invoice.status === 'cancelled') {
    throw ApiError.badRequest('Cannot record payment against a cancelled invoice');
  }

  if (invoice.status === 'paid') {
    throw ApiError.badRequest('Invoice is already fully paid');
  }

  // Calculate current outstanding balance in minor units
  const totalCents = toMinorUnits(invoice.totalAmount);
  const discountCents = toMinorUnits(invoice.discountAmount);
  const paidCents = toMinorUnits(invoice.paidAmount);
  const balanceCents = Math.max(0, totalCents - discountCents - paidCents);

  const paymentCents = toMinorUnits(validated.amount);
  if (paymentCents <= 0) {
    throw ApiError.badRequest('Payment amount must be greater than zero');
  }

  if (paymentCents > balanceCents) {
    throw ApiError.badRequest(
      `Payment amount (${fromMinorUnits(paymentCents)}) exceeds outstanding balance (${fromMinorUnits(
        balanceCents
      )}). Overpayment is not permitted.`
    );
  }

  const school = await School.findById(schoolId);
  const paymentNumber = generateReceiptNumber(school?.code || 'SMS');

  // Update invoice balance
  const newPaidCents = paidCents + paymentCents;
  const newBalanceCents = Math.max(0, balanceCents - paymentCents);

  invoice.paidAmount = toDecimal128(newPaidCents);
  if (newBalanceCents === 0) {
    invoice.status = 'paid';
    invoice.paidAt = new Date();
  } else {
    invoice.status = 'partially_paid';
  }
  await invoice.save();

  const recordUserId = req.user?.userId ? new Types.ObjectId(req.user.userId) : new Types.ObjectId();

  // Create payment record
  const payment = await Payment.create({
    schoolId,
    invoiceId: invoice._id,
    studentId: validated.studentId,
    paymentNumber,
    idempotencyKey: validated.idempotencyKey.trim(),
    amount: toDecimal128(paymentCents),
    currency: school?.currency || 'USD',
    method: validated.method,
    provider: validated.provider || 'manual',
    providerReference: validated.providerReference || undefined,
    status: 'successful',
    paidAt: validated.paidAt ? new Date(validated.paidAt) : new Date(),
    recordedBy: recordUserId,
    notes: validated.notes,
  });

  // Audit Log
  await AuditLog.create({
    actorId: recordUserId,
    actorRole: req.user?.role,
    schoolId: new Types.ObjectId(schoolId),
    action: 'FEE_PAYMENT_RECORDED',
    targetResource: 'Payment',
    targetResourceId: payment._id,
    metadata: {
      receiptNumber: paymentNumber,
      invoiceNumber: invoice.invoiceNumber,
      amount: fromMinorUnits(paymentCents),
      method: validated.method,
      remainingBalance: fromMinorUnits(newBalanceCents),
    },
    timestamp: new Date(),
  });

  // Non-blocking notification
  const student = await Student.findById(validated.studentId);
  if (student?.userId) {
    triggerFeeNotification(
      new Types.ObjectId(schoolId),
      student.userId,
      `Fee Payment Received (#${paymentNumber})`,
      `Payment of ${school?.currency || 'USD'} ${fromMinorUnits(paymentCents)} was successfully recorded for Invoice #${invoice.invoiceNumber}. Remaining balance: ${fromMinorUnits(newBalanceCents)}.`,
      'Payment',
      payment._id
    );
  }

  return ApiResponse.created(
    res,
    {
      payment,
      invoiceStatus: invoice.status,
      remainingBalance: fromMinorUnits(newBalanceCents),
    },
    `Payment of ${fromMinorUnits(paymentCents)} recorded successfully (Receipt #${paymentNumber})`
  );
};

/**
 * POST /api/fees/payments/:id/reverse
 * Reverse or refund an existing payment with audit trail.
 */
export const reversePayment = async (req: Request, res: Response): Promise<Response> => {
  const schoolId = req.schoolId;
  const { id } = req.params;
  const validated = reversePaymentSchema.parse(req.body);

  const payment = await Payment.findOne({ _id: id, schoolId });
  if (!payment) throw ApiError.notFound('Payment record not found');

  if (payment.isReversed) {
    throw ApiError.badRequest('This payment has already been reversed.');
  }

  const invoice = await Invoice.findOne({ _id: payment.invoiceId, schoolId });
  if (!invoice) throw ApiError.notFound('Associated invoice not found');

  // Reverse paid amount on invoice
  const currentPaidCents = toMinorUnits(invoice.paidAmount);
  const paymentCents = toMinorUnits(payment.amount);
  const newPaidCents = Math.max(0, currentPaidCents - paymentCents);

  invoice.paidAmount = toDecimal128(newPaidCents);

  const totalCents = toMinorUnits(invoice.totalAmount);
  const discountCents = toMinorUnits(invoice.discountAmount);
  const newBalanceCents = Math.max(0, totalCents - discountCents - newPaidCents);

  if (newPaidCents === 0) {
    invoice.status = 'issued';
    invoice.paidAt = null as any;
  } else {
    invoice.status = 'partially_paid';
  }
  await invoice.save();

  const reverseUserId = req.user?.userId ? new Types.ObjectId(req.user.userId) : undefined;

  // Mark payment reversed
  payment.isReversed = true;
  payment.reversedAt = new Date();
  payment.reversedBy = reverseUserId;
  payment.reversalReason = validated.reason.trim();
  payment.status = 'refunded';
  await payment.save();

  // Audit Log
  await AuditLog.create({
    actorId: reverseUserId,
    actorRole: req.user?.role,
    schoolId: new Types.ObjectId(schoolId),
    action: 'FEE_PAYMENT_REVERSED',
    targetResource: 'Payment',
    targetResourceId: payment._id,
    metadata: {
      receiptNumber: payment.paymentNumber,
      invoiceNumber: invoice.invoiceNumber,
      amountReversed: fromMinorUnits(paymentCents),
      reason: validated.reason,
      newInvoiceBalance: fromMinorUnits(newBalanceCents),
    },
    timestamp: new Date(),
  });

  return ApiResponse.success(
    res,
    {
      payment,
      invoiceStatus: invoice.status,
      newInvoiceBalance: fromMinorUnits(newBalanceCents),
    },
    `Payment #${payment.paymentNumber} reversed successfully`
  );
};

// ============================================================================
// 4. CONCESSION CONTROLLERS
// ============================================================================

/**
 * GET /api/fees/concessions
 * List student concessions.
 */
export const getStudentConcessions = async (req: Request, res: Response): Promise<Response> => {
  const schoolId = req.schoolId;
  const { studentId, academicSessionId, status } = req.query;

  const filter: any = { schoolId };
  if (studentId) filter.studentId = new Types.ObjectId(studentId as string);
  if (academicSessionId) filter.academicSessionId = new Types.ObjectId(academicSessionId as string);
  if (status) filter.status = status;

  const concessions = await StudentConcession.find(filter)
    .populate({
      path: 'studentId',
      select: 'admissionNumber rollNumber userId',
      populate: { path: 'userId', select: 'name email' },
    })
    .populate('academicSessionId', 'name code')
    .populate('feeStructureId', 'name')
    .populate('createdBy', 'name email role')
    .populate('approvedBy', 'name email role')
    .sort({ createdAt: -1 });

  return ApiResponse.success(res, concessions, 'Student concessions retrieved successfully');
};

/**
 * POST /api/fees/concessions
 * Create a new student-specific concession.
 */
export const createStudentConcession = async (req: Request, res: Response): Promise<Response> => {
  const schoolId = req.schoolId;
  const validated = createStudentConcessionSchema.parse(req.body);

  if (validated.type === 'percentage' && validated.value > 100) {
    throw ApiError.badRequest('Percentage concession cannot exceed 100%');
  }

  const creatorId = req.user?.userId ? new Types.ObjectId(req.user.userId) : new Types.ObjectId();

  const concession = await StudentConcession.create({
    schoolId,
    studentId: validated.studentId,
    academicSessionId: validated.academicSessionId,
    feeStructureId: validated.feeStructureId || null,
    name: validated.name.trim(),
    type: validated.type,
    value: toDecimal128(toMinorUnits(validated.value)),
    reason: validated.reason.trim(),
    effectiveStartDate: validated.effectiveStartDate ? new Date(validated.effectiveStartDate) : null,
    effectiveEndDate: validated.effectiveEndDate ? new Date(validated.effectiveEndDate) : null,
    status: 'active',
    createdBy: creatorId,
    approvedBy: creatorId,
  });

  return ApiResponse.created(res, concession, 'Student concession approved and created successfully');
};

// ============================================================================
// 5. FINANCE DASHBOARD & REPORT CONTROLLERS
// ============================================================================

/**
 * GET /api/fees/dashboard
 * Aggregated finance metrics (total invoiced, total collected, outstanding, overdue, unpaid count).
 * Excludes cancelled invoices and refunded/failed payments.
 */
export const getFeeDashboardMetrics = async (req: Request, res: Response): Promise<Response> => {
  const schoolId = req.schoolId;

  // Active invoices (exclude cancelled)
  const invoices = await Invoice.find({
    schoolId,
    status: { $ne: 'cancelled' },
  }).select('totalAmount discountAmount paidAmount dueDate status createdAt');

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  let totalInvoicedCents = 0;
  let totalDiscountCents = 0;
  let totalCollectedCents = 0;
  let totalOutstandingCents = 0;
  let totalOverdueCents = 0;
  let unpaidCount = 0;
  let overdueCount = 0;

  invoices.forEach((inv) => {
    const gross = toMinorUnits(inv.totalAmount);
    const discount = toMinorUnits(inv.discountAmount);
    const paid = toMinorUnits(inv.paidAmount);
    const balance = Math.max(0, gross - discount - paid);

    totalInvoicedCents += gross;
    totalDiscountCents += discount;
    totalCollectedCents += paid;
    totalOutstandingCents += balance;

    if (balance > 0) {
      unpaidCount++;
      const due = new Date(inv.dueDate);
      due.setUTCHours(0, 0, 0, 0);
      if (due.getTime() < today.getTime()) {
        totalOverdueCents += balance;
        overdueCount++;
      }
    }
  });

  const school = await School.findById(schoolId);
  const currency = school?.currency || 'USD';

  return ApiResponse.success(
    res,
    {
      currency,
      totalInvoiced: fromMinorUnits(totalInvoicedCents),
      totalDiscounts: fromMinorUnits(totalDiscountCents),
      netPayable: fromMinorUnits(totalInvoicedCents - totalDiscountCents),
      totalCollected: fromMinorUnits(totalCollectedCents),
      totalOutstanding: fromMinorUnits(totalOutstandingCents),
      totalOverdue: fromMinorUnits(totalOverdueCents),
      unpaidCount,
      overdueCount,
      totalInvoices: invoices.length,
      collectionRate:
        totalInvoicedCents - totalDiscountCents > 0
          ? Math.round(
              (totalCollectedCents / (totalInvoicedCents - totalDiscountCents)) * 1000
            ) / 10
          : 0,
    },
    'Fee dashboard metrics retrieved successfully'
  );
};

/**
 * GET /api/fees/student/:studentId/summary
 * Comprehensive student ledger and payment summary for student / parent view.
 */
export const getStudentFeeSummary = async (req: Request, res: Response): Promise<Response> => {
  const schoolId = req.schoolId;
  const user = req.user;
  const { studentId } = req.params;

  // Authorization checks
  if (user?.role === 'student') {
    const currentStudent = await Student.findOne({ userId: user.userId, schoolId });
    if (!currentStudent || currentStudent._id.toString() !== studentId) {
      throw ApiError.forbidden('Access denied: You can only view your own financial records');
    }
  } else if (user?.role === 'parent') {
    const parent = await Parent.findOne({ userId: user.userId, schoolId });
    if (!parent) throw ApiError.notFound('Parent profile not found');
    const isLinked = parent.children.some(
      (c) => c.studentProfileId.toString() === studentId
    );
    if (!isLinked) {
      throw ApiError.forbidden('Access denied: Selected student is not registered under your account');
    }
  }

  const student = await Student.findOne({ _id: studentId, schoolId })
    .populate('userId', 'name email avatar')
    .populate('currentClassId', 'name code')
    .populate('currentSectionId', 'name');

  if (!student) throw ApiError.notFound('Student not found');

  const [invoices, payments] = await Promise.all([
    Invoice.find({ schoolId, studentId, status: { $ne: 'cancelled' } })
      .populate('academicSessionId', 'name code')
      .populate('feeStructureId', 'name')
      .sort({ dueDate: -1 }),
    Payment.find({ schoolId, studentId, status: 'successful' }).sort({ paidAt: -1 }),
  ]);

  let totalPayableCents = 0;
  let totalPaidCents = 0;
  let totalOutstandingCents = 0;

  invoices.forEach((inv) => {
    const gross = toMinorUnits(inv.totalAmount);
    const discount = toMinorUnits(inv.discountAmount);
    const paid = toMinorUnits(inv.paidAmount);
    const balance = Math.max(0, gross - discount - paid);

    totalPayableCents += gross - discount;
    totalPaidCents += paid;
    totalOutstandingCents += balance;
  });

  const school = await School.findById(schoolId);

  return ApiResponse.success(
    res,
    {
      student: {
        _id: student._id,
        name: (student.userId as any)?.name,
        admissionNumber: student.admissionNumber,
        rollNumber: student.rollNumber,
        className: (student.currentClassId as any)?.name,
        sectionName: (student.currentSectionId as any)?.name,
      },
      currency: school?.currency || 'USD',
      summary: {
        totalPayable: fromMinorUnits(totalPayableCents),
        totalPaid: fromMinorUnits(totalPaidCents),
        totalOutstanding: fromMinorUnits(totalOutstandingCents),
      },
      invoices,
      payments,
    },
    'Student fee summary retrieved successfully'
  );
};

/**
 * GET /api/fees/reports/export
 * Safe CSV export for fee collections, outstanding balances, and invoices with DDE formula protection.
 */
export const exportFeesCsv = async (req: Request, res: Response): Promise<void> => {
  const schoolId = req.schoolId;
  const { reportType = 'invoices', academicSessionId, classId, status } = req.query;

  const filter: any = { schoolId };
  if (academicSessionId) filter.academicSessionId = new Types.ObjectId(academicSessionId as string);
  if (classId) filter.classId = new Types.ObjectId(classId as string);
  if (status) filter.status = status;

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="fees_${reportType}_${new Date().toISOString().split('T')[0]}.csv"`
  );

  if (reportType === 'payments' || reportType === 'collections') {
    const payments = await Payment.find(filter)
      .populate({
        path: 'studentId',
        select: 'admissionNumber rollNumber userId',
        populate: { path: 'userId', select: 'name' },
      })
      .populate('invoiceId', 'invoiceNumber')
      .sort({ paidAt: -1 });

    let csvContent = 'Receipt Number,Invoice Number,Admission No,Student Name,Amount,Currency,Method,Status,Date\n';
    payments.forEach((p) => {
      const student = p.studentId as any;
      const inv = p.invoiceId as any;
      csvContent += [
        sanitizeCsvCell(p.paymentNumber),
        sanitizeCsvCell(inv?.invoiceNumber || '--'),
        sanitizeCsvCell(student?.admissionNumber || '--'),
        sanitizeCsvCell(student?.userId?.name || 'Unknown'),
        sanitizeCsvCell(p.amount ? p.amount.toString() : '0.00'),
        sanitizeCsvCell(p.currency),
        sanitizeCsvCell(p.method),
        sanitizeCsvCell(p.status),
        sanitizeCsvCell(new Date(p.paidAt).toLocaleDateString()),
      ].join(',') + '\n';
    });

    res.status(200).send(csvContent);
    return;
  }

  // Default: Invoices Export
  const invoices = await Invoice.find(filter)
    .populate({
      path: 'studentId',
      select: 'admissionNumber rollNumber userId',
      populate: { path: 'userId', select: 'name' },
    })
    .populate('classId', 'name')
    .populate('sectionId', 'name')
    .sort({ dueDate: -1 });

  let csvContent = 'Invoice Number,Admission No,Student Name,Class,Section,Fee Period,Total,Discount,Paid,Balance,Due Date,Status\n';
  invoices.forEach((inv) => {
    const student = inv.studentId as any;
    const gross = parseFloat(inv.totalAmount ? inv.totalAmount.toString() : '0');
    const discount = parseFloat(inv.discountAmount ? inv.discountAmount.toString() : '0');
    const paid = parseFloat(inv.paidAmount ? inv.paidAmount.toString() : '0');
    const balance = Math.max(0, gross - discount - paid).toFixed(2);

    csvContent += [
      sanitizeCsvCell(inv.invoiceNumber),
      sanitizeCsvCell(student?.admissionNumber || '--'),
      sanitizeCsvCell(student?.userId?.name || 'Unknown'),
      sanitizeCsvCell((inv.classId as any)?.name || '--'),
      sanitizeCsvCell((inv.sectionId as any)?.name || '--'),
      sanitizeCsvCell(inv.feePeriod || '--'),
      sanitizeCsvCell(gross.toFixed(2)),
      sanitizeCsvCell(discount.toFixed(2)),
      sanitizeCsvCell(paid.toFixed(2)),
      sanitizeCsvCell(balance),
      sanitizeCsvCell(new Date(inv.dueDate).toLocaleDateString()),
      sanitizeCsvCell(inv.status),
    ].join(',') + '\n';
  });

  res.status(200).send(csvContent);
};

// ============================================================================
// 6. PAYMENT GATEWAY PREPARATION BOUNDARY
// ============================================================================

/**
 * POST /api/fees/gateway/initiate
 * Clean architectural boundary: Online payment gateway remains explicitly unavailable
 * until a verified provider (Stripe, Razorpay, Flutterwave, etc.) is provisioned.
 */
export const initiateGatewayPayment = async (_req: Request, _res: Response): Promise<void> => {
  throw new ApiError(
    503,
    'Online payment gateway is not yet configured for this institution. Please record payment through official school finance channels (Cash, Bank Wire Transfer, Cheque, or POS Card Terminal).'
  );
};
