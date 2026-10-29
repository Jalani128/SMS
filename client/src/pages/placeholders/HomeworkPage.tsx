import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import { HomeworkManagementPage } from '../admin/HomeworkManagementPage';
import { TeacherHomeworkPage } from '../homework/TeacherHomeworkPage';
import { StudentHomeworkPage } from '../homework/StudentHomeworkPage';
import { ParentHomeworkPage } from '../homework/ParentHomeworkPage';

export const HomeworkPage: React.FC = () => {
  const { activeRole } = useAuth();

  switch (activeRole) {
    case 'teacher':
      return <TeacherHomeworkPage />;
    case 'student':
      return <StudentHomeworkPage />;
    case 'parent':
      return <ParentHomeworkPage />;
    case 'admin':
    case 'super_admin':
    default:
      return <HomeworkManagementPage />;
  }
};

export default HomeworkPage;
