export type UserRole = 'super_admin' | 'admin' | 'teacher' | 'student' | 'parent';

export interface SchoolInfo {
  id: string;
  name: string;
  slug?: string;
  code?: string;
  logo?: string;
  currency?: string;
  timezone?: string;
  academicYear?: string;
  status?: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  schoolId: string;
  schoolName: string;
  avatarUrl?: string;
  phone?: string;
  emailVerified?: boolean;
  permissions?: string[];
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  schoolId: string;
  school: SchoolInfo | null;
  permissions?: string[];
}
