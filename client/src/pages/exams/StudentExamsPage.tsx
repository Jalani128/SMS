import React, { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '../../components/shared/PageHeader';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Dialog } from '../../components/ui/Dialog';
import { Skeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import {
  Printer,
  RotateCw,
} from 'lucide-react';
import { examService } from '../../services/exam.service';
import { Exam, ReportCardData } from '../../types/exam';

export const StudentExamsPage: React.FC = () => {
  const [exams, setExams] = useState<Exam[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<string>('');
  const [reportCard, setReportCard] = useState<ReportCardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  const loadStudentResults = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await examService.getExams({ status: 'published' });
      setExams(data);
      if (data.length > 0) {
        setSelectedExamId(data[0]._id);
        const card = await examService.getReportCard(data[0]._id, 'current-student');
        setReportCard(card);
      }
    } catch (err: any) {
      console.error('Failed to load student exam results', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStudentResults();
  }, [loadStudentResults]);

  const handleSelectExam = async (examId: string) => {
    setSelectedExamId(examId);
    try {
      const card = await examService.getReportCard(examId, 'current-student');
      setReportCard(card);
    } catch {
      setReportCard(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Examination Results & Scorecards"
        description="View your published examination results, subject-wise scores, grades, and official printable report cards."
        actions={
          <Button variant="outline" size="sm" onClick={loadStudentResults} className="flex items-center gap-1.5">
            <RotateCw className="h-4 w-4" />
            Refresh
          </Button>
        }
      />

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : exams.length === 0 ? (
        <EmptyState
          title="No Published Results Available"
          description="Your examination scores and report cards will appear here as soon as they are officially verified and published by the school administration."
        />
      ) : (
        <div className="space-y-6">
          {/* Exam Selector */}
          <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl border bg-card">
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-muted-foreground">Select Examination:</span>
              <select
                value={selectedExamId}
                onChange={(e) => handleSelectExam(e.target.value)}
                className="px-3 py-1.5 text-sm font-medium rounded-lg border bg-background text-foreground"
              >
                {exams.map((ex) => (
                  <option key={ex._id} value={ex._id}>
                    {ex.name}
                  </option>
                ))}
              </select>
            </div>

            {reportCard && (
              <Button
                size="sm"
                onClick={() => setIsReportModalOpen(true)}
                className="flex items-center gap-1.5 bg-primary text-primary-foreground"
              >
                <Printer className="h-4 w-4" />
                View & Print Report Card
              </Button>
            )}
          </div>

          {/* Performance Summary Banner */}
          {reportCard && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="rounded-xl border bg-card p-4">
                <span className="text-xs text-muted-foreground font-medium">Total Marks</span>
                <div className="text-2xl font-bold text-foreground mt-1 font-mono">
                  {reportCard.result.totalMarksObtained} / {reportCard.result.totalMaxMarks}
                </div>
              </div>
              <div className="rounded-xl border bg-card p-4">
                <span className="text-xs text-muted-foreground font-medium">Overall Percentage</span>
                <div className="text-2xl font-bold text-primary mt-1">
                  {reportCard.result.overallPercentage}%
                </div>
              </div>
              <div className="rounded-xl border bg-card p-4">
                <span className="text-xs text-muted-foreground font-medium">Grade</span>
                <div className="text-2xl font-bold text-foreground mt-1">
                  <span className="px-2.5 py-0.5 rounded text-lg font-bold bg-primary/10 text-primary">
                    {reportCard.result.overallGrade}
                  </span>
                </div>
              </div>
              <div className="rounded-xl border bg-card p-4">
                <span className="text-xs text-muted-foreground font-medium">Status</span>
                <div className="text-2xl font-bold mt-1">
                  <Badge
                    className={
                      reportCard.result.overallResult === 'PASS'
                        ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-sm'
                        : 'bg-rose-500/10 text-rose-500 border-rose-500/20 text-sm'
                    }
                  >
                    {reportCard.result.overallResult}
                  </Badge>
                </div>
              </div>
            </div>
          )}

          {/* Subject Breakdown Table */}
          {reportCard && (
            <div className="rounded-xl border bg-card overflow-hidden">
              <div className="p-4 border-b border-border">
                <h3 className="font-semibold text-foreground">Subject-Wise Performance Scorecard</h3>
              </div>
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/50 border-b border-border text-xs text-muted-foreground uppercase font-semibold">
                  <tr>
                    <th className="p-3.5">Subject</th>
                    <th className="p-3.5">Max Marks</th>
                    <th className="p-3.5">Pass Marks</th>
                    <th className="p-3.5">Marks Obtained</th>
                    <th className="p-3.5">Percentage</th>
                    <th className="p-3.5">Grade</th>
                    <th className="p-3.5">Result</th>
                    <th className="p-3.5">Teacher Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {reportCard.result.subjectResults.map((sub) => (
                    <tr key={sub.examSubjectId} className="hover:bg-muted/10">
                      <td className="p-3.5 font-medium text-foreground">{sub.subjectName}</td>
                      <td className="p-3.5">{sub.maxMarks}</td>
                      <td className="p-3.5">{sub.passMarks}</td>
                      <td className="p-3.5 font-bold font-mono">
                        {sub.status === 'ABSENT' ? 'ABSENT' : sub.status === 'EXEMPT' ? 'EXEMPT' : sub.marksObtained}
                      </td>
                      <td className="p-3.5">{sub.percentage !== undefined ? `${sub.percentage}%` : '-'}</td>
                      <td className="p-3.5">
                        <span className="font-bold text-primary">{sub.grade || '-'}</span>
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-semibold ${
                            sub.isPassed ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'
                          }`}
                        >
                          {sub.isPassed ? 'PASS' : 'FAIL'}
                        </span>
                      </td>
                      <td className="p-3.5 text-xs text-muted-foreground">{sub.remarks || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Report Card Modal */}
          <Dialog
            isOpen={isReportModalOpen}
            onClose={() => setIsReportModalOpen(false)}
            title="Official Progress Report Card"
            className="max-w-2xl"
          >
            {reportCard && (
              <div className="space-y-5 print:p-0">
                <div className="text-center pb-3 border-b border-border space-y-1">
                  <h2 className="text-xl font-bold text-foreground">{reportCard.school.name}</h2>
                  <p className="text-xs text-muted-foreground">{reportCard.exam.name} - Progress Report</p>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs p-3 rounded-lg border bg-muted/20">
                  <div>Student: <strong>{reportCard.student.name}</strong></div>
                  <div>Admission No: <strong>{reportCard.student.admissionNumber}</strong></div>
                  <div>Class: <strong>{reportCard.student.className} - {reportCard.student.sectionName}</strong></div>
                  <div>Roll No: <strong>{reportCard.student.rollNumber || 'N/A'}</strong></div>
                </div>

                <div className="rounded border overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-muted font-semibold uppercase text-muted-foreground">
                      <tr>
                        <th className="p-2">Subject</th>
                        <th className="p-2">Max</th>
                        <th className="p-2">Obtained</th>
                        <th className="p-2">Grade</th>
                        <th className="p-2">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {reportCard.result.subjectResults.map((s) => (
                        <tr key={s.examSubjectId}>
                          <td className="p-2 font-medium">{s.subjectName}</td>
                          <td className="p-2">{s.maxMarks}</td>
                          <td className="p-2 font-bold">{s.marksObtained ?? s.status}</td>
                          <td className="p-2 font-bold text-primary">{s.grade || '-'}</td>
                          <td className="p-2">
                            <span className={s.isPassed ? 'text-emerald-500 font-bold' : 'text-rose-500 font-bold'}>
                              {s.isPassed ? 'PASS' : 'FAIL'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-between items-center p-3 rounded border bg-muted/20 text-xs">
                  <div>Overall: <strong>{reportCard.result.overallPercentage}% ({reportCard.result.overallGrade})</strong></div>
                  <div>Result: <strong className="text-emerald-500">{reportCard.result.overallResult}</strong></div>
                </div>

                <div className="flex justify-end gap-2 pt-2 print:hidden">
                  <Button variant="outline" onClick={() => setIsReportModalOpen(false)}>
                    Close
                  </Button>
                  <Button onClick={() => window.print()} className="bg-primary text-primary-foreground flex items-center gap-1.5">
                    <Printer className="h-4 w-4" />
                    Print
                  </Button>
                </div>
              </div>
            )}
          </Dialog>
        </div>
      )}
    </div>
  );
};
