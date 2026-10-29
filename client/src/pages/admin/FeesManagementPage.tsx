import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { PageHeader } from '../../components/shared/PageHeader';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Dialog } from '../../components/ui/Dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/Table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/Tabs';
import { ConfirmationDialog } from '../../components/admin/management/ConfirmationDialog';
import { academicService } from '../../services/academic.service';
import { studentService } from '../../services/student.service';
import { feeService } from '../../services/fee.service';
import { ClassRecord, AcademicSessionRecord } from '../../types/academic';
import {
  FeeStructureItem,
  InvoiceItem,
  PaymentItem,
  StudentConcessionItem,
  FeeDashboardMetrics,
  InvoicePreviewResult,
  FeeFrequency,
  PaymentMethod,
} from '../../types/fees';
import {
  CreditCard,
  CheckCircle2,
  FileText,
  AlertTriangle,
  Download,
  RotateCw,
  Search,
  Plus,
  Receipt,
  Trash2,
  DollarSign,
  Undo2,
  FileSpreadsheet,
} from 'lucide-react';

export const FeesManagementPage: React.FC = () => {
  // Navigation & Tabs
  const [activeTab, setActiveTab] = useState<'overview' | 'structures' | 'invoices' | 'payments' | 'concessions' | 'reports'>('overview');

  // Academic Context
  const [sessions, setSessions] = useState<AcademicSessionRecord[]>([]);
  const [classes, setClasses] = useState<ClassRecord[]>([]);
  const [students, setStudents] = useState<any[]>([]);

  // Finance State
  const [metrics, setMetrics] = useState<FeeDashboardMetrics | null>(null);
  const [structures, setStructures] = useState<FeeStructureItem[]>([]);
  const [invoices, setInvoices] = useState<InvoiceItem[]>([]);
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [concessions, setConcessions] = useState<StudentConcessionItem[]>([]);

  // Loading States
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'warning'; text: string } | null>(null);

  // Search & Filter States
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState<string>('all');
  const [structureSessionFilter, setStructureSessionFilter] = useState<string>('all');

  // Modal States
  // 1. Create Structure Modal
  const [isCreateStructureOpen, setIsCreateStructureOpen] = useState(false);
  const [structName, setStructName] = useState('');
  const [structSessionId, setStructSessionId] = useState('');
  const [structClassId, setStructClassId] = useState('');
  const [structFrequency, setStructFrequency] = useState<FeeFrequency>('term');
  const [structComponents, setStructComponents] = useState<Array<{ name: string; amount: number }>>([
    { name: 'Tuition Fee', amount: 1500 },
    { name: 'Laboratory Fee', amount: 200 },
  ]);
  const [isSubmittingStructure, setIsSubmittingStructure] = useState(false);

  // 2. Create Single Invoice Modal
  const [isCreateInvoiceOpen, setIsCreateInvoiceOpen] = useState(false);
  const [invStudentId, setInvStudentId] = useState('');
  const [invSessionId, setInvSessionId] = useState('');
  const [invStructureId, setInvStructureId] = useState('');
  const [invFeePeriod, setInvFeePeriod] = useState('Term 1 (Fall 2026)');
  const [invDueDate, setInvDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  });
  const [isSubmittingInvoice, setIsSubmittingInvoice] = useState(false);

  // 3. Bulk Invoice Preview & Generate Modal
  const [isBulkInvoiceOpen, setIsBulkInvoiceOpen] = useState(false);
  const [bulkClassId, setBulkClassId] = useState('');
  const [bulkSessionId, setBulkSessionId] = useState('');
  const [bulkStructureId, setBulkStructureId] = useState('');
  const [bulkFeePeriod, setBulkFeePeriod] = useState('Term 1 (Fall 2026)');
  const [bulkDueDate, setBulkDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  });
  const [bulkPreview, setBulkPreview] = useState<InvoicePreviewResult | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isGeneratingBulk, setIsGeneratingBulk] = useState(false);

  // 4. Cancel Invoice Modal
  const [cancelTargetInvoice, setCancelTargetInvoice] = useState<InvoiceItem | null>(null);

  // 5. Record Payment Modal
  const [isRecordPaymentOpen, setIsRecordPaymentOpen] = useState(false);
  const [pmtInvoiceId, setPmtInvoiceId] = useState('');
  const [pmtAmount, setPmtAmount] = useState<number>(0);
  const [pmtMethod, setPmtMethod] = useState<PaymentMethod>('cash');
  const [pmtReference, setPmtReference] = useState('');
  const [pmtNotes, setPmtNotes] = useState('');
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

  // 6. Reverse Payment Modal
  const [reverseTargetPayment, setReverseTargetPayment] = useState<PaymentItem | null>(null);

  // 7. Create Concession Modal
  const [isCreateConcessionOpen, setIsCreateConcessionOpen] = useState(false);
  const [concStudentId, setConcStudentId] = useState('');
  const [concSessionId, setConcSessionId] = useState('');
  const [concName, setConcName] = useState('Merit Academic Scholarship');
  const [concType, setConcType] = useState<'percentage' | 'fixed'>('percentage');
  const [concValue, setConcValue] = useState<number>(20);
  const [concReason, setConcReason] = useState('Top performer in regional Olympiad');
  const [isSubmittingConcession, setIsSubmittingConcession] = useState(false);

  // 8. View Invoice / Receipt Detail Modal
  const [viewInvoice, setViewInvoice] = useState<InvoiceItem | null>(null);

  // Load Initial Academic & Finance Data
  const loadAllData = useCallback(async () => {
    try {
      setIsLoading(true);
      setFeedback(null);
      const [sessData, clsData, stuRes, dashMetrics, structData, invData, pmtData, concData] =
        await Promise.all([
          academicService.getSessions(),
          academicService.getClasses(),
          studentService.getStudents({ limit: 100 }),
          feeService.getDashboardMetrics(),
          feeService.getFeeStructures(),
          feeService.getInvoices({ limit: 50 }),
          feeService.getPayments({ limit: 50 }),
          feeService.getConcessions(),
        ]);

      setSessions(sessData);
      setClasses(clsData);
      setStudents(stuRes.students || []);
      setMetrics(dashMetrics);
      setStructures(structData);
      setInvoices(invData.invoices || []);
      setPayments(pmtData.payments || []);
      setConcessions(concData);

      const activeSess = sessData.find((s) => s.isCurrent) || sessData[0];
      if (activeSess) {
        setStructSessionId(activeSess._id);
        setInvSessionId(activeSess._id);
        setBulkSessionId(activeSess._id);
        setConcSessionId(activeSess._id);
      }
      if (clsData.length > 0) {
        setStructClassId(clsData[0]._id);
        setBulkClassId(clsData[0]._id);
      }
      if (structData.length > 0) {
        setInvStructureId(structData[0]._id);
        setBulkStructureId(structData[0]._id);
      }
      if (stuRes.students?.length > 0) {
        setInvStudentId(stuRes.students[0]._id);
        setConcStudentId(stuRes.students[0]._id);
      }
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Failed to load financial records' });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Selected invoice for payment recording
  const selectedPmtInvoice = useMemo(() => {
    return invoices.find((i) => i._id === pmtInvoiceId);
  }, [invoices, pmtInvoiceId]);

  useEffect(() => {
    if (selectedPmtInvoice) {
      setPmtAmount(parseFloat(selectedPmtInvoice.balanceAmount || '0'));
    }
  }, [selectedPmtInvoice]);

  // Handle Add/Remove Component in Structure Modal
  const handleAddComponent = () => {
    setStructComponents((prev) => [...prev, { name: 'Miscellaneous Activity Fee', amount: 100 }]);
  };

  const handleRemoveComponent = (idx: number) => {
    setStructComponents((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleComponentChange = (idx: number, field: 'name' | 'amount', val: any) => {
    setStructComponents((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, [field]: val } : item))
    );
  };

  // Submit Create Fee Structure
  const handleCreateStructure = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!structName.trim() || !structClassId || !structSessionId || structComponents.length === 0) return;
    try {
      setIsSubmittingStructure(true);
      await feeService.createFeeStructure({
        name: structName.trim(),
        academicSessionId: structSessionId,
        classId: structClassId,
        frequency: structFrequency,
        lineItems: structComponents.map((c) => ({ name: c.name.trim(), amount: Number(c.amount) })),
        dueDateRule: { dayOfMonth: 15, graceDays: 10 },
      });
      setIsCreateStructureOpen(false);
      setStructName('');
      setFeedback({ type: 'success', text: `Fee structure "${structName}" published successfully.` });
      loadAllData();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Failed to create fee structure' });
    } finally {
      setIsSubmittingStructure(false);
    }
  };

  // Submit Create Single Invoice
  const handleCreateSingleInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invStudentId || !invSessionId || !invDueDate) return;
    try {
      setIsSubmittingInvoice(true);
      const res = await feeService.createSingleInvoice({
        studentId: invStudentId,
        academicSessionId: invSessionId,
        feeStructureId: invStructureId || undefined,
        feePeriod: invFeePeriod.trim(),
        dueDate: invDueDate,
      });
      setIsCreateInvoiceOpen(false);
      setFeedback({ type: 'success', text: `Invoice #${res.invoiceNumber} generated successfully.` });
      loadAllData();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Failed to issue invoice' });
    } finally {
      setIsSubmittingInvoice(false);
    }
  };

  // Load Preview for Bulk Invoice Generation
  const handleLoadBulkPreview = async () => {
    if (!bulkClassId || !bulkSessionId || !bulkStructureId) return;
    try {
      setIsPreviewLoading(true);
      const preview = await feeService.previewInvoiceGeneration({
        classId: bulkClassId,
        academicSessionId: bulkSessionId,
        feeStructureId: bulkStructureId,
        feePeriod: bulkFeePeriod.trim(),
      });
      setBulkPreview(preview);
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Failed to preview bulk invoices' });
    } finally {
      setIsPreviewLoading(false);
    }
  };

  // Execute Bulk Generation
  const handleExecuteBulkInvoices = async () => {
    if (!bulkClassId || !bulkSessionId || !bulkStructureId || !bulkDueDate) return;
    try {
      setIsGeneratingBulk(true);
      const res = await feeService.bulkGenerateInvoices({
        classId: bulkClassId,
        academicSessionId: bulkSessionId,
        feeStructureId: bulkStructureId,
        feePeriod: bulkFeePeriod.trim(),
        dueDate: bulkDueDate,
      });
      setIsBulkInvoiceOpen(false);
      setBulkPreview(null);
      setFeedback({
        type: 'success',
        text: `Bulk generation complete! Issued ${res.generatedCount} invoices (${res.skippedCount} duplicates skipped).`,
      });
      loadAllData();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Failed to generate bulk invoices' });
    } finally {
      setIsGeneratingBulk(false);
    }
  };

  // Confirm Invoice Cancellation
  const handleConfirmCancelInvoice = async (reason?: string) => {
    if (!cancelTargetInvoice || !reason?.trim()) return;
    try {
      await feeService.cancelInvoice(cancelTargetInvoice._id, reason.trim());
      setCancelTargetInvoice(null);
      setFeedback({
        type: 'success',
        text: `Invoice #${cancelTargetInvoice.invoiceNumber} cancelled and audited.`,
      });
      loadAllData();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Failed to cancel invoice' });
    }
  };

  // Submit Payment Recording
  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPmtInvoice || pmtAmount <= 0) return;
    try {
      setIsSubmittingPayment(true);
      const res = await feeService.recordPayment({
        invoiceId: selectedPmtInvoice._id,
        studentId: selectedPmtInvoice.studentId._id,
        amount: Number(pmtAmount),
        method: pmtMethod,
        idempotencyKey: `idemp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        providerReference: pmtReference || undefined,
        notes: pmtNotes || undefined,
      });
      setIsRecordPaymentOpen(false);
      setPmtReference('');
      setPmtNotes('');
      setFeedback({
        type: 'success',
        text: `Payment recorded! Receipt #${res.payment.paymentNumber} issued. Remaining balance: $${res.remainingBalance}`,
      });
      loadAllData();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Failed to record payment' });
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  // Confirm Payment Reversal
  const handleConfirmReversePayment = async (reason?: string) => {
    if (!reverseTargetPayment || !reason?.trim()) return;
    try {
      await feeService.reversePayment(reverseTargetPayment._id, reason.trim());
      setReverseTargetPayment(null);
      setFeedback({
        type: 'success',
        text: `Payment #${reverseTargetPayment.paymentNumber} reversed. Invoice balance restored.`,
      });
      loadAllData();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Failed to reverse payment' });
    }
  };

  // Submit Create Concession
  const handleCreateConcession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!concStudentId || !concSessionId || !concName.trim() || !concReason.trim()) return;
    try {
      setIsSubmittingConcession(true);
      await feeService.createStudentConcession({
        studentId: concStudentId,
        academicSessionId: concSessionId,
        name: concName.trim(),
        type: concType,
        value: Number(concValue),
        reason: concReason.trim(),
      });
      setIsCreateConcessionOpen(false);
      setFeedback({ type: 'success', text: `Concession "${concName}" authorized and activated.` });
      loadAllData();
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Failed to create concession' });
    } finally {
      setIsSubmittingConcession(false);
    }
  };

  // CSV Export
  const handleExportCsv = async (reportType: 'invoices' | 'collections') => {
    try {
      setIsExporting(true);
      await feeService.exportCsv(reportType);
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Failed to export CSV report' });
    } finally {
      setIsExporting(false);
    }
  };

  // Filtered Invoices
  const displayedInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      if (invoiceStatusFilter !== 'all' && inv.status !== invoiceStatusFilter) return false;
      if (invoiceSearch.trim()) {
        const q = invoiceSearch.toLowerCase();
        const numMatch = inv.invoiceNumber.toLowerCase().includes(q);
        const nameMatch = inv.studentId?.userId?.name?.toLowerCase().includes(q);
        const admMatch = inv.studentId?.admissionNumber?.toLowerCase().includes(q);
        if (!numMatch && !nameMatch && !admMatch) return false;
      }
      return true;
    });
  }, [invoices, invoiceStatusFilter, invoiceSearch]);

  const currencySymbol = metrics?.currency || '$';

  return (
    <div className="space-y-6 pb-12">
      {/* Top Page Header */}
      <PageHeader
        title="Fees Management & Invoicing"
        description="Comprehensive tuition billing, payment recording, student concessions, and financial audit reports."
        badge={
          <Badge variant="outline" className="gap-1 border-primary/20 bg-primary/5 text-primary text-xs">
            <CreditCard className="h-3 w-3" />
            <span>Phase 8 Finance Engine</span>
          </Badge>
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadAllData}
              disabled={isLoading}
              className="gap-1.5 text-xs"
            >
              <RotateCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExportCsv('invoices')}
              disabled={isExporting}
              className="gap-1.5 text-xs"
            >
              <Download className={`h-3.5 w-3.5 ${isExporting ? 'animate-spin' : ''}`} />
              <span>Export Invoices CSV</span>
            </Button>
          </div>
        }
      />

      {/* Global Alert Banner */}
      {feedback && (
        <div
          className={`p-3.5 rounded-lg border text-sm flex items-center justify-between gap-3 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300'
              : feedback.type === 'warning'
              ? 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300'
              : 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            ) : (
              <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
            )}
            <span>{feedback.text}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-xs font-semibold opacity-70 hover:opacity-100">
            Dismiss
          </button>
        </div>
      )}

      {/* Main Tabs Navigation */}
      <Tabs defaultValue="overview" value={activeTab} onValueChange={(val) => setActiveTab(val as any)}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-border/80 pb-3">
          <TabsList className="bg-muted/80">
            <TabsTrigger value="overview" className="gap-1.5 text-xs">
              <DollarSign className="h-3.5 w-3.5" />
              <span>Finance Overview</span>
            </TabsTrigger>
            <TabsTrigger value="structures" className="gap-1.5 text-xs">
              <FileText className="h-3.5 w-3.5" />
              <span>Fee Structures ({structures.length})</span>
            </TabsTrigger>
            <TabsTrigger value="invoices" className="gap-1.5 text-xs">
              <Receipt className="h-3.5 w-3.5" />
              <span>Invoices ({invoices.length})</span>
            </TabsTrigger>
            <TabsTrigger value="payments" className="gap-1.5 text-xs">
              <CreditCard className="h-3.5 w-3.5" />
              <span>Collections ({payments.length})</span>
            </TabsTrigger>
            <TabsTrigger value="concessions" className="gap-1.5 text-xs">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Concessions ({concessions.length})</span>
            </TabsTrigger>
            <TabsTrigger value="reports" className="gap-1.5 text-xs">
              <FileSpreadsheet className="h-3.5 w-3.5" />
              <span>Reports & CSV</span>
            </TabsTrigger>
          </TabsList>

          {/* Quick Action Trigger Buttons */}
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => setIsRecordPaymentOpen(true)}
              className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <CreditCard className="h-3.5 w-3.5" />
              <span>Record Payment</span>
            </Button>
            <Button
              size="sm"
              onClick={() => setIsCreateInvoiceOpen(true)}
              className="gap-1.5 text-xs"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Issue Invoice</span>
            </Button>
          </div>
        </div>

        {/* ==================================================================== */}
        {/* TAB 1: FINANCE OVERVIEW & ANALYTICS */}
        {/* ==================================================================== */}
        <TabsContent value="overview" className="space-y-6 pt-4">
          {/* 6 Reusable Statistic Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="rounded-xl border border-border/80 bg-card p-4 shadow-sm">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase">Total Invoiced</span>
              <div className="text-xl font-bold mt-1 text-foreground">
                {currencySymbol} {metrics?.totalInvoiced ?? '0.00'}
              </div>
              <span className="text-[10px] text-muted-foreground">{metrics?.totalInvoices ?? 0} invoices issued</span>
            </div>

            <div className="rounded-xl border border-emerald-500/20 bg-emerald-50/40 dark:bg-emerald-950/20 p-4 shadow-sm">
              <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 uppercase">Revenue Collected</span>
              <div className="text-xl font-bold mt-1 text-emerald-700 dark:text-emerald-300">
                {currencySymbol} {metrics?.totalCollected ?? '0.00'}
              </div>
              <span className="text-[10px] text-emerald-600/80">Rate: {metrics?.collectionRate ?? 0}%</span>
            </div>

            <div className="rounded-xl border border-amber-500/20 bg-amber-50/40 dark:bg-amber-950/20 p-4 shadow-sm">
              <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 uppercase">Outstanding Balance</span>
              <div className="text-xl font-bold mt-1 text-amber-700 dark:text-amber-300">
                {currencySymbol} {metrics?.totalOutstanding ?? '0.00'}
              </div>
              <span className="text-[10px] text-amber-600/80">{metrics?.unpaidCount ?? 0} unpaid or partial</span>
            </div>

            <div className="rounded-xl border border-rose-500/20 bg-rose-50/40 dark:bg-rose-950/20 p-4 shadow-sm">
              <span className="text-[11px] font-semibold text-rose-700 dark:text-rose-400 uppercase">Overdue Balance</span>
              <div className="text-xl font-bold mt-1 text-rose-700 dark:text-rose-300">
                {currencySymbol} {metrics?.totalOverdue ?? '0.00'}
              </div>
              <span className="text-[10px] text-rose-600/80">{metrics?.overdueCount ?? 0} overdue invoices</span>
            </div>

            <div className="rounded-xl border border-sky-500/20 bg-sky-50/40 dark:bg-sky-950/20 p-4 shadow-sm">
              <span className="text-[11px] font-semibold text-sky-700 dark:text-sky-400 uppercase">Total Discounts</span>
              <div className="text-xl font-bold mt-1 text-sky-700 dark:text-sky-300">
                {currencySymbol} {metrics?.totalDiscounts ?? '0.00'}
              </div>
              <span className="text-[10px] text-sky-600/80">Concessions & waivers</span>
            </div>

            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 shadow-sm">
              <span className="text-[11px] font-semibold text-primary uppercase">Net Payable</span>
              <div className="text-xl font-bold mt-1 text-primary">
                {currencySymbol} {metrics?.netPayable ?? '0.00'}
              </div>
              <span className="text-[10px] text-muted-foreground">Invoiced minus discounts</span>
            </div>
          </div>

          {/* Quick Action Docks */}
          <div className="rounded-xl border border-border/80 bg-card p-4 shadow-sm flex flex-wrap items-center justify-between gap-4">
            <div>
              <h4 className="font-semibold text-sm text-foreground">Financial Workflows</h4>
              <p className="text-xs text-muted-foreground">Common administrative billing and collection operations.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsCreateStructureOpen(true)}
                className="gap-1.5 text-xs"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>+ Fee Structure</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsBulkInvoiceOpen(true)}
                className="gap-1.5 text-xs"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>+ Bulk Generate Class</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsCreateConcessionOpen(true)}
                className="gap-1.5 text-xs"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>+ Approve Concession</span>
              </Button>
            </div>
          </div>

          {/* Recent Collections Table */}
          <div className="rounded-xl border border-border/80 bg-card overflow-hidden shadow-sm">
            <div className="p-4 border-b border-border/60 flex items-center justify-between">
              <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-primary" />
                <span>Recent Collections & Receipts</span>
              </h3>
              <Button variant="ghost" size="sm" onClick={() => setActiveTab('payments')} className="text-xs text-primary">
                View All Payments →
              </Button>
            </div>

            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead>Receipt #</TableHead>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.slice(0, 5).map((pmt) => (
                  <TableRow key={pmt._id}>
                    <TableCell className="font-mono text-xs font-semibold text-primary">{pmt.paymentNumber}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {typeof pmt.invoiceId === 'object' ? pmt.invoiceId.invoiceNumber : '--'}
                    </TableCell>
                    <TableCell className="text-xs font-medium">{pmt.studentId?.userId?.name || 'Unknown'}</TableCell>
                    <TableCell className="text-right text-xs font-bold text-emerald-600">
                      ${pmt.amount}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px] capitalize">
                        {pmt.method.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(pmt.paidAt).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* ==================================================================== */}
        {/* TAB 2: FEE STRUCTURES */}
        {/* ==================================================================== */}
        <TabsContent value="structures" className="space-y-4 pt-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-card p-4 rounded-xl border border-border/80 shadow-sm">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <span className="text-xs font-semibold text-muted-foreground uppercase">Filter Session:</span>
              <select
                value={structureSessionFilter}
                onChange={(e) => setStructureSessionFilter(e.target.value)}
                className="h-8 rounded-md border border-input bg-background px-2.5 text-xs"
              >
                <option value="all">All Academic Sessions</option>
                {sessions.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <Button size="sm" onClick={() => setIsCreateStructureOpen(true)} className="gap-1.5 text-xs">
              <Plus className="h-3.5 w-3.5" />
              <span>Create Fee Structure</span>
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {structures.map((fs) => {
              const totalAmount = fs.lineItems.reduce((acc, i) => acc + Number(i.amount), 0);
              return (
                <div key={fs._id} className="rounded-xl border border-border/80 bg-card p-5 shadow-sm space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-semibold text-sm text-foreground">{fs.name}</h4>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {typeof fs.classId === 'object' ? fs.classId.name : 'Class Specific'} • {fs.frequency}
                      </div>
                    </div>
                    <Badge variant={fs.status === 'active' ? 'default' : 'outline'} className="capitalize text-[10px]">
                      {fs.status}
                    </Badge>
                  </div>

                  <div className="border-t border-b border-border/60 py-2.5 space-y-1.5">
                    {fs.lineItems.map((li, idx) => (
                      <div key={idx} className="flex justify-between text-xs">
                        <span className="text-muted-foreground">{li.name}</span>
                        <span className="font-medium">${li.amount}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <div>
                      <span className="text-[10px] text-muted-foreground uppercase font-semibold">Total Fee</span>
                      <div className="text-base font-bold text-primary">${totalAmount.toFixed(2)}</div>
                    </div>
                    {fs.status === 'active' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={async () => {
                          await feeService.archiveFeeStructure(fs._id);
                          loadAllData();
                        }}
                        className="text-xs text-muted-foreground hover:text-rose-600 h-8"
                      >
                        Archive
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>

        {/* ==================================================================== */}
        {/* TAB 3: INVOICES */}
        {/* ==================================================================== */}
        <TabsContent value="invoices" className="space-y-4 pt-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-card p-4 rounded-xl border border-border/80 shadow-sm">
            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search invoice #, student, admission..."
                  value={invoiceSearch}
                  onChange={(e) => setInvoiceSearch(e.target.value)}
                  className="pl-8 h-8 text-xs bg-background"
                />
              </div>

              <select
                value={invoiceStatusFilter}
                onChange={(e) => setInvoiceStatusFilter(e.target.value)}
                className="h-8 rounded-md border border-input bg-background px-2.5 text-xs capitalize"
              >
                <option value="all">All Statuses</option>
                <option value="issued">Issued</option>
                <option value="partially_paid">Partially Paid</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <Button size="sm" onClick={() => setIsCreateInvoiceOpen(true)} className="gap-1.5 text-xs">
                <Plus className="h-3.5 w-3.5" />
                <span>Single Invoice</span>
              </Button>
              <Button size="sm" onClick={() => setIsBulkInvoiceOpen(true)} className="gap-1.5 text-xs bg-primary">
                <Plus className="h-3.5 w-3.5" />
                <span>Bulk Generate</span>
              </Button>
            </div>
          </div>

          <div className="rounded-xl border border-border/80 bg-card overflow-hidden shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Student Name & ID</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead className="text-right">Gross</TableHead>
                  <TableHead className="text-right">Discount</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                  <TableHead className="text-right font-bold">Balance</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayedInvoices.map((inv) => {
                  const isPaid = inv.status === 'paid';
                  const isCancelled = inv.status === 'cancelled';
                  const isOverdue = inv.status === 'overdue' || inv.isOverdue;

                  return (
                    <TableRow key={inv._id} className={isOverdue ? 'bg-rose-500/5' : ''}>
                      <TableCell className="font-mono text-xs font-semibold text-primary">{inv.invoiceNumber}</TableCell>
                      <TableCell>
                        <div className="font-medium text-xs text-foreground">{inv.studentId?.userId?.name || 'Unknown'}</div>
                        <div className="font-mono text-[10px] text-muted-foreground">{inv.studentId?.admissionNumber}</div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{inv.feePeriod}</TableCell>
                      <TableCell className="text-right text-xs">${inv.totalAmount}</TableCell>
                      <TableCell className="text-right text-xs text-emerald-600">-${inv.discountAmount}</TableCell>
                      <TableCell className="text-right text-xs text-emerald-600 font-medium">${inv.paidAmount}</TableCell>
                      <TableCell className="text-right text-xs font-bold text-foreground">
                        ${inv.balanceAmount}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(inv.dueDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-[10px] capitalize ${
                            isPaid
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                              : isOverdue
                              ? 'bg-rose-50 text-rose-700 border-rose-300'
                              : isCancelled
                              ? 'bg-gray-100 text-gray-500 border-gray-300'
                              : 'bg-amber-50 text-amber-700 border-amber-300'
                          }`}
                        >
                          {isOverdue && !isPaid && !isCancelled ? 'Overdue' : inv.status.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <button
                          type="button"
                          onClick={() => setViewInvoice(inv)}
                          className="text-xs text-primary hover:underline cursor-pointer"
                        >
                          View
                        </button>
                        {!isPaid && !isCancelled && (
                          <button
                            type="button"
                            onClick={() => {
                              setPmtInvoiceId(inv._id);
                              setIsRecordPaymentOpen(true);
                            }}
                            className="text-xs text-emerald-600 hover:underline cursor-pointer font-medium"
                          >
                            Pay
                          </button>
                        )}
                        {!isCancelled && inv.paidAmount === '0.00' && (
                          <button
                            type="button"
                            onClick={() => setCancelTargetInvoice(inv)}
                            className="text-xs text-rose-600 hover:underline cursor-pointer"
                          >
                            Cancel
                          </button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* ==================================================================== */}
        {/* TAB 4: PAYMENTS & COLLECTIONS */}
        {/* ==================================================================== */}
        <TabsContent value="payments" className="space-y-4 pt-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-card p-4 rounded-xl border border-border/80 shadow-sm">
            <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-emerald-600" />
              <span>Payment Transactions & Receipts</span>
            </h3>
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={() => setIsRecordPaymentOpen(true)} className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white">
                <CreditCard className="h-3.5 w-3.5" />
                <span>+ Record Payment</span>
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleExportCsv('collections')} className="gap-1.5 text-xs">
                <Download className="h-3.5 w-3.5" />
                <span>Export Collections CSV</span>
              </Button>
            </div>
          </div>

          <div className="rounded-xl border border-border/80 bg-card overflow-hidden shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead>Receipt #</TableHead>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Payment Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((p) => {
                  const isReversed = p.isReversed || p.status === 'refunded';
                  return (
                    <TableRow key={p._id} className={isReversed ? 'opacity-60 bg-muted/20' : ''}>
                      <TableCell className="font-mono text-xs font-semibold text-primary">{p.paymentNumber}</TableCell>
                      <TableCell className="font-mono text-xs">
                        {typeof p.invoiceId === 'object' ? p.invoiceId.invoiceNumber : '--'}
                      </TableCell>
                      <TableCell className="text-xs font-medium">{p.studentId?.userId?.name || 'Unknown'}</TableCell>
                      <TableCell className="text-right text-xs font-bold text-emerald-600">${p.amount}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] capitalize">
                          {p.method.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(p.paidAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={isReversed ? 'bg-rose-50 text-rose-700 border-rose-300' : 'bg-emerald-50 text-emerald-700 border-emerald-300'}
                        >
                          {isReversed ? 'Refunded / Reversed' : 'Successful'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {!isReversed && (
                          <button
                            type="button"
                            onClick={() => setReverseTargetPayment(p)}
                            className="text-xs text-rose-600 hover:underline cursor-pointer flex items-center gap-1 justify-end ml-auto"
                          >
                            <Undo2 className="h-3 w-3" />
                            <span>Reverse</span>
                          </button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* ==================================================================== */}
        {/* TAB 5: CONCESSIONS & SCHOLARSHIPS */}
        {/* ==================================================================== */}
        <TabsContent value="concessions" className="space-y-4 pt-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-card p-4 rounded-xl border border-border/80 shadow-sm">
            <div>
              <h3 className="font-semibold text-sm text-foreground">Student Concessions & Waivers</h3>
              <p className="text-xs text-muted-foreground">Authorized percentage and fixed financial subsidies applied during invoice generation.</p>
            </div>
            <Button size="sm" onClick={() => setIsCreateConcessionOpen(true)} className="gap-1.5 text-xs">
              <Plus className="h-3.5 w-3.5" />
              <span>Approve Concession</span>
            </Button>
          </div>

          <div className="rounded-xl border border-border/80 bg-card overflow-hidden shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead>Student Name</TableHead>
                  <TableHead>Admission No</TableHead>
                  <TableHead>Concession Title</TableHead>
                  <TableHead className="text-center">Type</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                  <TableHead>Justification Reason</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {concessions.map((c) => (
                  <TableRow key={c._id}>
                    <TableCell className="font-medium text-xs">{c.studentId?.userId?.name || 'Unknown'}</TableCell>
                    <TableCell className="font-mono text-xs">{c.studentId?.admissionNumber || '--'}</TableCell>
                    <TableCell className="text-xs font-semibold">{c.name}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="text-[10px] capitalize">
                        {c.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-xs font-bold text-primary">
                      {c.type === 'percentage' ? `${c.value}%` : `$${c.value}`}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{c.reason}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 capitalize text-[10px]">
                        {c.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* ==================================================================== */}
        {/* TAB 6: FINANCIAL REPORTS & EXPORT */}
        {/* ==================================================================== */}
        <TabsContent value="reports" className="space-y-4 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-border/80 bg-card p-5 shadow-sm space-y-3">
              <h4 className="font-semibold text-sm text-foreground flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4 text-primary" />
                <span>Invoices & Outstanding Balances Register</span>
              </h4>
              <p className="text-xs text-muted-foreground">
                Export complete invoice ledger including student name, class, gross total, concessions, paid amounts, outstanding balances, and overdue statuses. Fully sanitized against CSV formula injection.
              </p>
              <Button
                variant="default"
                size="sm"
                onClick={() => handleExportCsv('invoices')}
                disabled={isExporting}
                className="gap-1.5 text-xs"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Download Invoices Register (.CSV)</span>
              </Button>
            </div>

            <div className="rounded-xl border border-border/80 bg-card p-5 shadow-sm space-y-3">
              <h4 className="font-semibold text-sm text-foreground flex items-center gap-2">
                <Receipt className="h-4 w-4 text-emerald-600" />
                <span>Collections & Receipts Register</span>
              </h4>
              <p className="text-xs text-muted-foreground">
                Export all recorded transactions with official receipt reference numbers, payment methods (Cash, Wire, POS), timestamped dates, and status.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExportCsv('collections')}
                disabled={isExporting}
                className="gap-1.5 text-xs"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Download Collections Register (.CSV)</span>
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* ==================================================================== */}
      {/* MODAL 1: CREATE FEE STRUCTURE */}
      {/* ==================================================================== */}
      <Dialog
        isOpen={isCreateStructureOpen}
        onClose={() => setIsCreateStructureOpen(false)}
        title="Publish New Fee Structure"
        description="Configure standard fee components, amounts, and billing frequency for a class."
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setIsCreateStructureOpen(false)} disabled={isSubmittingStructure}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleCreateStructure} disabled={isSubmittingStructure || !structName.trim()}>
              {isSubmittingStructure ? 'Publishing...' : 'Publish Structure'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreateStructure} className="space-y-4 py-2">
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">Structure Title *</label>
            <Input
              value={structName}
              onChange={(e) => setStructName(e.target.value)}
              placeholder="e.g. Grade 10 Standard Annual Structure 2026"
              required
              className="text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">Target Class *</label>
              <select
                value={structClassId}
                onChange={(e) => setStructClassId(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs"
              >
                {classes.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">Billing Frequency</label>
              <select
                value={structFrequency}
                onChange={(e) => setStructFrequency(e.target.value as any)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs capitalize"
              >
                <option value="term">Termly</option>
                <option value="annual">Annual</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
              </select>
            </div>
          </div>

          <div className="space-y-2 border-t pt-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Fee Components & Amounts
              </label>
              <button
                type="button"
                onClick={handleAddComponent}
                className="text-xs text-primary hover:underline font-medium"
              >
                + Add Head
              </button>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto">
              {structComponents.map((comp, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Input
                    value={comp.name}
                    onChange={(e) => handleComponentChange(idx, 'name', e.target.value)}
                    placeholder="Component name..."
                    className="h-8 text-xs flex-1"
                  />
                  <div className="w-28 relative">
                    <span className="absolute left-2.5 top-2 text-xs text-muted-foreground">$</span>
                    <Input
                      type="number"
                      value={comp.amount}
                      onChange={(e) => handleComponentChange(idx, 'amount', Number(e.target.value))}
                      placeholder="0.00"
                      className="h-8 text-xs pl-6"
                    />
                  </div>
                  {structComponents.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveComponent(idx)}
                      className="text-muted-foreground hover:text-rose-600 p-1"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </form>
      </Dialog>

      {/* ==================================================================== */}
      {/* MODAL 2: CREATE SINGLE INVOICE */}
      {/* ==================================================================== */}
      <Dialog
        isOpen={isCreateInvoiceOpen}
        onClose={() => setIsCreateInvoiceOpen(false)}
        title="Issue Student Fee Invoice"
        description="Issue an individual tuition or term invoice for an enrolled student."
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setIsCreateInvoiceOpen(false)} disabled={isSubmittingInvoice}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleCreateSingleInvoice} disabled={isSubmittingInvoice || !invStudentId}>
              {isSubmittingInvoice ? 'Generating...' : 'Issue Invoice'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreateSingleInvoice} className="space-y-4 py-2">
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">Select Student *</label>
            <select
              value={invStudentId}
              onChange={(e) => setInvStudentId(e.target.value)}
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs"
            >
              {students.map((st) => (
                <option key={st._id} value={st._id}>
                  {st.userId?.name} ({st.admissionNumber})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">Fee Structure Template</label>
            <select
              value={invStructureId}
              onChange={(e) => setInvStructureId(e.target.value)}
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs"
            >
              {structures.map((fs) => (
                <option key={fs._id} value={fs._id}>
                  {fs.name} (${fs.lineItems.reduce((acc, i) => acc + Number(i.amount), 0)})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">Fee Period Label *</label>
              <Input
                value={invFeePeriod}
                onChange={(e) => setInvFeePeriod(e.target.value)}
                placeholder="e.g. Term 1 (Fall 2026)"
                className="text-xs"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">Payment Due Date *</label>
              <Input
                type="date"
                value={invDueDate}
                onChange={(e) => setInvDueDate(e.target.value)}
                className="text-xs"
              />
            </div>
          </div>
        </form>
      </Dialog>

      {/* ==================================================================== */}
      {/* MODAL 3: BULK INVOICE GENERATION WITH PREVIEW */}
      {/* ==================================================================== */}
      <Dialog
        isOpen={isBulkInvoiceOpen}
        onClose={() => {
          setIsBulkInvoiceOpen(false);
          setBulkPreview(null);
        }}
        title="Cohort Bulk Invoice Generation"
        description="Generate invoices for an entire class or grade with automatic concession calculation and duplicate prevention."
        footer={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setIsBulkInvoiceOpen(false);
                setBulkPreview(null);
              }}
              disabled={isGeneratingBulk}
            >
              Close
            </Button>
            {!bulkPreview ? (
              <Button size="sm" onClick={handleLoadBulkPreview} disabled={isPreviewLoading}>
                {isPreviewLoading ? 'Calculating Preview...' : 'Calculate Preview'}
              </Button>
            ) : (
              <Button size="sm" onClick={handleExecuteBulkInvoices} disabled={isGeneratingBulk || bulkPreview.newInvoicesCount === 0}>
                {isGeneratingBulk ? 'Issuing Invoices...' : `Confirm & Issue ${bulkPreview.newInvoicesCount} Invoices`}
              </Button>
            )}
          </>
        }
      >
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">Class Grade</label>
              <select
                value={bulkClassId}
                onChange={(e) => {
                  setBulkClassId(e.target.value);
                  setBulkPreview(null);
                }}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs"
              >
                {classes.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">Fee Structure</label>
              <select
                value={bulkStructureId}
                onChange={(e) => {
                  setBulkStructureId(e.target.value);
                  setBulkPreview(null);
                }}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs"
              >
                {structures.map((fs) => (
                  <option key={fs._id} value={fs._id}>
                    {fs.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">Fee Period Label</label>
              <Input
                value={bulkFeePeriod}
                onChange={(e) => {
                  setBulkFeePeriod(e.target.value);
                  setBulkPreview(null);
                }}
                className="text-xs"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">Payment Due Date</label>
              <Input
                type="date"
                value={bulkDueDate}
                onChange={(e) => setBulkDueDate(e.target.value)}
                className="text-xs"
              />
            </div>
          </div>

          {bulkPreview && (
            <div className="rounded-xl border border-border/80 bg-muted/30 p-4 space-y-3">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2 bg-background rounded-lg border">
                  <div className="text-[10px] text-muted-foreground uppercase font-semibold">Eligible</div>
                  <div className="text-lg font-bold">{bulkPreview.totalEligibleStudents}</div>
                </div>
                <div className="p-2 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg border border-emerald-200">
                  <div className="text-[10px] text-emerald-700 uppercase font-semibold">New Invoices</div>
                  <div className="text-lg font-bold text-emerald-700">{bulkPreview.newInvoicesCount}</div>
                </div>
                <div className="p-2 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200">
                  <div className="text-[10px] text-amber-700 uppercase font-semibold">Skipped Duplicates</div>
                  <div className="text-lg font-bold text-amber-700">{bulkPreview.alreadyInvoicedCount}</div>
                </div>
              </div>

              <div className="text-xs text-muted-foreground flex justify-between pt-1">
                <span>Estimated Net Revenue:</span>
                <span className="font-bold text-foreground">${bulkPreview.estimatedNetRevenue}</span>
              </div>
            </div>
          )}
        </div>
      </Dialog>

      {/* ==================================================================== */}
      {/* MODAL 4: RECORD PAYMENT */}
      {/* ==================================================================== */}
      <Dialog
        isOpen={isRecordPaymentOpen}
        onClose={() => setIsRecordPaymentOpen(false)}
        title="Record Fee Payment Receipt"
        description="Record payment against an issued invoice and generate an official receipt."
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setIsRecordPaymentOpen(false)} disabled={isSubmittingPayment}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleRecordPayment}
              disabled={isSubmittingPayment || !selectedPmtInvoice || pmtAmount <= 0}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {isSubmittingPayment ? 'Recording...' : 'Record Payment'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleRecordPayment} className="space-y-4 py-2">
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">Select Unpaid Invoice *</label>
            <select
              value={pmtInvoiceId}
              onChange={(e) => setPmtInvoiceId(e.target.value)}
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs"
            >
              <option value="">-- Choose Invoice to Pay --</option>
              {invoices
                .filter((i) => i.status !== 'paid' && i.status !== 'cancelled')
                .map((inv) => (
                  <option key={inv._id} value={inv._id}>
                    #{inv.invoiceNumber} • {inv.studentId?.userId?.name} (Balance: ${inv.balanceAmount})
                  </option>
                ))}
            </select>
          </div>

          {selectedPmtInvoice && (
            <div className="p-3 bg-muted/40 rounded-lg text-xs space-y-1 border">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Student:</span>
                <span className="font-semibold">{selectedPmtInvoice.studentId?.userId?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Invoiced:</span>
                <span>${selectedPmtInvoice.totalAmount}</span>
              </div>
              <div className="flex justify-between text-amber-700 font-bold">
                <span>Outstanding Balance:</span>
                <span>${selectedPmtInvoice.balanceAmount}</span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">Payment Amount ($) *</label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                max={selectedPmtInvoice ? parseFloat(selectedPmtInvoice.balanceAmount) : undefined}
                value={pmtAmount}
                onChange={(e) => setPmtAmount(Number(e.target.value))}
                required
                className="text-xs"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">Payment Method *</label>
              <select
                value={pmtMethod}
                onChange={(e) => setPmtMethod(e.target.value as any)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs capitalize"
              >
                <option value="cash">Cash</option>
                <option value="bank_transfer">Bank Wire Transfer</option>
                <option value="card">Card / POS Terminal</option>
                <option value="cheque">Cheque</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">Transaction Reference (Optional)</label>
            <Input
              value={pmtReference}
              onChange={(e) => setPmtReference(e.target.value)}
              placeholder="e.g. Bank slip # / Wire ref..."
              className="text-xs"
            />
          </div>
        </form>
      </Dialog>

      {/* ==================================================================== */}
      {/* MODAL 5: APPROVE CONCESSION */}
      {/* ==================================================================== */}
      <Dialog
        isOpen={isCreateConcessionOpen}
        onClose={() => setIsCreateConcessionOpen(false)}
        title="Authorize Student Concession"
        description="Approve a percentage or fixed scholarship discount for an enrolled student."
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setIsCreateConcessionOpen(false)} disabled={isSubmittingConcession}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleCreateConcession} disabled={isSubmittingConcession || !concReason.trim()}>
              {isSubmittingConcession ? 'Authorizing...' : 'Authorize Concession'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreateConcession} className="space-y-4 py-2">
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">Select Student *</label>
            <select
              value={concStudentId}
              onChange={(e) => setConcStudentId(e.target.value)}
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs"
            >
              {students.map((st) => (
                <option key={st._id} value={st._id}>
                  {st.userId?.name} ({st.admissionNumber})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">Concession Title *</label>
            <Input
              value={concName}
              onChange={(e) => setConcName(e.target.value)}
              placeholder="e.g. Sibling Concession / Merit Scholarship"
              className="text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">Concession Type</label>
              <select
                value={concType}
                onChange={(e) => setConcType(e.target.value as any)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs capitalize"
              >
                <option value="percentage">Percentage (%)</option>
                <option value="fixed">Fixed Amount ($)</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">Value *</label>
              <Input
                type="number"
                min="0"
                max={concType === 'percentage' ? 100 : undefined}
                value={concValue}
                onChange={(e) => setConcValue(Number(e.target.value))}
                className="text-xs"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">Justification Reason *</label>
            <Input
              value={concReason}
              onChange={(e) => setConcReason(e.target.value)}
              placeholder="Administrative reason or scholarship board approval reference..."
              required
              className="text-xs"
            />
          </div>
        </form>
      </Dialog>

      {/* ==================================================================== */}
      {/* MODAL 6: VIEW INVOICE DETAIL & RECEIPT */}
      {/* ==================================================================== */}
      <Dialog
        isOpen={!!viewInvoice}
        onClose={() => setViewInvoice(null)}
        title={`Invoice #${viewInvoice?.invoiceNumber}`}
        description={`Issued to ${viewInvoice?.studentId?.userId?.name || 'Student'} on ${
          viewInvoice?.issuedAt ? new Date(viewInvoice.issuedAt).toLocaleDateString() : '--'
        }`}
        footer={
          <Button variant="default" size="sm" onClick={() => setViewInvoice(null)}>
            Done
          </Button>
        }
      >
        {viewInvoice && (
          <div className="space-y-4 py-2 text-xs">
            <div className="grid grid-cols-2 gap-2 p-3 bg-muted/40 rounded-lg border">
              <div>
                <span className="text-muted-foreground">Admission No:</span>
                <div className="font-mono font-medium">{viewInvoice.studentId?.admissionNumber}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Due Date:</span>
                <div className="font-medium">{new Date(viewInvoice.dueDate).toLocaleDateString()}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Fee Period:</span>
                <div className="font-medium">{viewInvoice.feePeriod}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Status:</span>
                <Badge variant="outline" className="capitalize text-[10px]">
                  {viewInvoice.status}
                </Badge>
              </div>
            </div>

            <div>
              <h5 className="font-semibold mb-1 text-muted-foreground uppercase text-[10px]">Breakdown of Charges</h5>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead>Component</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {viewInvoice.lineItems.map((li, i) => (
                      <TableRow key={i}>
                        <TableCell>{li.name}</TableCell>
                        <TableCell className="text-right font-medium">${li.amount}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-muted/10 font-bold">
                      <TableCell>Gross Total</TableCell>
                      <TableCell className="text-right">${viewInvoice.totalAmount}</TableCell>
                    </TableRow>
                    <TableRow className="text-emerald-600">
                      <TableCell>Concessions / Subsidy</TableCell>
                      <TableCell className="text-right">-${viewInvoice.discountAmount}</TableCell>
                    </TableRow>
                    <TableRow className="text-emerald-700 font-medium">
                      <TableCell>Amount Paid</TableCell>
                      <TableCell className="text-right">${viewInvoice.paidAmount}</TableCell>
                    </TableRow>
                    <TableRow className="font-bold text-sm text-foreground bg-primary/5">
                      <TableCell>Remaining Balance</TableCell>
                      <TableCell className="text-right text-primary">${viewInvoice.balanceAmount}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        )}
      </Dialog>

      {/* Confirmation Dialog for Invoice Cancellation */}
      <ConfirmationDialog
        isOpen={!!cancelTargetInvoice}
        onClose={() => setCancelTargetInvoice(null)}
        onConfirm={handleConfirmCancelInvoice}
        title="Cancel Unpaid Fee Invoice?"
        message={`Cancelling Invoice #${cancelTargetInvoice?.invoiceNumber} will mark it as void and prevent future payment collections. Please state an administrative cancellation reason.`}
        confirmLabel="Confirm Cancellation"
        confirmVariant="destructive"
        requireReason={true}
        reasonPlaceholder="State reason for cancelling this invoice..."
      />

      {/* Confirmation Dialog for Payment Reversal */}
      <ConfirmationDialog
        isOpen={!!reverseTargetPayment}
        onClose={() => setReverseTargetPayment(null)}
        onConfirm={handleConfirmReversePayment}
        title="Reverse Payment Transaction?"
        message={`Reversing Receipt #${reverseTargetPayment?.paymentNumber} will refund the recorded payment of $${reverseTargetPayment?.amount} and restore the corresponding balance on the invoice.`}
        confirmLabel="Authorize Reversal"
        confirmVariant="destructive"
        requireReason={true}
        reasonPlaceholder="State why this transaction is being reversed/refunded..."
      />
    </div>
  );
};
