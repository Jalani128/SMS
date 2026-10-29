export interface AcademicTerm {
  _id?: string;
  name: string;
  startDate: string;
  endDate: string;
}

export interface AcademicSessionRecord {
  _id: string;
  schoolId?: string;
  name: string;
  code: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  status: 'upcoming' | 'active' | 'completed' | 'archived';
  terms?: AcademicTerm[];
  createdAt?: string;
  updatedAt?: string;
}

export interface ClassRecord {
  _id: string;
  schoolId?: string;
  name: string;
  code: string;
  order: number;
  description?: string;
  academicSessionId?: string | AcademicSessionRecord;
  status: 'active' | 'inactive';
  sectionsCount?: number;
  studentsCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface SectionRecord {
  _id: string;
  schoolId?: string;
  classId: string | { _id: string; name: string; code: string };
  academicSessionId?: string | { _id: string; name: string; code: string };
  name: string;
  code: string;
  capacity: number;
  currentEnrolled?: number;
  classTeacherId?: string | {
    _id: string;
    employeeId?: string;
    userId?: {
      _id: string;
      name: string;
      email: string;
    };
  };
  roomNumber?: string;
  status: 'active' | 'inactive';
  createdAt?: string;
  updatedAt?: string;
}

export interface SubjectRecord {
  _id: string;
  schoolId?: string;
  name: string;
  code: string;
  type: 'core' | 'elective' | 'optional' | 'vocational';
  department: string;
  creditHours: number;
  description?: string;
  status: 'active' | 'inactive' | 'archived';
  createdAt?: string;
  updatedAt?: string;
}

export interface SubjectAssignmentRecord {
  _id: string;
  schoolId?: string;
  academicSessionId: string | { _id: string; name: string; code: string };
  classId: string | { _id: string; name: string; code: string };
  sectionId?: string | { _id: string; name: string; code: string };
  subjectId: string | { _id: string; name: string; code: string; type?: string; creditHours?: number };
  teacherId: string | {
    _id: string;
    employeeId?: string;
    department?: string;
    userId?: {
      _id: string;
      name: string;
      email: string;
    };
  };
  periodsPerWeek: number;
  status: 'active' | 'inactive' | 'archived';
  createdAt?: string;
  updatedAt?: string;
}

export interface AcademicEnrollmentItem {
  _id: string;
  schoolId?: string;
  studentId: string | {
    _id: string;
    admissionNumber: string;
    userId?: {
      _id: string;
      name: string;
      email: string;
    };
  };
  academicSessionId: string | { _id: string; name: string; code: string };
  classId: string | { _id: string; name: string; code: string };
  sectionId: string | { _id: string; name: string; code: string; capacity?: number };
  rollNumber?: string;
  enrollmentDate?: string;
  status: 'enrolled' | 'completed' | 'promoted' | 'transferred' | 'dropped';
  promotedToEnrollmentId?: string;
  remarks?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AcademicSummaryMetrics {
  activeSession: {
    _id: string;
    name: string;
    code: string;
    startDate: string;
    endDate: string;
    status: string;
  } | null;
  classesCount: number;
  sectionsCount: number;
  subjectsCount: number;
  enrolledStudentsCount: number;
  assignedTeachersCount: number;
  averageSectionCapacity: number;
  capacityUtilizationRate: number;
}
