import React, { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '../../components/shared/PageHeader';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Dialog } from '../../components/ui/Dialog';
import { Skeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/Table';
import { feeService } from '../../services/fee.service';
import { InvoiceItem, PaymentItem } from '../../types/fees';
import {
  CreditCard,
  Receipt,
  User,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

interface WardOption {
  id: string;
  name: string;
  admissionNumber: string;
  grade: string;
}

const SAMPLE_WARDS: WardOption[] = [
  { id: 'stu-101', name: 'Emma Watson', admissionNumber: 'ADM-2024-001', grade: 'Grade 10 - Section A' },
  { id: 'stu-104', name: 'Noah Ethan Vance', admissionNumber: 'ADM-2024-004', grade: 'Grade 10 - Section A' },
];

export const ParentFeesPage: React.FC = () => {
  const [selectedWardId, setSelectedWardId] = useState<string>(SAMPLE_WARDS[0].id);
  const [invoices, setInvoices] = useState<InvoiceItem[]>([]);
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [summary, setSummary] = useState<{ totalPayable: string; totalPaid: string; totalOutstanding: string }>({
    totalPayable: '0.00',
    totalPaid: '0.00',
    totalOutstanding: '0.00',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [viewInvoice, setViewInvoice] = useState<InvoiceItem | null>(null);

  const activeWard = SAMPLE_WARDS.find((w) => w.id === selectedWardId) || SAMPLE_WARDS[0];

  const loadWardFeeData = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await feeService.getStudentFeeSummary(selectedWardId);
      setInvoices(res.invoices || []);
      setPayments(res.payments || []);
      setSummary(res.summary);
    } catch (err) {
      console.warn('Failed to load ward fee summary:', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedWardId]);

  useEffect(() => {
    loadWardFeeData();
  }, [loadWardFeeData]);

  const hasOutstanding = parseFloat(summary.totalOutstanding) > 0;

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Ward Fee Accounts & Tuition"
        description="Monitor tuition invoices, payment records, and account balances for your registered children."
        badge={
          <Badge variant="outline" className="text-xs gap-1 border-primary/20 bg-primary/5 text-primary">
            <User className="h-3 w-3" />
            <span>Parent Portal</span>
          </Badge>
        }
      />

      {/* Ward Selector Bar */}
      <div className="rounded-xl border border-border/80 bg-card p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider shrink-0">
            Select Student:
          </label>
          <select
            value={selectedWardId}
            onChange={(e) => setSelectedWardId(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 py-1 text-xs font-medium focus:ring-2 focus:ring-primary/20"
          >
            {SAMPLE_WARDS.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name} ({w.admissionNumber} - {w.grade})
              </option>
            ))}
          </select>
        </div>

        <Badge
          variant="outline"
          className={`text-xs gap-1 font-semibold ${
            hasOutstanding
              ? 'border-amber-500/30 text-amber-700 bg-amber-500/10'
              : 'border-emerald-500/30 text-emerald-700 bg-emerald-500/10'
          }`}
        >
          <span>{hasOutstanding ? `Due for ${activeWard.name}: $${summary.totalOutstanding}` : 'All Fees Paid'}</span>
        </Badge>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-border/80 bg-card p-4 shadow-sm">
          <span className="text-xs font-semibold text-muted-foreground uppercase">Total Invoiced</span>
          <div className="text-2xl font-bold mt-1 text-foreground">${summary.totalPayable}</div>
          <span className="text-[10px] text-muted-foreground">For {activeWard.name}</span>
        </div>

        <div className="rounded-xl border border-emerald-500/20 bg-emerald-50/40 dark:bg-emerald-950/20 p-4 shadow-sm">
          <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase">Paid to Date</span>
          <div className="text-2xl font-bold mt-1 text-emerald-700 dark:text-emerald-300">${summary.totalPaid}</div>
          <span className="text-[10px] text-emerald-600/80">Cleared payments</span>
        </div>

        <div
          className={`rounded-xl border p-4 shadow-sm ${
            hasOutstanding ? 'border-amber-500/30 bg-amber-50/40 dark:bg-amber-950/20' : 'border-border/80 bg-card'
          }`}
        >
          <span
            className={`text-xs font-semibold uppercase ${
              hasOutstanding ? 'text-amber-700 dark:text-amber-400' : 'text-muted-foreground'
            }`}
          >
            Current Balance Due
          </span>
          <div
            className={`text-2xl font-bold mt-1 ${
              hasOutstanding ? 'text-amber-700 dark:text-amber-300' : 'text-foreground'
            }`}
          >
            ${summary.totalOutstanding}
          </div>
          <span className="text-[10px] text-muted-foreground">Pending payment</span>
        </div>
      </div>

      {/* Outstanding Alert */}
      {hasOutstanding && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
          <div>
            <div className="font-semibold text-sm">Tuition Payment Pending for {activeWard.name}</div>
            <div>
              An outstanding balance of <strong>${summary.totalOutstanding}</strong> remains unpaid. Please remit payment via bank transfer, school counter, or cashier.
            </div>
          </div>
        </div>
      )}

      {/* Invoices List */}
      <div className="rounded-xl border border-border/80 bg-card overflow-hidden shadow-sm">
        <div className="p-4 border-b border-border/60 flex items-center justify-between">
          <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
            <Receipt className="h-4 w-4 text-primary" />
            <span>Invoices for {activeWard.name}</span>
          </h3>
          <span className="text-xs text-muted-foreground">{invoices.length} invoices</span>
        </div>

        {isLoading ? (
          <div className="p-8 space-y-3">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : invoices.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="No Invoices"
            description="No fee invoices recorded for this student."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead>Invoice #</TableHead>
                <TableHead>Fee Period</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Discount</TableHead>
                <TableHead className="text-right">Paid</TableHead>
                <TableHead className="text-right font-bold">Balance</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((inv) => (
                <TableRow key={inv._id}>
                  <TableCell className="font-mono text-xs font-semibold text-primary">{inv.invoiceNumber}</TableCell>
                  <TableCell className="text-xs">{inv.feePeriod}</TableCell>
                  <TableCell className="text-right text-xs">${inv.totalAmount}</TableCell>
                  <TableCell className="text-right text-xs text-emerald-600">-${inv.discountAmount}</TableCell>
                  <TableCell className="text-right text-xs text-emerald-600 font-medium">${inv.paidAmount}</TableCell>
                  <TableCell className="text-right text-xs font-bold text-foreground">${inv.balanceAmount}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(inv.dueDate).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={`text-[10px] capitalize ${
                        inv.status === 'paid'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                          : inv.status === 'overdue' || inv.isOverdue
                          ? 'bg-rose-50 text-rose-700 border-rose-300'
                          : 'bg-amber-50 text-amber-700 border-amber-300'
                      }`}
                    >
                      {inv.isOverdue && inv.status !== 'paid' ? 'Overdue' : inv.status.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <button
                      type="button"
                      onClick={() => setViewInvoice(inv)}
                      className="text-xs text-primary hover:underline cursor-pointer font-medium"
                    >
                      View
                    </button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Receipts Table */}
      <div className="rounded-xl border border-border/80 bg-card overflow-hidden shadow-sm">
        <div className="p-4 border-b border-border/60 flex items-center justify-between">
          <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-emerald-600" />
            <span>Payment Receipts</span>
          </h3>
          <span className="text-xs text-muted-foreground">{payments.length} receipts</span>
        </div>

        {payments.length === 0 ? (
          <div className="p-6 text-center text-xs text-muted-foreground bg-muted/10">
            No receipts recorded yet.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead>Receipt #</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Payment Method</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((p) => (
                <TableRow key={p._id}>
                  <TableCell className="font-mono text-xs font-semibold text-primary">{p.paymentNumber}</TableCell>
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
                    <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Paid
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Invoice Breakdown Modal */}
      <Dialog
        isOpen={!!viewInvoice}
        onClose={() => setViewInvoice(null)}
        title={`Invoice Breakdown #${viewInvoice?.invoiceNumber}`}
        description={`For ${activeWard.name} | Period: ${viewInvoice?.feePeriod}`}
        footer={
          <Button variant="default" size="sm" onClick={() => setViewInvoice(null)}>
            Close
          </Button>
        }
      >
        {viewInvoice && (
          <div className="space-y-4 py-2 text-xs">
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead>Fee Component</TableHead>
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
                    <TableCell>Outstanding Balance</TableCell>
                    <TableCell className="text-right text-primary">${viewInvoice.balanceAmount}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
};
