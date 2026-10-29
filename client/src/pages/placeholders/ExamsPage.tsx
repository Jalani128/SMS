import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import { ExamsManagementPage } from '../admin/ExamsManagementPage';
import { TeacherExamsPage } from '../exams/TeacherExamsPage';
import { StudentExamsPage } from '../exams/StudentExamsPage';
import { ParentExamsPage } from '../exams/ParentExamsPage';

export const ExamsPage: React.FC = () => {
  const { activeRole } = useAuth();

  switch (activeRole) {
    case 'teacher':
      return <TeacherExamsPage />;
    case 'student':
      return <StudentExamsPage />;
    case 'parent':
      return <ParentExamsPage />;
    case 'admin':
    case 'super_admin':
    default:
      return <ExamsManagementPage />;
  }
};

export default ExamsPage;
