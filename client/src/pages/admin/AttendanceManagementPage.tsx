import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { PageHeader } from '../../components/shared/PageHeader';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/Tabs';
import { ConfirmationDialog } from '../../components/admin/management/ConfirmationDialog';
import { academicService } from '../../services/academic.service';
import { attendanceService } from '../../services/attendance.service';
import { ClassRecord, SectionRecord, AcademicSessionRecord } from '../../types/academic';
import {
  DailyAttendanceRosterItem,
  AttendanceStatus,
  ClassSummaryResponse,
  MonthlyReportResponse,
} from '../../types/attendance';
import {
  CalendarCheck,
  CheckCircle2,
  XCircle,
  FileText,
  AlertTriangle,
  Download,
  RotateCw,
  Search,
  Filter,
  Save,
  ShieldAlert,
  Info,
  Check,
} from 'lucide-react';

export const AttendanceManagementPage: React.FC = () => {
  // Academic Context
  const [sessions, setSessions] = useState<AcademicSessionRecord[]>([]);
  const [classes, setClasses] = useState<ClassRecord[]>([]);
  const [sections, setSections] = useState<SectionRecord[]>([]);

  // Selection Filters
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedSectionId, setSelectedSectionId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  // Daily Roster State
  const [roster, setRoster] = useState<DailyAttendanceRosterItem[]>([]);
  const [isMarkedInitially, setIsMarkedInitially] = useState<boolean>(false);
  const [isRosterLoading, setIsRosterLoading] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{
    type: 'success' | 'error' | 'warning';
    text: string;
  } | null>(null);

  // Search in roster
  const [searchRoster, setSearchRoster] = useState('');

  // Overwrite Confirmation
  const [showOverwriteConfirm, setShowOverwriteConfirm] = useState(false);

  // Correction Dialog for single record
  const [correctionTarget, setCorrectionTarget] = useState<DailyAttendanceRosterItem | null>(null);
  const [correctionStatus, setCorrectionStatus] = useState<AttendanceStatus>('present');
  const [correctionRemarks, setCorrectionRemarks] = useState('');
  const [correctionReason, setCorrectionReason] = useState('');
  const [isCorrectionSubmitting, setIsCorrectionSubmitting] = useState(false);

  // Analytics & Summary State
  const [summaryData, setSummaryData] = useState<ClassSummaryResponse | null>(null);
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);
  const [summaryStartDate, setSummaryStartDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split('T')[0];
  });
  const [summaryEndDate, setSummaryEndDate] = useState(
    new Date().toISOString().split('T')[0]
  );

  // Monthly Report State
  const [monthlyReport, setMonthlyReport] = useState<MonthlyReportResponse | null>(null);
  const [isMonthlyLoading, setIsMonthlyLoading] = useState(false);
  const [reportMonth, setReportMonth] = useState<number>(new Date().getMonth() + 1);
  const [reportYear, setReportYear] = useState<number>(new Date().getFullYear());
  const [isExportingCsv, setIsExportingCsv] = useState(false);

  // Active Tab
  const [activeTab, setActiveTab] = useState<'roster' | 'analytics' | 'reports'>('roster');

  // Initial Academic Data Load
  useEffect(() => {
    let isMounted = true;
    Promise.all([
      academicService.getSessions(),
      academicService.getClasses(),
      academicService.getSections(),
    ])
      .then(([sess, cls, sec]) => {
        if (!isMounted) return;
        setSessions(sess);
        setClasses(cls);
        setSections(sec);

        // Set defaults
        const currentSess = sess.find((s) => s.isCurrent) || sess[0];
        if (currentSess) setSelectedSessionId(currentSess._id);

        if (cls.length > 0) setSelectedClassId(cls[0]._id);
      })
      .catch((err) => {
        console.error('Failed to load academic data for attendance:', err);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // Filter sections by selected class
  const filteredSections = useMemo(() => {
    if (!selectedClassId) return sections;
    return sections.filter((s) => {
      const cId = typeof s.classId === 'string' ? s.classId : s.classId?._id;
      return cId === selectedClassId;
    });
  }, [sections, selectedClassId]);

  // Update selectedSectionId when filteredSections change
  useEffect(() => {
    if (filteredSections.length > 0) {
      if (!filteredSections.some((s) => s._id === selectedSectionId)) {
        setSelectedSectionId(filteredSections[0]._id);
      }
    } else {
      setSelectedSectionId('');
    }
  }, [filteredSections, selectedSectionId]);

  // Fetch Daily Roster
  const fetchRoster = useCallback(async () => {
    if (!selectedClassId || !selectedSectionId || !selectedDate) return;
    try {
      setIsRosterLoading(true);
      setFeedbackMessage(null);
      const res = await attendanceService.getDailyAttendance({
        academicSessionId: selectedSessionId,
        classId: selectedClassId,
        sectionId: selectedSectionId,
        date: selectedDate,
      });

      setRoster(res.roster || []);
      setIsMarkedInitially(res.isMarked);
      setHasUnsavedChanges(false);
    } catch (err: any) {
      setFeedbackMessage({
        type: 'error',
        text: err.message || 'Failed to load attendance roster',
      });
    } finally {
      setIsRosterLoading(false);
    }
  }, [selectedSessionId, selectedClassId, selectedSectionId, selectedDate]);

  useEffect(() => {
    fetchRoster();
  }, [fetchRoster]);

  // Fetch Summary Analytics
  const fetchSummary = useCallback(async () => {
    if (!selectedClassId || !selectedSectionId) return;
    try {
      setIsSummaryLoading(true);
      const data = await attendanceService.getClassSummary({
        classId: selectedClassId,
        sectionId: selectedSectionId,
        startDate: summaryStartDate,
        endDate: summaryEndDate,
      });
      setSummaryData(data);
    } catch (err) {
      console.warn('Class summary load warning:', err);
    } finally {
      setIsSummaryLoading(false);
    }
  }, [selectedClassId, selectedSectionId, summaryStartDate, summaryEndDate]);

  useEffect(() => {
    if (activeTab === 'analytics') {
      fetchSummary();
    }
  }, [activeTab, fetchSummary]);

  // Fetch Monthly Report
  const fetchMonthly = useCallback(async () => {
    if (!selectedClassId || !selectedSectionId) return;
    try {
      setIsMonthlyLoading(true);
      const data = await attendanceService.getMonthlyReport({
        classId: selectedClassId,
        sectionId: selectedSectionId,
        month: reportMonth,
        year: reportYear,
      });
      setMonthlyReport(data);
    } catch (err) {
      console.warn('Monthly report load warning:', err);
    } finally {
      setIsMonthlyLoading(false);
    }
  }, [selectedClassId, selectedSectionId, reportMonth, reportYear]);

  useEffect(() => {
    if (activeTab === 'reports') {
      fetchMonthly();
    }
  }, [activeTab, fetchMonthly]);

  // Status updates for individual student in daily roster
  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    setRoster((prev) =>
      prev.map((item) =>
        item.studentId === studentId
          ? { ...item, status: item.status === status ? null : status }
          : item
      )
    );
    setHasUnsavedChanges(true);
  };

  const handleRemarkChange = (studentId: string, remarks: string) => {
    setRoster((prev) =>
      prev.map((item) => (item.studentId === studentId ? { ...item, remarks } : item))
    );
    setHasUnsavedChanges(true);
  };

  // Quick Action: Mark All Present
  const handleMarkAll = (status: AttendanceStatus | null) => {
    setRoster((prev) => prev.map((item) => ({ ...item, status })));
    setHasUnsavedChanges(true);
  };

  // Save Bulk Attendance
  const executeSaveAttendance = async () => {
    if (!selectedClassId || !selectedSectionId || !selectedDate) return;
    try {
      setIsSaving(true);
      setFeedbackMessage(null);

      // Validate all students marked
      const unmarkedCount = roster.filter((r) => !r.status).length;
      if (unmarkedCount > 0) {
        setFeedbackMessage({
          type: 'warning',
          text: `Note: ${unmarkedCount} student(s) currently have no status selected and will be skipped.`,
        });
      }

      const recordsToSubmit = roster
        .filter((r) => r.status !== null)
        .map((r) => ({
          studentId: r.studentId,
          status: r.status as AttendanceStatus,
          remarks: r.remarks || undefined,
        }));

      const res = await attendanceService.submitBulkAttendance({
        academicSessionId: selectedSessionId,
        classId: selectedClassId,
        sectionId: selectedSectionId,
        date: selectedDate,
        records: recordsToSubmit,
      });

      setHasUnsavedChanges(false);
      setIsMarkedInitially(true);
      setFeedbackMessage({
        type: 'success',
        text: `Attendance saved successfully for ${res.processed} student(s).`,
      });
      fetchRoster();
    } catch (err: any) {
      setFeedbackMessage({
        type: 'error',
        text: err.message || 'Failed to submit attendance roll',
      });
    } finally {
      setIsSaving(false);
      setShowOverwriteConfirm(false);
    }
  };

  const handleSaveClick = () => {
    if (isMarkedInitially) {
      setShowOverwriteConfirm(true);
    } else {
      executeSaveAttendance();
    }
  };

  // Submit single record correction
  const handleCorrectionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!correctionTarget || !correctionTarget.attendanceRecordId || !correctionReason.trim()) return;
    try {
      setIsCorrectionSubmitting(true);
      await attendanceService.updateAttendanceRecord(correctionTarget.attendanceRecordId, {
        status: correctionStatus,
        remarks: correctionRemarks,
        reason: correctionReason.trim(),
      });
      setCorrectionTarget(null);
      setFeedbackMessage({
        type: 'success',
        text: `Attendance record updated with audit log for ${correctionTarget.name}.`,
      });
      fetchRoster();
    } catch (err: any) {
      setFeedbackMessage({
        type: 'error',
        text: err.message || 'Failed to correct record',
      });
    } finally {
      setIsCorrectionSubmitting(false);
    }
  };

  // Export CSV handler
  const handleExportCsv = async () => {
    if (!selectedClassId || !selectedSectionId) return;
    try {
      setIsExportingCsv(true);
      await attendanceService.exportCsv({
        classId: selectedClassId,
        sectionId: selectedSectionId,
        month: reportMonth,
        year: reportYear,
      });
    } catch (err: any) {
      setFeedbackMessage({
        type: 'error',
        text: err.message || 'Failed to export CSV report',
      });
    } finally {
      setIsExportingCsv(false);
    }
  };

  // Computed live statistics for roster
  const stats = useMemo(() => {
    const total = roster.length;
    const present = roster.filter((r) => r.status === 'present').length;
    const absent = roster.filter((r) => r.status === 'absent').length;
    const late = roster.filter((r) => r.status === 'late').length;
    const leave = roster.filter((r) => r.status === 'leave').length;
    const marked = present + absent + late + leave;
    const percentage = marked > 0 ? Math.round(((present + late) / marked) * 1000) / 10 : 0;
    return { total, present, absent, late, leave, marked, percentage };
  }, [roster]);

  // Filtered roster for search
  const displayedRoster = useMemo(() => {
    if (!searchRoster.trim()) return roster;
    const q = searchRoster.toLowerCase();
    return roster.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.admissionNumber.toLowerCase().includes(q) ||
        r.rollNumber.toLowerCase().includes(q)
    );
  }, [roster, searchRoster]);

  const isFutureDate = selectedDate > new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <PageHeader
        title="Attendance Management"
        description="Daily student roll call, section aggregates, audit corrections, and monthly compliance exports."
        badge={
          <Badge variant="outline" className="gap-1 border-primary/20 bg-primary/5 text-primary text-xs">
            <CalendarCheck className="h-3 w-3" />
            <span>Phase 7 Daily Operations</span>
          </Badge>
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchRoster}
              disabled={isRosterLoading}
              className="gap-1.5 text-xs"
            >
              <RotateCw className={`h-3.5 w-3.5 ${isRosterLoading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCsv}
              disabled={isExportingCsv || !selectedSectionId}
              className="gap-1.5 text-xs"
            >
              <Download className={`h-3.5 w-3.5 ${isExportingCsv ? 'animate-spin' : ''}`} />
              <span>Export CSV</span>
            </Button>
          </div>
        }
      />

      {/* Global Notification Banner */}
      {feedbackMessage && (
        <div
          className={`p-3.5 rounded-lg border text-sm flex items-center justify-between gap-3 ${
            feedbackMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
              : feedbackMessage.type === 'warning'
              ? 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
              : 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedbackMessage.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            ) : feedbackMessage.type === 'warning' ? (
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
            ) : (
              <XCircle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
            )}
            <span>{feedbackMessage.text}</span>
          </div>
          <button
            onClick={() => setFeedbackMessage(null)}
            className="text-xs font-semibold opacity-70 hover:opacity-100"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Unsaved Changes Alert Bar */}
      {hasUnsavedChanges && (
        <div className="sticky top-16 z-20 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg backdrop-blur-md flex items-center justify-between gap-3 text-amber-800 dark:text-amber-300 text-xs font-medium">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <span>You have unsaved attendance marks for this section. Please save changes before navigating away.</span>
          </div>
          <Button
            size="sm"
            onClick={handleSaveClick}
            disabled={isSaving}
            className="h-7 text-xs bg-amber-600 hover:bg-amber-700 text-white gap-1"
          >
            <Save className="h-3 w-3" />
            <span>Save Now</span>
          </Button>
        </div>
      )}

      {/* Top Filter Bar */}
      <div className="rounded-xl border border-border/80 bg-card p-4 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
          {/* Academic Session */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Academic Session
            </label>
            <select
              value={selectedSessionId}
              onChange={(e) => setSelectedSessionId(e.target.value)}
              className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              {sessions.map((sess) => (
                <option key={sess._id} value={sess._id}>
                  {sess.name} {sess.isCurrent ? '★ (Active)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Class Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Class Grade
            </label>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              {classes.map((cls) => (
                <option key={cls._id} value={cls._id}>
                  {cls.name} ({cls.code})
                </option>
              ))}
            </select>
          </div>

          {/* Section Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Section
            </label>
            <select
              value={selectedSectionId}
              onChange={(e) => setSelectedSectionId(e.target.value)}
              disabled={filteredSections.length === 0}
              className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
            >
              {filteredSections.map((sec) => (
                <option key={sec._id} value={sec._id}>
                  {sec.name} {sec.roomNumber ? `(${sec.roomNumber})` : ''}
                </option>
              ))}
              {filteredSections.length === 0 && <option value="">No sections configured</option>}
            </select>
          </div>

          {/* Date Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Roll Call Date
            </label>
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="h-9 text-xs"
            />
          </div>
        </div>

        {/* Future Date Warning */}
        {isFutureDate && (
          <div className="mt-3 p-2.5 rounded-lg bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800 flex items-center gap-2 text-xs">
            <ShieldAlert className="h-4 w-4 shrink-0" />
            <span>Future date selected ({selectedDate}). Attendance cannot be recorded for dates ahead of current calendar day.</span>
          </div>
        )}
      </div>

      {/* Main Tabs Navigation */}
      <Tabs
        defaultValue="roster"
        value={activeTab}
        onValueChange={(val) => setActiveTab(val as any)}
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-border/80 pb-3">
          <TabsList className="bg-muted/80">
            <TabsTrigger value="roster" className="gap-1.5 text-xs">
              <CalendarCheck className="h-3.5 w-3.5" />
              <span>Daily Roll Call</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-1.5 text-xs">
              <FileText className="h-3.5 w-3.5" />
              <span>Class Analytics</span>
            </TabsTrigger>
            <TabsTrigger value="reports" className="gap-1.5 text-xs">
              <Download className="h-3.5 w-3.5" />
              <span>Monthly Register</span>
            </TabsTrigger>
          </TabsList>

          {activeTab === 'roster' && (
            <div className="flex items-center gap-2">
              {isMarkedInitially ? (
                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs gap-1">
                  <Check className="h-3 w-3" />
                  <span>Already Recorded</span>
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-xs gap-1">
                  <Info className="h-3 w-3" />
                  <span>Unrecorded Sheet</span>
                </Badge>
              )}
              <Button
                size="sm"
                onClick={handleSaveClick}
                disabled={isSaving || isFutureDate || roster.length === 0}
                className="gap-1.5 text-xs"
              >
                <Save className="h-3.5 w-3.5" />
                <span>{isSaving ? 'Saving...' : isMarkedInitially ? 'Update Roll Call' : 'Save Roll Call'}</span>
              </Button>
            </div>
          )}
        </div>

        {/* TAB 1: DAILY ROSTER */}
        <TabsContent value="roster" className="space-y-4 pt-4">
          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="rounded-lg border border-border/60 bg-card p-3 shadow-sm">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase">Roster Total</span>
              <div className="text-xl font-bold mt-1 text-foreground">{stats.total}</div>
              <span className="text-[10px] text-muted-foreground">Enrolled students</span>
            </div>

            <div className="rounded-lg border border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-950/20 p-3 shadow-sm">
              <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 uppercase">Present</span>
              <div className="text-xl font-bold mt-1 text-emerald-700 dark:text-emerald-300">{stats.present}</div>
              <span className="text-[10px] text-emerald-600/80">In classroom</span>
            </div>

            <div className="rounded-lg border border-rose-500/20 bg-rose-50/50 dark:bg-rose-950/20 p-3 shadow-sm">
              <span className="text-[11px] font-semibold text-rose-700 dark:text-rose-400 uppercase">Absent</span>
              <div className="text-xl font-bold mt-1 text-rose-700 dark:text-rose-300">{stats.absent}</div>
              <span className="text-[10px] text-rose-600/80">Unexcused</span>
            </div>

            <div className="rounded-lg border border-amber-500/20 bg-amber-50/50 dark:bg-amber-950/20 p-3 shadow-sm">
              <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 uppercase">Late</span>
              <div className="text-xl font-bold mt-1 text-amber-700 dark:text-amber-300">{stats.late}</div>
              <span className="text-[10px] text-amber-600/80">Tardy arrival</span>
            </div>

            <div className="rounded-lg border border-sky-500/20 bg-sky-50/50 dark:bg-sky-950/20 p-3 shadow-sm">
              <span className="text-[11px] font-semibold text-sky-700 dark:text-sky-400 uppercase">Leave</span>
              <div className="text-xl font-bold mt-1 text-sky-700 dark:text-sky-300">{stats.leave}</div>
              <span className="text-[10px] text-sky-600/80">Excused leave</span>
            </div>

            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 shadow-sm">
              <span className="text-[11px] font-semibold text-primary uppercase">Attendance Rate</span>
              <div className="text-xl font-bold mt-1 text-primary">{stats.percentage}%</div>
              <span className="text-[10px] text-muted-foreground">(P + L) / Total marked</span>
            </div>
          </div>

          {/* Table Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-muted/30 p-3 rounded-lg border border-border/60">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search by name, roll, or admission #..."
                value={searchRoster}
                onChange={(e) => setSearchRoster(e.target.value)}
                className="pl-8 h-8 text-xs bg-background"
              />
            </div>

            {/* Batch Status Buttons */}
            <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto justify-end">
              <span className="text-xs text-muted-foreground mr-1 hidden sm:inline">Quick Marks:</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleMarkAll('present')}
                disabled={isFutureDate || roster.length === 0}
                className="h-7 text-xs border-emerald-500/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
              >
                Mark All Present
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleMarkAll('absent')}
                disabled={isFutureDate || roster.length === 0}
                className="h-7 text-xs border-rose-500/40 text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40"
              >
                Mark All Absent
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleMarkAll(null)}
                disabled={isFutureDate || roster.length === 0}
                className="h-7 text-xs text-muted-foreground hover:text-foreground"
              >
                Clear All
              </Button>
            </div>
          </div>

          {/* Roster Table */}
          <div className="rounded-xl border border-border/80 bg-card overflow-hidden shadow-sm">
            {isRosterLoading ? (
              <div className="p-8 space-y-4">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : displayedRoster.length === 0 ? (
              <EmptyState
                icon={CalendarCheck}
                title="No Students in Section"
                description="No active enrollments were found for the selected class and section."
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="w-16">Roll</TableHead>
                    <TableHead>Student Name & ID</TableHead>
                    <TableHead className="w-80 text-center">Attendance Status</TableHead>
                    <TableHead className="w-64">Remarks / Excuse</TableHead>
                    <TableHead className="w-20 text-right">Audit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayedRoster.map((student) => {
                    const isPresent = student.status === 'present';
                    const isAbsent = student.status === 'absent';
                    const isLate = student.status === 'late';
                    const isLeave = student.status === 'leave';

                    return (
                      <TableRow
                        key={student.studentId}
                        className={
                          isAbsent
                            ? 'bg-rose-500/5 hover:bg-rose-500/10'
                            : isLate
                            ? 'bg-amber-500/5 hover:bg-amber-500/10'
                            : ''
                        }
                      >
                        {/* Roll Number */}
                        <TableCell className="font-mono text-xs font-semibold text-muted-foreground">
                          {student.rollNumber || '--'}
                        </TableCell>

                        {/* Name & Admission */}
                        <TableCell>
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xs">
                              {student.name.charAt(0)}
                            </div>
                            <div>
                              <div className="font-medium text-xs text-foreground">{student.name}</div>
                              <div className="font-mono text-[10px] text-muted-foreground">
                                {student.admissionNumber}
                              </div>
                            </div>
                          </div>
                        </TableCell>

                        {/* Status Toggle Group */}
                        <TableCell>
                          <div className="flex items-center justify-center gap-1">
                            {/* Present Button */}
                            <button
                              type="button"
                              onClick={() => handleStatusChange(student.studentId, 'present')}
                              disabled={isFutureDate}
                              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                                isPresent
                                  ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-500/30'
                                  : 'bg-muted/70 text-muted-foreground hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/50'
                              }`}
                            >
                              Present
                            </button>

                            {/* Absent Button */}
                            <button
                              type="button"
                              onClick={() => handleStatusChange(student.studentId, 'absent')}
                              disabled={isFutureDate}
                              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                                isAbsent
                                  ? 'bg-rose-600 text-white shadow-sm ring-2 ring-rose-500/30'
                                  : 'bg-muted/70 text-muted-foreground hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/50'
                              }`}
                            >
                              Absent
                            </button>

                            {/* Late Button */}
                            <button
                              type="button"
                              onClick={() => handleStatusChange(student.studentId, 'late')}
                              disabled={isFutureDate}
                              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                                isLate
                                  ? 'bg-amber-600 text-white shadow-sm ring-2 ring-amber-500/30'
                                  : 'bg-muted/70 text-muted-foreground hover:bg-amber-50 hover:text-amber-700 dark:hover:bg-amber-950/50'
                              }`}
                            >
                              Late
                            </button>

                            {/* Leave Button */}
                            <button
                              type="button"
                              onClick={() => handleStatusChange(student.studentId, 'leave')}
                              disabled={isFutureDate}
                              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                                isLeave
                                  ? 'bg-sky-600 text-white shadow-sm ring-2 ring-sky-500/30'
                                  : 'bg-muted/70 text-muted-foreground hover:bg-sky-50 hover:text-sky-700 dark:hover:bg-sky-950/50'
                              }`}
                            >
                              Leave
                            </button>
                          </div>
                        </TableCell>

                        {/* Remarks Input */}
                        <TableCell>
                          <Input
                            placeholder="Optional notes / reason..."
                            value={student.remarks || ''}
                            onChange={(e) => handleRemarkChange(student.studentId, e.target.value)}
                            disabled={isFutureDate}
                            className="h-8 text-xs"
                          />
                        </TableCell>

                        {/* Audit / Single Record Action */}
                        <TableCell className="text-right">
                          {student.attendanceRecordId ? (
                            <button
                              type="button"
                              onClick={() => {
                                setCorrectionTarget(student);
                                setCorrectionStatus(student.status || 'present');
                                setCorrectionRemarks(student.remarks || '');
                                setCorrectionReason('');
                              }}
                              title="Audit Correction"
                              className="text-xs text-muted-foreground hover:text-primary underline cursor-pointer"
                            >
                              Audit
                            </button>
                          ) : (
                            <span className="text-[10px] text-muted-foreground">New</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>
        </TabsContent>

        {/* TAB 2: CLASS ANALYTICS & LOW ATTENDANCE ALERTS */}
        <TabsContent value="analytics" className="space-y-4 pt-4">
          {/* Analytics Filters */}
          <div className="rounded-xl border border-border/80 bg-card p-4 shadow-sm flex flex-col sm:flex-row items-end gap-3">
            <div className="space-y-1 w-full sm:w-48">
              <label className="text-xs font-medium text-muted-foreground">Start Date</label>
              <Input
                type="date"
                value={summaryStartDate}
                onChange={(e) => setSummaryStartDate(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
            <div className="space-y-1 w-full sm:w-48">
              <label className="text-xs font-medium text-muted-foreground">End Date</label>
              <Input
                type="date"
                value={summaryEndDate}
                onChange={(e) => setSummaryEndDate(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
            <Button
              size="sm"
              onClick={fetchSummary}
              disabled={isSummaryLoading}
              className="gap-1.5 text-xs h-9"
            >
              <Filter className="h-3.5 w-3.5" />
              <span>Analyze Period</span>
            </Button>
          </div>

          {isSummaryLoading ? (
            <div className="p-8 space-y-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-40 w-full" />
            </div>
          ) : summaryData ? (
            <div className="space-y-4">
              {/* Stat Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="rounded-xl border border-border/80 bg-card p-4 shadow-sm">
                  <div className="text-xs text-muted-foreground font-semibold uppercase">Total Recorded Days</div>
                  <div className="text-2xl font-bold mt-1 text-foreground">
                    {summaryData.stats.totalRecordedDays} Days
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">Across active roster</div>
                </div>

                <div className="rounded-xl border border-border/80 bg-card p-4 shadow-sm">
                  <div className="text-xs text-muted-foreground font-semibold uppercase">Average Attendance Rate</div>
                  <div className="text-2xl font-bold mt-1 text-primary">
                    {summaryData.stats.attendancePercentage}%
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">Target benchmark: ≥ 75%</div>
                </div>

                <div className="rounded-xl border border-border/80 bg-card p-4 shadow-sm">
                  <div className="text-xs text-muted-foreground font-semibold uppercase">Cumulative Absences</div>
                  <div className="text-2xl font-bold mt-1 text-rose-600 dark:text-rose-400">
                    {summaryData.stats.absentCount}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">Recorded unexcused absences</div>
                </div>

                <div className="rounded-xl border border-border/80 bg-card p-4 shadow-sm">
                  <div className="text-xs text-muted-foreground font-semibold uppercase">Low Attendance Flags</div>
                  <div className="text-2xl font-bold mt-1 text-amber-600 dark:text-amber-400">
                    {summaryData.lowAttendanceAlerts.length}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">Below 75% compliance threshold</div>
                </div>
              </div>

              {/* Low Attendance Alert Section */}
              <div className="rounded-xl border border-border/80 bg-card p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-sm flex items-center gap-2 text-foreground">
                      <AlertTriangle className="h-4 w-4 text-amber-600" />
                      <span>Low Attendance Warning Register (&lt; 75%)</span>
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Students whose attendance percentage is beneath the institutional compliance threshold.
                    </p>
                  </div>
                  <Badge variant="outline" className="border-amber-500/30 text-amber-700 bg-amber-500/10 text-xs">
                    {summaryData.lowAttendanceAlerts.length} Flagged
                  </Badge>
                </div>

                {summaryData.lowAttendanceAlerts.length === 0 ? (
                  <div className="p-6 text-center text-xs text-muted-foreground bg-muted/20 rounded-lg">
                    ✓ All students currently maintain attendance above the 75% compliance threshold.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40">
                        <TableHead>Admission Number</TableHead>
                        <TableHead>Student Name</TableHead>
                        <TableHead className="text-center">Total Instructional Days</TableHead>
                        <TableHead className="text-center">Days Missed</TableHead>
                        <TableHead className="text-right">Attendance Rate</TableHead>
                        <TableHead className="text-right">Risk Level</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {summaryData.lowAttendanceAlerts.map((st) => (
                        <TableRow key={st.studentId}>
                          <TableCell className="font-mono text-xs">{st.admissionNumber}</TableCell>
                          <TableCell className="font-medium text-xs">{st.name}</TableCell>
                          <TableCell className="text-center text-xs">{st.totalDays}</TableCell>
                          <TableCell className="text-center text-xs text-rose-600 font-semibold">
                            {st.absentDays}
                          </TableCell>
                          <TableCell className="text-right text-xs font-bold text-amber-600">
                            {st.percentage}%
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge
                              variant="outline"
                              className={
                                st.percentage < 65
                                  ? 'bg-rose-50 text-rose-700 border-rose-300'
                                  : 'bg-amber-50 text-amber-700 border-amber-300'
                              }
                            >
                              {st.percentage < 65 ? 'Critical Warning' : 'At-Risk'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </div>
          ) : (
            <EmptyState
              icon={FileText}
              title="No Analytics Data"
              description="Select date range to view attendance analytics."
            />
          )}
        </TabsContent>

        {/* TAB 3: MONTHLY REGISTER & CSV EXPORT */}
        <TabsContent value="reports" className="space-y-4 pt-4">
          {/* Month / Year Filter & Export CTA */}
          <div className="rounded-xl border border-border/80 bg-card p-4 shadow-sm flex flex-col sm:flex-row items-end justify-between gap-3">
            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-1 w-36">
                <label className="text-xs font-medium text-muted-foreground">Month</label>
                <select
                  value={reportMonth}
                  onChange={(e) => setReportMonth(Number(e.target.value))}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <option key={m} value={m}>
                      {new Date(2026, m - 1).toLocaleString('default', { month: 'long' })}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1 w-28">
                <label className="text-xs font-medium text-muted-foreground">Year</label>
                <select
                  value={reportYear}
                  onChange={(e) => setReportYear(Number(e.target.value))}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs"
                >
                  <option value={2025}>2025</option>
                  <option value={2026}>2026</option>
                  <option value={2027}>2027</option>
                </select>
              </div>

              <Button
                size="sm"
                onClick={fetchMonthly}
                disabled={isMonthlyLoading}
                className="gap-1.5 text-xs h-9"
              >
                <RotateCw className={`h-3.5 w-3.5 ${isMonthlyLoading ? 'animate-spin' : ''}`} />
                <span>Load Register</span>
              </Button>
            </div>

            <Button
              variant="default"
              size="sm"
              onClick={handleExportCsv}
              disabled={isExportingCsv}
              className="gap-1.5 text-xs h-9 bg-primary"
            >
              <Download className="h-3.5 w-3.5" />
              <span>{isExportingCsv ? 'Generating CSV...' : 'Download Official CSV'}</span>
            </Button>
          </div>

          {/* Monthly Matrix Table */}
          <div className="rounded-xl border border-border/80 bg-card overflow-hidden shadow-sm">
            {isMonthlyLoading ? (
              <div className="p-8 space-y-4">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : !monthlyReport ? (
              <EmptyState
                icon={Download}
                title="Monthly Register Unloaded"
                description="Click 'Load Register' to preview monthly attendance records."
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="w-16">Roll</TableHead>
                    <TableHead>Admission No</TableHead>
                    <TableHead>Student Name</TableHead>
                    <TableHead className="text-center">Total Days</TableHead>
                    <TableHead className="text-center text-emerald-600">Present</TableHead>
                    <TableHead className="text-center text-rose-600">Absent</TableHead>
                    <TableHead className="text-center text-amber-600">Late</TableHead>
                    <TableHead className="text-center text-sky-600">Leave</TableHead>
                    <TableHead className="text-right">Attendance %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {monthlyReport.studentReports.map((st) => (
                    <TableRow key={st.studentId}>
                      <TableCell className="font-mono text-xs">{st.rollNumber || '--'}</TableCell>
                      <TableCell className="font-mono text-xs">{st.admissionNumber}</TableCell>
                      <TableCell className="font-medium text-xs">{st.name}</TableCell>
                      <TableCell className="text-center text-xs">{st.totalDays}</TableCell>
                      <TableCell className="text-center text-xs font-semibold text-emerald-600">
                        {st.present}
                      </TableCell>
                      <TableCell className="text-center text-xs font-semibold text-rose-600">
                        {st.absent}
                      </TableCell>
                      <TableCell className="text-center text-xs font-semibold text-amber-600">
                        {st.late}
                      </TableCell>
                      <TableCell className="text-center text-xs font-semibold text-sky-600">
                        {st.leave}
                      </TableCell>
                      <TableCell className="text-right text-xs font-bold">
                        <span
                          className={
                            st.percentage >= 75
                              ? 'text-emerald-600'
                              : st.percentage >= 65
                              ? 'text-amber-600'
                              : 'text-rose-600'
                          }
                        >
                          {st.percentage}%
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Confirmation Dialog for Overwriting Existing Daily Attendance */}
      <ConfirmationDialog
        isOpen={showOverwriteConfirm}
        onClose={() => setShowOverwriteConfirm(false)}
        onConfirm={executeSaveAttendance}
        title="Update Existing Attendance Roll?"
        message="Attendance records already exist for this class section and date. Saving will update the roster and dispatch attendance notifications to parents of absent or tardy students."
        confirmLabel="Confirm & Save Roll"
        confirmVariant="default"
        isDestructive={false}
      />

      {/* Single Record Audit Correction Modal */}
      <Dialog
        isOpen={!!correctionTarget}
        onClose={() => setCorrectionTarget(null)}
        title="Attendance Record Audit Correction"
        description={`Modify verified record for ${correctionTarget?.name} (${correctionTarget?.admissionNumber}). Every modification creates an immutable audit trail entry.`}
        footer={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCorrectionTarget(null)}
              disabled={isCorrectionSubmitting}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleCorrectionSubmit}
              disabled={isCorrectionSubmitting || !correctionReason.trim()}
              className="gap-1.5"
            >
              {isCorrectionSubmitting ? 'Logging...' : 'Apply Correction'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleCorrectionSubmit} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">Updated Attendance Status</label>
            <select
              value={correctionStatus}
              onChange={(e) => setCorrectionStatus(e.target.value as AttendanceStatus)}
              className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs"
            >
              <option value="present">Present</option>
              <option value="absent">Absent</option>
              <option value="late">Late</option>
              <option value="leave">Excused Leave</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">Updated Remarks</label>
            <Input
              value={correctionRemarks}
              onChange={(e) => setCorrectionRemarks(e.target.value)}
              placeholder="e.g. Doctor's note submitted"
              className="text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-rose-600 dark:text-rose-400">
              Mandatory Administrative Reason *
            </label>
            <Input
              value={correctionReason}
              onChange={(e) => setCorrectionReason(e.target.value)}
              placeholder="Explain why this status is being altered (required by audit policy)..."
              required
              className="text-xs"
            />
          </div>
        </form>
      </Dialog>
    </div>
  );
};
