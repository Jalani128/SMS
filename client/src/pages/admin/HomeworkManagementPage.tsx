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
import {
  BookOpen,
  ClipboardList,
  CheckCircle2,
  FileText,
  Plus,
  Search,
  RotateCw,
  Archive,
  Award,
  Send,
  Link,
  Users,
} from 'lucide-react';
import { homeworkService } from '../../services/homework.service';
import {
  HomeworkItem,
  HomeworkStatus,
  AssignmentType,
  RosterStudentItem,
  ResourceLink,
} from '../../types/homework';

export const HomeworkManagementPage: React.FC = () => {
  const [homeworkList, setHomeworkList] = useState<HomeworkItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isRosterModalOpen, setIsRosterModalOpen] = useState(false);
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [isGradeModalOpen, setIsGradeModalOpen] = useState(false);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);

  const [selectedHomework, setSelectedHomework] = useState<HomeworkItem | null>(null);
  const [rosterData, setRosterData] = useState<RosterStudentItem[]>([]);
  const [selectedRosterItem, setSelectedRosterItem] = useState<RosterStudentItem | null>(null);
  const [isLoadingRoster, setIsLoadingRoster] = useState(false);

  // Form states for Create/Edit
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    instructions: '',
    classId: 'cls-10',
    sectionId: 'sec-10a',
    subjectId: 'sub-phy',
    assignmentType: 'homework' as AssignmentType,
    dueDate: '',
    maxMarks: 100,
    isGraded: true,
    status: 'published' as HomeworkStatus,
    allowLateSubmission: true,
    latePenaltyPercent: 10,
    allowResubmission: true,
    maxSubmissions: 3,
  });

  const [resourceLinks, setResourceLinks] = useState<ResourceLink[]>([]);
  const [newLinkTitle, setNewLinkTitle] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');

  // Form states for Grade / Return / Archive
  const [gradeMarks, setGradeMarks] = useState<number>(0);
  const [gradeFeedback, setGradeFeedback] = useState('');
  const [gradeReleaseToggle, setGradeReleaseToggle] = useState(true);
  const [returnFeedback, setReturnFeedback] = useState('');
  const [archiveReason, setArchiveReason] = useState('');

  // Notification message
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Load homework
  const loadHomework = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await homeworkService.getHomeworkList({
        status: statusFilter !== 'all' ? statusFilter : undefined,
        assignmentType: typeFilter !== 'all' ? typeFilter : undefined,
        search: searchQuery || undefined,
      });
      setHomeworkList(res.data);
    } catch (err) {
      console.error('Failed to load homework:', err);
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, typeFilter, searchQuery]);

  useEffect(() => {
    loadHomework();
  }, [loadHomework]);

  // Load Submissions Roster
  const openSubmissionsRoster = async (hw: HomeworkItem) => {
    setSelectedHomework(hw);
    setIsRosterModalOpen(true);
    setIsLoadingRoster(true);
    try {
      const res = await homeworkService.getSubmissionsRoster(hw._id);
      setRosterData(res.data);
    } catch (err) {
      console.error('Failed to load roster:', err);
    } finally {
      setIsLoadingRoster(false);
    }
  };

  // Grade action
  const handleOpenGradeDialog = (item: RosterStudentItem) => {
    if (!item.submission) return;
    setSelectedRosterItem(item);
    setGradeMarks(item.submission.marksObtained ?? 85);
    setGradeFeedback(item.submission.teacherFeedback || '');
    setGradeReleaseToggle(true);
    setIsGradeModalOpen(true);
  };

  const handleSaveGrade = async () => {
    if (!selectedRosterItem?.submission) return;
    try {
      await homeworkService.gradeSubmission(selectedRosterItem.submission._id, {
        marksObtained: Number(gradeMarks),
        teacherFeedback: gradeFeedback,
        releaseGrade: gradeReleaseToggle,
      });
      showToast(`Grade recorded for ${selectedRosterItem.studentName}`);
      setIsGradeModalOpen(false);
      if (selectedHomework) openSubmissionsRoster(selectedHomework);
    } catch (err: any) {
      alert(err.message || 'Failed to record grade');
    }
  };

  // Return for Revision
  const handleOpenReturnDialog = (item: RosterStudentItem) => {
    if (!item.submission) return;
    setSelectedRosterItem(item);
    setReturnFeedback('');
    setIsReturnModalOpen(true);
  };

  const handleConfirmReturn = async () => {
    if (!selectedRosterItem?.submission || !returnFeedback.trim()) return;
    try {
      await homeworkService.returnSubmission(selectedRosterItem.submission._id, returnFeedback);
      showToast(`Submission returned to ${selectedRosterItem.studentName} for revision`);
      setIsReturnModalOpen(false);
      if (selectedHomework) openSubmissionsRoster(selectedHomework);
    } catch (err: any) {
      alert(err.message || 'Failed to return submission');
    }
  };

  // Bulk Release Grades
  const handleBulkReleaseGrades = async () => {
    if (!selectedHomework) return;
    try {
      const count = await homeworkService.releaseGrades(selectedHomework._id);
      showToast(`Released grades to ${count} students`);
      openSubmissionsRoster(selectedHomework);
    } catch (err: any) {
      alert(err.message || 'Failed to release grades');
    }
  };

  // Archive
  const handleOpenArchiveDialog = (hw: HomeworkItem) => {
    setSelectedHomework(hw);
    setArchiveReason('');
    setIsArchiveModalOpen(true);
  };

  const handleConfirmArchive = async () => {
    if (!selectedHomework || !archiveReason.trim()) return;
    try {
      await homeworkService.archiveHomework(selectedHomework._id, archiveReason);
      showToast(`Assignment "${selectedHomework.title}" archived`);
      setIsArchiveModalOpen(false);
      loadHomework();
    } catch (err: any) {
      alert(err.message || 'Failed to archive assignment');
    }
  };

  // Publish Draft
  const handlePublishDraft = async (hw: HomeworkItem) => {
    try {
      await homeworkService.publishHomework(hw._id);
      showToast(`Assignment "${hw.title}" published`);
      loadHomework();
    } catch (err: any) {
      alert(err.message || 'Failed to publish assignment');
    }
  };

  // Create Assignment Submit
  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await homeworkService.createHomework({
        title: formData.title,
        description: formData.description,
        instructions: formData.instructions,
        classId: formData.classId,
        sectionId: formData.sectionId,
        subjectId: formData.subjectId,
        assignmentType: formData.assignmentType,
        dueDate: new Date(formData.dueDate).toISOString(),
        maxMarks: Number(formData.maxMarks),
        isGraded: formData.isGraded,
        status: formData.status,
        resourceLinks,
        submissionSettings: {
          allowLateSubmission: formData.allowLateSubmission,
          latePenaltyPercent: Number(formData.latePenaltyPercent),
          allowResubmission: formData.allowResubmission,
          maxSubmissions: Number(formData.maxSubmissions),
        },
      });

      showToast(`Assignment "${formData.title}" created successfully`);
      setIsCreateModalOpen(false);
      loadHomework();
    } catch (err: any) {
      alert(err.message || 'Failed to create assignment');
    }
  };

  // Add Resource Link
  const handleAddLink = () => {
    if (!newLinkTitle || !newLinkUrl) return;
    setResourceLinks([...resourceLinks, { title: newLinkTitle, url: newLinkUrl }]);
    setNewLinkTitle('');
    setNewLinkUrl('');
  };

  // KPI Calculations
  const stats = useMemo(() => {
    const total = homeworkList.length;
    const published = homeworkList.filter((h) => h.status === 'published').length;
    const drafts = homeworkList.filter((h) => h.status === 'draft').length;
    const overdue = homeworkList.filter((h) => h.isOverdue).length;
    return { total, published, drafts, overdue };
  }, [homeworkList]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Homework & Assignments Management"
        description="Oversee academic assignments, submission rosters, grading rubrics, revision workflows, and student submissions across all school cohorts."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={loadHomework} className="gap-1.5">
              <RotateCw className="h-4 w-4" />
              <span>Refresh</span>
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => {
                setFormData({
                  title: '',
                  description: '',
                  instructions: '',
                  classId: 'cls-10',
                  sectionId: 'sec-10a',
                  subjectId: 'sub-phy',
                  assignmentType: 'homework',
                  dueDate: '2026-10-30T17:00',
                  maxMarks: 100,
                  isGraded: true,
                  status: 'published',
                  allowLateSubmission: true,
                  latePenaltyPercent: 10,
                  allowResubmission: true,
                  maxSubmissions: 3,
                });
                setResourceLinks([]);
                setIsCreateModalOpen(true);
              }}
              className="gap-1.5"
            >
              <Plus className="h-4 w-4" />
              <span>Create Assignment</span>
            </Button>
          </div>
        }
      />

      {/* Toast Banner */}
      {toastMessage && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-lg text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-xl border border-border/80 bg-card p-4 shadow-sm">
          <span className="text-xs font-semibold text-muted-foreground uppercase">Total Assignments</span>
          <div className="text-2xl font-bold mt-1 text-foreground">{stats.total}</div>
          <span className="text-[10px] text-muted-foreground">Across all subjects</span>
        </div>
        <div className="rounded-xl border border-border/80 bg-card p-4 shadow-sm">
          <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase">Active / Published</span>
          <div className="text-2xl font-bold mt-1 text-emerald-600 dark:text-emerald-400">{stats.published}</div>
          <span className="text-[10px] text-muted-foreground">Available to students</span>
        </div>
        <div className="rounded-xl border border-border/80 bg-card p-4 shadow-sm">
          <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase">Draft Tasks</span>
          <div className="text-2xl font-bold mt-1 text-amber-600 dark:text-amber-400">{stats.drafts}</div>
          <span className="text-[10px] text-muted-foreground">Hidden from students</span>
        </div>
        <div className="rounded-xl border border-border/80 bg-card p-4 shadow-sm">
          <span className="text-xs font-semibold text-rose-600 dark:text-rose-400 uppercase">Past Due</span>
          <div className="text-2xl font-bold mt-1 text-rose-600 dark:text-rose-400">{stats.overdue}</div>
          <span className="text-[10px] text-muted-foreground">Pending submissions or grading</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-xl border border-border/80 bg-card p-4 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[260px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search assignments by title or instructions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 text-xs"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              aria-label="Filter assignments by publication status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 px-3 rounded-md border border-input bg-background text-xs"
            >
              <option value="all">All Statuses</option>
              <option value="published">Published</option>
              <option value="draft">Drafts</option>
              <option value="archived">Archived</option>
            </select>

            <select
              aria-label="Filter assignments by task category"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="h-9 px-3 rounded-md border border-input bg-background text-xs"
            >
              <option value="all">All Task Types</option>
              <option value="homework">Homework</option>
              <option value="classwork">Classwork</option>
              <option value="project">Projects</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>
      </div>

      {/* Assignments Table */}
      <div className="rounded-xl border border-border/80 bg-card overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-8 space-y-3">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : homeworkList.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="No Assignments Found"
            description="No assignments matched the specified criteria. Create a new assignment to get started."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead>Assignment</TableHead>
                <TableHead>Target Cohort</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Assigned By</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead className="text-center">Max Marks</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {homeworkList.map((hw) => {
                const className = typeof hw.classId === 'object' ? hw.classId?.name : 'Grade 10';
                const sectionName = typeof hw.sectionId === 'object' ? hw.sectionId?.name : 'Section A';
                const subjectName = typeof hw.subjectId === 'object' ? hw.subjectId?.name : 'General';
                const teacherName =
                  typeof hw.teacherId === 'object' ? hw.teacherId?.userId?.name || 'Staff' : 'Staff';

                return (
                  <TableRow key={hw._id}>
                    <TableCell>
                      <div className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                        <BookOpen className="h-3.5 w-3.5 text-primary shrink-0" />
                        <span>{hw.title}</span>
                      </div>
                      <div className="text-[10px] text-muted-foreground uppercase mt-0.5">
                        Type: <span className="font-medium text-foreground">{hw.assignmentType}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">
                      {className} - {sectionName}
                    </TableCell>
                    <TableCell className="text-xs font-medium text-primary">{subjectName}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{teacherName}</TableCell>
                    <TableCell>
                      <div className="text-xs font-medium">{new Date(hw.dueDate).toLocaleDateString()}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {new Date(hw.dueDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </TableCell>
                    <TableCell className="text-center text-xs font-bold text-foreground">
                      {hw.isGraded ? hw.maxMarks : 'Ungraded'}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`text-[10px] capitalize ${
                          hw.status === 'published'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-400'
                            : hw.status === 'draft'
                            ? 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-400'
                            : 'bg-muted text-muted-foreground border-border'
                        }`}
                      >
                        {hw.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openSubmissionsRoster(hw)}
                          className="h-7 px-2 text-[11px] gap-1"
                        >
                          <Users className="h-3.5 w-3.5" />
                          <span>Submissions</span>
                        </Button>

                        {hw.status === 'draft' && (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handlePublishDraft(hw)}
                            className="h-7 px-2 text-[11px] gap-1"
                          >
                            <Send className="h-3.5 w-3.5" />
                            <span>Publish</span>
                          </Button>
                        )}

                        {hw.status !== 'archived' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenArchiveDialog(hw)}
                            className="h-7 px-2 text-[11px] text-muted-foreground hover:text-rose-600"
                          >
                            <Archive className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {/* ---------------------------------------------------------------------- */}
      {/* MODAL 1: Submissions Roster & Grading Modal */}
      {/* ---------------------------------------------------------------------- */}
      <Dialog
        isOpen={isRosterModalOpen}
        onClose={() => setIsRosterModalOpen(false)}
        title={selectedHomework ? `Submissions Roster: ${selectedHomework.title}` : 'Submissions Roster'}
        description="Inspect student submissions, review submitted files, assign marks, and request revisions."
        className="max-w-4xl"
      >
        <div className="space-y-4 pt-2">
          {/* Header Action Bar */}
          <div className="flex items-center justify-between p-3 bg-muted/40 rounded-lg">
            <div className="text-xs">
              Cohort: <strong>Grade 10 - Section A</strong> | Max Marks: <strong>{selectedHomework?.maxMarks}</strong>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleBulkReleaseGrades}
              className="h-7 text-xs gap-1.5"
            >
              <Award className="h-3.5 w-3.5 text-primary" />
              <span>Release All Graded</span>
            </Button>
          </div>

          {isLoadingRoster ? (
            <div className="p-6 space-y-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead>Student</TableHead>
                    <TableHead>Admission #</TableHead>
                    <TableHead>Submission Status</TableHead>
                    <TableHead>Submitted At</TableHead>
                    <TableHead className="text-right">Marks</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rosterData.map((item) => (
                    <TableRow key={item.enrollmentId}>
                      <TableCell className="text-xs font-semibold">{item.studentName}</TableCell>
                      <TableCell className="text-xs text-muted-foreground font-mono">{item.admissionNumber}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-[10px] capitalize ${
                            item.status === 'graded'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                              : item.status === 'submitted'
                              ? 'bg-blue-50 text-blue-700 border-blue-300'
                              : item.status === 'late'
                              ? 'bg-amber-50 text-amber-700 border-amber-300'
                              : item.status === 'returned'
                              ? 'bg-purple-50 text-purple-700 border-purple-300'
                              : 'bg-rose-50 text-rose-700 border-rose-300'
                          }`}
                        >
                          {item.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {item.submission
                          ? new Date(item.submission.submittedAt).toLocaleDateString()
                          : 'Not Submitted'}
                      </TableCell>
                      <TableCell className="text-right text-xs font-bold">
                        {item.submission?.marksObtained !== undefined
                          ? `${item.submission.marksObtained} / ${selectedHomework?.maxMarks}`
                          : '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        {item.submission ? (
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenGradeDialog(item)}
                              className="h-6 px-2 text-[10px] gap-1"
                            >
                              <Award className="h-3 w-3" />
                              <span>Grade</span>
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenReturnDialog(item)}
                              className="h-6 px-2 text-[10px] text-purple-700 hover:bg-purple-50"
                            >
                              Return
                            </Button>
                          </div>
                        ) : (
                          <span className="text-[10px] text-muted-foreground italic">No submission</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </Dialog>

      {/* ---------------------------------------------------------------------- */}
      {/* MODAL 2: Grade Submission Dialog */}
      {/* ---------------------------------------------------------------------- */}
      <Dialog
        isOpen={isGradeModalOpen}
        onClose={() => setIsGradeModalOpen(false)}
        title={`Grade: ${selectedRosterItem?.studentName}`}
        description={`Maximum available marks: ${selectedHomework?.maxMarks}. Marks must not exceed maximum marks.`}
        className="max-w-md"
      >
        <div className="space-y-4 pt-2">
          {/* Submission Preview */}
          {selectedRosterItem?.submission && (
            <div className="p-3 bg-muted/40 rounded-lg text-xs space-y-1.5">
              <div className="font-semibold text-foreground">Submitted Notes:</div>
              <p className="text-muted-foreground italic">
                {selectedRosterItem.submission.submissionText || 'No text notes submitted.'}
              </p>
              {selectedRosterItem.submission.attachments.length > 0 && (
                <div className="pt-1">
                  <span className="font-semibold">Attachments:</span>
                  <div className="mt-1 space-y-1">
                    {selectedRosterItem.submission.attachments.map((att, idx) => (
                      <div key={idx} className="flex items-center gap-1.5 text-primary text-[11px]">
                        <FileText className="h-3.5 w-3.5" />
                        <a href={att.url} target="_blank" rel="noreferrer" className="underline truncate">
                          {att.name}
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Marks Obtained</label>
            <Input
              type="number"
              min={0}
              max={selectedHomework?.maxMarks || 100}
              value={gradeMarks}
              onChange={(e) => setGradeMarks(Number(e.target.value))}
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Teacher Feedback</label>
            <textarea
              className="w-full min-h-[80px] p-2 rounded-md border border-input bg-background text-xs"
              placeholder="Constructive feedback for the student..."
              value={gradeFeedback}
              onChange={(e) => setGradeFeedback(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="releaseToggle"
              checked={gradeReleaseToggle}
              onChange={(e) => setGradeReleaseToggle(e.target.checked)}
              className="rounded border-input text-primary"
            />
            <label htmlFor="releaseToggle" className="text-xs text-foreground cursor-pointer">
              Release grade immediately to student portal
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setIsGradeModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="default" size="sm" onClick={handleSaveGrade}>
              Save Grade
            </Button>
          </div>
        </div>
      </Dialog>

      {/* ---------------------------------------------------------------------- */}
      {/* MODAL 3: Return For Revision Dialog */}
      {/* ---------------------------------------------------------------------- */}
      <Dialog
        isOpen={isReturnModalOpen}
        onClose={() => setIsReturnModalOpen(false)}
        title={`Return for Revision: ${selectedRosterItem?.studentName}`}
        description="Explain to the student what changes or additions are required before resubmitting."
        className="max-w-md"
      >
        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Revision Instructions (Required)</label>
            <textarea
              className="w-full min-h-[90px] p-2 rounded-md border border-input bg-background text-xs"
              placeholder="e.g. Please recalibrate your heat loss curve and cite your external references..."
              value={returnFeedback}
              onChange={(e) => setReturnFeedback(e.target.value)}
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setIsReturnModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handleConfirmReturn}
              disabled={!returnFeedback.trim()}
            >
              Confirm Return
            </Button>
          </div>
        </div>
      </Dialog>

      {/* ---------------------------------------------------------------------- */}
      {/* MODAL 4: Archive Assignment Dialog */}
      {/* ---------------------------------------------------------------------- */}
      <Dialog
        isOpen={isArchiveModalOpen}
        onClose={() => setIsArchiveModalOpen(false)}
        title={`Archive: ${selectedHomework?.title}`}
        description="Archiving will preserve all student submissions and historical grades while closing active access."
        className="max-w-md"
      >
        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Mandatory Reason for Archival</label>
            <textarea
              className="w-full min-h-[80px] p-2 rounded-md border border-input bg-background text-xs"
              placeholder="e.g. Term completed; superseded by Final Comprehensive Assessment."
              value={archiveReason}
              onChange={(e) => setArchiveReason(e.target.value)}
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setIsArchiveModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handleConfirmArchive}
              disabled={!archiveReason.trim()}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              Confirm Archival
            </Button>
          </div>
        </div>
      </Dialog>

      {/* ---------------------------------------------------------------------- */}
      {/* MODAL 5: Create Assignment Modal */}
      {/* ---------------------------------------------------------------------- */}
      <Dialog
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create Academic Assignment"
        description="Configure instructions, target cohort, due dates, late-submission policies, and resource attachments."
        className="max-w-2xl"
      >
        <form onSubmit={handleCreateAssignment} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Assignment Title</label>
            <Input
              type="text"
              placeholder="e.g. Cellular Respiration Lab Report"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Assignment Type</label>
              <select
                aria-label="Assignment Type"
                value={formData.assignmentType}
                onChange={(e) =>
                  setFormData({ ...formData, assignmentType: e.target.value as AssignmentType })
                }
                className="w-full h-9 px-3 rounded-md border border-input bg-background text-xs"
              >
                <option value="homework">Homework</option>
                <option value="classwork">Classwork</option>
                <option value="project">Project</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Publication Status</label>
              <select
                aria-label="Publication Status"
                value={formData.status}
                onChange={(e) =>
                  setFormData({ ...formData, status: e.target.value as HomeworkStatus })
                }
                className="w-full h-9 px-3 rounded-md border border-input bg-background text-xs"
              >
                <option value="published">Publish Immediately</option>
                <option value="draft">Save as Draft</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Detailed Instructions</label>
            <textarea
              className="w-full min-h-[90px] p-2 rounded-md border border-input bg-background text-xs"
              placeholder="Specify requirements, submission expectations, and grading rubrics..."
              value={formData.instructions}
              onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Submission Due Date & Time</label>
              <Input
                type="datetime-local"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Maximum Marks</label>
              <Input
                type="number"
                min={1}
                value={formData.maxMarks}
                onChange={(e) => setFormData({ ...formData, maxMarks: Number(e.target.value) })}
                required
              />
            </div>
          </div>

          {/* Late Policy */}
          <div className="p-3 bg-muted/40 rounded-lg space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="allowLateToggle"
                checked={formData.allowLateSubmission}
                onChange={(e) => setFormData({ ...formData, allowLateSubmission: e.target.checked })}
              />
              <label htmlFor="allowLateToggle" className="text-xs font-semibold text-foreground cursor-pointer">
                Allow Late Submissions
              </label>
            </div>
            {formData.allowLateSubmission && (
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="space-y-1">
                  <span className="text-[11px] text-muted-foreground">Late Penalty (% deducted)</span>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={formData.latePenaltyPercent}
                    onChange={(e) => setFormData({ ...formData, latePenaltyPercent: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-[11px] text-muted-foreground">Max Revision Attempts</span>
                  <Input
                    type="number"
                    min={1}
                    max={10}
                    value={formData.maxSubmissions}
                    onChange={(e) => setFormData({ ...formData, maxSubmissions: Number(e.target.value) })}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Resource Links */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Link className="h-3.5 w-3.5" />
              <span>Reference Resource Links</span>
            </label>
            <div className="flex items-center gap-2">
              <Input
                type="text"
                placeholder="Link Title (e.g. Reference Guide)"
                value={newLinkTitle}
                onChange={(e) => setNewLinkTitle(e.target.value)}
                className="text-xs"
              />
              <Input
                type="url"
                placeholder="https://..."
                value={newLinkUrl}
                onChange={(e) => setNewLinkUrl(e.target.value)}
                className="text-xs"
              />
              <Button type="button" variant="outline" size="sm" onClick={handleAddLink} className="text-xs">
                Add
              </Button>
            </div>
            {resourceLinks.length > 0 && (
              <div className="space-y-1 pt-1">
                {resourceLinks.map((rl, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs p-1.5 bg-muted/30 rounded">
                    <span>{rl.title}</span>
                    <a href={rl.url} target="_blank" rel="noreferrer" className="text-primary truncate max-w-[200px]">
                      {rl.url}
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="default" size="sm">
              Create Assignment
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
};

export default HomeworkManagementPage;
