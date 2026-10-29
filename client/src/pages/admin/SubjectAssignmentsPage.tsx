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
import { ConfirmationDialog } from '../../components/admin/management/ConfirmationDialog';
import { academicService } from '../../services/academic.service';
import { teacherService } from '../../services/teacher.service';
import {
  SubjectAssignmentRecord,
  ClassRecord,
  SectionRecord,
  SubjectRecord,
  AcademicSessionRecord,
} from '../../types/academic';
import { TeacherItem } from '../../types/management';
import {
  UserCheck,
  Plus,
  RefreshCw,
  Edit2,
  Archive,
  GraduationCap,
  Layers,
  Clock,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

export const SubjectAssignmentsPage: React.FC = () => {
  const [assignments, setAssignments] = useState<SubjectAssignmentRecord[]>([]);
  const [sessions, setSessions] = useState<AcademicSessionRecord[]>([]);
  const [classes, setClasses] = useState<ClassRecord[]>([]);
  const [sections, setSections] = useState<SectionRecord[]>([]);
  const [subjects, setSubjects] = useState<SubjectRecord[]>([]);
  const [teachers, setTeachers] = useState<TeacherItem[]>([]);

  // Filter states
  const [sessionFilter, setSessionFilter] = useState<string>('all');
  const [classFilter, setClassFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Modal states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<SubjectAssignmentRecord | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<SubjectAssignmentRecord | null>(null);

  // Form states
  const [formSessionId, setFormSessionId] = useState('');
  const [formClassId, setFormClassId] = useState('');
  const [formSectionId, setFormSectionId] = useState('');
  const [formSubjectId, setFormSubjectId] = useState('');
  const [formTeacherId, setFormTeacherId] = useState('');
  const [formPeriods, setFormPeriods] = useState<number>(5);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setErrorMsg(null);
      const [asgData, sessData, clsData, secData, subjData] = await Promise.all([
        academicService.getAssignments(),
        academicService.getSessions(),
        academicService.getClasses(),
        academicService.getSections(),
        academicService.getSubjects(),
      ]);
      setAssignments(asgData);
      setSessions(sessData);
      setClasses(clsData);
      setSections(secData);
      setSubjects(subjData);

      try {
        const tchrRes = await teacherService.getTeachers({ limit: 100, status: 'active' });
        setTeachers(tchrRes.teachers || []);
      } catch (tErr) {
        console.warn('Teacher fetch warning:', tErr);
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || err.message || 'Failed to load assignments');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const activeSession = sessions.find((s) => s.isCurrent) || sessions[0];

  const handleOpenCreate = () => {
    setFormSessionId(activeSession?._id || '');
    setFormClassId(classes[0]?._id || '');
    setFormSectionId('');
    setFormSubjectId(subjects[0]?._id || '');
    setFormTeacherId(teachers[0]?._id || '');
    setFormPeriods(5);
    setFormError(null);
    setIsCreateOpen(true);
  };

  const handleOpenEdit = (asg: SubjectAssignmentRecord) => {
    setEditingAssignment(asg);
    const tchId = typeof asg.teacherId === 'object' && asg.teacherId !== null ? asg.teacherId._id : asg.teacherId;
    setFormTeacherId(tchId || '');
    setFormPeriods(asg.periodsPerWeek || 5);
    setFormError(null);
    setIsEditOpen(true);
  };

  const handleSaveAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (editingAssignment) {
      if (!formTeacherId) {
        setFormError('Please select a teacher');
        return;
      }
      try {
        setIsSubmitting(true);
        await academicService.updateAssignment(editingAssignment._id, {
          teacherId: (formTeacherId as any),
          periodsPerWeek: Number(formPeriods),
        });
        setActionSuccess('Teaching assignment updated successfully.');
        setIsEditOpen(false);
        await loadData();
        setTimeout(() => setActionSuccess(null), 4000);
      } catch (err: any) {
        setFormError(err.response?.data?.message || err.message || 'Update failed');
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    if (!formSessionId || !formClassId || !formSubjectId || !formTeacherId) {
      setFormError('Session, Class, Subject, and Teacher are required');
      return;
    }

    try {
      setIsSubmitting(true);
      const payload: Partial<SubjectAssignmentRecord> = {
        academicSessionId: (formSessionId as any),
        classId: (formClassId as any),
        sectionId: formSectionId ? (formSectionId as any) : undefined,
        subjectId: (formSubjectId as any),
        teacherId: (formTeacherId as any),
        periodsPerWeek: Number(formPeriods),
        status: 'active',
      };

      await academicService.createAssignment(payload);
      setActionSuccess('Subject teacher assigned successfully.');
      setIsCreateOpen(false);
      await loadData();
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      setFormError(err.response?.data?.message || err.message || 'Assignment creation failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleArchiveConfirm = async () => {
    if (!archiveTarget) return;
    try {
      await academicService.archiveAssignment(archiveTarget._id);
      setActionSuccess('Subject assignment archived.');
      setArchiveTarget(null);
      await loadData();
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || err.message || 'Failed to archive assignment');
    }
  };

  const filteredSectionsForForm = sections.filter((sec) => {
    if (!formClassId) return true;
    const cid = typeof sec.classId === 'object' && sec.classId !== null ? sec.classId._id : sec.classId;
    return cid === formClassId;
  });

  const filteredAssignments = assignments.filter((asg) => {
    const sessionMatches =
      sessionFilter === 'all' ||
      (typeof asg.academicSessionId === 'object' && asg.academicSessionId !== null
        ? asg.academicSessionId._id === sessionFilter
        : asg.academicSessionId === sessionFilter);

    const classMatches =
      classFilter === 'all' ||
      (typeof asg.classId === 'object' && asg.classId !== null
        ? asg.classId._id === classFilter
        : asg.classId === classFilter);

    return sessionMatches && classMatches;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Teacher & Subject Assignments"
        description="Pair active faculty with class subjects and establish weekly period allocations."
        actions={
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={loadData} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              size="sm"
              onClick={handleOpenCreate}
              disabled={classes.length === 0 || subjects.length === 0 || teachers.length === 0}
            >
              <Plus className="h-4 w-4 mr-2" />
              Assign Teacher
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
              value={sessionFilter}
              onChange={(e) => setSessionFilter(e.target.value)}
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
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
            >
              <option value="all">All Classes</option>
              {classes.map((cls) => (
                <option key={cls._id} value={cls._id}>
                  {cls.name} ({cls.code})
                </option>
              ))}
            </select>
          </div>
        </div>

        <span className="text-xs text-muted-foreground self-end sm:self-center">
          {filteredAssignments.length} course assignments
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
        ) : filteredAssignments.length === 0 ? (
          <EmptyState
            icon={UserCheck}
            title="No Teacher Assignments"
            description="Assign teachers to teach specific subjects to classes and sections for the academic session."
            actionLabel={classes.length > 0 && subjects.length > 0 ? 'Assign Teacher' : undefined}
            onAction={classes.length > 0 && subjects.length > 0 ? handleOpenCreate : undefined}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Class & Section</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Assigned Instructor</TableHead>
                <TableHead>Workload</TableHead>
                <TableHead>Session</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAssignments.map((asg) => {
                const className =
                  typeof asg.classId === 'object' && asg.classId !== null ? asg.classId.name : 'Class';
                const sectionName =
                  typeof asg.sectionId === 'object' && asg.sectionId !== null
                    ? asg.sectionId.name
                    : 'All Sections';
                const subjectName =
                  typeof asg.subjectId === 'object' && asg.subjectId !== null
                    ? asg.subjectId.name
                    : 'Subject';
                const subjectCode =
                  typeof asg.subjectId === 'object' && asg.subjectId !== null
                    ? asg.subjectId.code
                    : '';
                const teacherObj =
                  typeof asg.teacherId === 'object' && asg.teacherId !== null ? asg.teacherId : null;
                const teacherName = teacherObj?.userId?.name || teacherObj?.employeeId || 'Teacher';
                const teacherDept = teacherObj?.department || '';
                const sessionName =
                  typeof asg.academicSessionId === 'object' && asg.academicSessionId !== null
                    ? asg.academicSessionId.name
                    : 'Session';

                return (
                  <TableRow key={asg._id}>
                    <TableCell>
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5 font-semibold text-foreground text-xs">
                          <GraduationCap className="h-3.5 w-3.5 text-primary" />
                          <span>{className}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
                          <Layers className="h-3 w-3" />
                          <span>{sectionName}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <span className="font-semibold text-foreground text-xs">{subjectName}</span>
                        {subjectCode && (
                          <span className="font-mono text-xs text-muted-foreground block">
                            {subjectCode}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold">
                          {teacherName.charAt(0)}
                        </div>
                        <div>
                          <span className="font-medium text-foreground text-xs block">{teacherName}</span>
                          <span className="text-[11px] text-muted-foreground">{teacherDept}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-xs text-foreground font-medium">
                        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>{asg.periodsPerWeek} periods / wk</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground">{sessionName}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={asg.status === 'active' ? 'default' : 'secondary'}>
                        {asg.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => handleOpenEdit(asg)}
                          title="Reassign Teacher / Edit Periods"
                        >
                          <Edit2 className="h-4 w-4 text-muted-foreground" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-rose-600 hover:bg-rose-50"
                          onClick={() => setArchiveTarget(asg)}
                          title="Archive Assignment"
                        >
                          <Archive className="h-4 w-4" />
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

      {/* Create / Edit Dialog */}
      <Dialog
        isOpen={isCreateOpen || isEditOpen}
        onClose={() => {
          setIsCreateOpen(false);
          setIsEditOpen(false);
        }}
        title={editingAssignment ? 'Update Course Assignment' : 'Assign Teacher to Subject'}
        description="Select the academic session, grade, subject, and assigned instructor."
        footer={
          <div className="flex justify-end gap-3 w-full">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsCreateOpen(false);
                setIsEditOpen(false);
              }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" form="assignment-form" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : editingAssignment ? 'Update Assignment' : 'Assign Course'}
            </Button>
          </div>
        }
      >
        <form id="assignment-form" onSubmit={handleSaveAssignment} className="space-y-4">
          {formError && (
            <div className="p-3 bg-rose-50 text-rose-800 rounded-lg text-xs flex items-center gap-2 border border-rose-200">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {!editingAssignment && (
            <>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Academic Session *</label>
                <select
                  required
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  value={formSessionId}
                  onChange={(e) => setFormSessionId(e.target.value)}
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
                    value={formClassId}
                    onChange={(e) => {
                      setFormClassId(e.target.value);
                      setFormSectionId('');
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
                  <label className="text-xs font-medium text-foreground">Section (Optional)</label>
                  <select
                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    value={formSectionId}
                    onChange={(e) => setFormSectionId(e.target.value)}
                  >
                    <option value="">All sections in this class</option>
                    {filteredSectionsForForm.map((sec) => (
                      <option key={sec._id} value={sec._id}>
                        {sec.name} ({sec.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Subject *</label>
                <select
                  required
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  value={formSubjectId}
                  onChange={(e) => setFormSubjectId(e.target.value)}
                >
                  {subjects.map((subj) => (
                    <option key={subj._id} value={subj._id}>
                      {subj.name} ({subj.code}) — {subj.department}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">Assigned Teacher *</label>
            <select
              required
              className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              value={formTeacherId}
              onChange={(e) => setFormTeacherId(e.target.value)}
            >
              <option value="">Select an active faculty member...</option>
              {teachers.map((t) => (
                <option key={t._id} value={t._id}>
                  {t.userId?.name || t.employeeId} ({t.department || 'Faculty'})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">Weekly Periods *</label>
            <Input
              type="number"
              min="1"
              max="50"
              required
              value={formPeriods}
              onChange={(e) => setFormPeriods(Number(e.target.value))}
            />
            <p className="text-[11px] text-muted-foreground">Number of teaching sessions allocated per week.</p>
          </div>
        </form>
      </Dialog>

      {/* Confirmation Dialog for Archival */}
      <ConfirmationDialog
        isOpen={Boolean(archiveTarget)}
        onClose={() => setArchiveTarget(null)}
        onConfirm={handleArchiveConfirm}
        title="Archive Subject Assignment"
        message="Are you sure you want to archive this teacher assignment? The teacher will no longer be mapped to this class subject for attendance and grading."
        confirmLabel="Archive Assignment"
        confirmVariant="destructive"
        isDestructive={true}
      />
    </div>
  );
};

export default SubjectAssignmentsPage;
