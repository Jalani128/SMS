import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import { FeesManagementPage } from '../admin/FeesManagementPage';
import { StudentFeesPage } from '../fees/StudentFeesPage';
import { ParentFeesPage } from '../fees/ParentFeesPage';

export const FeesPage: React.FC = () => {
  const { activeRole } = useAuth();

  switch (activeRole) {
    case 'student':
      return <StudentFeesPage />;
    case 'parent':
      return <ParentFeesPage />;
    case 'admin':
    case 'super_admin':
    default:
      return <FeesManagementPage />;
  }
};

export default FeesPage;
