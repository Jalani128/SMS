import React, { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '../../components/shared/PageHeader';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import {
  Calendar,
  Clock,
  MapPin,
  RotateCw,
} from 'lucide-react';
import { examService } from '../../services/exam.service';
import { Exam, ExamSubject, RosterStudent } from '../../types/exam';

export const TeacherExamsPage: React.FC = () => {
  const [exams, setExams] = useState<Exam[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<string>('');
  const [examSubjects, setExamSubjects] = useState<ExamSubject[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [roster, setRoster] = useState<RosterStudent[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Load teacher exams
  const loadTeacherExams = useCallback(async () => {
    try {
      const data = await examService.getExams();
      setExams(data);
      if (data.length > 0 && !selectedExamId) {
        setSelectedExamId(data[0]._id);
      }
    } catch (err: any) {
      console.error('Failed to load exams', err);
    }
  }, [selectedExamId]);

  useEffect(() => {
    loadTeacherExams();
  }, [loadTeacherExams]);

  // Load subjects for selected exam
  useEffect(() => {
    if (!selectedExamId) return;
    examService.getExamSubjects(selectedExamId).then((subs) => {
      setExamSubjects(subs);
      if (subs.length > 0) {
        setSelectedSubjectId(subs[0]._id);
      }
    });
  }, [selectedExamId]);

  // Load marks roster for selected subject
  useEffect(() => {
    if (!selectedExamId || !selectedSubjectId) return;
    examService.getRosterAndMarks(selectedExamId, selectedSubjectId).then((res) => {
      setRoster(res.roster);
    });
  }, [selectedExamId, selectedSubjectId]);

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

  const handleSaveMarks = async (saveAs: 'draft' | 'submitted') => {
    if (!selectedExamId || !selectedSubjectId) return;
    setIsSaving(true);
    setFeedback(null);
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
      setFeedback({
        type: 'success',
        message: `Successfully saved ${roster.length} student scores as ${saveAs}.`,
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || err.message || 'Error saving marks',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const selectedExam = exams.find((e) => e._id === selectedExamId);
  const selectedSubject = examSubjects.find((s) => s._id === selectedSubjectId);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Teacher Examination & Marks Portal"
        description="View your assigned examination papers, room allocations, and submit student marks rosters."
        actions={
          <Button variant="outline" size="sm" onClick={loadTeacherExams} className="flex items-center gap-1.5">
            <RotateCw className="h-4 w-4" />
            Refresh
          </Button>
        }
      />

      {/* Selectors */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl border bg-card">
        <div>
          <label className="text-xs font-semibold text-muted-foreground block mb-1">Select Examination</label>
          <select
            value={selectedExamId}
            onChange={(e) => setSelectedExamId(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-lg border bg-background text-foreground"
          >
            {exams.map((ex) => (
              <option key={ex._id} value={ex._id}>
                {ex.name} ({ex.status.toUpperCase()})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-semibold text-muted-foreground block mb-1">Assigned Subject</label>
          <select
            value={selectedSubjectId}
            onChange={(e) => setSelectedSubjectId(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-lg border bg-background text-foreground"
          >
            {examSubjects.map((s) => (
              <option key={s._id} value={s._id}>
                {(s.subjectId as any)?.name || 'Subject'} - Max: {s.maxMarks}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Selected Subject Banner */}
      {selectedSubject && (
        <div className="p-4 rounded-xl border bg-primary/5 border-primary/20 flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-xs font-semibold uppercase text-primary tracking-wide">Examination Paper</span>
            <h3 className="text-base font-bold text-foreground">
              {(selectedSubject.subjectId as any)?.name || 'Subject'}
            </h3>
            <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground mt-1">
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {new Date(selectedSubject.examDate).toLocaleDateString()}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {selectedSubject.startTime} - {selectedSubject.endTime}
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {selectedSubject.room || 'Main Hall'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={isSaving || selectedExam?.status === 'published'}
              onClick={() => handleSaveMarks('draft')}
            >
              Save Draft
            </Button>
            <Button
              size="sm"
              disabled={isSaving || selectedExam?.status === 'published'}
              onClick={() => handleSaveMarks('submitted')}
              className="bg-primary text-primary-foreground"
            >
              Submit for Verification
            </Button>
          </div>
        </div>
      )}

      {feedback && (
        <div
          className={`p-3 rounded-lg text-xs font-medium ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
              : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
          }`}
        >
          {feedback.message}
        </div>
      )}

      {/* Student Roster Marks Table */}
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
              <th className="p-3.5">Teacher Remarks</th>
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
                    max={selectedSubject?.maxMarks || 100}
                    disabled={row.isAbsent || row.isExempt || selectedExam?.status === 'published'}
                    value={row.marksObtained !== undefined ? row.marksObtained : ''}
                    onChange={(e) => handleMarkChange(row.studentId, e.target.value)}
                    placeholder={`0 - ${selectedSubject?.maxMarks || 100}`}
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
                    onChange={(e) => {
                      const text = e.target.value;
                      setRoster((prev) =>
                        prev.map((r) => (r.studentId === row.studentId ? { ...r, remarks: text } : r))
                      );
                    }}
                    placeholder="Performance note..."
                    className="h-8 text-xs max-w-xs"
                  />
                </td>
                <td className="p-3.5 text-right">
                  <Badge variant="outline" className="text-xs">
                    {row.publicationStatus}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
