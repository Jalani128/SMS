import React, { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '../../components/shared/PageHeader';
import { Badge } from '../../components/ui/Badge';
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
import { useAuth } from '../../hooks/useAuth';
import { attendanceService } from '../../services/attendance.service';
import { StudentAttendanceHistoryResponse } from '../../types/attendance';
import {
  CalendarCheck,
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
  Calendar,
  AlertCircle,
} from 'lucide-react';

export const StudentAttendancePage: React.FC = () => {
  const { user } = useAuth();
  const [data, setData] = useState<StudentAttendanceHistoryResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Student ID derived from authenticated user
  const studentId = user?.id || 'stu-101';

  const loadHistory = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await attendanceService.getStudentAttendance(studentId);
      setData(res);
    } catch (err) {
      console.warn('Failed to load student attendance history:', err);
    } finally {
      setIsLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const stats = data?.stats;
  const pct = stats?.attendancePercentage ?? 0;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'present':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
            <CheckCircle2 className="h-3 w-3" />
            Present
          </span>
        );
      case 'absent':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300">
            <XCircle className="h-3 w-3" />
            Absent
          </span>
        );
      case 'late':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
            <Clock className="h-3 w-3" />
            Late
          </span>
        );
      case 'leave':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-100 text-sky-800 dark:bg-sky-950/50 dark:text-sky-300">
            <FileText className="h-3 w-3" />
            Leave
          </span>
        );
      default:
        return <span className="text-xs text-muted-foreground">--</span>;
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="My Attendance Record"
        description="Verify your daily classroom roll call, attendance rate, and excused absence history."
        badge={
          <Badge
            variant="outline"
            className={`text-xs gap-1 font-semibold ${
              pct >= 75
                ? 'border-emerald-500/30 text-emerald-700 bg-emerald-500/10'
                : pct >= 65
                ? 'border-amber-500/30 text-amber-700 bg-amber-500/10'
                : 'border-rose-500/30 text-rose-700 bg-rose-500/10'
            }`}
          >
            <span>Overall: {pct}%</span>
            <span>{pct >= 75 ? '• Good Standing' : '• Action Required'}</span>
          </Badge>
        }
      />

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="rounded-xl border border-border/80 bg-card p-4 shadow-sm">
          <span className="text-xs font-semibold text-muted-foreground uppercase">Total Days</span>
          <div className="text-2xl font-bold mt-1 text-foreground">
            {stats?.totalRecordedDays ?? 0}
          </div>
          <span className="text-[10px] text-muted-foreground">Instructional days</span>
        </div>

        <div className="rounded-xl border border-emerald-500/20 bg-emerald-50/40 dark:bg-emerald-950/20 p-4 shadow-sm">
          <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase">Present</span>
          <div className="text-2xl font-bold mt-1 text-emerald-700 dark:text-emerald-300">
            {stats?.presentCount ?? 0}
          </div>
          <span className="text-[10px] text-emerald-600/80">Attended sessions</span>
        </div>

        <div className="rounded-xl border border-rose-500/20 bg-rose-50/40 dark:bg-rose-950/20 p-4 shadow-sm">
          <span className="text-xs font-semibold text-rose-700 dark:text-rose-400 uppercase">Absent</span>
          <div className="text-2xl font-bold mt-1 text-rose-700 dark:text-rose-300">
            {stats?.absentCount ?? 0}
          </div>
          <span className="text-[10px] text-rose-600/80">Missed days</span>
        </div>

        <div className="rounded-xl border border-amber-500/20 bg-amber-50/40 dark:bg-amber-950/20 p-4 shadow-sm">
          <span className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase">Late</span>
          <div className="text-2xl font-bold mt-1 text-amber-700 dark:text-amber-300">
            {stats?.lateCount ?? 0}
          </div>
          <span className="text-[10px] text-amber-600/80">Tardy arrivals</span>
        </div>

        <div className="rounded-xl border border-sky-500/20 bg-sky-50/40 dark:bg-sky-950/20 p-4 shadow-sm">
          <span className="text-xs font-semibold text-sky-700 dark:text-sky-400 uppercase">Leave</span>
          <div className="text-2xl font-bold mt-1 text-sky-700 dark:text-sky-300">
            {stats?.leaveCount ?? 0}
          </div>
          <span className="text-[10px] text-sky-600/80">Excused leaves</span>
        </div>
      </div>

      {/* Compliance Notice */}
      {pct < 75 && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
          <div>
            <div className="font-semibold text-sm">Attendance Notice</div>
            <div>
              Your current attendance rate is <strong>{pct}%</strong>, which is below the school's minimum required benchmark of <strong>75%</strong>. Please consult with your class mentor.
            </div>
          </div>
        </div>
      )}

      {/* Attendance Log Table */}
      <div className="rounded-xl border border-border/80 bg-card overflow-hidden shadow-sm">
        <div className="p-4 border-b border-border/60 flex items-center justify-between">
          <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            <span>Attendance History Log</span>
          </h3>
          <span className="text-xs text-muted-foreground">Recent sessions</span>
        </div>

        {isLoading ? (
          <div className="p-8 space-y-3">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : !data || data.records.length === 0 ? (
          <EmptyState
            icon={CalendarCheck}
            title="No Attendance Records"
            description="No roll call entries found for your account."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Remarks</TableHead>
                <TableHead className="text-right">Recorded At</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.records.map((rec) => (
                <TableRow key={rec._id}>
                  <TableCell className="font-medium text-xs">
                    {rec.attendanceDate || (rec.date ? rec.date.split('T')[0] : '--')}
                  </TableCell>
                  <TableCell>{getStatusBadge(rec.status)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {rec.remarks || '—'}
                  </TableCell>
                  <TableCell className="text-right font-mono text-[11px] text-muted-foreground">
                    {new Date(rec.createdAt).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
};
