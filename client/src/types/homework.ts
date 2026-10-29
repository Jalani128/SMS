export type HomeworkStatus = 'draft' | 'published' | 'closed' | 'archived';
export type AssignmentType = 'homework' | 'classwork' | 'project' | 'other';
export type SubmissionStatus = 'submitted' | 'late' | 'graded' | 'resubmitted' | 'returned' | 'missing';

export interface AttachmentMeta {
  name: string;
  url: string;
  fileType: string;
  sizeBytes: number;
  storageKey?: string;
}

export interface ResourceLink {
  title: string;
  url: string;
}

export interface SubmissionSettings {
  allowLateSubmission: boolean;
  latePenaltyPercent: number;
  allowResubmission: boolean;
  maxSubmissions: number;
  cutoffDate?: string;
}

export interface SubmissionRevision {
  revisionNumber: number;
  submittedAt: string;
  submissionText?: string;
  attachments: AttachmentMeta[];
  status: SubmissionStatus;
  marksObtained?: number;
  teacherFeedback?: string;
}

export interface SubmissionItem {
  _id: string;
  schoolId: string;
  homeworkId: string;
  studentId: string;
  submittedAt: string;
  submissionText?: string;
  attachments: AttachmentMeta[];
  status: SubmissionStatus;
  isLate: boolean;
  marksObtained?: number;
  teacherFeedback?: string;
  gradedBy?: {
    _id: string;
    name: string;
    email: string;
  } | string;
  gradedAt?: string;
  isGradeReleased: boolean;
  releasedAt?: string;
  revisionNumber: number;
  history?: SubmissionRevision[];
  createdAt?: string;
  updatedAt?: string;
}

export interface HomeworkItem {
  _id: string;
  schoolId: string;
  academicSessionId: {
    _id: string;
    name: string;
    isCurrent?: boolean;
  } | string;
  classId: {
    _id: string;
    name: string;
    stage?: string;
  } | string;
  sectionId: {
    _id: string;
    name: string;
    roomNumber?: string;
  } | string;
  subjectId: {
    _id: string;
    name: string;
    code?: string;
  } | string;
  teacherId: {
    _id: string;
    employeeId: string;
    userId?: {
      name: string;
      email: string;
    };
  } | string;
  title: string;
  description?: string;
  instructions: string;
  assignmentType: AssignmentType;
  assignedDate: string;
  publishDate?: string;
  dueDate: string;
  maxMarks: number;
  isGraded: boolean;
  attachments: AttachmentMeta[];
  resourceLinks: ResourceLink[];
  submissionSettings: SubmissionSettings;
  status: HomeworkStatus;
  archiveReason?: string;
  archivedAt?: string;
  version: number;
  isOverdue?: boolean;
  studentSubmission?: {
    _id: string;
    status: SubmissionStatus;
    submittedAt: string;
    isLate: boolean;
    marksObtained?: number;
    teacherFeedback?: string;
    isGradeReleased: boolean;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface HomeworkSummaryStats {
  homeworkId: string;
  title: string;
  dueDate: string;
  isOverdue: boolean;
  eligibleStudents: number;
  totalSubmissions: number;
  submittedCount: number;
  lateCount: number;
  gradedCount: number;
  returnedCount: number;
  missingCount: number;
  completionRate: number;
}

export interface RosterStudentItem {
  enrollmentId: string;
  studentId: string;
  studentName: string;
  studentEmail?: string;
  admissionNumber: string;
  rollNumber?: string;
  submission: SubmissionItem | null;
  status: SubmissionStatus;
}

export interface QueryHomeworkParams {
  page?: number;
  limit?: number;
  classId?: string;
  sectionId?: string;
  subjectId?: string;
  teacherId?: string;
  status?: string;
  assignmentType?: string;
  search?: string;
  wardId?: string;
}
