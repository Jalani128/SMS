/**
 * Phase 7: Attendance Management Client Types
 */

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'leave';

export interface AttendanceRecord {
  _id: string;
  schoolId: string;
  academicSessionId: string | { _id: string; name: string };
  studentId:
    | string
    | {
        _id: string;
        admissionNumber: string;
        firstName: string;
        lastName: string;
        rollNumber?: string;
        gender?: string;
      };
  classId: string | { _id: string; name: string; code: string };
  sectionId: string | { _id: string; name: string; capacity?: number };
  attendanceDate?: string;
  date: string;
  status: AttendanceStatus;
  remarks?: string;
  markedBy?:
    | string
    | {
        _id: string;
        name: string;
        email: string;
        role: string;
      };
  createdAt: string;
  updatedAt: string;
}

export interface AttendanceStats {
  totalStudents: number;
  totalRecordedDays: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  leaveCount: number;
  attendancePercentage: number;
}

export interface DailyAttendanceRosterItem {
  studentId: string;
  admissionNumber: string;
  name: string;
  rollNumber: string;
  avatarUrl?: string;
  gender?: string;
  attendanceRecordId?: string;
  status: AttendanceStatus | null;
  remarks: string;
  isExisting: boolean;
  markedBy?: string;
  updatedAt?: string;
}

export interface DailyAttendanceResponse {
  session: { _id: string; name: string };
  class: { _id: string; name: string; code: string };
  section: { _id: string; name: string };
  date: string;
  isMarked: boolean;
  stats: AttendanceStats;
  roster: DailyAttendanceRosterItem[];
}

export interface BulkAttendancePayload {
  academicSessionId: string;
  classId: string;
  sectionId: string;
  date: string;
  records: Array<{
    studentId: string;
    status: AttendanceStatus;
    remarks?: string;
  }>;
}

export interface BulkAttendanceResult {
  processed: number;
  upserted: number;
  errors: Array<{ studentId: string; error: string }>;
}

export interface UpdateAttendancePayload {
  status: AttendanceStatus;
  remarks?: string;
  reason: string;
}

export interface StudentAttendanceHistoryResponse {
  student: {
    _id: string;
    admissionNumber: string;
    firstName: string;
    lastName: string;
    rollNumber?: string;
  };
  stats: AttendanceStats;
  records: AttendanceRecord[];
}

export interface ClassSummaryResponse {
  class: { _id: string; name: string };
  section: { _id: string; name: string };
  dateRange: { startDate: string; endDate: string };
  stats: AttendanceStats;
  lowAttendanceAlerts: Array<{
    studentId: string;
    admissionNumber: string;
    name: string;
    percentage: number;
    totalDays: number;
    absentDays: number;
  }>;
}

export interface MonthlyStudentReportItem {
  studentId: string;
  admissionNumber: string;
  name: string;
  rollNumber?: string;
  present: number;
  absent: number;
  late: number;
  leave: number;
  totalDays: number;
  percentage: number;
  dailyMarks?: Record<string, AttendanceStatus>;
}

export interface MonthlyReportResponse {
  month: number;
  year: number;
  class: { _id: string; name: string };
  section: { _id: string; name: string };
  summary: {
    totalStudents: number;
    instructionalDays: number;
    averageAttendancePercentage: number;
  };
  studentReports: MonthlyStudentReportItem[];
}

export interface AttendanceListQuery {
  page?: number;
  limit?: number;
  academicSessionId?: string;
  classId?: string;
  sectionId?: string;
  studentId?: string;
  startDate?: string;
  endDate?: string;
  status?: AttendanceStatus;
}
