export interface ChatMessage {
  id?: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

export interface ChatResponse {
  reply: string;
  role: string;
}

export interface HomeworkHelpRequest {
  question: string;
  subjectId?: string;
  topic?: string;
  studyMaterialId?: string;
}

export interface HomeworkHelpResponse {
  explanation: string;
  hints: string[];
  practiceQuestions: string[];
  gradeLevel?: string;
}

export interface QuizQuestion {
  question: string;
  options?: string[];
  correctAnswer?: string;
  suggestedAnswer?: string;
  explanation?: string;
  markingRubric?: string;
  marks?: number;
}

export interface QuizGeneratorRequest {
  subjectId: string;
  classId: string;
  sectionId?: string;
  topic: string;
  questionCount: number;
  difficulty: 'easy' | 'medium' | 'hard';
  questionType: 'multiple_choice' | 'true_false' | 'short_answer';
  marksPerQuestion?: number;
  studyMaterialId?: string;
}

export interface QuizGeneratorResponse {
  title: string;
  topic: string;
  subjectId: string;
  classId: string;
  sectionId?: string;
  difficulty: string;
  questionType: string;
  totalMarks: number;
  questions: QuizQuestion[];
  isDraft: boolean;
}

export interface ReportCardCommentRequest {
  studentId: string;
  subjectId?: string;
  academicSessionId?: string;
  strengths?: string[];
  areasForImprovement?: string[];
  tone?: 'encouraging' | 'formal' | 'constructive';
  length?: 'short' | 'medium' | 'detailed';
}

export interface ReportCardCommentResponse {
  studentId: string;
  studentName: string;
  attendanceSummary: {
    totalDays: number;
    present: number;
    absent: number;
    attendanceRate: number;
    hasRecords: boolean;
  };
  academicSummary: {
    averageScore: number;
    subjectsEvaluated: number;
    hasRecords: boolean;
  };
  comment: string;
  isDraft: boolean;
}

export interface FeeReminderRequest {
  invoiceId: string;
  tone?: 'gentle' | 'standard' | 'urgent';
  additionalInstructions?: string;
}

export interface FeeReminderResponse {
  invoiceId: string;
  invoiceNumber: string;
  recipientName: string;
  balanceAmount: number;
  dueDate: string;
  subject: string;
  draftMessage: string;
  isDraft: boolean;
}

export interface NoticeGeneratorRequest {
  title: string;
  eventType:
    | 'notice'
    | 'parent_announcement'
    | 'event_invitation'
    | 'event_schedule'
    | 'holiday_notice'
    | 'meeting_reminder'
    | 'academic_plan';
  targetAudience: 'all' | 'students' | 'teachers' | 'parents';
  date?: string;
  location?: string;
  instructions?: string;
  tone?: 'formal' | 'warm' | 'urgent';
}

export interface NoticeGeneratorResponse {
  title: string;
  eventType: string;
  targetAudience: string;
  date?: string;
  location?: string;
  draftNotice: string;
  isDraft: boolean;
}

export interface SchoolInsightsRequest {
  insightType:
    | 'attendance_trends'
    | 'fee_collection'
    | 'outstanding_fees'
    | 'enrollment_counts'
    | 'academic_performance'
    | 'homework_completion';
  classId?: string;
  academicSessionId?: string;
}

export interface SchoolInsightsResponse {
  insightType: string;
  reportingPeriod: string;
  statistics: Record<string, any>;
  summary: string;
  hasData: boolean;
}
