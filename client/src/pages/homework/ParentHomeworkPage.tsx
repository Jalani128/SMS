import React, { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '../../components/shared/PageHeader';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Dialog } from '../../components/ui/Dialog';
import { Skeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import {
  BookOpen,
  ClipboardList,
  User,
  RotateCw,
} from 'lucide-react';
import { homeworkService } from '../../services/homework.service';
import { HomeworkItem } from '../../types/homework';

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

export const ParentHomeworkPage: React.FC = () => {
  const [activeWard, setActiveWard] = useState<WardOption>(SAMPLE_WARDS[0]);
  const [homeworkList, setHomeworkList] = useState<HomeworkItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedHw, setSelectedHw] = useState<HomeworkItem | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const loadWardHomework = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await homeworkService.getHomeworkList({ wardId: activeWard.id });
      setHomeworkList(res.data);
    } catch (err) {
      console.error('Failed to load ward homework:', err);
    } finally {
      setIsLoading(false);
    }
  }, [activeWard.id]);

  useEffect(() => {
    loadWardHomework();
  }, [loadWardHomework]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Ward Homework & Academic Assignments"
        description="Monitor your children's coursework, submission timeliness, teacher evaluations, and academic milestones."
        actions={
          <Button variant="outline" size="sm" onClick={loadWardHomework} className="gap-1.5">
            <RotateCw className="h-4 w-4" />
            <span>Refresh</span>
          </Button>
        }
      />

      {/* Multi-Ward Switcher */}
      <div className="flex flex-wrap items-center gap-3 p-3 bg-muted/30 rounded-xl border border-border/80">
        <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
          <User className="h-4 w-4 text-primary" />
          <span>Active Student Profile:</span>
        </span>
        <div className="flex items-center gap-2">
          {SAMPLE_WARDS.map((ward) => (
            <button
              key={ward.id}
              onClick={() => setActiveWard(ward)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeWard.id === ward.id
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-background hover:bg-muted/80 text-foreground border border-border'
              }`}
            >
              {ward.name} ({ward.grade})
            </button>
          ))}
        </div>
      </div>

      {/* Assignments List */}
      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
      ) : homeworkList.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No Coursework Recorded"
          description={`No assignments currently assigned to ${activeWard.name}.`}
        />
      ) : (
        <div className="space-y-3">
          {homeworkList.map((hw) => {
            const subjectName = typeof hw.subjectId === 'object' ? hw.subjectId.name : 'General';
            const sub = hw.studentSubmission;
            const isGraded = sub?.status === 'graded';
            const isSubmitted = !!sub;

            return (
              <div
                key={hw._id}
                className="rounded-xl border border-border/80 bg-card p-4 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px] font-bold">
                      {subjectName}
                    </Badge>
                    <span className="text-xs text-muted-foreground uppercase">
                      Due: {new Date(hw.dueDate).toLocaleDateString()}
                    </span>
                  </div>
                  <h3 className="font-semibold text-sm text-foreground flex items-center gap-1.5">
                    <BookOpen className="h-4 w-4 text-primary shrink-0" />
                    <span>{hw.title}</span>
                  </h3>
                  <p className="text-xs text-muted-foreground line-clamp-1">{hw.instructions}</p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <Badge
                    variant="outline"
                    className={`text-xs capitalize ${
                      isGraded
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                        : isSubmitted
                        ? 'bg-blue-50 text-blue-700 border-blue-300'
                        : 'bg-amber-50 text-amber-700 border-amber-300'
                    }`}
                  >
                    {isGraded
                      ? `Graded: ${sub?.marksObtained} / ${hw.maxMarks}`
                      : isSubmitted
                      ? 'Submitted'
                      : 'Pending Submission'}
                  </Badge>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedHw(hw);
                      setIsDetailModalOpen(true);
                    }}
                    className="text-xs h-8"
                  >
                    View Details
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Details Dialog */}
      <Dialog
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title={selectedHw?.title || 'Assignment Details'}
        description={`Student: ${activeWard.name} | Due Date: ${
          selectedHw ? new Date(selectedHw.dueDate).toLocaleDateString() : ''
        }`}
        className="max-w-md"
      >
        {selectedHw && (
          <div className="space-y-4 pt-2 text-xs">
            <div className="p-3 bg-muted/40 rounded-lg space-y-1">
              <div className="font-semibold text-foreground">Instructions:</div>
              <p className="text-muted-foreground">{selectedHw.instructions}</p>
            </div>

            {selectedHw.studentSubmission ? (
              <div className="p-3 rounded-lg border border-border/80 space-y-2 bg-card">
                <div className="font-semibold text-foreground">Submission Status:</div>
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
                        Teacher Feedback: {selectedHw.studentSubmission.teacherFeedback}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-3 bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 rounded-lg">
                No submission has been turned in yet for this assignment.
              </div>
            )}
          </div>
        )}
      </Dialog>
    </div>
  );
};

export default ParentHomeworkPage;
