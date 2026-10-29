import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { PageHeader } from '../../components/shared/PageHeader';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Dialog } from '../../components/ui/Dialog';
import { Skeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import {
  BookOpen,
  ClipboardList,
  CheckCircle2,
  AlertCircle,
  FileText,
  Upload,
  RotateCw,
  Award,
  Calendar,
} from 'lucide-react';
import { homeworkService } from '../../services/homework.service';
import { HomeworkItem, AttachmentMeta } from '../../types/homework';

export const StudentHomeworkPage: React.FC = () => {
  const [homeworkList, setHomeworkList] = useState<HomeworkItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'submitted' | 'graded'>('all');

  // Modals state
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedHw, setSelectedHw] = useState<HomeworkItem | null>(null);

  // Submit Form state
  const [submissionText, setSubmissionText] = useState('');
  const [attachedFiles, setAttachedFiles] = useState<AttachmentMeta[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const loadStudentHomework = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await homeworkService.getHomeworkList();
      setHomeworkList(res.data);
    } catch (err) {
      console.error('Failed to load student assignments:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStudentHomework();
  }, [loadStudentHomework]);

  // Filter assignments based on activeTab
  const filteredList = useMemo(() => {
    return homeworkList.filter((hw) => {
      const sub = hw.studentSubmission;
      if (activeTab === 'pending') {
        return !sub || sub.status === 'returned';
      }
      if (activeTab === 'submitted') {
        return sub && (sub.status === 'submitted' || sub.status === 'late' || sub.status === 'resubmitted');
      }
      if (activeTab === 'graded') {
        return sub && sub.status === 'graded';
      }
      return true;
    });
  }, [homeworkList, activeTab]);

  // Open submission dialog
  const handleOpenSubmit = (hw: HomeworkItem) => {
    setSelectedHw(hw);
    setSubmissionText('');
    setAttachedFiles([]);
    setIsSubmitModalOpen(true);
  };

  // Open detail dialog
  const handleOpenDetail = (hw: HomeworkItem) => {
    setSelectedHw(hw);
    setIsDetailModalOpen(true);
  };

  // Handle mock file upload
  const handleSimulateFileUpload = () => {
    const mockFile: AttachmentMeta = {
      name: `Submission_Doc_${Date.now().toString().slice(-4)}.pdf`,
      url: 'https://res.cloudinary.com/demo/image/upload/sample.pdf',
      fileType: 'application/pdf',
      sizeBytes: 1024 * 512,
    };
    setAttachedFiles([...attachedFiles, mockFile]);
  };

  // Submit action
  const handleSubmitAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHw) return;

    if (!submissionText.trim() && attachedFiles.length === 0) {
      alert('Please provide either text notes or at least one file attachment.');
      return;
    }

    setIsSubmitting(true);
    try {
      await homeworkService.submitAssignment(selectedHw._id, {
        submissionText,
        attachments: attachedFiles,
      });

      showToast(`Successfully submitted work for "${selectedHw.title}"`);
      setIsSubmitModalOpen(false);
      loadStudentHomework();
    } catch (err: any) {
      alert(err.message || 'Failed to submit assignment');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="My Homework & Assignments"
        description="View assigned coursework, verify instructions, submit homework files, and review teacher grading feedback."
        actions={
          <Button variant="outline" size="sm" onClick={loadStudentHomework} className="gap-1.5">
            <RotateCw className="h-4 w-4" />
            <span>Refresh</span>
          </Button>
        }
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-lg text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Status Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-border/80 pb-3">
        {(['all', 'pending', 'submitted', 'graded'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${
              activeTab === tab
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-muted/60'
            }`}
          >
            {tab === 'all' ? 'All Assignments' : tab}
          </button>
        ))}
      </div>

      {/* Assignments Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-44 w-full rounded-xl" />
          <Skeleton className="h-44 w-full rounded-xl" />
        </div>
      ) : filteredList.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No Assignments Found"
          description={`There are currently no ${activeTab === 'all' ? '' : activeTab} assignments.`}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredList.map((hw) => {
            const subjectName = typeof hw.subjectId === 'object' ? hw.subjectId.name : 'General';
            const sub = hw.studentSubmission;
            const isSubmitted = !!sub;
            const isGraded = sub?.status === 'graded';
            const isReturned = sub?.status === 'returned';
            const isPastDue = new Date().getTime() > new Date(hw.dueDate).getTime();

            return (
              <div
                key={hw._id}
                className="rounded-xl border border-border/80 bg-card p-4 shadow-sm hover:border-primary/40 transition-all flex flex-col justify-between"
              >
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider">
                      {subjectName}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={`text-[10px] capitalize ${
                        isGraded
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                          : isReturned
                          ? 'bg-purple-50 text-purple-700 border-purple-300'
                          : isSubmitted
                          ? 'bg-blue-50 text-blue-700 border-blue-300'
                          : isPastDue
                          ? 'bg-rose-50 text-rose-700 border-rose-300'
                          : 'bg-amber-50 text-amber-700 border-amber-300'
                      }`}
                    >
                      {isGraded
                        ? 'Graded'
                        : isReturned
                        ? 'Revision Required'
                        : isSubmitted
                        ? sub?.isLate
                          ? 'Submitted (Late)'
                          : 'Submitted'
                        : isPastDue
                        ? 'Overdue'
                        : 'Pending'}
                    </Badge>
                  </div>

                  <div>
                    <h3 className="font-semibold text-sm text-foreground flex items-center gap-1.5">
                      <BookOpen className="h-4 w-4 text-primary shrink-0" />
                      <span>{hw.title}</span>
                    </h3>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                      {hw.instructions}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-muted-foreground pt-1 border-t border-border/40">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>Due: {new Date(hw.dueDate).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-1 font-semibold text-foreground">
                      <Award className="h-3.5 w-3.5 text-primary" />
                      <span>
                        {hw.isGraded
                          ? sub?.marksObtained !== undefined
                            ? `${sub.marksObtained} / ${hw.maxMarks} Pts`
                            : `${hw.maxMarks} Pts`
                          : 'Ungraded'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 pt-4 mt-2 border-t border-border/40">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenDetail(hw)}
                    className="text-xs h-8"
                  >
                    View Details
                  </Button>

                  {(!isSubmitted || isReturned || hw.submissionSettings?.allowResubmission) && (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => handleOpenSubmit(hw)}
                      className="text-xs h-8 gap-1.5"
                    >
                      <Upload className="h-3.5 w-3.5" />
                      <span>{isReturned ? 'Submit Revision' : isSubmitted ? 'Resubmit' : 'Submit Work'}</span>
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* MODAL 1: Submit Work Dialog */}
      {/* ---------------------------------------------------------------------- */}
      <Dialog
        isOpen={isSubmitModalOpen}
        onClose={() => setIsSubmitModalOpen(false)}
        title={selectedHw ? `Submit: ${selectedHw.title}` : 'Submit Assignment'}
        description="Provide your written notes and upload supporting documents or spreadsheets."
        className="max-w-xl"
      >
        <form onSubmit={handleSubmitAssignment} className="space-y-4 pt-2">
          {selectedHw && new Date().getTime() > new Date(selectedHw.dueDate).getTime() && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-lg text-amber-900 dark:text-amber-200 text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
              <span>
                Late Submission Notice: The assignment due date has passed. Your submission will be marked as Late
                {selectedHw.submissionSettings?.latePenaltyPercent
                  ? ` with a ${selectedHw.submissionSettings.latePenaltyPercent}% late penalty.`
                  : '.'}
              </span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Written Response / Submission Notes</label>
            <textarea
              className="w-full min-h-[100px] p-2 rounded-md border border-input bg-background text-xs"
              placeholder="Type your answers, executive summary, or notes to the teacher..."
              value={submissionText}
              onChange={(e) => setSubmissionText(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5" />
                <span>Uploaded Attachments (PDF, DOCX, Images up to 10MB)</span>
              </label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSimulateFileUpload}
                className="h-7 text-xs gap-1"
              >
                <Upload className="h-3 w-3" />
                <span>Attach File</span>
              </Button>
            </div>

            {attachedFiles.length > 0 ? (
              <div className="space-y-1.5 pt-1">
                {attachedFiles.map((file, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between text-xs p-2 bg-muted/40 rounded border"
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-primary" />
                      <span className="font-medium">{file.name}</span>
                      <span className="text-[10px] text-muted-foreground">
                        ({(file.sizeBytes / 1024).toFixed(0)} KB)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAttachedFiles(attachedFiles.filter((_, i) => i !== idx))}
                      className="text-rose-600 hover:underline text-[11px]"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 border-2 border-dashed rounded-lg text-center text-xs text-muted-foreground">
                No files attached yet. Click "Attach File" to attach your work.
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsSubmitModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="default" size="sm" disabled={isSubmitting}>
              {isSubmitting ? 'Submitting...' : 'Confirm Submission'}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* ---------------------------------------------------------------------- */}
      {/* MODAL 2: Details & Feedback Dialog */}
      {/* ---------------------------------------------------------------------- */}
      <Dialog
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title={selectedHw?.title || 'Assignment Details'}
        description={`Due Date: ${
          selectedHw ? new Date(selectedHw.dueDate).toLocaleString() : ''
        } | Maximum Marks: ${selectedHw?.maxMarks}`}
        className="max-w-xl"
      >
        {selectedHw && (
          <div className="space-y-4 pt-2 text-xs">
            <div className="p-3 bg-muted/40 rounded-lg space-y-1">
              <div className="font-semibold text-foreground">Instructions:</div>
              <p className="text-muted-foreground whitespace-pre-wrap">{selectedHw.instructions}</p>
            </div>

            {selectedHw.attachments.length > 0 && (
              <div>
                <div className="font-semibold text-foreground mb-1">Teacher Provided Materials:</div>
                <div className="space-y-1">
                  {selectedHw.attachments.map((att, i) => (
                    <div key={i} className="flex items-center gap-2 p-1.5 bg-muted/30 rounded">
                      <FileText className="h-3.5 w-3.5 text-primary" />
                      <a href={att.url} target="_blank" rel="noreferrer" className="underline text-primary">
                        {att.name}
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Submission Status & Feedback */}
            {selectedHw.studentSubmission ? (
              <div className="p-3 rounded-lg border border-border/80 space-y-2 bg-card">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground">Your Submission:</span>
                  <Badge variant="outline" className="text-[10px] capitalize">
                    {selectedHw.studentSubmission.status}
                  </Badge>
                </div>
                <div className="text-muted-foreground text-[11px]">
                  Submitted on: {new Date(selectedHw.studentSubmission.submittedAt).toLocaleString()}
                </div>
                {selectedHw.studentSubmission.marksObtained !== undefined && (
                  <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 rounded border border-emerald-300 dark:border-emerald-800 space-y-1">
                    <div className="font-bold text-emerald-800 dark:text-emerald-300">
                      Score: {selectedHw.studentSubmission.marksObtained} / {selectedHw.maxMarks} Pts
                    </div>
                    {selectedHw.studentSubmission.teacherFeedback && (
                      <p className="text-emerald-700 dark:text-emerald-400">
                        Feedback: {selectedHw.studentSubmission.teacherFeedback}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200">
                You have not yet submitted work for this assignment.
              </div>
            )}
          </div>
        )}
      </Dialog>
    </div>
  );
};

export default StudentHomeworkPage;
