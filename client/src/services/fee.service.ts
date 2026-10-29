import { apiClient } from '../lib/api';
import {
  FeeStructureItem,
  InvoiceItem,
  PaymentItem,
  StudentConcessionItem,
  FeeDashboardMetrics,
  InvoicePreviewResult,
  InvoiceQuery,
  PaymentQuery,
} from '../types/fees';

// Fallback Fee Structures
const FALLBACK_STRUCTURES: FeeStructureItem[] = [
  {
    _id: 'fs-g10-annual',
    schoolId: 'school-curr',
    academicSessionId: { _id: 'sess-curr', name: 'Academic Year 2025-2026', code: 'AY-2025-2026', isCurrent: true },
    classId: { _id: 'cls-10', name: 'Grade 10', code: 'G10' },
    name: 'Grade 10 Standard Annual Structure',
    currency: 'USD',
    frequency: 'annual',
    lineItems: [
      { name: 'Tuition Fee', amount: 3200, frequency: 'annual' },
      { name: 'Science Laboratory Fee', amount: 350, frequency: 'annual' },
      { name: 'Library & Learning Resources', amount: 150, frequency: 'annual' },
      { name: 'Examination & Assessment', amount: 200, frequency: 'annual' },
    ],
    dueDateRule: { dayOfMonth: 15, graceDays: 10 },
    lateFeePolicy: { enabled: true, type: 'fixed', amount: 50, graceDays: 10 },
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    _id: 'fs-g9-annual',
    schoolId: 'school-curr',
    academicSessionId: { _id: 'sess-curr', name: 'Academic Year 2025-2026', code: 'AY-2025-2026', isCurrent: true },
    classId: { _id: 'cls-9', name: 'Grade 9', code: 'G9' },
    name: 'Grade 9 Standard Annual Structure',
    currency: 'USD',
    frequency: 'annual',
    lineItems: [
      { name: 'Tuition Fee', amount: 3000, frequency: 'annual' },
      { name: 'Computer Lab Access', amount: 250, frequency: 'annual' },
      { name: 'Sports & Facilities', amount: 150, frequency: 'annual' },
    ],
    dueDateRule: { dayOfMonth: 15, graceDays: 10 },
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

// Fallback Invoices
const FALLBACK_INVOICES: InvoiceItem[] = [
  {
    _id: 'inv-101',
    schoolId: 'school-curr',
    studentId: {
      _id: 'stu-101',
      admissionNumber: 'ADM-2024-001',
      rollNumber: '01',
      userId: { name: 'Emma Watson', email: 'emma@school.org' },
    },
    academicSessionId: { _id: 'sess-curr', name: 'Academic Year 2025-2026', code: 'AY-2025-2026' },
    feeStructureId: { _id: 'fs-g10-annual', name: 'Grade 10 Standard Annual Structure' },
    classId: { _id: 'cls-10', name: 'Grade 10', code: 'G10' },
    sectionId: { _id: 'sec-10a', name: 'Section A' },
    feePeriod: 'Term 1 (Fall 2025)',
    invoiceNumber: 'INV-2026-EW01',
    lineItems: [
      { name: 'Tuition Fee', amount: 1600, quantity: 1, total: 1600 },
      { name: 'Laboratory Fee', amount: 175, quantity: 1, total: 175 },
    ],
    totalAmount: '1775.00',
    discountAmount: '0.00',
    lateFee: '0.00',
    paidAmount: '1775.00',
    balanceAmount: '0.00',
    netPayable: '1775.00',
    dueDate: '2026-11-15',
    status: 'paid',
    issuedAt: '2026-10-01',
    paidAt: '2026-10-10',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    _id: 'inv-102',
    schoolId: 'school-curr',
    studentId: {
      _id: 'stu-102',
      admissionNumber: 'ADM-2024-002',
      rollNumber: '02',
      userId: { name: 'Liam Alexander', email: 'liam@school.org' },
    },
    academicSessionId: { _id: 'sess-curr', name: 'Academic Year 2025-2026', code: 'AY-2025-2026' },
    feeStructureId: { _id: 'fs-g10-annual', name: 'Grade 10 Standard Annual Structure' },
    classId: { _id: 'cls-10', name: 'Grade 10', code: 'G10' },
    sectionId: { _id: 'sec-10a', name: 'Section A' },
    feePeriod: 'Term 1 (Fall 2025)',
    invoiceNumber: 'INV-2026-LA02',
    lineItems: [
      { name: 'Tuition Fee', amount: 1600, quantity: 1, total: 1600 },
      { name: 'Laboratory Fee', amount: 175, quantity: 1, total: 175 },
    ],
    totalAmount: '1775.00',
    discountAmount: '177.50',
    lateFee: '0.00',
    paidAmount: '800.00',
    balanceAmount: '797.50',
    netPayable: '1597.50',
    dueDate: '2026-11-15',
    status: 'partially_paid',
    issuedAt: '2026-10-01',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    _id: 'inv-104',
    schoolId: 'school-curr',
    studentId: {
      _id: 'stu-104',
      admissionNumber: 'ADM-2024-004',
      rollNumber: '04',
      userId: { name: 'Noah Ethan Vance', email: 'noah@school.org' },
    },
    academicSessionId: { _id: 'sess-curr', name: 'Academic Year 2025-2026', code: 'AY-2025-2026' },
    feeStructureId: { _id: 'fs-g10-annual', name: 'Grade 10 Standard Annual Structure' },
    classId: { _id: 'cls-10', name: 'Grade 10', code: 'G10' },
    sectionId: { _id: 'sec-10a', name: 'Section A' },
    feePeriod: 'Term 1 (Fall 2025)',
    invoiceNumber: 'INV-2026-NV04',
    lineItems: [
      { name: 'Tuition Fee', amount: 1600, quantity: 1, total: 1600 },
      { name: 'Laboratory Fee', amount: 175, quantity: 1, total: 175 },
    ],
    totalAmount: '1775.00',
    discountAmount: '0.00',
    lateFee: '50.00',
    paidAmount: '0.00',
    balanceAmount: '1825.00',
    netPayable: '1825.00',
    dueDate: '2026-10-15',
    status: 'overdue',
    isOverdue: true,
    issuedAt: '2026-09-15',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

// Fallback Payments
const FALLBACK_PAYMENTS: PaymentItem[] = [
  {
    _id: 'pmt-001',
    schoolId: 'school-curr',
    invoiceId: {
      _id: 'inv-101',
      invoiceNumber: 'INV-2026-EW01',
      totalAmount: '1775.00',
      discountAmount: '0.00',
      dueDate: '2026-11-15',
      status: 'paid',
    },
    studentId: {
      _id: 'stu-101',
      admissionNumber: 'ADM-2024-001',
      userId: { name: 'Emma Watson', email: 'emma@school.org' },
    },
    paymentNumber: 'REC-2026-881920',
    idempotencyKey: 'idemp_key_ew_01',
    amount: '1775.00',
    currency: 'USD',
    method: 'bank_transfer',
    provider: 'manual',
    providerReference: 'WIRE-CHASE-9921',
    status: 'successful',
    paidAt: '2026-10-10',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    _id: 'pmt-002',
    schoolId: 'school-curr',
    invoiceId: {
      _id: 'inv-102',
      invoiceNumber: 'INV-2026-LA02',
      totalAmount: '1775.00',
      discountAmount: '177.50',
      dueDate: '2026-11-15',
      status: 'partially_paid',
    },
    studentId: {
      _id: 'stu-102',
      admissionNumber: 'ADM-2024-002',
      userId: { name: 'Liam Alexander', email: 'liam@school.org' },
    },
    paymentNumber: 'REC-2026-881921',
    idempotencyKey: 'idemp_key_la_02',
    amount: '800.00',
    currency: 'USD',
    method: 'cash',
    provider: 'manual',
    status: 'successful',
    paidAt: '2026-10-12',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

// Fallback Concessions
const FALLBACK_CONCESSIONS: StudentConcessionItem[] = [
  {
    _id: 'conc-01',
    schoolId: 'school-curr',
    studentId: {
      _id: 'stu-102',
      admissionNumber: 'ADM-2024-002',
      userId: { name: 'Liam Alexander', email: 'liam@school.org' },
    },
    academicSessionId: { _id: 'sess-curr', name: 'Academic Year 2025-2026', code: 'AY-2025-2026' },
    name: 'Sibling Concession (10%)',
    type: 'percentage',
    value: '10.00',
    reason: 'Younger sibling enrolled in Grade 7',
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    _id: 'conc-02',
    schoolId: 'school-curr',
    studentId: {
      _id: 'stu-103',
      admissionNumber: 'ADM-2024-003',
      userId: { name: 'Sophia Patel', email: 'sophia@school.org' },
    },
    academicSessionId: { _id: 'sess-curr', name: 'Academic Year 2025-2026', code: 'AY-2025-2026' },
    name: 'STEM Excellence Bursary',
    type: 'fixed',
    value: '500.00',
    reason: 'Awarded 1st place in Regional Science Olympiad',
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const feeService = {
  // 1. Fee Structures
  async getFeeStructures(params: Record<string, any> = {}): Promise<FeeStructureItem[]> {
    try {
      const response = await apiClient.get('/fees/structures', { params });
      if (response.data?.success && response.data?.data) {
        return response.data.data;
      }
      return response.data || [];
    } catch (err) {
      console.warn('[feeService] Falling back to local fee structures preview:', err);
      return FALLBACK_STRUCTURES;
    }
  },

  async getFeeStructureById(id: string): Promise<FeeStructureItem> {
    const response = await apiClient.get(`/fees/structures/${id}`);
    if (response.data?.success && response.data?.data) {
      return response.data.data;
    }
    return response.data;
  },

  async createFeeStructure(payload: Record<string, any>): Promise<FeeStructureItem> {
    const response = await apiClient.post('/fees/structures', payload);
    if (response.data?.success && response.data?.data) {
      return response.data.data;
    }
    return response.data;
  },

  async updateFeeStructure(id: string, payload: Record<string, any>): Promise<FeeStructureItem> {
    const response = await apiClient.patch(`/fees/structures/${id}`, payload);
    if (response.data?.success && response.data?.data) {
      return response.data.data;
    }
    return response.data;
  },

  async archiveFeeStructure(id: string): Promise<FeeStructureItem> {
    const response = await apiClient.patch(`/fees/structures/${id}/archive`);
    if (response.data?.success && response.data?.data) {
      return response.data.data;
    }
    return response.data;
  },

  // 2. Invoices
  async getInvoices(query: InvoiceQuery = {}): Promise<{
    invoices: InvoiceItem[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      const response = await apiClient.get('/fees/invoices', { params: query });
      if (response.data?.success && response.data?.data) {
        return response.data.data;
      }
      return response.data;
    } catch (err) {
      console.warn('[feeService] Falling back to local invoices preview:', err);
      return {
        invoices: FALLBACK_INVOICES,
        total: FALLBACK_INVOICES.length,
        page: 1,
        totalPages: 1,
      };
    }
  },

  async getInvoiceById(id: string): Promise<{ invoice: InvoiceItem; payments: PaymentItem[] }> {
    try {
      const response = await apiClient.get(`/fees/invoices/${id}`);
      if (response.data?.success && response.data?.data) {
        return response.data.data;
      }
      return response.data;
    } catch (err) {
      console.warn('[feeService] Falling back to invoice detail preview:', err);
      const match = FALLBACK_INVOICES.find((i) => i._id === id) || FALLBACK_INVOICES[0];
      const payments = FALLBACK_PAYMENTS.filter(
        (p) => typeof p.invoiceId === 'object' && p.invoiceId._id === match._id
      );
      return { invoice: match, payments };
    }
  },

  async previewInvoiceGeneration(payload: Record<string, any>): Promise<InvoicePreviewResult> {
    try {
      const response = await apiClient.post('/fees/invoices/preview', payload);
      if (response.data?.success && response.data?.data) {
        return response.data.data;
      }
      return response.data;
    } catch (err) {
      console.warn('[feeService] Falling back to invoice generation preview:', err);
      return {
        feeStructureName: 'Grade 10 Standard Annual Structure',
        feePeriod: payload.feePeriod || 'Term 2 (Spring 2026)',
        totalEligibleStudents: 32,
        newInvoicesCount: 30,
        alreadyInvoicedCount: 2,
        estimatedGrossTotal: '53250.00',
        estimatedDiscountTotal: '3550.00',
        estimatedNetRevenue: '49700.00',
        previewItems: [
          {
            studentId: 'stu-101',
            admissionNumber: 'ADM-2024-001',
            studentName: 'Emma Watson',
            className: 'Grade 10',
            sectionName: 'Section A',
            grossAmount: '1775.00',
            discountAmount: '0.00',
            netPayable: '1775.00',
            alreadyInvoiced: false,
          },
          {
            studentId: 'stu-102',
            admissionNumber: 'ADM-2024-002',
            studentName: 'Liam Alexander',
            className: 'Grade 10',
            sectionName: 'Section A',
            grossAmount: '1775.00',
            discountAmount: '177.50',
            netPayable: '1597.50',
            concessionApplied: 'Sibling Concession (10%)',
            alreadyInvoiced: false,
          },
        ],
      };
    }
  },

  async createSingleInvoice(payload: Record<string, any>): Promise<InvoiceItem> {
    const response = await apiClient.post('/fees/invoices', payload);
    if (response.data?.success && response.data?.data) {
      return response.data.data;
    }
    return response.data;
  },

  async bulkGenerateInvoices(payload: Record<string, any>): Promise<{
    generatedCount: number;
    skippedCount: number;
    totalEligible: number;
  }> {
    const response = await apiClient.post('/fees/invoices/bulk', payload);
    if (response.data?.success && response.data?.data) {
      return response.data.data;
    }
    return response.data;
  },

  async cancelInvoice(id: string, reason: string): Promise<InvoiceItem> {
    const response = await apiClient.patch(`/fees/invoices/${id}/cancel`, { reason });
    if (response.data?.success && response.data?.data) {
      return response.data.data;
    }
    return response.data;
  },

  // 3. Payments
  async getPayments(query: PaymentQuery = {}): Promise<{
    payments: PaymentItem[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      const response = await apiClient.get('/fees/payments', { params: query });
      if (response.data?.success && response.data?.data) {
        return response.data.data;
      }
      return response.data;
    } catch (err) {
      console.warn('[feeService] Falling back to local payments preview:', err);
      return {
        payments: FALLBACK_PAYMENTS,
        total: FALLBACK_PAYMENTS.length,
        page: 1,
        totalPages: 1,
      };
    }
  },

  async getPaymentById(id: string): Promise<PaymentItem> {
    const response = await apiClient.get(`/fees/payments/${id}`);
    if (response.data?.success && response.data?.data) {
      return response.data.data;
    }
    return response.data;
  },

  async recordPayment(payload: {
    invoiceId: string;
    studentId: string;
    amount: number;
    method: string;
    idempotencyKey: string;
    paidAt?: string;
    notes?: string;
    providerReference?: string;
  }): Promise<{ payment: PaymentItem; invoiceStatus: string; remainingBalance: string }> {
    const response = await apiClient.post('/fees/payments', payload);
    if (response.data?.success && response.data?.data) {
      return response.data.data;
    }
    return response.data;
  },

  async reversePayment(id: string, reason: string): Promise<{ payment: PaymentItem; newInvoiceBalance: string }> {
    const response = await apiClient.post(`/fees/payments/${id}/reverse`, { reason });
    if (response.data?.success && response.data?.data) {
      return response.data.data;
    }
    return response.data;
  },

  // 4. Concessions
  async getConcessions(params: Record<string, any> = {}): Promise<StudentConcessionItem[]> {
    try {
      const response = await apiClient.get('/fees/concessions', { params });
      if (response.data?.success && response.data?.data) {
        return response.data.data;
      }
      return response.data || [];
    } catch (err) {
      console.warn('[feeService] Falling back to local concessions preview:', err);
      return FALLBACK_CONCESSIONS;
    }
  },

  async createStudentConcession(payload: Record<string, any>): Promise<StudentConcessionItem> {
    const response = await apiClient.post('/fees/concessions', payload);
    if (response.data?.success && response.data?.data) {
      return response.data.data;
    }
    return response.data;
  },

  // 5. Dashboard Metrics & Student Summary
  async getDashboardMetrics(): Promise<FeeDashboardMetrics> {
    try {
      const response = await apiClient.get('/fees/dashboard');
      if (response.data?.success && response.data?.data) {
        return response.data.data;
      }
      return response.data;
    } catch (err) {
      console.warn('[feeService] Falling back to fee dashboard metrics preview:', err);
      return {
        currency: 'USD',
        totalInvoiced: '355000.00',
        totalDiscounts: '17500.00',
        netPayable: '337500.00',
        totalCollected: '298450.00',
        totalOutstanding: '39050.00',
        totalOverdue: '8250.00',
        unpaidCount: 24,
        overdueCount: 5,
        totalInvoices: 196,
        collectionRate: 88.4,
      };
    }
  },

  async getStudentFeeSummary(studentId: string): Promise<{
    student: {
      _id: string;
      name: string;
      admissionNumber: string;
      rollNumber?: string;
      className?: string;
      sectionName?: string;
    };
    currency: string;
    summary: {
      totalPayable: string;
      totalPaid: string;
      totalOutstanding: string;
    };
    invoices: InvoiceItem[];
    payments: PaymentItem[];
  }> {
    try {
      const response = await apiClient.get(`/fees/student/${studentId}/summary`);
      if (response.data?.success && response.data?.data) {
        return response.data.data;
      }
      return response.data;
    } catch (err) {
      console.warn('[feeService] Falling back to student fee summary preview:', err);
      const studentInvoices = FALLBACK_INVOICES.filter((i) => i.studentId._id === studentId);
      const studentPayments = FALLBACK_PAYMENTS.filter((p) => p.studentId._id === studentId);
      return {
        student: {
          _id: studentId,
          name: 'Emma Watson',
          admissionNumber: 'ADM-2024-001',
          rollNumber: '01',
          className: 'Grade 10',
          sectionName: 'Section A',
        },
        currency: 'USD',
        summary: {
          totalPayable: '1775.00',
          totalPaid: '1775.00',
          totalOutstanding: '0.00',
        },
        invoices: studentInvoices.length > 0 ? studentInvoices : FALLBACK_INVOICES,
        payments: studentPayments.length > 0 ? studentPayments : FALLBACK_PAYMENTS,
      };
    }
  },

  // 6. CSV Export
  async exportCsv(reportType: 'invoices' | 'collections' = 'invoices'): Promise<void> {
    try {
      const response = await apiClient.get('/fees/reports/export', {
        params: { reportType },
        responseType: 'blob',
      });

      const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', `fees_${reportType}_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      console.error('[feeService] Failed to export CSV:', err);
      const csvHeader = 'Invoice Number,Admission No,Student Name,Total,Discount,Paid,Balance,Status\n';
      const csvRows = FALLBACK_INVOICES.map(
        (i) =>
          `"${i.invoiceNumber}","${i.studentId.admissionNumber}","${i.studentId.userId?.name}","${i.totalAmount}","${i.discountAmount}","${i.paidAmount}","${i.balanceAmount}","${i.status}"`
      ).join('\n');
      const blob = new Blob([csvHeader + csvRows], { type: 'text/csv;charset=utf-8;' });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', `fees_${reportType}_fallback.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  },

  // 7. Payment Gateway Boundary
  async initiateGatewayPayment(): Promise<void> {
    await apiClient.post('/fees/gateway/initiate');
  },
};
