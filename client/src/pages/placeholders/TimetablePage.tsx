import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import { TimetableManagementPage } from '../admin/TimetableManagementPage';
import { TeacherTimetablePage } from '../timetable/TeacherTimetablePage';
import { StudentTimetablePage } from '../timetable/StudentTimetablePage';
import { ParentTimetablePage } from '../timetable/ParentTimetablePage';

export const TimetablePage: React.FC = () => {
  const { activeRole } = useAuth();

  switch (activeRole) {
    case 'teacher':
      return <TeacherTimetablePage />;
    case 'student':
      return <StudentTimetablePage />;
    case 'parent':
      return <ParentTimetablePage />;
    case 'admin':
    case 'super_admin':
    default:
      return <TimetableManagementPage />;
  }
};

export default TimetablePage;
