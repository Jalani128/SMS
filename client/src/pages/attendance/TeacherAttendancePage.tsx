import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { PageHeader } from '../../components/shared/PageHeader';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
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
import { ConfirmationDialog } from '../../components/admin/management/ConfirmationDialog';
import { academicService } from '../../services/academic.service';
import { attendanceService } from '../../services/attendance.service';
import { SectionRecord, ClassRecord } from '../../types/academic';
import { DailyAttendanceRosterItem, AttendanceStatus } from '../../types/attendance';
import {
  CalendarCheck,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  Save,
  Check,
} from 'lucide-react';

export const TeacherAttendancePage: React.FC = () => {
  const [classes, setClasses] = useState<ClassRecord[]>([]);
  const [sections, setSections] = useState<SectionRecord[]>([]);

  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedSectionId, setSelectedSectionId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  const [roster, setRoster] = useState<DailyAttendanceRosterItem[]>([]);
  const [isMarkedInitially, setIsMarkedInitially] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  const [showConfirm, setShowConfirm] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error' | 'warning';
    text: string;
  } | null>(null);

  // Load teacher assigned classes & sections
  useEffect(() => {
    let isMounted = true;
    Promise.all([academicService.getClasses(), academicService.getSections()])
      .then(([cls, sec]) => {
        if (!isMounted) return;
        setClasses(cls);
        setSections(sec);
        if (cls.length > 0) setSelectedClassId(cls[0]._id);
      })
      .catch((err) => {
        console.error('Failed to load teacher class assignments:', err);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const availableSections = useMemo(() => {
    if (!selectedClassId) return sections;
    return sections.filter((s) => {
      const cId = typeof s.classId === 'string' ? s.classId : s.classId?._id;
      return cId === selectedClassId;
    });
  }, [sections, selectedClassId]);

  useEffect(() => {
    if (availableSections.length > 0) {
      if (!availableSections.some((s) => s._id === selectedSectionId)) {
        setSelectedSectionId(availableSections[0]._id);
      }
    } else {
      setSelectedSectionId('');
    }
  }, [availableSections, selectedSectionId]);

  // Load daily roster
  const fetchRoster = useCallback(async () => {
    if (!selectedClassId || !selectedSectionId || !selectedDate) return;
    try {
      setIsLoading(true);
      setFeedback(null);
      const res = await attendanceService.getDailyAttendance({
        classId: selectedClassId,
        sectionId: selectedSectionId,
        date: selectedDate,
      });
      setRoster(res.roster || []);
      setIsMarkedInitially(res.isMarked);
      setHasUnsavedChanges(false);
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: err.message || 'Failed to load class roster',
      });
    } finally {
      setIsLoading(false);
    }
  }, [selectedClassId, selectedSectionId, selectedDate]);

  useEffect(() => {
    fetchRoster();
  }, [fetchRoster]);

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

  const handleMarkAll = (status: AttendanceStatus | null) => {
    setRoster((prev) => prev.map((item) => ({ ...item, status })));
    setHasUnsavedChanges(true);
  };

  const executeSave = async () => {
    if (!selectedClassId || !selectedSectionId || !selectedDate) return;
    try {
      setIsSaving(true);
      setFeedback(null);

      const recordsToSubmit = roster
        .filter((r) => r.status !== null)
        .map((r) => ({
          studentId: r.studentId,
          status: r.status as AttendanceStatus,
          remarks: r.remarks || undefined,
        }));

      const res = await attendanceService.submitBulkAttendance({
        academicSessionId: 'sess-current',
        classId: selectedClassId,
        sectionId: selectedSectionId,
        date: selectedDate,
        records: recordsToSubmit,
      });

      setHasUnsavedChanges(false);
      setIsMarkedInitially(true);
      setFeedback({
        type: 'success',
        text: `Class roll call recorded successfully (${res.processed} students).`,
      });
      fetchRoster();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: err.message || 'Failed to submit attendance roll',
      });
    } finally {
      setIsSaving(false);
      setShowConfirm(false);
    }
  };

  const handleSaveClick = () => {
    if (isMarkedInitially) {
      setShowConfirm(true);
    } else {
      executeSave();
    }
  };

  // Stats
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

  const isFutureDate = selectedDate > new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Classroom Roll Call"
        description="Daily attendance roll for your assigned classrooms. Mark student presence, tardiness, and excused leaves."
        badge={
          <Badge variant="outline" className="border-emerald-500/30 text-emerald-700 bg-emerald-500/10 text-xs gap-1">
            <CheckCircle2 className="h-3 w-3" />
            <span>Teacher Portal</span>
          </Badge>
        }
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={fetchRoster}
            disabled={isLoading}
            className="gap-1.5 text-xs"
          >
            <RotateCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Reload</span>
          </Button>
        }
      />

      {/* Unsaved Changes Banner */}
      {hasUnsavedChanges && (
        <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
            <span>Unsaved roll marks in worksheet. Click "Submit Class Roll" to save.</span>
          </div>
          <Button
            size="sm"
            onClick={handleSaveClick}
            disabled={isSaving}
            className="h-6 text-xs bg-amber-600 hover:bg-amber-700 text-white gap-1 px-2"
          >
            <Save className="h-3 w-3" />
            <span>Save</span>
          </Button>
        </div>
      )}

      {feedback && (
        <div
          className={`p-3 rounded-lg border text-sm flex items-center justify-between ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300'
              : feedback.type === 'warning'
              ? 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300'
              : 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <Check className="h-4 w-4 text-emerald-600" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-rose-600" />
            )}
            <span>{feedback.text}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-xs font-semibold">
            ✕
          </button>
        </div>
      )}

      {/* Filter and Date Bar */}
      <div className="rounded-xl border border-border/80 bg-card p-4 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground uppercase">Class</label>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs"
            >
              {classes.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground uppercase">Section</label>
            <select
              value={selectedSectionId}
              onChange={(e) => setSelectedSectionId(e.target.value)}
              className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs"
            >
              {availableSections.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.name} {s.roomNumber ? `(${s.roomNumber})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground uppercase">Roll Date</label>
            <Input
              type="date"
              value={selectedDate}
              max={new Date().toISOString().split('T')[0]}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="h-9 text-xs"
            />
          </div>
        </div>

        {isFutureDate && (
          <div className="mt-2 text-xs text-rose-600 flex items-center gap-1 font-medium">
            <AlertTriangle className="h-3.5 w-3.5" />
            <span>Attendance cannot be marked for future calendar dates.</span>
          </div>
        )}
      </div>

      {/* Stats Summary Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="rounded-lg border border-border/60 bg-card p-3 shadow-sm">
          <span className="text-[11px] text-muted-foreground uppercase font-semibold">Total Students</span>
          <div className="text-xl font-bold mt-1 text-foreground">{stats.total}</div>
        </div>
        <div className="rounded-lg border border-emerald-500/20 bg-emerald-50/40 dark:bg-emerald-950/20 p-3 shadow-sm">
          <span className="text-[11px] text-emerald-700 dark:text-emerald-400 uppercase font-semibold">Present</span>
          <div className="text-xl font-bold mt-1 text-emerald-700 dark:text-emerald-300">{stats.present}</div>
        </div>
        <div className="rounded-lg border border-rose-500/20 bg-rose-50/40 dark:bg-rose-950/20 p-3 shadow-sm">
          <span className="text-[11px] text-rose-700 dark:text-rose-400 uppercase font-semibold">Absent</span>
          <div className="text-xl font-bold mt-1 text-rose-700 dark:text-rose-300">{stats.absent}</div>
        </div>
        <div className="rounded-lg border border-amber-500/20 bg-amber-50/40 dark:bg-amber-950/20 p-3 shadow-sm">
          <span className="text-[11px] text-amber-700 dark:text-amber-400 uppercase font-semibold">Late</span>
          <div className="text-xl font-bold mt-1 text-amber-700 dark:text-amber-300">{stats.late}</div>
        </div>
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 shadow-sm">
          <span className="text-[11px] text-primary uppercase font-semibold">Today's %</span>
          <div className="text-xl font-bold mt-1 text-primary">{stats.percentage}%</div>
        </div>
      </div>

      {/* Roster Sheet */}
      <div className="rounded-xl border border-border/80 bg-card p-4 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-border/60 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase">Batch Marks:</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleMarkAll('present')}
              disabled={isFutureDate}
              className="h-7 text-xs border-emerald-500/40 text-emerald-700 hover:bg-emerald-50"
            >
              All Present
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleMarkAll('absent')}
              disabled={isFutureDate}
              className="h-7 text-xs border-rose-500/40 text-rose-700 hover:bg-rose-50"
            >
              All Absent
            </Button>
          </div>

          <div className="flex items-center gap-2">
            {isMarkedInitially && (
              <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">
                Recorded
              </Badge>
            )}
            <Button
              size="sm"
              onClick={handleSaveClick}
              disabled={isSaving || isFutureDate || roster.length === 0}
              className="gap-1.5 text-xs bg-primary"
            >
              <Save className="h-3.5 w-3.5" />
              <span>{isSaving ? 'Submitting...' : 'Submit Class Roll'}</span>
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="p-8 space-y-3">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : roster.length === 0 ? (
          <EmptyState
            icon={CalendarCheck}
            title="No Roster Available"
            description="No students enrolled in this section."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="w-16">Roll</TableHead>
                <TableHead>Student Name</TableHead>
                <TableHead className="w-72 text-center">Status</TableHead>
                <TableHead>Remarks</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {roster.map((student) => (
                <TableRow key={student.studentId}>
                  <TableCell className="font-mono text-xs">{student.rollNumber || '--'}</TableCell>
                  <TableCell>
                    <div className="font-medium text-xs text-foreground">{student.name}</div>
                    <div className="font-mono text-[10px] text-muted-foreground">{student.admissionNumber}</div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleStatusChange(student.studentId, 'present')}
                        className={`px-3 py-1 text-xs font-semibold rounded ${
                          student.status === 'present'
                            ? 'bg-emerald-600 text-white'
                            : 'bg-muted/70 text-muted-foreground hover:bg-emerald-50'
                        }`}
                      >
                        Present
                      </button>
                      <button
                        type="button"
                        onClick={() => handleStatusChange(student.studentId, 'absent')}
                        className={`px-3 py-1 text-xs font-semibold rounded ${
                          student.status === 'absent'
                            ? 'bg-rose-600 text-white'
                            : 'bg-muted/70 text-muted-foreground hover:bg-rose-50'
                        }`}
                      >
                        Absent
                      </button>
                      <button
                        type="button"
                        onClick={() => handleStatusChange(student.studentId, 'late')}
                        className={`px-3 py-1 text-xs font-semibold rounded ${
                          student.status === 'late'
                            ? 'bg-amber-600 text-white'
                            : 'bg-muted/70 text-muted-foreground hover:bg-amber-50'
                        }`}
                      >
                        Late
                      </button>
                      <button
                        type="button"
                        onClick={() => handleStatusChange(student.studentId, 'leave')}
                        className={`px-3 py-1 text-xs font-semibold rounded ${
                          student.status === 'leave'
                            ? 'bg-sky-600 text-white'
                            : 'bg-muted/70 text-muted-foreground hover:bg-sky-50'
                        }`}
                      >
                        Leave
                      </button>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Input
                      value={student.remarks || ''}
                      onChange={(e) => handleRemarkChange(student.studentId, e.target.value)}
                      placeholder="Remarks..."
                      className="h-8 text-xs"
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <ConfirmationDialog
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={executeSave}
        title="Update Class Attendance?"
        message="This class section already has attendance recorded for today. Saving will update the status."
        confirmLabel="Update Roll"
        confirmVariant="default"
        isDestructive={false}
      />
    </div>
  );
};
