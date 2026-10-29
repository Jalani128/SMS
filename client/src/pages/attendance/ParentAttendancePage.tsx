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
import { attendanceService } from '../../services/attendance.service';
import { StudentAttendanceHistoryResponse } from '../../types/attendance';
import {
  CalendarCheck,
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
  User,
  ShieldAlert,
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

export const ParentAttendancePage: React.FC = () => {
  const [selectedWardId, setSelectedWardId] = useState<string>(SAMPLE_WARDS[0].id);
  const [data, setData] = useState<StudentAttendanceHistoryResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const activeWard = SAMPLE_WARDS.find((w) => w.id === selectedWardId) || SAMPLE_WARDS[0];

  const loadWardAttendance = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await attendanceService.getStudentAttendance(selectedWardId);
      setData(res);
    } catch (err) {
      console.warn('Failed to load ward attendance history:', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedWardId]);

  useEffect(() => {
    loadWardAttendance();
  }, [loadWardAttendance]);

  const stats = data?.stats;
  const pct = stats?.attendancePercentage ?? 0;

  // Check if today's record is absent or late
  const todayStr = new Date().toISOString().split('T')[0];
  const todayRecord = data?.records.find(
    (r) => r.attendanceDate === todayStr || (r.date && r.date.startsWith(todayStr))
  );
  const isAbsentToday = todayRecord?.status === 'absent';
  const isLateToday = todayRecord?.status === 'late';

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
            Excused Leave
          </span>
        );
      default:
        return <span className="text-xs text-muted-foreground">--</span>;
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Ward Attendance Monitoring"
        description="Daily classroom roll call, attendance rate, and real-time absence alerts for your enrolled children."
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

        <div className="flex items-center gap-2">
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
            <span>{activeWard.name}'s Rate: {pct}%</span>
          </Badge>
        </div>
      </div>

      {/* Today's Alert Banner if Absent or Late */}
      {isAbsentToday && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 dark:bg-rose-950/40 dark:border-rose-800 text-rose-900 dark:text-rose-200 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <ShieldAlert className="h-6 w-6 text-rose-600 shrink-0" />
            <div>
              <div className="font-semibold text-sm">Absence Notification for Today</div>
              <div>
                <strong>{activeWard.name}</strong> was marked <strong>Absent</strong> during today's roll call. If this is an excused illness or emergency, please submit a note or contact the school office.
              </div>
            </div>
          </div>
        </div>
      )}

      {isLateToday && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 dark:bg-amber-950/40 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs flex items-center gap-3">
          <Clock className="h-6 w-6 text-amber-600 shrink-0" />
          <div>
            <div className="font-semibold text-sm">Late Arrival Notification</div>
            <div>
              <strong>{activeWard.name}</strong> was marked <strong>Late</strong> during morning roll call. Remarks: {todayRecord?.remarks || 'Arrived after bell'}.
            </div>
          </div>
        </div>
      )}

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="rounded-xl border border-border/80 bg-card p-4 shadow-sm">
          <span className="text-xs font-semibold text-muted-foreground uppercase">Instructional Days</span>
          <div className="text-2xl font-bold mt-1 text-foreground">
            {stats?.totalRecordedDays ?? 0}
          </div>
        </div>
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-50/40 dark:bg-emerald-950/20 p-4 shadow-sm">
          <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase">Present</span>
          <div className="text-2xl font-bold mt-1 text-emerald-700 dark:text-emerald-300">
            {stats?.presentCount ?? 0}
          </div>
        </div>
        <div className="rounded-xl border border-rose-500/20 bg-rose-50/40 dark:bg-rose-950/20 p-4 shadow-sm">
          <span className="text-xs font-semibold text-rose-700 dark:text-rose-400 uppercase">Absent</span>
          <div className="text-2xl font-bold mt-1 text-rose-700 dark:text-rose-300">
            {stats?.absentCount ?? 0}
          </div>
        </div>
        <div className="rounded-xl border border-amber-500/20 bg-amber-50/40 dark:bg-amber-950/20 p-4 shadow-sm">
          <span className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase">Late</span>
          <div className="text-2xl font-bold mt-1 text-amber-700 dark:text-amber-300">
            {stats?.lateCount ?? 0}
          </div>
        </div>
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 shadow-sm">
          <span className="text-xs font-semibold text-primary uppercase">Attendance Rate</span>
          <div className="text-2xl font-bold mt-1 text-primary">{pct}%</div>
        </div>
      </div>

      {/* History Log */}
      <div className="rounded-xl border border-border/80 bg-card overflow-hidden shadow-sm">
        <div className="p-4 border-b border-border/60 flex items-center justify-between">
          <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
            <CalendarCheck className="h-4 w-4 text-primary" />
            <span>Attendance Log for {activeWard.name}</span>
          </h3>
          <span className="text-xs text-muted-foreground">{activeWard.grade}</span>
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
            description="No roll call logs available for this student."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Remarks</TableHead>
                <TableHead className="text-right">Logged</TableHead>
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
