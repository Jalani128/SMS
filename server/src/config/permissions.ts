import { UserRole } from '../models/User.model.js';

export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  super_admin: [
    '*', // Full system access across all schools
    'schools:create',
    'schools:read',
    'schools:update',
    'schools:delete',
    'schools:approve',
    'schools:suspend',
    'users:all',
    'system:audit',
  ],
  admin: [
    'school:read',
    'school:update',
    'users:create',
    'users:read',
    'users:update',
    'users:delete',
    'academic:manage',
    'attendance:view_all',
    'attendance:manage',
    'fees:manage',
    'fees:view_all',
    'exams:manage',
    'reports:generate',
    'settings:update',
    'announcements:create',
  ],
  teacher: [
    'classes:assigned_view',
    'attendance:mark_assigned',
    'attendance:view_assigned',
    'homework:create',
    'homework:grade',
    'study_materials:upload',
    'timetable:view_assigned',
    'messages:send',
    'messages:read',
  ],
  student: [
    'profile:view_self',
    'attendance:view_self',
    'timetable:view_self',
    'homework:view_assigned',
    'homework:submit',
    'study_materials:view',
    'exams:view_self',
    'fees:view_self',
    'messages:send',
  ],
  parent: [
    'profile:view_self',
    'wards:view_linked',
    'attendance:view_ward',
    'homework:view_ward',
    'exams:view_ward',
    'fees:view_ward',
    'fees:pay_ward',
    'messages:send_to_teacher',
  ],
};

export const getRolePermissions = (role: UserRole): string[] => {
  return ROLE_PERMISSIONS[role] || [];
};

export const hasPermission = (role: UserRole, requiredPermission: string): boolean => {
  const permissions = getRolePermissions(role);
  if (permissions.includes('*')) return true;
  return permissions.includes(requiredPermission);
};

/**
 * Resource-level authorization helper: validates if teacher is assigned to the requested class
 */
export const canTeacherAccessClass = (
  teacherId: string,
  classId: string,
  assignedClasses: string[]
): boolean => {
  return assignedClasses.includes(classId);
};

/**
 * Resource-level authorization helper: validates if parent is linked to the requested student ward
 */
export const canParentAccessStudent = (
  parentId: string,
  studentId: string,
  linkedStudentIds: string[]
): boolean => {
  return linkedStudentIds.includes(studentId);
};

/**
 * Resource-level authorization helper: validates if student owns the requested resource
 */
export const canStudentAccessResource = (
  studentId: string,
  targetStudentId: string
): boolean => {
  return studentId === targetStudentId;
};
