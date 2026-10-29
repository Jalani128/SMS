import React, { useState, useEffect, useCallback } from 'react';
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
import { academicService } from '../../services/academic.service';
import { studentService } from '../../services/student.service';
import {
  AcademicEnrollmentItem,
  ClassRecord,
  SectionRecord,
  AcademicSessionRecord,
} from '../../types/academic';
import { StudentItem } from '../../types/management';
import {
  UserPlus,
  RefreshCw,
  ArrowRightLeft,
  History,
  GraduationCap,
  Layers,
  Calendar,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

export const StudentEnrollmentsPage: React.FC = () => {
  const [enrollments, setEnrollments] = useState<AcademicEnrollmentItem[]>([]);
  const [sessions, setSessions] = useState<AcademicSessionRecord[]>([]);
  const [classes, setClasses] = useState<ClassRecord[]>([]);
  const [sections, setSections] = useState<SectionRecord[]>([]);
  const [studentsList, setStudentsList] = useState<StudentItem[]>([]);

  // Filter states
  const [selectedSessionFilter, setSelectedSessionFilter] = useState<string>('all');
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Transfer modal
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [transferEnrollment, setTransferEnrollment] = useState<AcademicEnrollmentItem | null>(null);
  const [targetClassId, setTargetClassId] = useState('');
  const [targetSectionId, setTargetSectionId] = useState('');
  const [targetRollNumber, setTargetRollNumber] = useState('');
  const [transferReason, setTransferReason] = useState('');

  // Enroll modal
  const [isEnrollOpen, setIsEnrollOpen] = useState(false);
  const [enrollStudentId, setEnrollStudentId] = useState('');
  const [enrollSessionId, setEnrollSessionId] = useState('');
  const [enrollClassId, setEnrollClassId] = useState('');
  const [enrollSectionId, setEnrollSectionId] = useState('');
  const [enrollRollNumber, setEnrollRollNumber] = useState('');
  const [enrollRemarks, setEnrollRemarks] = useState('');

  // History modal
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historyItems, setHistoryItems] = useState<AcademicEnrollmentItem[]>([]);
  const [historyStudentName, setHistoryStudentName] = useState('');
  const [historyLoading, setHistoryLoading] = useState(false);

  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setErrorMsg(null);
      const [enrData, sessData, clsData, secData] = await Promise.all([
        academicService.getEnrollments(),
        academicService.getSessions(),
        academicService.getClasses(),
        academicService.getSections(),
      ]);
      setEnrollments(enrData);
      setSessions(sessData);
      setClasses(clsData);
      setSections(secData);

      try {
        const stuRes = await studentService.getStudents({ limit: 100 });
        setStudentsList(stuRes.students || []);
      } catch (sErr) {
        console.warn('Students fetch warning:', sErr);
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || err.message || 'Failed to load enrollments');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const activeSession = sessions.find((s) => s.isCurrent) || sessions[0];

  // Open Enroll
  const handleOpenEnroll = () => {
    setEnrollStudentId(studentsList[0]?._id || '');
    setEnrollSessionId(activeSession?._id || '');
    setEnrollClassId(classes[0]?._id || '');
    setEnrollSectionId('');
    setEnrollRollNumber('');
    setEnrollRemarks('');
    setFormError(null);
    setIsEnrollOpen(true);
  };

  // Open Transfer
  const handleOpenTransfer = (enr: AcademicEnrollmentItem) => {
    setTransferEnrollment(enr);
    setTargetClassId('');
    setTargetSectionId('');
    setTargetRollNumber('');
    setTransferReason('');
    setFormError(null);
    setIsTransferOpen(true);
  };

  // Open History
  const handleOpenHistory = async (enr: AcademicEnrollmentItem) => {
    const sId =
      typeof enr.studentId === 'object' && enr.studentId !== null ? enr.studentId._id : (enr.studentId as string);
    const sName =
      typeof enr.studentId === 'object' && enr.studentId !== null
        ? enr.studentId.userId?.name || enr.studentId.admissionNumber
        : 'Student';

    setHistoryStudentName(sName);
    setIsHistoryOpen(true);
    setHistoryLoading(true);
    try {
      const history = await academicService.getStudentEnrollmentHistory(sId);
      setHistoryItems(history);
    } catch (err) {
      console.warn('History fetch fallback:', err);
      setHistoryItems([enr]);
    } finally {
      setHistoryLoading(false);
    }
  };

  // Sections filtered by target class
  const targetSections = sections.filter((s) => {
    if (!targetClassId) return false;
    const cid = typeof s.classId === 'object' && s.classId !== null ? s.classId._id : s.classId;
    return cid === targetClassId;
  });

  const selectedTargetSection = sections.find((s) => s._id === targetSectionId);
  const targetCapacity = selectedTargetSection?.capacity || 35;
  const targetEnrolled = selectedTargetSection?.currentEnrolled || 0;
  const isTargetFull = targetEnrolled >= targetCapacity;

  // Sections filtered by enroll class
  const enrollSections = sections.filter((s) => {
    if (!enrollClassId) return false;
    const cid = typeof s.classId === 'object' && s.classId !== null ? s.classId._id : s.classId;
    return cid === enrollClassId;
  });

  const selectedEnrollSection = sections.find((s) => s._id === enrollSectionId);
  const enrollCapacity = selectedEnrollSection?.capacity || 35;
  const enrollCurrent = selectedEnrollSection?.currentEnrolled || 0;
  const isEnrollFull = enrollCurrent >= enrollCapacity;

  const handleSaveEnroll = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!enrollStudentId || !enrollSessionId || !enrollClassId || !enrollSectionId) {
      setFormError('Please select Student, Session, Class, and Section');
      return;
    }

    if (isEnrollFull) {
      setFormError('Selected section has reached maximum capacity. Cannot enroll student.');
      return;
    }

    try {
      setIsSubmitting(true);
      await academicService.enrollStudent({
        studentId: enrollStudentId,
        academicSessionId: enrollSessionId,
        classId: enrollClassId,
        sectionId: enrollSectionId,
        rollNumber: enrollRollNumber.trim() || undefined,
        remarks: enrollRemarks.trim() || undefined,
      });

      setActionSuccess('Student enrolled successfully into academic session.');
      setIsEnrollOpen(false);
      await loadData();
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      setFormError(err.response?.data?.message || err.message || 'Enrollment failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!transferEnrollment || !targetClassId || !targetSectionId) {
      setFormError('Please select target Class and Section');
      return;
    }

    if (!transferReason.trim()) {
      setFormError('Transfer reason is required for administrative audit logs');
      return;
    }

    if (isTargetFull) {
      setFormError('Target section is completely full. Transfer cannot proceed.');
      return;
    }

    try {
      setIsSubmitting(true);
      await academicService.transferStudent(transferEnrollment._id, {
        targetClassId,
        targetSectionId,
        targetRollNumber: targetRollNumber.trim() || undefined,
        reason: transferReason.trim(),
      });

      setActionSuccess('Student transferred successfully. Previous enrollment marked as transferred.');
      setIsTransferOpen(false);
      await loadData();
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      setFormError(err.response?.data?.message || err.message || 'Transfer failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredEnrollments = enrollments.filter((enr) => {
    const sessionMatches =
      selectedSessionFilter === 'all' ||
      (typeof enr.academicSessionId === 'object' && enr.academicSessionId !== null
        ? enr.academicSessionId._id === selectedSessionFilter
        : enr.academicSessionId === selectedSessionFilter);

    const classMatches =
      selectedClassFilter === 'all' ||
      (typeof enr.classId === 'object' && enr.classId !== null
        ? enr.classId._id === selectedClassFilter
        : enr.classId === selectedClassFilter);

    const statusMatches =
      selectedStatusFilter === 'all' || enr.status === selectedStatusFilter;

    return sessionMatches && classMatches && statusMatches;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'enrolled':
        return <Badge variant="default" className="bg-emerald-600 hover:bg-emerald-700 text-xs">Enrolled</Badge>;
      case 'transferred':
        return <Badge variant="secondary" className="bg-amber-100 text-amber-800 border-amber-200 text-xs">Transferred</Badge>;
      case 'promoted':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-200 text-xs">Promoted</Badge>;
      case 'completed':
        return <Badge variant="outline" className="text-xs">Completed</Badge>;
      case 'dropped':
        return <Badge variant="destructive" className="text-xs">Dropped</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Student Enrollments & Transfers"
        description="Enroll students into session classes, verify capacity limits, execute non-destructive transfers, and trace historical movements."
        actions={
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={loadData} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              size="sm"
              onClick={handleOpenEnroll}
              disabled={classes.length === 0 || sections.length === 0}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Enroll Student
            </Button>
          </div>
        }
      />

      {/* Notifications */}
      {actionSuccess && (
        <div className="flex items-center gap-3 p-4 bg-emerald-50 text-emerald-800 rounded-lg border border-emerald-200 text-sm">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}
      {errorMsg && (
        <div className="flex items-center gap-3 p-4 bg-rose-50 text-rose-800 rounded-lg border border-rose-200 text-sm">
          <AlertCircle className="h-5 w-5 text-rose-600 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl border bg-card shadow-sm">
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">Session:</span>
            <select
              className="h-9 px-3 rounded-md border border-input bg-background text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              value={selectedSessionFilter}
              onChange={(e) => setSelectedSessionFilter(e.target.value)}
            >
              <option value="all">All Academic Sessions</option>
              {sessions.map((sess) => (
                <option key={sess._id} value={sess._id}>
                  {sess.name} {sess.isCurrent ? '(Active)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">Class:</span>
            <select
              className="h-9 px-3 rounded-md border border-input bg-background text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              value={selectedClassFilter}
              onChange={(e) => setSelectedClassFilter(e.target.value)}
            >
              <option value="all">All Classes</option>
              {classes.map((cls) => (
                <option key={cls._id} value={cls._id}>
                  {cls.name} ({cls.code})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">Status:</span>
            <select
              className="h-9 px-3 rounded-md border border-input bg-background text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="enrolled">Enrolled</option>
              <option value="transferred">Transferred</option>
              <option value="promoted">Promoted</option>
              <option value="completed">Completed</option>
              <option value="dropped">Dropped</option>
            </select>
          </div>
        </div>

        <span className="text-xs text-muted-foreground self-end sm:self-center">
          {filteredEnrollments.length} enrollment records
        </span>
      </div>

      {/* Directory Table */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : filteredEnrollments.length === 0 ? (
          <EmptyState
            icon={GraduationCap}
            title="No Enrollments Recorded"
            description="Enroll students into classes and sections for this academic period."
            actionLabel={classes.length > 0 && sections.length > 0 ? 'Enroll Student' : undefined}
            onAction={classes.length > 0 && sections.length > 0 ? handleOpenEnroll : undefined}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Admission No</TableHead>
                <TableHead>Class & Section</TableHead>
                <TableHead>Roll No</TableHead>
                <TableHead>Academic Session</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Enrollment Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEnrollments.map((enr) => {
                const stuObj = typeof enr.studentId === 'object' && enr.studentId !== null ? enr.studentId : null;
                const studentName = stuObj?.userId?.name || stuObj?.admissionNumber || 'Student';
                const admNo = stuObj?.admissionNumber || '—';
                const className =
                  typeof enr.classId === 'object' && enr.classId !== null ? enr.classId.name : 'Class';
                const sectionName =
                  typeof enr.sectionId === 'object' && enr.sectionId !== null ? enr.sectionId.name : 'Section';
                const sessionName =
                  typeof enr.academicSessionId === 'object' && enr.academicSessionId !== null
                    ? enr.academicSessionId.name
                    : 'Session';

                return (
                  <TableRow key={enr._id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                          {studentName.charAt(0)}
                        </div>
                        <div>
                          <span className="font-semibold text-foreground text-xs block">{studentName}</span>
                          {enr.remarks && (
                            <span className="text-[11px] text-muted-foreground truncate max-w-[140px] block">
                              {enr.remarks}
                            </span>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-xs font-medium text-muted-foreground">{admNo}</span>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5 font-semibold text-foreground text-xs">
                          <GraduationCap className="h-3 w-3 text-primary" />
                          <span>{className}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-muted-foreground text-[11px]">
                          <Layers className="h-2.5 w-2.5" />
                          <span>{sectionName}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-xs text-foreground">{enr.rollNumber || '—'}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground">{sessionName}</span>
                    </TableCell>
                    <TableCell>{getStatusBadge(enr.status)}</TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground">
                        {enr.enrollmentDate ? new Date(enr.enrollmentDate).toLocaleDateString() : '—'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {enr.status === 'enrolled' && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs border-amber-300 text-amber-700 hover:bg-amber-50"
                            onClick={() => handleOpenTransfer(enr)}
                            title="Transfer Student"
                          >
                            <ArrowRightLeft className="h-3.5 w-3.5 mr-1" />
                            Transfer
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => handleOpenHistory(enr)}
                          title="View Complete Enrollment History"
                        >
                          <History className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Enroll Student Modal */}
      <Dialog
        isOpen={isEnrollOpen}
        onClose={() => setIsEnrollOpen(false)}
        title="Enroll Student"
        description="Select a student, session, class, and section with real-time capacity validation."
        footer={
          <div className="flex justify-end gap-3 w-full">
            <Button type="button" variant="outline" onClick={() => setIsEnrollOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" form="enroll-form" disabled={isSubmitting || isEnrollFull}>
              {isSubmitting ? 'Enrolling...' : 'Confirm Enrollment'}
            </Button>
          </div>
        }
      >
        <form id="enroll-form" onSubmit={handleSaveEnroll} className="space-y-4">
          {formError && (
            <div className="p-3 bg-rose-50 text-rose-800 rounded-lg text-xs flex items-center gap-2 border border-rose-200">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">Student *</label>
            <select
              required
              className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              value={enrollStudentId}
              onChange={(e) => setEnrollStudentId(e.target.value)}
            >
              <option value="">Select a student...</option>
              {studentsList.map((stu) => (
                <option key={stu._id} value={stu._id}>
                  {stu.userId?.name || stu.admissionNumber} ({stu.admissionNumber})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">Academic Session *</label>
            <select
              required
              className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              value={enrollSessionId}
              onChange={(e) => setEnrollSessionId(e.target.value)}
            >
              {sessions.map((sess) => (
                <option key={sess._id} value={sess._id}>
                  {sess.name} {sess.isCurrent ? '(Active)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Class *</label>
              <select
                required
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                value={enrollClassId}
                onChange={(e) => {
                  setEnrollClassId(e.target.value);
                  setEnrollSectionId('');
                }}
              >
                {classes.map((cls) => (
                  <option key={cls._id} value={cls._id}>
                    {cls.name} ({cls.code})
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Section *</label>
              <select
                required
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                value={enrollSectionId}
                onChange={(e) => setEnrollSectionId(e.target.value)}
              >
                <option value="">Select section...</option>
                {enrollSections.map((sec) => (
                  <option key={sec._id} value={sec._id}>
                    {sec.name} ({sec.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Section Capacity Indicator */}
          {enrollSectionId && (
            <div
              className={`p-3 rounded-lg border text-xs flex items-center justify-between ${
                isEnrollFull
                  ? 'bg-rose-50 border-rose-200 text-rose-800'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-800'
              }`}
            >
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4" />
                <span>
                  Section Occupancy: <strong>{enrollCurrent} / {enrollCapacity}</strong> enrolled
                </span>
              </div>
              <Badge variant={isEnrollFull ? 'destructive' : 'default'} className="text-[11px]">
                {isEnrollFull ? 'Capacity Full' : `${enrollCapacity - enrollCurrent} Spots Open`}
              </Badge>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">Roll Number (Optional)</label>
            <Input
              placeholder="e.g. 10-A-14"
              value={enrollRollNumber}
              onChange={(e) => setEnrollRollNumber(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">Remarks</label>
            <Input
              placeholder="e.g. Regular enrollment, transferred from sister school"
              value={enrollRemarks}
              onChange={(e) => setEnrollRemarks(e.target.value)}
            />
          </div>
        </form>
      </Dialog>

      {/* Transfer Student Modal */}
      <Dialog
        isOpen={isTransferOpen}
        onClose={() => setIsTransferOpen(false)}
        title="Transfer Student"
        description="Non-destructively transfer a student to another class/section while maintaining permanent enrollment history."
        footer={
          <div className="flex justify-end gap-3 w-full">
            <Button type="button" variant="outline" onClick={() => setIsTransferOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              form="transfer-form"
              className="bg-amber-600 hover:bg-amber-700 text-white"
              disabled={isSubmitting || isTargetFull}
            >
              {isSubmitting ? 'Transferring...' : 'Execute Transfer'}
            </Button>
          </div>
        }
      >
        <form id="transfer-form" onSubmit={handleSaveTransfer} className="space-y-4">
          {formError && (
            <div className="p-3 bg-rose-50 text-rose-800 rounded-lg text-xs flex items-center gap-2 border border-rose-200">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="p-3 bg-muted/40 rounded-lg border text-xs space-y-1">
            <span className="text-muted-foreground block">Current Placement:</span>
            <p className="font-semibold text-foreground">
              {typeof transferEnrollment?.classId === 'object' && transferEnrollment.classId !== null
                ? transferEnrollment.classId.name
                : 'Class'}
              {' — '}
              {typeof transferEnrollment?.sectionId === 'object' && transferEnrollment.sectionId !== null
                ? transferEnrollment.sectionId.name
                : 'Section'}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Target Class *</label>
              <select
                required
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                value={targetClassId}
                onChange={(e) => {
                  setTargetClassId(e.target.value);
                  setTargetSectionId('');
                }}
              >
                <option value="">Select class...</option>
                {classes.map((cls) => (
                  <option key={cls._id} value={cls._id}>
                    {cls.name} ({cls.code})
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Target Section *</label>
              <select
                required
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                value={targetSectionId}
                onChange={(e) => setTargetSectionId(e.target.value)}
                disabled={!targetClassId}
              >
                <option value="">Select section...</option>
                {targetSections.map((sec) => (
                  <option key={sec._id} value={sec._id}>
                    {sec.name} ({sec.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Target Capacity Indicator */}
          {targetSectionId && (
            <div
              className={`p-3 rounded-lg border text-xs flex items-center justify-between ${
                isTargetFull
                  ? 'bg-rose-50 border-rose-200 text-rose-800'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-800'
              }`}
            >
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4" />
                <span>
                  Target Section Capacity: <strong>{targetEnrolled} / {targetCapacity}</strong>
                </span>
              </div>
              <Badge variant={isTargetFull ? 'destructive' : 'default'} className="text-[11px]">
                {isTargetFull ? 'Full - Cannot Transfer' : `${targetCapacity - targetEnrolled} Open`}
              </Badge>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">New Roll Number (Optional)</label>
            <Input
              placeholder="e.g. 10-B-22"
              value={targetRollNumber}
              onChange={(e) => setTargetRollNumber(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">Reason for Transfer *</label>
            <Input
              required
              placeholder="e.g. Academic track reassignment, parental request, language streaming"
              value={transferReason}
              onChange={(e) => setTransferReason(e.target.value)}
            />
          </div>
        </form>
      </Dialog>

      {/* History Dialog */}
      <Dialog
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        title={`Enrollment History — ${historyStudentName}`}
        description="Chronological record of student academic sessions, promotions, and section transfers."
        footer={
          <div className="flex justify-end w-full">
            <Button variant="outline" onClick={() => setIsHistoryOpen(false)}>
              Close History
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          {historyLoading ? (
            <div className="space-y-3 py-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : historyItems.length === 0 ? (
            <p className="text-xs text-muted-foreground italic py-4">No enrollment records located.</p>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {historyItems.map((item, idx) => {
                const sessName =
                  typeof item.academicSessionId === 'object' && item.academicSessionId !== null
                    ? item.academicSessionId.name
                    : 'Session';
                const clsName =
                  typeof item.classId === 'object' && item.classId !== null ? item.classId.name : 'Class';
                const secName =
                  typeof item.sectionId === 'object' && item.sectionId !== null ? item.sectionId.name : 'Section';

                return (
                  <div key={item._id || idx} className="p-3 bg-muted/40 rounded-lg border text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-foreground flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-primary" />
                        {sessName}
                      </span>
                      {getStatusBadge(item.status)}
                    </div>
                    <div className="flex items-center gap-4 text-muted-foreground">
                      <span>
                        Placement: <strong>{clsName}</strong> ({secName})
                      </span>
                      {item.rollNumber && <span>Roll: {item.rollNumber}</span>}
                    </div>
                    {item.remarks && (
                      <p className="text-[11px] text-muted-foreground italic bg-background/50 p-1.5 rounded">
                        Notes: {item.remarks}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Dialog>
    </div>
  );
};

export default StudentEnrollmentsPage;
