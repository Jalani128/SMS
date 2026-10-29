import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useAdminDashboard } from '../../hooks/useAdminDashboard';
import { PageHeader } from '../../components/shared/PageHeader';
import { StatCard } from '../../components/shared/StatCard';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { academicService } from '../../services/academic.service';
import { AcademicSummaryMetrics } from '../../types/academic';
import { Link } from 'react-router-dom';
import {
  AttendanceTrendChart,
  FeeCollectionChart,
  StudentDistributionChart,
  AcademicPerformanceChart,
} from '../../components/admin/DashboardCharts';
import { RecentActivitySections } from '../../components/admin/RecentActivitySections';
import { QuickActionDock } from '../../components/admin/QuickActionDock';
import { OnboardingReadinessWidget } from '../../components/admin/OnboardingReadinessWidget';
import {
  QuickEnrollStudentModal,
  QuickAddTeacherModal,
  QuickRecordAttendanceModal,
  QuickFeeInvoiceModal,
  QuickAnnouncementModal,
} from '../../components/admin/QuickActionModals';
import {
  Download,
  RotateCw,
  Sparkles,
  AlertCircle,
  ShieldCheck,
  Calendar,
  BookOpen,
  Layers,
  GraduationCap,
  UserCheck,
  ArrowRight,
  Activity,
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const { school, schoolName } = useAuth();
  const {
    data,
    isLoading,
    error,
    timeframe,
    setTimeframe,
    refetch,
    isDevMock,
  } = useAdminDashboard();

  // Quick Action Modal states
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
  const [isAddTeacherOpen, setIsAddTeacherOpen] = useState(false);
  const [isRecordAttendanceOpen, setIsRecordAttendanceOpen] = useState(false);
  const [isCreateInvoiceOpen, setIsCreateInvoiceOpen] = useState(false);
  const [isCreateAnnouncementOpen, setIsCreateAnnouncementOpen] = useState(false);

  // Phase 6 Academic Summary live metrics
  const [academicSummary, setAcademicSummary] = useState<AcademicSummaryMetrics | null>(null);
  const [isAcademicLoading, setIsAcademicLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    academicService
      .getSummary()
      .then((summary) => {
        if (isMounted) setAcademicSummary(summary);
      })
      .catch((err) => console.warn('Academic summary load warning:', err))
      .finally(() => {
        if (isMounted) setIsAcademicLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const activeSchoolName = school?.name || schoolName || 'EduManage Academy';
  const currency = school?.currency || 'USD';

  // Export Executive Summary
  const handleExportSummary = () => {
    if (!data) return;

    const summaryContent = {
      institution: activeSchoolName,
      schoolCode: school?.code || 'SMS-2026',
      currency,
      generatedAt: new Date().toISOString(),
      statistics: {
        totalStudents: data.stats.totalStudents.value,
        totalTeachers: data.stats.totalTeachers.value,
        totalParents: data.stats.totalParents.value,
        todayAttendance: data.stats.todayAttendance.value,
        feesCollected: data.stats.feesCollected.value,
        outstandingFees: data.stats.outstandingFees.value,
      },
      dataMode: isDevMock ? 'Development Preview (Local)' : 'Live Production API',
    };

    const blob = new Blob([JSON.stringify(summaryContent, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeSchoolName.toLowerCase().replace(/\s+/g, '-')}-analytics-summary.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Dev Mode Data Banner (Transparency indicator) */}
      {isDevMock && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-xl border border-amber-200 dark:border-amber-900 bg-amber-50/70 dark:bg-amber-950/30 text-amber-950 dark:text-amber-200">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500 text-white shrink-0 shadow-sm">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs uppercase tracking-wider text-amber-800 dark:text-amber-300">
                  Phase 4 Dashboard UI Groundwork
                </span>
                <Badge variant="outline" className="text-[10px] py-0 border-amber-400 text-amber-800 dark:text-amber-300">
                  Development Mock Data Active
                </Badge>
              </div>
              <p className="text-xs text-amber-900/80 dark:text-amber-300/80 mt-0.5">
                Frontend dashboard service is consuming labeled preview analytics formatted for{' '}
                <strong>{activeSchoolName} ({currency})</strong>. Backend analytics aggregation endpoints will be implemented in Phase 5.
              </p>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="text-xs gap-1.5 border-amber-300 dark:border-amber-800 shrink-0 bg-card hover:bg-card/80"
          >
            <RotateCw className="h-3.5 w-3.5" />
            Refresh Analytics
          </Button>
        </div>
      )}

      {/* Global Error Banner */}
      {error && (
        <div className="p-4 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive text-sm flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="text-xs h-7">
            Retry
          </Button>
        </div>
      )}

      {/* Page Header */}
      <PageHeader
        title="Institutional Command Center"
        description={`Executive administrative & financial overview for ${activeSchoolName}`}
        badge={
          <Badge variant="default" className="gap-1">
            <ShieldCheck className="h-3 w-3" />
            <span>Admin</span>
          </Badge>
        }
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportSummary}
              disabled={isLoading || !data}
              className="gap-1.5 text-xs cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Export Summary</span>
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => setIsAddStudentOpen(true)}
              className="gap-1.5 text-xs cursor-pointer shadow-sm"
            >
              <span>+ Quick Enroll</span>
            </Button>
          </div>
        }
      />

      {/* Phase 23: Onboarding & Institutional Setup Readiness Widget */}
      <OnboardingReadinessWidget />

      {/* Phase 24: Operations & Daily Administration Quick Dock */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between rounded-xl border bg-card p-4 shadow-sm gap-3">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-2.5 text-primary">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <h4 className="font-semibold text-sm text-foreground">Daily Operations & Task Center</h4>
            <p className="text-xs text-muted-foreground">
              Monitor missing daily attendance, overdue fee follow-ups, grading desks, and pending approvals.
            </p>
          </div>
        </div>
        <Link
          to="/admin/operations"
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition shadow-sm shrink-0"
        >
          <span>Operations Desk</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* 6 Reusable Statistic Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* Card 1: Total Students */}
        <StatCard
          title="Total Students"
          value={data?.stats.totalStudents.value ?? '--'}
          change={data?.stats.totalStudents.change}
          isPositive={data?.stats.totalStudents.isPositive}
          description={data?.stats.totalStudents.description}
          iconName="graduation-cap"
          href="/admin/students"
          isLoading={isLoading}
          isDevMock={isDevMock}
        />

        {/* Card 2: Total Teachers */}
        <StatCard
          title="Total Teachers"
          value={data?.stats.totalTeachers.value ?? '--'}
          change={data?.stats.totalTeachers.change}
          isPositive={data?.stats.totalTeachers.isPositive}
          description={data?.stats.totalTeachers.description}
          iconName="users"
          href="/admin/teachers"
          isLoading={isLoading}
          isDevMock={isDevMock}
        />

        {/* Card 3: Total Parents */}
        <StatCard
          title="Total Parents"
          value={data?.stats.totalParents.value ?? '--'}
          change={data?.stats.totalParents.change}
          isPositive={data?.stats.totalParents.isPositive}
          description={data?.stats.totalParents.description}
          iconName="heart-handshake"
          href="/admin/parents"
          isLoading={isLoading}
          isDevMock={isDevMock}
        />

        {/* Card 4: Today's Attendance */}
        <StatCard
          title="Today's Attendance"
          value={data?.stats.todayAttendance.value ?? '--'}
          change={data?.stats.todayAttendance.change}
          isPositive={data?.stats.todayAttendance.isPositive}
          description={data?.stats.todayAttendance.description}
          iconName="calendar-check"
          href="/admin/attendance"
          isLoading={isLoading}
          isDevMock={isDevMock}
        />

        {/* Card 5: Fees Collected */}
        <StatCard
          title="Fees Collected"
          value={data?.stats.feesCollected.value ?? '--'}
          change={data?.stats.feesCollected.change}
          isPositive={data?.stats.feesCollected.isPositive}
          description={data?.stats.feesCollected.description}
          iconName="credit-card"
          href="/admin/fees"
          isLoading={isLoading}
          isDevMock={isDevMock}
        />

        {/* Card 6: Outstanding Fees */}
        <StatCard
          title="Outstanding Fees"
          value={data?.stats.outstandingFees.value ?? '--'}
          change={data?.stats.outstandingFees.change}
          isPositive={data?.stats.outstandingFees.isPositive}
          description={data?.stats.outstandingFees.description}
          iconName="alert-circle"
          href="/admin/fees"
          isLoading={isLoading}
          isDevMock={isDevMock}
        />
      </div>

      {/* Academic Operations Command Strip (Phase 6 Integration) */}
      <div className="p-4 rounded-xl border bg-card shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Calendar className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-semibold text-foreground">Academic Operations Hub</h4>
                <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">
                  {academicSummary?.activeSession?.name || 'Academic Year Active'}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Session Code: {academicSummary?.activeSession?.code || 'AY-2025-2026'} • Capacity Utilization:{' '}
                {academicSummary?.capacityUtilizationRate || 0}%
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <Link to="/admin/academic-sessions">
              <Button variant="ghost" size="sm" className="h-7 text-xs text-primary">
                Manage Sessions
                <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Dynamic Metric Pills & Direct Academic Route Links */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          <Link
            to="/admin/classes"
            className="p-2.5 rounded-lg border bg-muted/30 hover:bg-muted/60 transition flex items-center justify-between group"
          >
            <div>
              <p className="text-[11px] text-muted-foreground font-medium">Grades</p>
              <p className="text-base font-bold text-foreground">
                {isAcademicLoading ? '...' : academicSummary?.classesCount ?? 0}
              </p>
            </div>
            <GraduationCap className="h-4 w-4 text-muted-foreground group-hover:text-primary transition" />
          </Link>

          <Link
            to="/admin/sections"
            className="p-2.5 rounded-lg border bg-muted/30 hover:bg-muted/60 transition flex items-center justify-between group"
          >
            <div>
              <p className="text-[11px] text-muted-foreground font-medium">Sections</p>
              <p className="text-base font-bold text-foreground">
                {isAcademicLoading ? '...' : academicSummary?.sectionsCount ?? 0}
              </p>
            </div>
            <Layers className="h-4 w-4 text-muted-foreground group-hover:text-primary transition" />
          </Link>

          <Link
            to="/admin/subjects"
            className="p-2.5 rounded-lg border bg-muted/30 hover:bg-muted/60 transition flex items-center justify-between group"
          >
            <div>
              <p className="text-[11px] text-muted-foreground font-medium">Subjects</p>
              <p className="text-base font-bold text-foreground">
                {isAcademicLoading ? '...' : academicSummary?.subjectsCount ?? 0}
              </p>
            </div>
            <BookOpen className="h-4 w-4 text-muted-foreground group-hover:text-primary transition" />
          </Link>

          <Link
            to="/admin/enrollments"
            className="p-2.5 rounded-lg border bg-muted/30 hover:bg-muted/60 transition flex items-center justify-between group"
          >
            <div>
              <p className="text-[11px] text-muted-foreground font-medium">Enrolled</p>
              <p className="text-base font-bold text-foreground">
                {isAcademicLoading ? '...' : academicSummary?.enrolledStudentsCount ?? 0}
              </p>
            </div>
            <Calendar className="h-4 w-4 text-muted-foreground group-hover:text-primary transition" />
          </Link>

          <Link
            to="/admin/subject-assignments"
            className="p-2.5 rounded-lg border bg-muted/30 hover:bg-muted/60 transition flex items-center justify-between group"
          >
            <div>
              <p className="text-[11px] text-muted-foreground font-medium">Instructors</p>
              <p className="text-base font-bold text-foreground">
                {isAcademicLoading ? '...' : academicSummary?.assignedTeachersCount ?? 0}
              </p>
            </div>
            <UserCheck className="h-4 w-4 text-muted-foreground group-hover:text-primary transition" />
          </Link>

          <Link
            to="/admin/sections"
            className="p-2.5 rounded-lg border bg-muted/30 hover:bg-muted/60 transition flex items-center justify-between group"
          >
            <div>
              <p className="text-[11px] text-muted-foreground font-medium">Avg Capacity</p>
              <p className="text-base font-bold text-foreground">
                {isAcademicLoading ? '...' : `${academicSummary?.averageSectionCapacity ?? 35} seats`}
              </p>
            </div>
            <Layers className="h-4 w-4 text-muted-foreground group-hover:text-primary transition" />
          </Link>
        </div>
      </div>

      {/* Row 2: Attendance Velocity (Line Chart) & Tuition Realization (Bar Chart) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AttendanceTrendChart
          data={data?.attendanceTrend}
          isLoading={isLoading}
          timeframe={timeframe}
          onTimeframeChange={setTimeframe}
          isDevMock={isDevMock}
        />

        <FeeCollectionChart
          data={data?.feeCollections}
          isLoading={isLoading}
          currency={currency}
          isDevMock={isDevMock}
        />
      </div>

      {/* Row 3: Student Cohort Distribution & Academic Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <StudentDistributionChart
            data={data?.studentDistribution}
            isLoading={isLoading}
            isDevMock={isDevMock}
          />
        </div>

        <div className="lg:col-span-2">
          <AcademicPerformanceChart
            data={data?.academicPerformance}
            isLoading={isLoading}
          />
        </div>
      </div>

      {/* Row 4: Recent Activity Sections (Admissions, Payments, Announcements, Activities) */}
      <div>
        <RecentActivitySections
          admissions={data?.recentAdmissions}
          payments={data?.recentFeePayments}
          announcements={data?.recentAnnouncements}
          activities={data?.recentActivities}
          isLoading={isLoading}
        />
      </div>

      {/* Row 5: Quick Administrative Actions Dock */}
      <QuickActionDock
        onAddStudent={() => setIsAddStudentOpen(true)}
        onAddTeacher={() => setIsAddTeacherOpen(true)}
        onRecordAttendance={() => setIsRecordAttendanceOpen(true)}
        onCreateInvoice={() => setIsCreateInvoiceOpen(true)}
        onCreateAnnouncement={() => setIsCreateAnnouncementOpen(true)}
      />

      {/* Interactive Modal Dialogs */}
      <QuickEnrollStudentModal
        isOpen={isAddStudentOpen}
        onClose={() => setIsAddStudentOpen(false)}
        schoolName={activeSchoolName}
      />

      <QuickAddTeacherModal
        isOpen={isAddTeacherOpen}
        onClose={() => setIsAddTeacherOpen(false)}
        schoolName={activeSchoolName}
      />

      <QuickRecordAttendanceModal
        isOpen={isRecordAttendanceOpen}
        onClose={() => setIsRecordAttendanceOpen(false)}
      />

      <QuickFeeInvoiceModal
        isOpen={isCreateInvoiceOpen}
        onClose={() => setIsCreateInvoiceOpen(false)}
        currency={currency}
      />

      <QuickAnnouncementModal
        isOpen={isCreateAnnouncementOpen}
        onClose={() => setIsCreateAnnouncementOpen(false)}
        schoolName={activeSchoolName}
      />
    </div>
  );
};
