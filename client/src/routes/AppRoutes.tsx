import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { RoleGuard } from '../components/shared/RoleGuard';

// Route Level Suspense Fallback
const RouteLoadingFallback: React.FC = () => (
  <div className="flex h-64 w-full items-center justify-center p-6">
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
  </div>
);

// Lazy-loaded Auth Pages
const Login = lazy(() => import('../pages/auth/Login').then((m) => ({ default: m.Login })));
const RegisterSchool = lazy(() => import('../pages/auth/RegisterSchool').then((m) => ({ default: m.RegisterSchool })));
const VerifySchoolOtp = lazy(() => import('../pages/auth/VerifySchoolOtp').then((m) => ({ default: m.VerifySchoolOtp })));
const ForgotPassword = lazy(() => import('../pages/auth/ForgotPassword').then((m) => ({ default: m.ForgotPassword })));
const ResetPassword = lazy(() => import('../pages/auth/ResetPassword').then((m) => ({ default: m.ResetPassword })));
const Unauthorized = lazy(() => import('../pages/auth/Unauthorized').then((m) => ({ default: m.Unauthorized })));
const NotFound = lazy(() => import('../pages/NotFound').then((m) => ({ default: m.NotFound })));

// Lazy-loaded Role Dashboards
const AdminDashboard = lazy(() => import('../pages/dashboards/AdminDashboard').then((m) => ({ default: m.AdminDashboard })));
const TeacherDashboard = lazy(() => import('../pages/dashboards/TeacherDashboard').then((m) => ({ default: m.TeacherDashboard })));
const StudentDashboard = lazy(() => import('../pages/dashboards/StudentDashboard').then((m) => ({ default: m.StudentDashboard })));
const ParentDashboard = lazy(() => import('../pages/dashboards/ParentDashboard').then((m) => ({ default: m.ParentDashboard })));

// Lazy-loaded Academic & Operations Management Pages
const AcademicSessionsPage = lazy(() => import('../pages/admin/AcademicSessionsPage').then((m) => ({ default: m.AcademicSessionsPage })));
const SectionsManagementPage = lazy(() => import('../pages/admin/SectionsManagementPage').then((m) => ({ default: m.SectionsManagementPage })));
const SubjectAssignmentsPage = lazy(() => import('../pages/admin/SubjectAssignmentsPage').then((m) => ({ default: m.SubjectAssignmentsPage })));
const StudentEnrollmentsPage = lazy(() => import('../pages/admin/StudentEnrollmentsPage').then((m) => ({ default: m.StudentEnrollmentsPage })));
const SchoolOnboardingPage = lazy(() => import('../pages/admin/SchoolOnboardingPage').then((m) => ({ default: m.SchoolOnboardingPage })));
const BulkDataImportPage = lazy(() => import('../pages/admin/BulkDataImportPage').then((m) => ({ default: m.BulkDataImportPage })));
const SchoolOperationsDashboardPage = lazy(() => import('../pages/admin/SchoolOperationsDashboardPage').then((m) => ({ default: m.SchoolOperationsDashboardPage })));

// Lazy-loaded Placeholder & Module Pages
const StudentsPage = lazy(() => import('../pages/placeholders/StudentsPage').then((m) => ({ default: m.StudentsPage })));
const TeachersPage = lazy(() => import('../pages/placeholders/TeachersPage').then((m) => ({ default: m.TeachersPage })));
const ParentsPage = lazy(() => import('../pages/placeholders/ParentsPage').then((m) => ({ default: m.ParentsPage })));
const ClassesPage = lazy(() => import('../pages/placeholders/ClassesPage').then((m) => ({ default: m.ClassesPage })));
const SubjectsPage = lazy(() => import('../pages/placeholders/SubjectsPage').then((m) => ({ default: m.SubjectsPage })));
const AttendancePage = lazy(() => import('../pages/placeholders/AttendancePage').then((m) => ({ default: m.AttendancePage })));
const FeesPage = lazy(() => import('../pages/placeholders/FeesPage').then((m) => ({ default: m.FeesPage })));
const HomeworkPage = lazy(() => import('../pages/placeholders/HomeworkPage').then((m) => ({ default: m.HomeworkPage })));
const TimetablePage = lazy(() => import('../pages/placeholders/TimetablePage').then((m) => ({ default: m.TimetablePage })));
const ExamsPage = lazy(() => import('../pages/placeholders/ExamsPage').then((m) => ({ default: m.ExamsPage })));
const StudyMaterialsPage = lazy(() => import('../pages/placeholders/StudyMaterialsPage').then((m) => ({ default: m.StudyMaterialsPage })));
const AiAssistantPage = lazy(() => import('../pages/placeholders/AiAssistantPage').then((m) => ({ default: m.AiAssistantPage })));
const MessagesPage = lazy(() => import('../pages/placeholders/MessagesPage').then((m) => ({ default: m.MessagesPage })));
const ReportsPage = lazy(() => import('../pages/placeholders/ReportsPage').then((m) => ({ default: m.ReportsPage })));
const SettingsPage = lazy(() => import('../pages/placeholders/SettingsPage').then((m) => ({ default: m.SettingsPage })));
const NotificationsPage = lazy(() => import('../pages/NotificationsPage').then((m) => ({ default: m.NotificationsPage })));
const ProfilePage = lazy(() => import('../pages/ProfilePage').then((m) => ({ default: m.ProfilePage })));

export const AppRoutes: React.FC = () => {
  const { activeRole } = useAuth();

  return (
    <Suspense fallback={<RouteLoadingFallback />}>
      <Routes>
        {/* Public Authentication Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register-school" element={<RegisterSchool />} />
        <Route path="/verify-otp" element={<VerifySchoolOtp />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/unauthorized" element={<Unauthorized />} />

        {/* Root redirect to current active role */}
        <Route path="/" element={<Navigate to={`/${activeRole}`} replace />} />
        <Route path="/profile" element={<Navigate to={`/${activeRole}/profile`} replace />} />

        {/* Admin Route Group */}
        <Route
          path="/admin"
          element={
            <RoleGuard allowedRoles={['admin']}>
              <DashboardLayout />
            </RoleGuard>
          }
        >
          <Route index element={<AdminDashboard />} />
          <Route path="operations" element={<SchoolOperationsDashboardPage />} />
          <Route path="onboarding" element={<SchoolOnboardingPage />} />
          <Route path="data-import" element={<BulkDataImportPage />} />
          <Route path="students" element={<StudentsPage />} />
          <Route path="teachers" element={<TeachersPage />} />
          <Route path="parents" element={<ParentsPage />} />
          <Route path="academic-sessions" element={<AcademicSessionsPage />} />
          <Route path="classes" element={<ClassesPage />} />
          <Route path="sections" element={<SectionsManagementPage />} />
          <Route path="subjects" element={<SubjectsPage />} />
          <Route path="subject-assignments" element={<SubjectAssignmentsPage />} />
          <Route path="enrollments" element={<StudentEnrollmentsPage />} />
          <Route path="attendance" element={<AttendancePage />} />
          <Route path="fees" element={<FeesPage />} />
          <Route path="homework" element={<HomeworkPage />} />
          <Route path="timetable" element={<TimetablePage />} />
          <Route path="exams" element={<ExamsPage />} />
          <Route path="study-materials" element={<StudyMaterialsPage />} />
          <Route path="ai-assistant" element={<AiAssistantPage />} />
          <Route path="messages" element={<MessagesPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>

        {/* Teacher Route Group */}
        <Route
          path="/teacher"
          element={
            <RoleGuard allowedRoles={['teacher']}>
              <DashboardLayout />
            </RoleGuard>
          }
        >
          <Route index element={<TeacherDashboard />} />
          <Route path="classes" element={<ClassesPage />} />
          <Route path="attendance" element={<AttendancePage />} />
          <Route path="homework" element={<HomeworkPage />} />
          <Route path="timetable" element={<TimetablePage />} />
          <Route path="exams" element={<ExamsPage />} />
          <Route path="study-materials" element={<StudyMaterialsPage />} />
          <Route path="messages" element={<MessagesPage />} />
          <Route path="ai-assistant" element={<AiAssistantPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>

        {/* Student Route Group */}
        <Route
          path="/student"
          element={
            <RoleGuard allowedRoles={['student']}>
              <DashboardLayout />
            </RoleGuard>
          }
        >
          <Route index element={<StudentDashboard />} />
          <Route path="timetable" element={<TimetablePage />} />
          <Route path="attendance" element={<AttendancePage />} />
          <Route path="homework" element={<HomeworkPage />} />
          <Route path="study-materials" element={<StudyMaterialsPage />} />
          <Route path="exams" element={<ExamsPage />} />
          <Route path="fees" element={<FeesPage />} />
          <Route path="messages" element={<MessagesPage />} />
          <Route path="ai-assistant" element={<AiAssistantPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>

        {/* Parent Route Group */}
        <Route
          path="/parent"
          element={
            <RoleGuard allowedRoles={['parent']}>
              <DashboardLayout />
            </RoleGuard>
          }
        >
          <Route index element={<ParentDashboard />} />
          <Route path="ward-attendance" element={<AttendancePage />} />
          <Route path="ward-exams" element={<ExamsPage />} />
          <Route path="ward-homework" element={<HomeworkPage />} />
          <Route path="ward-materials" element={<StudyMaterialsPage />} />
          <Route path="fees" element={<FeesPage />} />
          <Route path="timetable" element={<TimetablePage />} />
          <Route path="messages" element={<MessagesPage />} />
          <Route path="ai-assistant" element={<AiAssistantPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>

        {/* Fallback 404 Route */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
};
