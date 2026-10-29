export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface UserSummary {
  _id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  isActive: boolean;
  role?: string;
  createdAt?: string;
}

export interface AcademicClass {
  _id: string;
  name: string;
  code: string;
  order?: number;
}

export interface AcademicSection {
  _id: string;
  classId?: string;
  name: string;
  code: string;
  capacity?: number;
}

export interface AcademicSessionItem {
  _id: string;
  name: string;
  code: string;
  startDate?: string;
  endDate?: string;
  isCurrent: boolean;
  status?: string;
}

export interface AcademicContextData {
  classes: AcademicClass[];
  sections: AcademicSection[];
  sessions: AcademicSessionItem[];
  currentSession: AcademicSessionItem | null;
}

export interface StudentGuardianLink {
  parentProfileId: {
    _id: string;
    userId?: UserSummary;
    occupation?: string;
    alternatePhone?: string;
  } | string;
  relationship: 'father' | 'mother' | 'guardian' | 'other';
  isPrimary: boolean;
  canPickup: boolean;
}

export interface EnrollmentRecord {
  _id: string;
  studentId: string;
  academicSessionId: AcademicSessionItem;
  classId: AcademicClass;
  sectionId: AcademicSection;
  rollNumber?: string;
  enrollmentDate: string;
  status: 'enrolled' | 'promoted' | 'transferred' | 'dropped' | 'graduated';
  remarks?: string;
  createdAt: string;
}

export interface StudentItem {
  _id: string;
  userId: UserSummary;
  schoolId: string;
  admissionNumber: string;
  rollNumber?: string;
  currentClassId?: AcademicClass;
  currentSectionId?: AcademicSection;
  currentSessionId?: AcademicSessionItem;
  dateOfBirth?: string;
  gender: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  bloodGroup: string;
  medicalNotes?: string;
  adminNotes?: string;
  address?: string;
  admissionDate?: string;
  emergencyContact?: {
    name?: string;
    relationship?: string;
    phone?: string;
  };
  guardians: StudentGuardianLink[];
  enrollments?: EnrollmentRecord[];
  status: 'active' | 'inactive' | 'transferred' | 'graduated' | 'suspended';
  createdAt: string;
  updatedAt: string;
}

export interface TeacherItem {
  _id: string;
  userId: UserSummary;
  schoolId: string;
  employeeId: string;
  department: string;
  designation: string;
  qualification?: string;
  specializations: string[];
  joiningDate?: string;
  experienceYears?: number;
  bio?: string;
  adminNotes?: string;
  assignedClassIds?: AcademicClass[];
  assignedSubjectIds?: any[];
  status: 'active' | 'on_leave' | 'resigned' | 'terminated' | 'retired';
  createdAt: string;
  updatedAt: string;
}

export interface ParentChildLinkItem {
  studentProfileId: {
    _id: string;
    admissionNumber: string;
    rollNumber?: string;
    userId?: { name: string; avatarUrl?: string };
    currentClassId?: { name: string; code: string };
    currentSectionId?: { name: string; code: string };
    status?: string;
  } | string;
  relationship: 'father' | 'mother' | 'guardian' | 'other';
  isPrimary: boolean;
}

export interface ParentItem {
  _id: string;
  userId: UserSummary;
  schoolId: string;
  occupation?: string;
  alternatePhone?: string;
  address?: string;
  emergencyContact?: {
    name?: string;
    relationship?: string;
    phone?: string;
  };
  adminNotes?: string;
  children: ParentChildLinkItem[];
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}
