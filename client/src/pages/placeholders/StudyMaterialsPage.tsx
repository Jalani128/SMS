import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import { StudyMaterialsManagementPage } from '../admin/StudyMaterialsManagementPage';
import { TeacherStudyMaterialsPage } from '../study-materials/TeacherStudyMaterialsPage';
import { StudentStudyMaterialsPage } from '../study-materials/StudentStudyMaterialsPage';
import { ParentStudyMaterialsPage } from '../study-materials/ParentStudyMaterialsPage';

export const StudyMaterialsPage: React.FC = () => {
  const { activeRole } = useAuth();

  switch (activeRole) {
    case 'teacher':
      return <TeacherStudyMaterialsPage />;
    case 'student':
      return <StudentStudyMaterialsPage />;
    case 'parent':
      return <ParentStudyMaterialsPage />;
    case 'admin':
    case 'super_admin':
    default:
      return <StudyMaterialsManagementPage />;
  }
};

export default StudyMaterialsPage;
