export interface EmergencyContact {
  name?: string;
  relationship?: string;
  phone?: string;
}

export interface StudentChildSummary {
  _id: string;
  admissionNumber: string;
  rollNumber?: string;
  dateOfBirth?: string;
  gender?: string;
  status: string;
  userId?: {
    _id: string;
    name: string;
    email: string;
    avatarUrl?: string;
    phone?: string;
  };
  currentClassId?: {
    _id: string;
    name: string;
    grade?: string;
  };
  currentSectionId?: {
    _id: string;
    name: string;
  };
}

export interface ParentChildLink {
  studentProfileId: StudentChildSummary;
  relationship: string;
  isPrimary: boolean;
}

export interface RoleProfileData {
  // Student
  admissionNumber?: string;
  rollNumber?: string;
  dateOfBirth?: string;
  gender?: string;
  bloodGroup?: string;
  address?: string;
  medicalNotes?: string;
  emergencyContact?: EmergencyContact;
  currentClassId?: { _id: string; name: string; code?: string; grade?: string };
  currentSectionId?: { _id: string; name: string; capacity?: number };
  currentSessionId?: { _id: string; name: string; isActive?: boolean };

  // Teacher
  employeeId?: string;
  department?: string;
  designation?: string;
  qualification?: string;
  specializations?: string[];
  experienceYears?: number;
  bio?: string;
  assignedClassIds?: Array<{ _id: string; name: string }>;
  assignedSubjectIds?: Array<{ _id: string; name: string; code?: string }>;

  // Parent
  occupation?: string;
  alternatePhone?: string;
  children?: ParentChildLink[];

  // Admin / General
  administrativeLevel?: string;
}

export interface SecurityMetadata {
  lastLoginAt?: string | null;
  lastLoginIp?: string;
  lastLoginUserAgent?: string;
  passwordChangedAt?: string | null;
  tokenVersion: number;
  emailVerified: boolean;
  isActive: boolean;
}

export interface UserProfileResponse {
  user: {
    id: string;
    name: string;
    firstName?: string;
    lastName?: string;
    email: string;
    role: 'super_admin' | 'admin' | 'teacher' | 'student' | 'parent';
    phone?: string;
    avatarUrl?: string;
    schoolId?: string;
    schoolName?: string;
    isActive: boolean;
    emailVerified: boolean;
    lastLoginAt?: string | null;
    lastLoginIp?: string;
    lastLoginUserAgent?: string;
    passwordChangedAt?: string | null;
    createdAt: string;
    updatedAt: string;
  };
  school?: {
    name: string;
    slug: string;
    code: string;
    currency?: string;
    timezone?: string;
    status: string;
    logo?: string;
  } | null;
  roleProfile?: RoleProfileData | null;
  security: SecurityMetadata;
}

export interface UpdateProfilePayload {
  name?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;

  // Teacher fields
  qualification?: string;
  specializations?: string[];
  bio?: string;
  experienceYears?: number;

  // Student fields
  address?: string;
  dateOfBirth?: string;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  bloodGroup?: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-' | 'unknown';
  medicalNotes?: string;

  // Parent fields
  occupation?: string;
  alternatePhone?: string;

  // Emergency contact (Students & Parents)
  emergencyContact?: EmergencyContact;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface AvatarUploadPayload {
  name: string;
  mimetype: string;
  size: number;
  base64Data?: string;
}
