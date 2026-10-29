import React, { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '../../components/shared/PageHeader';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Dialog } from '../../components/ui/Dialog';
import { Skeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import {
  FileCheck2,
  Plus,
  RotateCw,
  Printer,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  BookOpen,
  User,
  MapPin,
  TrendingUp,
  Award,
  Download,
  ShieldAlert,
  Edit3,
  Sliders,
} from 'lucide-react';
import { examService } from '../../services/exam.service';
import {
  Exam,
  ExamSubject,
  RosterStudent,
  StudentExamResult,
  ClassPerformanceAnalytics,
  ReportCardData,
  GradingScale,
} from '../../types/exam';

export const ExamsManagementPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'exams' | 'subjects' | 'marks' | 'verify' | 'results'>('exams');
  const [exams, setExams] = useState<Exam[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<string>('');
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [examSubjects, setExamSubjects] = useState<ExamSubject[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Marks entry state
  const [roster, setRoster] = useState<RosterStudent[]>([]);
  const [isSavingMarks, setIsSavingMarks] = useState(false);
  const [marksFeedback, setMarksFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Verification state
  const [verificationData, setVerificationData] = useState<{
    totalEligibleStudents: number;
    completeCount: number;
    incompleteCount: number;
    isReadyForPublication: boolean;
    missingEntriesCount: number;
    missingEntries: any[];
  } | null>(null);

  // Analytics & Report Card state
  const [analytics, setAnalytics] = useState<ClassPerformanceAnalytics | null>(null);
  const [studentResults, setStudentResults] = useState<StudentExamResult[]>([]);
  const [reportCardData, setReportCardData] = useState<ReportCardData | null>(null);
  const [isReportCardModalOpen, setIsReportCardModalOpen] = useState(false);

  // Modals state
  const [isCreateExamModalOpen, setIsCreateExamModalOpen] = useState(false);
  const [isAddSubjectModalOpen, setIsAddSubjectModalOpen] = useState(false);
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [isCorrectionModalOpen, setIsCorrectionModalOpen] = useState(false);
  const [selectedStudentForCorrection, setSelectedStudentForCorrection] = useState<RosterStudent | null>(null);
  const [isGradingScaleModalOpen, setIsGradingScaleModalOpen] = useState(false);
  const [gradingScales, setGradingScales] = useState<GradingScale[]>([]);

  // Form states
  const [newExamForm, setNewExamForm] = useState({
    name: '',
    examType: 'midterm',
    term: 'Term 1',
    startDate: '2026-11-01',
    endDate: '2026-11-10',
    description: '',
    instructions: '',
  });

  const [newSubjectForm, setNewSubjectForm] = useState({
    subjectName: 'Advanced Mathematics',
    examDate: '2026-11-02',
    startTime: '09:00',
    endTime: '11:30',
    maxMarks: 100,
    passMarks: 40,
    room: 'Hall A',
  });

  const [correctionForm, setCorrectionForm] = useState({
    newMarks: 85,
    reason: '',
    remarks: '',
  });

  // Load exams
  const loadExams = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await examService.getExams({
        search: searchQuery || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
      });
      setExams(data);
      if (data.length > 0 && !selectedExamId) {
        setSelectedExamId(data[0]._id);
        setSelectedExam(data[0]);
      }
    } catch (err: any) {
      console.error('Failed to load exams', err);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, statusFilter, selectedExamId]);

  useEffect(() => {
    loadExams();
  }, [loadExams]);

  // When selected exam changes, load its subjects and verification
  useEffect(() => {
    if (!selectedExamId) return;
    const match = exams.find((e) => e._id === selectedExamId);
    if (match) setSelectedExam(match);

    examService.getExamSubjects(selectedExamId).then((subs) => {
      setExamSubjects(subs);
      if (subs.length > 0 && !selectedSubjectId) {
        setSelectedSubjectId(subs[0]._id);
      }
    });

    examService.verifyMarks(selectedExamId).then(setVerificationData);
    examService.getClassAnalytics(selectedExamId).then((res) => {
      setAnalytics(res.analytics);
      setStudentResults(res.studentResults);
    });
  }, [selectedExamId, exams]);

  // When selected subject changes, load roster and marks
  useEffect(() => {
    if (!selectedExamId || !selectedSubjectId) return;
    examService.getRosterAndMarks(selectedExamId, selectedSubjectId).then((data) => {
      setRoster(data.roster);
    });
  }, [selectedExamId, selectedSubjectId]);

  // Load grading scale
  useEffect(() => {
    examService.getGradingScales().then(setGradingScales);
  }, []);

  // Handle Mark input change
  const handleMarkChange = (studentId: string, val: string) => {
    const num = val === '' ? undefined : Number(val);
    setRoster((prev) =>
      prev.map((r) =>
        r.studentId === studentId
          ? {
              ...r,
              marksObtained: num,
              isAbsent: num !== undefined ? false : r.isAbsent,
              isExempt: num !== undefined ? false : r.isExempt,
            }
          : r
      )
    );
  };

  const handleAbsentToggle = (studentId: string) => {
    setRoster((prev) =>
      prev.map((r) =>
        r.studentId === studentId
          ? {
              ...r,
              isAbsent: !r.isAbsent,
              isExempt: false,
              marksObtained: !r.isAbsent ? 0 : undefined,
            }
          : r
      )
    );
  };

  const handleExemptToggle = (studentId: string) => {
    setRoster((prev) =>
      prev.map((r) =>
        r.studentId === studentId
          ? {
              ...r,
              isExempt: !r.isExempt,
              isAbsent: false,
              marksObtained: undefined,
            }
          : r
      )
    );
  };

  const handleRemarksChange = (studentId: string, remarks: string) => {
    setRoster((prev) =>
      prev.map((r) => (r.studentId === studentId ? { ...r, remarks } : r))
    );
  };

  // Save marks
  const handleSaveMarks = async (saveAs: 'draft' | 'submitted') => {
    if (!selectedExamId || !selectedSubjectId) return;
    setIsSavingMarks(true);
    setMarksFeedback(null);
    try {
      const payload = {
        saveAs,
        marks: roster.map((r) => ({
          studentId: r.studentId,
          marksObtained: r.marksObtained,
          isAbsent: r.isAbsent,
          isExempt: r.isExempt,
          remarks: r.remarks,
        })),
      };
      await examService.bulkSaveMarks(selectedExamId, selectedSubjectId, payload);
      setMarksFeedback({
        type: 'success',
        message: `Successfully saved ${roster.length} student marks as ${saveAs}.`,
      });
      // Refresh verification
      examService.verifyMarks(selectedExamId).then(setVerificationData);
    } catch (err: any) {
      setMarksFeedback({
        type: 'error',
        message: err.response?.data?.message || err.message || 'Failed to save marks',
      });
    } finally {
      setIsSavingMarks(false);
    }
  };

  // Publish exam
  const handlePublishExam = async () => {
    if (!selectedExamId) return;
    try {
      const updated = await examService.publishExam(selectedExamId);
      setSelectedExam(updated);
      setExams((prev) => prev.map((e) => (e._id === updated._id ? updated : e)));
      setIsPublishModalOpen(false);
      examService.getClassAnalytics(selectedExamId).then((res) => {
        setAnalytics(res.analytics);
        setStudentResults(res.studentResults);
      });
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Error publishing exam');
    }
  };

  // Submit correction
  const handleSaveCorrection = async () => {
    if (!selectedStudentForCorrection || !selectedStudentForCorrection.markId) return;
    if (!correctionForm.reason.trim()) {
      alert('A compliance reason is required for correcting published marks.');
      return;
    }
    try {
      await examService.correctMark(selectedStudentForCorrection.markId, {
        marksObtained: Number(correctionForm.newMarks),
        reason: correctionForm.reason,
        remarks: correctionForm.remarks,
      });
      setIsCorrectionModalOpen(false);
      // Refresh roster & analytics
      if (selectedSubjectId) {
        examService.getRosterAndMarks(selectedExamId, selectedSubjectId).then((d) => setRoster(d.roster));
      }
      examService.getClassAnalytics(selectedExamId).then((res) => {
        setAnalytics(res.analytics);
        setStudentResults(res.studentResults);
      });
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Failed to correct mark');
    }
  };

  // Open report card
  const handleOpenReportCard = async (studentId: string) => {
    if (!selectedExamId) return;
    try {
      const data = await examService.getReportCard(selectedExamId, studentId);
      setReportCardData(data);
      setIsReportCardModalOpen(true);
    } catch (err: any) {
      alert('Unable to load student report card');
    }
  };

  // Helper for status badge
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'published':
        return <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">Published</Badge>;
      case 'ongoing':
        return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20">Ongoing</Badge>;
      case 'completed':
        return <Badge className="bg-purple-500/10 text-purple-500 border-purple-500/20">Completed</Badge>;
      case 'scheduled':
        return <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20">Scheduled</Badge>;
      case 'draft':
      default:
        return <Badge className="bg-muted text-muted-foreground">Draft</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Examinations & Grading Management"
        description="Schedule examination timetables, record marks scorecards, configure grading scales, and publish report cards."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsGradingScaleModalOpen(true)}
              className="flex items-center gap-1.5"
            >
              <Sliders className="h-4 w-4" />
              Grading Scale
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={loadExams}
              className="flex items-center gap-1.5"
            >
              <RotateCw className="h-4 w-4" />
              Refresh
            </Button>
            <Button
              size="sm"
              onClick={() => setIsCreateExamModalOpen(true)}
              className="flex items-center gap-1.5 bg-primary text-primary-foreground"
            >
              <Plus className="h-4 w-4" />
              New Examination
            </Button>
          </div>
        }
      />

      {/* Main Tabs Navigation */}
      <div className="flex flex-wrap items-center border-b border-border bg-card/50 p-1.5 rounded-lg gap-1">
        <button
          onClick={() => setActiveTab('exams')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            activeTab === 'exams' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted'
          }`}
        >
          <FileCheck2 className="h-4 w-4" />
          Examinations ({exams.length})
        </button>
        <button
          onClick={() => setActiveTab('subjects')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            activeTab === 'subjects' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted'
          }`}
        >
          <Calendar className="h-4 w-4" />
          Subject Schedules ({examSubjects.length})
        </button>
        <button
          onClick={() => setActiveTab('marks')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            activeTab === 'marks' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted'
          }`}
        >
          <Edit3 className="h-4 w-4" />
          Marks Entry Roster
        </button>
        <button
          onClick={() => setActiveTab('verify')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            activeTab === 'verify' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted'
          }`}
        >
          <CheckCircle2 className="h-4 w-4" />
          Verification & Publication
        </button>
        <button
          onClick={() => setActiveTab('results')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            activeTab === 'results' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted'
          }`}
        >
          <TrendingUp className="h-4 w-4" />
          Analytics & Report Cards
        </button>
      </div>

      {/* Active Exam Selector Strip */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl border bg-card/60 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-muted-foreground">Active Examination:</span>
          <select
            value={selectedExamId}
            onChange={(e) => {
              setSelectedExamId(e.target.value);
              const found = exams.find((x) => x._id === e.target.value);
              if (found) setSelectedExam(found);
            }}
            className="px-3 py-1.5 text-sm font-medium rounded-lg border bg-background text-foreground focus:ring-2 focus:ring-primary"
          >
            {exams.map((ex) => (
              <option key={ex._id} value={ex._id}>
                {ex.name} ({ex.status.toUpperCase()})
              </option>
            ))}
          </select>
        </div>

        {selectedExam && (
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>
              Dates: <strong className="text-foreground">{new Date(selectedExam.startDate).toLocaleDateString()} - {new Date(selectedExam.endDate).toLocaleDateString()}</strong>
            </span>
            <span>•</span>
            <span>Type: <strong className="text-foreground">{selectedExam.examType.toUpperCase()}</strong></span>
            <span>•</span>
            <span>Status: {renderStatusBadge(selectedExam.status)}</span>
          </div>
        )}
      </div>

      {/* TAB 1: EXAMINATIONS DIRECTORY */}
      {activeTab === 'exams' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Input
              placeholder="Search examinations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-sm"
            />
            <div className="flex items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-1.5 text-sm rounded-lg border bg-background text-foreground"
              >
                <option value="all">All Statuses</option>
                <option value="draft">Draft</option>
                <option value="scheduled">Scheduled</option>
                <option value="ongoing">Ongoing</option>
                <option value="completed">Completed</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : exams.length === 0 ? (
            <EmptyState
              title="No examinations found"
              description="Create a new examination schedule to manage subjects, marks, and report cards."
              actionLabel="Create Examination"
              onAction={() => setIsCreateExamModalOpen(true)}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {exams.map((exam) => (
                <div
                  key={exam._id}
                  onClick={() => {
                    setSelectedExamId(exam._id);
                    setSelectedExam(exam);
                  }}
                  className={`cursor-pointer rounded-xl border p-5 transition-all shadow-sm ${
                    selectedExamId === exam._id
                      ? 'border-primary ring-2 ring-primary/20 bg-primary/5'
                      : 'border-border bg-card hover:border-primary/40'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-foreground text-base line-clamp-1">{exam.name}</h3>
                    {renderStatusBadge(exam.status)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{exam.description || 'No description provided.'}</p>

                  <div className="mt-4 pt-3 border-t border-border/60 text-xs space-y-1.5 text-muted-foreground">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> Timeline:</span>
                      <span className="text-foreground font-medium">
                        {new Date(exam.startDate).toLocaleDateString()} - {new Date(exam.endDate).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5"><BookOpen className="h-3.5 w-3.5" /> Type:</span>
                      <span className="text-foreground font-medium">{exam.examType.toUpperCase()}</span>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-end gap-2 pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-7"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedExamId(exam._id);
                        setActiveTab('subjects');
                      }}
                    >
                      Schedules
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-7"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedExamId(exam._id);
                        setActiveTab('marks');
                      }}
                    >
                      Marks
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: EXAM SUBJECTS & SCHEDULES */}
      {activeTab === 'subjects' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-foreground">
                Scheduled Subjects for {selectedExam?.name}
              </h3>
              <p className="text-xs text-muted-foreground">
                Manage subject dates, time slots, maximum marks snapshot, and assigned exam rooms.
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => setIsAddSubjectModalOpen(true)}
              className="flex items-center gap-1.5"
            >
              <Plus className="h-4 w-4" />
              Schedule Subject
            </Button>
          </div>

          {examSubjects.length === 0 ? (
            <EmptyState
              title="No subjects scheduled"
              description="Add subjects, paper timings, and maximum marks to this examination."
              actionLabel="Schedule First Subject"
              onAction={() => setIsAddSubjectModalOpen(true)}
            />
          ) : (
            <div className="rounded-xl border bg-card overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/50 border-b border-border text-xs text-muted-foreground uppercase font-semibold">
                  <tr>
                    <th className="p-4">Subject</th>
                    <th className="p-4">Exam Date</th>
                    <th className="p-4">Time Window</th>
                    <th className="p-4">Marks (Max / Pass)</th>
                    <th className="p-4">Room & Examiner</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {examSubjects.map((sub) => {
                    const subInfo = sub.subjectId as any;
                    const teacherInfo = sub.teacherId as any;
                    return (
                      <tr key={sub._id} className="hover:bg-muted/20">
                        <td className="p-4 font-medium text-foreground">
                          {subInfo?.name || 'Subject'}
                          <span className="block text-xs text-muted-foreground">{subInfo?.code || ''}</span>
                        </td>
                        <td className="p-4 text-foreground">
                          {new Date(sub.examDate).toLocaleDateString(undefined, {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </td>
                        <td className="p-4">
                          <span className="font-mono text-xs bg-muted px-2 py-1 rounded">
                            {sub.startTime} - {sub.endTime}
                          </span>
                        </td>
                        <td className="p-4 font-medium">
                          <span className="text-foreground">{sub.maxMarks}</span>
                          <span className="text-muted-foreground text-xs ml-1">(Pass: {sub.passMarks})</span>
                        </td>
                        <td className="p-4 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {sub.room || 'TBD'}</div>
                          <div className="flex items-center gap-1 mt-0.5"><User className="h-3 w-3" /> {teacherInfo ? `${teacherInfo.firstName || ''} ${teacherInfo.lastName || ''}`.trim() : 'Unassigned'}</div>
                        </td>
                        <td className="p-4 text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs"
                            onClick={() => {
                              setSelectedSubjectId(sub._id);
                              setActiveTab('marks');
                            }}
                          >
                            Enter Marks
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: MARKS ENTRY ROSTER */}
      {activeTab === 'marks' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl border bg-card">
            <div className="flex flex-wrap items-center gap-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">Select Subject:</label>
                <select
                  value={selectedSubjectId}
                  onChange={(e) => setSelectedSubjectId(e.target.value)}
                  className="px-3 py-1.5 text-sm font-medium rounded-lg border bg-background text-foreground"
                >
                  {examSubjects.map((s) => (
                    <option key={s._id} value={s._id}>
                      {(s.subjectId as any)?.name || 'Subject'} (Max: {s.maxMarks})
                    </option>
                  ))}
                </select>
              </div>

              <div className="text-xs space-y-1">
                <span className="text-muted-foreground">Class Cohort:</span>
                <span className="block font-semibold text-foreground">Grade 10 - Section A</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={isSavingMarks || selectedExam?.status === 'published'}
                onClick={() => handleSaveMarks('draft')}
              >
                Save Draft
              </Button>
              <Button
                size="sm"
                disabled={isSavingMarks || selectedExam?.status === 'published'}
                onClick={() => handleSaveMarks('submitted')}
                className="bg-primary text-primary-foreground"
              >
                Submit Marks
              </Button>
            </div>
          </div>

          {selectedExam?.status === 'published' && (
            <div className="p-3 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-600 text-xs flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 shrink-0" />
              This exam has already been published. Marks are locked against standard edits. To adjust a published score, use the authorized correction workflow below.
            </div>
          )}

          {marksFeedback && (
            <div
              className={`p-3 rounded-lg text-xs font-medium ${
                marksFeedback.type === 'success'
                  ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                  : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
              }`}
            >
              {marksFeedback.message}
            </div>
          )}

          {/* Student Roster Table */}
          <div className="rounded-xl border bg-card overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/50 border-b border-border text-xs text-muted-foreground uppercase font-semibold">
                <tr>
                  <th className="p-3.5">Roll No</th>
                  <th className="p-3.5">Student Name</th>
                  <th className="p-3.5">Admission No</th>
                  <th className="p-3.5">Marks Obtained</th>
                  <th className="p-3.5 text-center">Absent</th>
                  <th className="p-3.5 text-center">Exempt</th>
                  <th className="p-3.5">Remarks</th>
                  <th className="p-3.5 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {roster.map((row) => (
                  <tr key={row.studentId} className="hover:bg-muted/10">
                    <td className="p-3.5 font-mono text-xs">{row.rollNumber || '-'}</td>
                    <td className="p-3.5 font-medium text-foreground">{row.name}</td>
                    <td className="p-3.5 text-xs text-muted-foreground">{row.admissionNumber}</td>
                    <td className="p-3.5">
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        disabled={row.isAbsent || row.isExempt || selectedExam?.status === 'published'}
                        value={row.marksObtained !== undefined ? row.marksObtained : ''}
                        onChange={(e) => handleMarkChange(row.studentId, e.target.value)}
                        placeholder="0 - 100"
                        className="w-24 h-8 text-sm"
                      />
                    </td>
                    <td className="p-3.5 text-center">
                      <input
                        type="checkbox"
                        disabled={selectedExam?.status === 'published'}
                        checked={row.isAbsent}
                        onChange={() => handleAbsentToggle(row.studentId)}
                        className="rounded border-border"
                      />
                    </td>
                    <td className="p-3.5 text-center">
                      <input
                        type="checkbox"
                        disabled={selectedExam?.status === 'published'}
                        checked={row.isExempt}
                        onChange={() => handleExemptToggle(row.studentId)}
                        className="rounded border-border"
                      />
                    </td>
                    <td className="p-3.5">
                      <Input
                        type="text"
                        disabled={selectedExam?.status === 'published'}
                        value={row.remarks || ''}
                        onChange={(e) => handleRemarksChange(row.studentId, e.target.value)}
                        placeholder="Optional remarks"
                        className="h-8 text-xs max-w-xs"
                      />
                    </td>
                    <td className="p-3.5 text-right">
                      {selectedExam?.status === 'published' ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs text-primary"
                          onClick={() => {
                            setSelectedStudentForCorrection(row);
                            setCorrectionForm({
                              newMarks: row.marksObtained ?? 0,
                              reason: '',
                              remarks: row.remarks || '',
                            });
                            setIsCorrectionModalOpen(true);
                          }}
                        >
                          Correct Mark
                        </Button>
                      ) : (
                        <Badge variant="outline" className="text-xs">
                          {row.publicationStatus}
                        </Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: VERIFICATION & PUBLICATION */}
      {activeTab === 'verify' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-xl border bg-card p-5">
              <span className="text-xs font-medium text-muted-foreground">Total Eligible Students</span>
              <div className="text-2xl font-bold text-foreground mt-1">
                {verificationData?.totalEligibleStudents || 0}
              </div>
            </div>
            <div className="rounded-xl border bg-card p-5">
              <span className="text-xs font-medium text-muted-foreground">Complete Marks Profiles</span>
              <div className="text-2xl font-bold text-emerald-500 mt-1">
                {verificationData?.completeCount || 0}
              </div>
            </div>
            <div className="rounded-xl border bg-card p-5">
              <span className="text-xs font-medium text-muted-foreground">Incomplete Profiles</span>
              <div className="text-2xl font-bold text-amber-500 mt-1">
                {verificationData?.incompleteCount || 0}
              </div>
            </div>
          </div>

          {/* Publication Readiness Card */}
          <div className="rounded-xl border bg-card p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-lg text-foreground">Publication Status & Readiness</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Once published, results will be visible to students and parents, and student report cards become accessible.
                </p>
              </div>

              {selectedExam?.status === 'published' ? (
                <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-sm px-3 py-1">
                  Already Published
                </Badge>
              ) : verificationData?.isReadyForPublication ? (
                <Button
                  onClick={() => setIsPublishModalOpen(true)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2"
                >
                  <Award className="h-4 w-4" />
                  Publish Examination Results
                </Button>
              ) : (
                <Button disabled className="opacity-50 cursor-not-allowed">
                  Publishing Blocked (Incomplete)
                </Button>
              )}
            </div>

            {verificationData?.missingEntriesCount && verificationData.missingEntriesCount > 0 ? (
              <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-4 text-xs space-y-2">
                <div className="flex items-center gap-2 font-semibold text-rose-500">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  Missing Marks Detected ({verificationData.missingEntriesCount} entries)
                </div>
                <p className="text-rose-400">
                  Examination results cannot be published until every enrolled student has a recorded score, or is explicitly flagged as absent or exempt.
                </p>
              </div>
            ) : (
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs text-emerald-500 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                All student scores are complete and accounted for. This examination is eligible for immediate official publication.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 5: RESULTS & REPORT CARDS */}
      {activeTab === 'results' && (
        <div className="space-y-6">
          {analytics && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="rounded-xl border bg-card p-4">
                <span className="text-xs text-muted-foreground font-medium">Class Average</span>
                <div className="text-2xl font-bold text-foreground mt-1">{analytics.classAveragePercentage}%</div>
              </div>
              <div className="rounded-xl border bg-card p-4">
                <span className="text-xs text-muted-foreground font-medium">Pass Percentage</span>
                <div className="text-2xl font-bold text-emerald-500 mt-1">{analytics.passPercentage}%</div>
              </div>
              <div className="rounded-xl border bg-card p-4">
                <span className="text-xs text-muted-foreground font-medium">Top Score</span>
                <div className="text-2xl font-bold text-primary mt-1">{analytics.highestPercentage}%</div>
              </div>
              <div className="rounded-xl border bg-card p-4">
                <span className="text-xs text-muted-foreground font-medium">Lowest Score</span>
                <div className="text-2xl font-bold text-amber-500 mt-1">{analytics.lowestPercentage}%</div>
              </div>
            </div>
          )}

          {/* Student Performance Roster */}
          <div className="rounded-xl border bg-card overflow-hidden">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-foreground">Official Examination Results Roster</h4>
                <p className="text-xs text-muted-foreground">Class-wide aggregated scores and final report cards.</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  window.open(`/api/exams/${selectedExamId}/export-csv`, '_blank');
                }}
                className="flex items-center gap-1.5"
              >
                <Download className="h-4 w-4" />
                Export CSV
              </Button>
            </div>

            <table className="w-full text-left text-sm">
              <thead className="bg-muted/50 border-b border-border text-xs text-muted-foreground uppercase font-semibold">
                <tr>
                  <th className="p-3.5">Roll No</th>
                  <th className="p-3.5">Student</th>
                  <th className="p-3.5">Admission No</th>
                  <th className="p-3.5">Total Obtained</th>
                  <th className="p-3.5">Percentage</th>
                  <th className="p-3.5">Grade</th>
                  <th className="p-3.5">Result</th>
                  <th className="p-3.5 text-right">Report Card</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {studentResults.map((sr) => (
                  <tr key={sr.studentId} className="hover:bg-muted/10">
                    <td className="p-3.5 font-mono text-xs">{sr.rollNumber || '-'}</td>
                    <td className="p-3.5 font-medium text-foreground">{sr.studentName}</td>
                    <td className="p-3.5 text-xs text-muted-foreground">{sr.admissionNumber}</td>
                    <td className="p-3.5 font-mono">
                      {sr.totalMarksObtained} / {sr.totalMaxMarks}
                    </td>
                    <td className="p-3.5 font-semibold text-foreground">{sr.overallPercentage}%</td>
                    <td className="p-3.5">
                      <span className="px-2 py-0.5 rounded text-xs font-bold bg-primary/10 text-primary">
                        {sr.overallGrade}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <Badge
                        className={
                          sr.overallResult === 'PASS'
                            ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                            : sr.overallResult === 'FAIL'
                            ? 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                            : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                        }
                      >
                        {sr.overallResult}
                      </Badge>
                    </td>
                    <td className="p-3.5 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenReportCard(sr.studentId)}
                        className="h-8 text-xs flex items-center gap-1.5"
                      >
                        <Printer className="h-3.5 w-3.5" />
                        Report Card
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CREATE EXAM MODAL */}
      <Dialog
        isOpen={isCreateExamModalOpen}
        onClose={() => setIsCreateExamModalOpen(false)}
        title="Schedule New Examination"
        description="Configure academic examination session, timeline dates, and instructions."
      >
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1">Examination Name</label>
            <Input
              value={newExamForm.name}
              onChange={(e) => setNewExamForm({ ...newExamForm, name: e.target.value })}
              placeholder="e.g. Winter Midterms 2026"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">Exam Type</label>
              <select
                value={newExamForm.examType}
                onChange={(e) => setNewExamForm({ ...newExamForm, examType: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border bg-background text-foreground"
              >
                <option value="monthly_test">Monthly Test</option>
                <option value="midterm">Midterm</option>
                <option value="final">Final Exam</option>
                <option value="quiz">Quiz</option>
                <option value="practical">Practical / Lab</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">Academic Term</label>
              <Input
                value={newExamForm.term}
                onChange={(e) => setNewExamForm({ ...newExamForm, term: e.target.value })}
                placeholder="e.g. Term 1"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">Start Date</label>
              <Input
                type="date"
                value={newExamForm.startDate}
                onChange={(e) => setNewExamForm({ ...newExamForm, startDate: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">End Date</label>
              <Input
                type="date"
                value={newExamForm.endDate}
                onChange={(e) => setNewExamForm({ ...newExamForm, endDate: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1">Description</label>
            <Input
              value={newExamForm.description}
              onChange={(e) => setNewExamForm({ ...newExamForm, description: e.target.value })}
              placeholder="Scope of examination..."
            />
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <Button variant="outline" onClick={() => setIsCreateExamModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!newExamForm.name) return;
                await examService.createExam(newExamForm as any);
                setIsCreateExamModalOpen(false);
                loadExams();
              }}
              className="bg-primary text-primary-foreground"
            >
              Create Exam
            </Button>
          </div>
        </div>
      </Dialog>

      {/* SCHEDULE SUBJECT MODAL */}
      <Dialog
        isOpen={isAddSubjectModalOpen}
        onClose={() => setIsAddSubjectModalOpen(false)}
        title="Schedule Exam Subject Slot"
        description="Assign examination date, paper timings, passing mark threshold, and room."
      >
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1">Subject</label>
            <Input
              value={newSubjectForm.subjectName}
              onChange={(e) => setNewSubjectForm({ ...newSubjectForm, subjectName: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">Exam Date</label>
              <Input
                type="date"
                value={newSubjectForm.examDate}
                onChange={(e) => setNewSubjectForm({ ...newSubjectForm, examDate: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">Start Time</label>
              <Input
                type="time"
                value={newSubjectForm.startTime}
                onChange={(e) => setNewSubjectForm({ ...newSubjectForm, startTime: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">End Time</label>
              <Input
                type="time"
                value={newSubjectForm.endTime}
                onChange={(e) => setNewSubjectForm({ ...newSubjectForm, endTime: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">Maximum Marks</label>
              <Input
                type="number"
                value={newSubjectForm.maxMarks}
                onChange={(e) => setNewSubjectForm({ ...newSubjectForm, maxMarks: Number(e.target.value) })}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">Passing Marks</label>
              <Input
                type="number"
                value={newSubjectForm.passMarks}
                onChange={(e) => setNewSubjectForm({ ...newSubjectForm, passMarks: Number(e.target.value) })}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">Room</label>
              <Input
                value={newSubjectForm.room}
                onChange={(e) => setNewSubjectForm({ ...newSubjectForm, room: e.target.value })}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <Button variant="outline" onClick={() => setIsAddSubjectModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!selectedExamId) return;
                await examService.createExamSubject(selectedExamId, {
                  startTime: newSubjectForm.startTime,
                  endTime: newSubjectForm.endTime,
                  examDate: newSubjectForm.examDate,
                  maxMarks: newSubjectForm.maxMarks,
                  passMarks: newSubjectForm.passMarks,
                  room: newSubjectForm.room,
                });
                setIsAddSubjectModalOpen(false);
                examService.getExamSubjects(selectedExamId).then(setExamSubjects);
              }}
              className="bg-primary text-primary-foreground"
            >
              Save Schedule
            </Button>
          </div>
        </div>
      </Dialog>

      {/* PUBLISH CONFIRMATION MODAL */}
      <Dialog
        isOpen={isPublishModalOpen}
        onClose={() => setIsPublishModalOpen(false)}
        title="Publish Examination Results"
        description="Are you sure you want to officially publish these examination results?"
      >
        <div className="space-y-4">
          <p className="text-sm text-foreground">
            Publishing results will lock all student scores against ordinary edits and make them immediately visible on student and parent dashboards.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setIsPublishModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handlePublishExam} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              Confirm Publication
            </Button>
          </div>
        </div>
      </Dialog>

      {/* POST-PUBLICATION MARK CORRECTION MODAL */}
      <Dialog
        isOpen={isCorrectionModalOpen}
        onClose={() => setIsCorrectionModalOpen(false)}
        title="Post-Publication Mark Correction"
        description={`Audit-logged score correction for ${selectedStudentForCorrection?.name}`}
      >
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1">Corrected Marks</label>
            <Input
              type="number"
              min="0"
              max="100"
              value={correctionForm.newMarks}
              onChange={(e) => setCorrectionForm({ ...correctionForm, newMarks: Number(e.target.value) })}
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1">
              Compliance Reason <span className="text-rose-500">*</span>
            </label>
            <Input
              value={correctionForm.reason}
              onChange={(e) => setCorrectionForm({ ...correctionForm, reason: e.target.value })}
              placeholder="e.g. Recount requested by examiner - 3 marks reinstated"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1">Updated Remarks</label>
            <Input
              value={correctionForm.remarks}
              onChange={(e) => setCorrectionForm({ ...correctionForm, remarks: e.target.value })}
              placeholder="Optional remarks"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setIsCorrectionModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveCorrection} className="bg-primary text-primary-foreground">
              Save Correction
            </Button>
          </div>
        </div>
      </Dialog>

      {/* REPORT CARD MODAL (Print-Friendly) */}
      <Dialog
        isOpen={isReportCardModalOpen}
        onClose={() => setIsReportCardModalOpen(false)}
        title="Student Academic Report Card"
        className="max-w-3xl"
      >
        {reportCardData && (
          <div className="space-y-6 print:m-0 print:p-0">
            {/* Printable Report Header */}
            <div className="text-center pb-4 border-b border-border space-y-1">
              <h2 className="text-xl font-bold text-foreground">{reportCardData.school.name}</h2>
              <p className="text-xs text-muted-foreground">Official Academic Progress Report</p>
              <p className="text-xs font-semibold text-primary">{reportCardData.exam.name} ({reportCardData.exam.academicSessionName})</p>
            </div>

            {/* Student & Class Meta */}
            <div className="grid grid-cols-2 gap-4 text-xs bg-muted/30 p-3 rounded-lg border border-border">
              <div>
                <span className="text-muted-foreground">Student Name:</span>{' '}
                <strong className="text-foreground">{reportCardData.student.name}</strong>
              </div>
              <div>
                <span className="text-muted-foreground">Admission No:</span>{' '}
                <strong className="text-foreground">{reportCardData.student.admissionNumber}</strong>
              </div>
              <div>
                <span className="text-muted-foreground">Class & Section:</span>{' '}
                <strong className="text-foreground">{reportCardData.student.className} - {reportCardData.student.sectionName}</strong>
              </div>
              <div>
                <span className="text-muted-foreground">Roll No:</span>{' '}
                <strong className="text-foreground">{reportCardData.student.rollNumber || 'N/A'}</strong>
              </div>
            </div>

            {/* Subject Marks Breakdown */}
            <div className="rounded-lg border bg-card overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted border-b border-border font-semibold uppercase text-muted-foreground">
                  <tr>
                    <th className="p-2.5">Subject</th>
                    <th className="p-2.5">Max Marks</th>
                    <th className="p-2.5">Pass Marks</th>
                    <th className="p-2.5">Marks Obtained</th>
                    <th className="p-2.5">Percentage</th>
                    <th className="p-2.5">Grade</th>
                    <th className="p-2.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {reportCardData.result.subjectResults.map((sub) => (
                    <tr key={sub.examSubjectId}>
                      <td className="p-2.5 font-medium text-foreground">{sub.subjectName}</td>
                      <td className="p-2.5">{sub.maxMarks}</td>
                      <td className="p-2.5">{sub.passMarks}</td>
                      <td className="p-2.5 font-bold text-foreground">
                        {sub.status === 'ABSENT' ? 'ABSENT' : sub.status === 'EXEMPT' ? 'EXEMPT' : sub.marksObtained}
                      </td>
                      <td className="p-2.5">{sub.percentage !== undefined ? `${sub.percentage}%` : '-'}</td>
                      <td className="p-2.5 font-bold text-primary">{sub.grade || '-'}</td>
                      <td className="p-2.5">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                            sub.isPassed ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'
                          }`}
                        >
                          {sub.isPassed ? 'PASS' : 'FAIL'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Overall Summary */}
            <div className="flex flex-wrap items-center justify-between p-4 rounded-lg border bg-muted/30">
              <div className="space-y-0.5 text-xs">
                <div>Total Marks: <strong>{reportCardData.result.totalMarksObtained} / {reportCardData.result.totalMaxMarks}</strong></div>
                <div>Overall Percentage: <strong>{reportCardData.result.overallPercentage}%</strong></div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right text-xs">
                  <span className="text-muted-foreground block">Overall Result:</span>
                  <span className="text-sm font-bold text-emerald-500">{reportCardData.result.overallResult}</span>
                </div>
                <div className="text-right text-xs">
                  <span className="text-muted-foreground block">Overall Grade:</span>
                  <span className="text-sm font-bold text-primary">{reportCardData.result.overallGrade}</span>
                </div>
              </div>
            </div>

            {/* Print & Close Actions */}
            <div className="flex justify-end gap-2 pt-2 print:hidden">
              <Button variant="outline" onClick={() => setIsReportCardModalOpen(false)}>
                Close
              </Button>
              <Button onClick={() => window.print()} className="flex items-center gap-1.5 bg-primary text-primary-foreground">
                <Printer className="h-4 w-4" />
                Print / Save PDF
              </Button>
            </div>
          </div>
        )}
      </Dialog>

      {/* GRADING SCALE MODAL */}
      <Dialog
        isOpen={isGradingScaleModalOpen}
        onClose={() => setIsGradingScaleModalOpen(false)}
        title="Configurable Grading Scales"
        description="Active grading bands, GPA grade-point values, and passing thresholds."
      >
        <div className="space-y-4">
          {gradingScales.map((scale) => (
            <div key={scale._id} className="rounded-lg border p-4 bg-card space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-sm text-foreground">{scale.name}</h4>
                {scale.isDefault && (
                  <Badge className="bg-primary/10 text-primary border-primary/20 text-xs">Default Scale</Badge>
                )}
              </div>

              <div className="rounded border overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted font-semibold uppercase text-muted-foreground">
                    <tr>
                      <th className="p-2">Grade</th>
                      <th className="p-2">Percentage Band</th>
                      <th className="p-2">Grade Point</th>
                      <th className="p-2">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {scale.bands.map((b) => (
                      <tr key={b.grade}>
                        <td className="p-2 font-bold text-primary">{b.grade}</td>
                        <td className="p-2">{b.minPercentage}% - {b.maxPercentage}%</td>
                        <td className="p-2 font-mono">{b.gradePoint !== undefined ? b.gradePoint.toFixed(1) : '-'}</td>
                        <td className="p-2">
                          <span className={b.isPassing ? 'text-emerald-500 font-medium' : 'text-rose-500 font-medium'}>
                            {b.isPassing ? 'Pass' : 'Fail'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}

          <div className="flex justify-end pt-2">
            <Button variant="outline" onClick={() => setIsGradingScaleModalOpen(false)}>
              Close
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
};
