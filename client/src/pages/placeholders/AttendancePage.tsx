import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import { AttendanceManagementPage } from '../admin/AttendanceManagementPage';
import { TeacherAttendancePage } from '../attendance/TeacherAttendancePage';
import { StudentAttendancePage } from '../attendance/StudentAttendancePage';
import { ParentAttendancePage } from '../attendance/ParentAttendancePage';

export const AttendancePage: React.FC = () => {
  const { activeRole } = useAuth();

  switch (activeRole) {
    case 'teacher':
      return <TeacherAttendancePage />;
    case 'student':
      return <StudentAttendancePage />;
    case 'parent':
      return <ParentAttendancePage />;
    case 'admin':
    case 'super_admin':
    default:
      return <AttendanceManagementPage />;
  }
};

export default AttendancePage;
