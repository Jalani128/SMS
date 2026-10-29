import { Router } from 'express';
import { authenticate, enforceSchoolContext, requireActiveSchool, requireVerifiedEmail, } from '../../middlewares/auth.middleware.js';
import { requireRole } from '../../middlewares/rbac.middleware.js';
import { getFeeStructures, getFeeStructureById, createFeeStructure, updateFeeStructure, archiveFeeStructure, getInvoices, getInvoiceById, previewInvoiceGeneration, createSingleInvoice, bulkGenerateInvoices, cancelInvoice, getPayments, getPaymentById, recordPayment, reversePayment, getStudentConcessions, createStudentConcession, getFeeDashboardMetrics, getStudentFeeSummary, exportFeesCsv, initiateGatewayPayment, } from '../../controllers/fee.controller.js';
const router = Router();
// Apply global security pipeline across all fee endpoints
router.use(authenticate);
router.use(enforceSchoolContext);
router.use(requireActiveSchool);
router.use(requireVerifiedEmail);
// ============================================================================
// 1. Fee Structures Routes
// ============================================================================
router.get('/structures', getFeeStructures);
router.get('/structures/:id', getFeeStructureById);
router.post('/structures', requireRole(['admin', 'super_admin']), createFeeStructure);
router.patch('/structures/:id', requireRole(['admin', 'super_admin']), updateFeeStructure);
router.patch('/structures/:id/archive', requireRole(['admin', 'super_admin']), archiveFeeStructure);
// ============================================================================
// 2. Invoices Routes
// ============================================================================
router.get('/invoices', getInvoices);
router.get('/invoices/:id', getInvoiceById);
router.post('/invoices/preview', requireRole(['admin', 'super_admin']), previewInvoiceGeneration);
router.post('/invoices', requireRole(['admin', 'super_admin']), createSingleInvoice);
router.post('/invoices/bulk', requireRole(['admin', 'super_admin']), bulkGenerateInvoices);
router.patch('/invoices/:id/cancel', requireRole(['admin', 'super_admin']), cancelInvoice);
// ============================================================================
// 3. Payments Routes
// ============================================================================
router.get('/payments', getPayments);
router.get('/payments/:id', getPaymentById);
router.post('/payments', requireRole(['admin', 'super_admin']), recordPayment);
router.post('/payments/:id/reverse', requireRole(['admin', 'super_admin']), reversePayment);
// ============================================================================
// 4. Student Concessions Routes
// ============================================================================
router.get('/concessions', requireRole(['admin', 'super_admin']), getStudentConcessions);
router.post('/concessions', requireRole(['admin', 'super_admin']), createStudentConcession);
// ============================================================================
// 5. Finance Views, Summaries & Reports
// ============================================================================
router.get('/dashboard', requireRole(['admin', 'super_admin']), getFeeDashboardMetrics);
router.get('/student/:studentId/summary', getStudentFeeSummary);
router.get('/reports/export', requireRole(['admin', 'super_admin']), exportFeesCsv);
// ============================================================================
// 6. Gateway Boundary Route
// ============================================================================
router.post('/gateway/initiate', initiateGatewayPayment);
export default router;
