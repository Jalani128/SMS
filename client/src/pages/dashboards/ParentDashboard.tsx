import React, { useState } from 'react';
import { PageHeader } from '../../components/shared/PageHeader';
import { StatCard } from '../../components/shared/StatCard';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table';
import {
  CalendarCheck,
  CreditCard,
  Award,
  Calendar,
  MessageSquare,
  Sparkles,
} from 'lucide-react';

export const ParentDashboard: React.FC = () => {
  const [selectedWard, setSelectedWard] = useState('Liam Chen (Grade 10-A)');

  const feeInvoices = [
    { invoice: 'INV-2026-0881', term: 'Term 1 Tuition & Lab Fees', amount: '$1,250.00', status: 'Paid', date: 'Oct 02, 2026' },
    { invoice: 'INV-2026-0940', term: 'Annual Sports & Activity Fee', amount: '$180.00', status: 'Paid', date: 'Sep 15, 2026' },
    { invoice: 'INV-2026-1102', term: 'Term 2 Tuition Installment', amount: '$1,250.00', status: 'Upcoming', date: 'Due Jan 15, 2027' },
  ];

  return (
    <div className="space-y-6">
      <div className="p-4 rounded-xl border border-purple-200 dark:border-purple-900 bg-purple-50/70 dark:bg-purple-950/30 text-purple-950 dark:text-purple-200 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-600 text-white shrink-0">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <span className="font-bold text-xs uppercase tracking-wider text-purple-800 dark:text-purple-300">
              Parent Guardian Portal
            </span>
            <p className="text-xs text-purple-900/80 dark:text-purple-300/80 mt-0.5">
              Monitor academic attendance, fee balances, teacher remarks, and school notices.
            </p>
          </div>
        </div>
        <Badge variant="secondary">Parent: Sarah Chen</Badge>
      </div>

      <PageHeader
        title="Guardian Oversight Dashboard"
        description="Comprehensive progress tracker for your registered wards at Greenwood International"
        badge={
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{selectedWard}</Badge>
          </div>
        }
        actions={
          <div className="flex items-center gap-2">
            <select
              value={selectedWard}
              onChange={(e) => setSelectedWard(e.target.value)}
              className="h-8 rounded-lg border border-input bg-card px-2.5 text-xs text-foreground focus:outline-none"
            >
              <option value="Liam Chen (Grade 10-A)">Ward: Liam Chen (Grade 10-A)</option>
              <option value="Maya Chen (Grade 6-B)">Ward: Maya Chen (Grade 6-B)</option>
            </select>
            <Button variant="default" size="sm" className="gap-1.5 text-xs">
              <MessageSquare className="h-3.5 w-3.5" />
              Contact Teacher
            </Button>
          </div>
        }
      />

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Ward Attendance"
          value="96.0%"
          change="Regular"
          isPositive={true}
          description="172 / 180 Days Present"
          customIcon={CalendarCheck}
        />
        <StatCard
          title="Academic Standing"
          value="GPA 3.82"
          change="Grade A"
          isPositive={true}
          description="High Honors Certificate"
          customIcon={Award}
        />
        <StatCard
          title="Tuition Balance"
          value="$0.00 Due"
          change="Cleared"
          isPositive={true}
          description="Term 1 fully settled"
          customIcon={CreditCard}
        />
        <StatCard
          title="Parent-Teacher Meeting"
          value="Oct 24"
          description="Friday 4:30 PM - Room 204"
          customIcon={Calendar}
        />
      </div>

      {/* Guardian Overview & Remarks */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Faculty Remarks & Progress Observations</CardTitle>
            <CardDescription className="text-xs">Direct feedback from subject teachers for Liam</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-3.5 rounded-lg border bg-muted/20 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs">Prof. Clara Oswald — AP Physics</span>
                  <Badge variant="success" className="text-[10px]">Academic Commendation</Badge>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  "Liam demonstrates keen analytical aptitude during experimental laboratory work. Consistently leads his peer group in problem analysis."
                </p>
                <span className="text-[10px] text-muted-foreground">Logged on Oct 14, 2026</span>
              </div>

              <div className="p-3.5 rounded-lg border bg-muted/20 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs">Dr. Arthur Vance — Mathematics</span>
                  <Badge variant="info" className="text-[10px]">General Remark</Badge>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  "Exemplary assignment turnaround. Recommended to prepare for the upcoming regional Math Olympiad in November."
                </p>
                <span className="text-[10px] text-muted-foreground">Logged on Oct 11, 2026</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Next PTA Event Card */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Next Campus Event</CardTitle>
            <CardDescription className="text-xs">Parent-Teacher Conference</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3 p-3 rounded-lg border bg-primary/5">
              <Calendar className="h-8 w-8 text-primary shrink-0" />
              <div>
                <p className="font-semibold text-xs">Term 1 Evaluation</p>
                <p className="text-xs text-muted-foreground">Friday, Oct 24, 2026</p>
                <p className="text-xs text-muted-foreground">04:30 PM - 06:00 PM</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Appointment slot confirmed with homeroom mentor. Meeting venue: Main Campus Room 204.
            </p>
            <Button variant="outline" size="sm" className="w-full text-xs">
              Add to Calendar
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Tuition & Invoices Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Tuition Invoices & Payment Receipts</CardTitle>
          <CardDescription className="text-xs">Financial ledger for academic year 2026-2027</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>Description / Term</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Date / Due</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {feeInvoices.map((inv) => (
                <TableRow key={inv.invoice}>
                  <TableCell className="font-mono text-xs">{inv.invoice}</TableCell>
                  <TableCell className="font-medium">{inv.term}</TableCell>
                  <TableCell className="font-semibold">{inv.amount}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{inv.date}</TableCell>
                  <TableCell>
                    <Badge variant={inv.status === 'Paid' ? 'success' : 'neutral'}>
                      {inv.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
