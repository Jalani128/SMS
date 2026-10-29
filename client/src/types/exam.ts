export type ExamStatus =
  | 'draft'
  | 'scheduled'
  | 'ongoing'
  | 'completed'
  | 'published'
  | 'cancelled'
  | 'archived';

export type ExamType =
  | 'monthly_test'
  | 'midterm'
  | 'final'
  | 'quiz'
  | 'practical'
  | 'other';

export type ExamSubjectStatus = 'scheduled' | 'completed' | 'cancelled';

export type MarkPublicationStatus = 'draft' | 'submitted' | 'verified' | 'published';

export interface Exam {
  _id: string;
  schoolId: string;
  academicSessionId: string | { _id: string; name: string; isCurrent: boolean };
  name: string;
  examType: ExamType;
  classId?: string | { _id: string; name: string; code?: string };
  sectionId?: string | { _id: string; name: string };
  term?: string;
  startDate: string;
  endDate: string;
  description?: string;
  instructions?: string;
  status: ExamStatus;
  createdBy?: { _id: string; firstName?: string; lastName?: string; email?: string };
  publishedBy?: string;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
  subjects?: ExamSubject[];
}

export interface ExamSubject {
  _id: string;
  schoolId: string;
  examId: string;
  academicSessionId: string;
  classId: string | { _id: string; name: string; code?: string };
  sectionId?: string | { _id: string; name: string };
  subjectId: string | { _id: string; name: string; code: string; type?: string };
  teacherId?: string | { _id: string; employeeId?: string; firstName?: string; lastName?: string };
  examDate: string;
  startTime: string; // "HH:mm"
  endTime: string;   // "HH:mm"
  maxMarks: number;
  passMarks: number;
  room?: string;
  instructions?: string;
  status: ExamSubjectStatus;
  createdAt: string;
  updatedAt: string;
}

export interface MarkCorrection {
  correctedBy: string | { _id: string; name?: string; email?: string };
  previousMarks?: number;
  newMarks?: number;
  previousStatus?: string;
  newStatus?: string;
  reason: string;
  correctedAt: string;
}

export interface Mark {
  _id: string;
  schoolId: string;
  examId: string;
  examSubjectId: string;
  academicSessionId: string;
  studentId: string;
  enrollmentId: string;
  marksObtained?: number;
  maxMarksSnapshot?: number;
  percentage?: number;
  grade?: string;
  isPassed?: boolean;
  isAbsent: boolean;
  isExempt: boolean;
  remarks?: string;
  enteredBy: string;
  verifiedBy?: string;
  verifiedAt?: string;
  publicationStatus: MarkPublicationStatus;
  correctionHistory?: MarkCorrection[];
  createdAt: string;
  updatedAt: string;
}

export interface GradeBand {
  grade: string;
  minPercentage: number;
  maxPercentage: number;
  gradePoint?: number;
  isPassing: boolean;
  description?: string;
}

export interface GradingScale {
  _id: string;
  schoolId: string;
  name: string;
  description?: string;
  isDefault: boolean;
  bands: GradeBand[];
}

export interface RosterStudent {
  studentId: string;
  enrollmentId: string;
  firstName?: string;
  lastName?: string;
  name: string;
  admissionNumber?: string;
  rollNumber?: string;
  markId?: string;
  marksObtained?: number;
  percentage?: number;
  grade?: string;
  isAbsent: boolean;
  isExempt: boolean;
  remarks?: string;
  publicationStatus: MarkPublicationStatus;
}

export interface SubjectResultDetail {
  examSubjectId: string;
  subjectId: string;
  subjectName?: string;
  subjectCode?: string;
  maxMarks: number;
  passMarks: number;
  marksObtained?: number;
  percentage?: number;
  grade?: string;
  gradePoint?: number;
  isPassed?: boolean;
  isAbsent: boolean;
  isExempt: boolean;
  isMissing: boolean;
  status: 'SCORED' | 'ABSENT' | 'EXEMPT' | 'MISSING';
  remarks?: string;
}

export interface StudentExamResult {
  studentId: string;
  studentName?: string;
  admissionNumber?: string;
  rollNumber?: string;
  classId?: string;
  sectionId?: string;
  examId: string;
  academicSessionId: string;
  subjectResults: SubjectResultDetail[];
  totalMarksObtained: number;
  totalMaxMarks: number;
  overallPercentage: number;
  overallGrade: string;
  overallGradePoint?: number;
  overallResult: 'PASS' | 'FAIL' | 'INCOMPLETE' | 'ABSENT';
  isComplete: boolean;
  hasExemptions: boolean;
}

export interface ClassPerformanceAnalytics {
  examId: string;
  classId?: string;
  sectionId?: string;
  totalEligible: number;
  completeResultsCount: number;
  incompleteResultsCount: number;
  passedCount: number;
  failedCount: number;
  absentCount: number;
  classAveragePercentage: number;
  passPercentage: number;
  highestPercentage: number;
  lowestPercentage: number;
  gradeDistribution: Record<string, number>;
  subjectAverages: Array<{
    subjectId: string;
    subjectName?: string;
    maxMarks: number;
    averageMarks: number;
    averagePercentage: number;
    highestMarks: number;
    lowestMarks: number;
    passCount: number;
    failCount: number;
  }>;
}

export interface ReportCardData {
  school: {
    name: string;
    address?: any;
    email?: string;
    phone?: string;
    logoUrl?: string;
  };
  student: {
    id: string;
    name: string;
    admissionNumber?: string;
    rollNumber?: string;
    className: string;
    sectionName: string;
  };
  exam: {
    id: string;
    name: string;
    term?: string;
    startDate: string;
    endDate: string;
    status: ExamStatus;
    publishedAt?: string;
    academicSessionName: string;
  };
  result: StudentExamResult;
}
