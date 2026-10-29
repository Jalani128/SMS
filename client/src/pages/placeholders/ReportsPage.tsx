import React, { useState, useEffect } from 'react';
import { PageHeader } from '../../components/shared/PageHeader';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Skeleton } from '../../components/ui/Skeleton';
import { useAuth } from '../../hooks/useAuth';
import { reportService } from '../../services/report.service';
import '../../lib/chart';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  DashboardAnalyticsResponse,
  AttendanceReportResponse,
  FeeFinanceReportResponse,
  StudentEnrollmentReportResponse,
  AcademicPerformanceReportResponse,
  HomeworkReportResponse,
  AdvancedAnalyticsResponse,
} from '../../types/reports';
import {
  BarChart3,
  Calendar,
  Download,
  Printer,
  Users,
  GraduationCap,
  CreditCard,
  ClipboardList,
  AlertTriangle,
  Search,
  Filter,
  RefreshCw,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';

export const ReportsPage: React.FC = () => {
  const { activeRole, schoolName } = useAuth();

  // Navigation Tabs
  const [activeTab, setActiveTab] = useState<
    'dashboard' | 'attendance' | 'finances' | 'enrollment' | 'academics' | 'homework'
  >('dashboard');

  // Filter Toolbar State
  const [timeframe, setTimeframe] = useState<'today' | 'week' | 'month' | 'term' | 'year' | 'custom'>('month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  // Data Loading States
  const [isLoading, setIsLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<DashboardAnalyticsResponse | null>(null);
  const [advancedData, setAdvancedData] = useState<AdvancedAnalyticsResponse | null>(null);
  const [attendanceData, setAttendanceData] = useState<AttendanceReportResponse | null>(null);
  const [financeData, setFinanceData] = useState<FeeFinanceReportResponse | null>(null);
  const [enrollmentData, setEnrollmentData] = useState<StudentEnrollmentReportResponse | null>(null);
  const [academicData, setAcademicData] = useState<AcademicPerformanceReportResponse | null>(null);
  const [homeworkData, setHomeworkData] = useState<HomeworkReportResponse | null>(null);

  // Fetch report data based on active tab and timeframe
  const loadData = async () => {
    setIsLoading(true);
    try {
      const query = {
        timeframe,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      };

      if (activeTab === 'dashboard') {
        const [dashRes, advRes] = await Promise.all([
          reportService.getDashboardAnalytics(query).catch(() => null),
          reportService.getAdvancedAnalytics(query).catch(() => null),
        ]);
        setDashboardData(dashRes);
        setAdvancedData(advRes);
      } else if (activeTab === 'attendance') {
        const res = await reportService.getAttendanceReport(query);
        setAttendanceData(res);
      } else if (activeTab === 'finances' && (activeRole === 'admin' || activeRole === 'super_admin')) {
        const res = await reportService.getFeeFinanceReport(query);
        setFinanceData(res);
      } else if (activeTab === 'enrollment') {
        const res = await reportService.getStudentEnrollmentReport(query);
        setEnrollmentData(res);
      } else if (activeTab === 'academics') {
        const res = await reportService.getAcademicPerformanceReport(query);
        setAcademicData(res);
      } else if (activeTab === 'homework') {
        const res = await reportService.getHomeworkReport(query);
        setHomeworkData(res);
      }
    } catch (err) {
      console.error('[ReportsPage] Failed to fetch reporting data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeTab, timeframe, startDate, endDate]);

  // Export CSV Handler
  const handleExportCsv = async () => {
    setIsExporting(true);
    try {
      if (activeTab === 'dashboard') {
        await reportService.exportAdvancedAnalyticsCsv({
          timeframe,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        });
      } else {
        const typeMap: Record<string, 'attendance' | 'fees' | 'students' | 'academic' | 'homework'> = {
          attendance: 'attendance',
          finances: 'fees',
          enrollment: 'students',
          academics: 'academic',
          homework: 'homework',
        };
        const exportType = typeMap[activeTab] || 'attendance';
        await reportService.downloadReportCsv(exportType, {
          timeframe,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        });
      }
    } catch (err) {
      console.error('[ReportsPage] CSV Export failed:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      <style>{`
        @media print {
          .no-print, aside, nav, header {
            display: none !important;
          }
          body {
            background: white !important;
            color: black !important;
          }
          .print-full-width {
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
        }
      `}</style>

      {/* Page Header */}
      <div className="no-print">
        <PageHeader
          title="Reports & Institutional Analytics"
          description={`Comprehensive operational audits, academic performance, and financial analytics for ${schoolName}`}
          badge={<Badge variant="default">Phase 25 Analytics</Badge>}
          actions={
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs"
                onClick={handlePrint}
              >
                <Printer className="h-3.5 w-3.5" />
                Print Report
              </Button>
              <Button
                size="sm"
                className="gap-1.5 text-xs"
                onClick={handleExportCsv}
                disabled={isExporting}
              >
                <Download className="h-3.5 w-3.5" />
                {isExporting ? 'Exporting...' : 'Export CSV'}
              </Button>
            </div>
          }
        />
      </div>

      {/* Filter Toolbar */}
      <Card className="no-print">
        <CardContent className="p-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
              <Filter className="h-3.5 w-3.5" />
              Timeframe:
            </div>
            <select
              className="h-8 rounded-md border border-input bg-background px-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              value={timeframe}
              onChange={(e: any) => setTimeframe(e.target.value)}
            >
              <option value="today">Today</option>
              <option value="week">Last 7 Days</option>
              <option value="month">Last 30 Days</option>
              <option value="term">Current Term</option>
              <option value="year">Full Academic Year</option>
              <option value="custom">Custom Date Range</option>
            </select>

            {timeframe === 'custom' && (
              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  className="h-8 text-xs w-36"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
                <span className="text-xs text-muted-foreground">to</span>
                <Input
                  type="date"
                  className="h-8 text-xs w-36"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            )}
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-xs h-8 text-muted-foreground hover:text-foreground"
            onClick={loadData}
          >
            <RefreshCw className="h-3 w-3" />
            Refresh
          </Button>
        </CardContent>
      </Card>

      {/* Navigation Tabs */}
      <div className="no-print flex border-b border-border overflow-x-auto gap-2 pb-px text-sm font-medium">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'dashboard'
              ? 'border-primary text-primary font-semibold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <BarChart3 className="h-4 w-4" />
          Dashboard Overview
        </button>

        <button
          onClick={() => setActiveTab('attendance')}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'attendance'
              ? 'border-primary text-primary font-semibold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Calendar className="h-4 w-4" />
          Attendance Report
        </button>

        {(activeRole === 'admin' || activeRole === 'super_admin') && (
          <button
            onClick={() => setActiveTab('finances')}
            className={`flex items-center gap-2 px-4 py-2.5 border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'finances'
                ? 'border-primary text-primary font-semibold'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <CreditCard className="h-4 w-4" />
            Financial Analytics
          </button>
        )}

        <button
          onClick={() => setActiveTab('enrollment')}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'enrollment'
              ? 'border-primary text-primary font-semibold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Users className="h-4 w-4" />
          Enrollment & Demographics
        </button>

        <button
          onClick={() => setActiveTab('academics')}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'academics'
              ? 'border-primary text-primary font-semibold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <GraduationCap className="h-4 w-4" />
          Academic Performance
        </button>

        <button
          onClick={() => setActiveTab('homework')}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'homework'
              ? 'border-primary text-primary font-semibold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <ClipboardList className="h-4 w-4" />
          Homework Completion
        </button>
      </div>

      {/* ---------------------------------------------------------------------- */}
      {/* TAB 1: Advanced Analytics Dashboard Overview */}
      {/* ---------------------------------------------------------------------- */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Decision Support & Institutional Insights Section */}
          {advancedData?.insights && advancedData.insights.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">
                    Institutional Insights & Decision Support
                  </h3>
                </div>
                <span className="text-[11px] text-muted-foreground italic">
                  Deterministic algorithmic observations derived from authoritative records
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {advancedData.insights.map((insight, idx) => (
                  <Card
                    key={idx}
                    className={`border-l-4 ${
                      insight.trend === 'positive'
                        ? 'border-l-emerald-500 bg-emerald-50/20'
                        : insight.trend === 'negative'
                        ? 'border-l-rose-500 bg-rose-50/20'
                        : 'border-l-blue-500 bg-blue-50/20'
                    }`}
                  >
                    <CardContent className="p-3.5 space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-foreground">{insight.title}</span>
                        <Badge
                          variant="outline"
                          className={`text-[10px] uppercase font-bold px-1.5 py-0 ${
                            insight.trend === 'positive'
                              ? 'border-emerald-300 text-emerald-700 bg-emerald-50'
                              : insight.trend === 'negative'
                              ? 'border-rose-300 text-rose-700 bg-rose-50'
                              : 'border-blue-300 text-blue-700 bg-blue-50'
                          }`}
                        >
                          {insight.trend === 'positive' && (
                            <ArrowUpRight className="h-3 w-3 inline mr-0.5" />
                          )}
                          {insight.trend === 'negative' && (
                            <ArrowDownRight className="h-3 w-3 inline mr-0.5" />
                          )}
                          {insight.category}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {insight.observation}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Primary Multi-Category KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* Enrollment */}
            <Card>
              <CardContent className="p-3.5 space-y-1">
                <span className="text-[11px] text-muted-foreground font-medium block">
                  Active Students
                </span>
                <span className="text-xl font-bold text-foreground block">
                  {isLoading ? (
                    <Skeleton className="h-6 w-14" />
                  ) : (
                    (advancedData?.enrollment.totalActiveStudents ?? dashboardData?.entityCounts.students ?? 0).toLocaleString()
                  )}
                </span>
                <div className="flex items-center gap-1 text-[10px]">
                  {advancedData && (
                    <Badge
                      variant="secondary"
                      className={`text-[10px] px-1 py-0 ${
                        advancedData.enrollment.admissionsGrowthPercentage >= 0
                          ? 'text-emerald-700 bg-emerald-50'
                          : 'text-rose-700 bg-rose-50'
                      }`}
                    >
                      {advancedData.enrollment.admissionsGrowthPercentage >= 0 ? '+' : ''}
                      {advancedData.enrollment.admissionsGrowthPercentage}%
                    </Badge>
                  )}
                  <span className="text-muted-foreground truncate">
                    +{advancedData?.enrollment.newAdmissionsCurrent || 0} adm
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Attendance Rate */}
            <Card>
              <CardContent className="p-3.5 space-y-1">
                <span className="text-[11px] text-muted-foreground font-medium block">
                  Attendance Rate
                </span>
                <span className="text-xl font-bold text-emerald-600 block">
                  {isLoading ? (
                    <Skeleton className="h-6 w-14" />
                  ) : (
                    `${advancedData?.attendance.currentAttendanceRate ?? dashboardData?.attendance.todayAttendanceRate ?? 0}%`
                  )}
                </span>
                <div className="flex items-center gap-1 text-[10px]">
                  {advancedData && (
                    <Badge
                      variant="secondary"
                      className={`text-[10px] px-1 py-0 ${
                        advancedData.attendance.attendanceRateDelta >= 0
                          ? 'text-emerald-700 bg-emerald-50'
                          : 'text-rose-700 bg-rose-50'
                      }`}
                    >
                      {advancedData.attendance.attendanceRateDelta >= 0 ? '+' : ''}
                      {advancedData.attendance.attendanceRateDelta}%
                    </Badge>
                  )}
                  <span className="text-muted-foreground truncate">
                    vs prior period
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Academic Pass Rate */}
            <Card>
              <CardContent className="p-3.5 space-y-1">
                <span className="text-[11px] text-muted-foreground font-medium block">
                  Pass Rate (Published)
                </span>
                <span className="text-xl font-bold text-purple-600 block">
                  {isLoading ? (
                    <Skeleton className="h-6 w-14" />
                  ) : (
                    `${advancedData?.academics.passRatePercentage ?? dashboardData?.academics.passRate ?? 0}%`
                  )}
                </span>
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground truncate">
                  <span>Avg: {advancedData?.academics.averageScore ?? 0}%</span>
                  <span>•</span>
                  <span>{advancedData?.academics.supportRequiredCount ?? 0} support</span>
                </div>
              </CardContent>
            </Card>

            {/* Homework Submissions */}
            <Card>
              <CardContent className="p-3.5 space-y-1">
                <span className="text-[11px] text-muted-foreground font-medium block">
                  Homework Submissions
                </span>
                <span className="text-xl font-bold text-blue-600 block">
                  {isLoading ? (
                    <Skeleton className="h-6 w-14" />
                  ) : (
                    advancedData?.homework.totalSubmissions ?? 0
                  )}
                </span>
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground truncate">
                  <span>{advancedData?.homework.onTimeSubmissions ?? 0} on-time</span>
                  <span>•</span>
                  <span>{advancedData?.homework.pendingGradingCount ?? 0} backlog</span>
                </div>
              </CardContent>
            </Card>

            {/* Faculty / Operations */}
            <Card>
              <CardContent className="p-3.5 space-y-1">
                <span className="text-[11px] text-muted-foreground font-medium block">
                  Active Faculty
                </span>
                <span className="text-xl font-bold text-indigo-600 block">
                  {isLoading ? (
                    <Skeleton className="h-6 w-14" />
                  ) : (
                    advancedData?.operations?.activeTeachersCount ?? dashboardData?.entityCounts.teachers ?? 0
                  )}
                </span>
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground truncate">
                  <span>{advancedData?.operations?.openTasksCount ?? 0} open tasks</span>
                </div>
              </CardContent>
            </Card>

            {/* Operations Workload / Approvals */}
            <Card>
              <CardContent className="p-3.5 space-y-1">
                <span className="text-[11px] text-muted-foreground font-medium block">
                  Pending Approvals
                </span>
                <span className={`text-xl font-bold block ${
                  (advancedData?.operations?.pendingApprovalsCount || 0) > 0
                    ? 'text-amber-600'
                    : 'text-foreground'
                }`}>
                  {isLoading ? (
                    <Skeleton className="h-6 w-14" />
                  ) : (
                    advancedData?.operations?.pendingApprovalsCount ?? 0
                  )}
                </span>
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground truncate">
                  <span>{advancedData?.operations?.overdueTasksCount ?? 0} overdue tasks</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Admin Authoritative Financial Analytics Strip */}
          {advancedData?.finances && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-emerald-50/40 border-emerald-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider block">
                      Net Collections
                    </span>
                    <Badge
                      variant="secondary"
                      className={`text-[10px] px-1.5 py-0 ${
                        advancedData.finances.collectionGrowthPercentage >= 0
                          ? 'text-emerald-700 bg-emerald-100'
                          : 'text-rose-700 bg-rose-100'
                      }`}
                    >
                      {advancedData.finances.collectionGrowthPercentage >= 0 ? '+' : ''}
                      {advancedData.finances.collectionGrowthPercentage}% vs prior
                    </Badge>
                  </div>
                  <span className="text-2xl font-bold text-emerald-700 mt-1 block">
                    {advancedData.finances.currency} {advancedData.finances.netCollected.toLocaleString()}
                  </span>
                  <span className="text-[11px] text-emerald-600 mt-1 block">
                    Gross: {advancedData.finances.currency} {advancedData.finances.grossCollected.toLocaleString()} • Refunds: {advancedData.finances.currency} {advancedData.finances.refunds.toLocaleString()}
                  </span>
                </CardContent>
              </Card>

              <Card className="bg-amber-50/40 border-amber-200">
                <CardContent className="p-4">
                  <span className="text-xs font-semibold text-amber-800 uppercase tracking-wider block">
                    Total Outstanding Receivables
                  </span>
                  <span className="text-2xl font-bold text-amber-700 mt-1 block">
                    {advancedData.finances.currency} {advancedData.finances.totalOutstanding.toLocaleString()}
                  </span>
                  <span className="text-[11px] text-amber-600 mt-1 block">
                    Total Invoiced: {advancedData.finances.currency} {advancedData.finances.totalInvoiced.toLocaleString()}
                  </span>
                </CardContent>
              </Card>

              <Card className="bg-rose-50/40 border-rose-200">
                <CardContent className="p-4">
                  <span className="text-xs font-semibold text-rose-800 uppercase tracking-wider block">
                    Overdue Receivables Balance
                  </span>
                  <span className="text-2xl font-bold text-rose-700 mt-1 block">
                    {advancedData.finances.currency} {advancedData.finances.totalOverdue.toLocaleString()}
                  </span>
                  <span className="text-[11px] text-rose-600 mt-1 block">
                    {advancedData.finances.overdueInvoicesCount} invoices past due date
                  </span>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Interactive Chart Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Chart 1: Attendance Daily Trend */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center justify-between">
                  <span>Attendance Trend Over Period</span>
                  {advancedData?.attendance.threshold && (
                    <Badge variant="outline" className="text-[10px]">
                      Target: ≥{advancedData.attendance.threshold}%
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription className="text-xs">
                  Recorded attendance velocity across all active student cohorts
                </CardDescription>
              </CardHeader>
              <CardContent className="h-64">
                {isLoading ? (
                  <Skeleton className="h-full w-full rounded-lg" />
                ) : dashboardData?.attendance.trends && dashboardData.attendance.trends.length > 0 ? (
                  <Line
                    data={{
                      labels: dashboardData.attendance.trends.map((t) => t.date),
                      datasets: [
                        {
                          label: 'Attendance Rate (%)',
                          data: dashboardData.attendance.trends.map((t) => t.rate),
                          borderColor: '#10b981',
                          backgroundColor: 'rgba(16, 185, 129, 0.1)',
                          fill: true,
                          tension: 0.3,
                        },
                      ],
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      scales: {
                        y: { min: 0, max: 100, ticks: { callback: (v) => `${v}%` } },
                      },
                    }}
                  />
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-muted-foreground border border-dashed rounded-lg">
                    No attendance records for the selected date range.
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Chart 2: Cohort Distribution by Class */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Enrollment by Class Cohort</CardTitle>
                <CardDescription className="text-xs">
                  Active student distribution across registered classes
                </CardDescription>
              </CardHeader>
              <CardContent className="h-64">
                {isLoading ? (
                  <Skeleton className="h-full w-full rounded-lg" />
                ) : advancedData?.enrollment.cohortDistribution &&
                  advancedData.enrollment.cohortDistribution.length > 0 ? (
                  <Bar
                    data={{
                      labels: advancedData.enrollment.cohortDistribution.map((c) => c.className),
                      datasets: [
                        {
                          label: 'Students Enrolled',
                          data: advancedData.enrollment.cohortDistribution.map((c) => c.studentCount),
                          backgroundColor: '#3b82f6',
                          borderRadius: 4,
                        },
                      ],
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      scales: {
                        y: { beginAtZero: true, ticks: { stepSize: 1 } },
                      },
                    }}
                  />
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-muted-foreground border border-dashed rounded-lg">
                    No cohort distribution records available.
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Chart 3: Academic Grade Distribution */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Published Grade Distribution</CardTitle>
                <CardDescription className="text-xs">
                  Distribution of evaluated grades across published examinations
                </CardDescription>
              </CardHeader>
              <CardContent className="h-64 flex items-center justify-center">
                {isLoading ? (
                  <Skeleton className="h-full w-full rounded-lg" />
                ) : advancedData?.academics.gradeDistribution &&
                  advancedData.academics.gradeDistribution.length > 0 ? (
                  <Doughnut
                    data={{
                      labels: advancedData.academics.gradeDistribution.map((g) => `Grade ${g.grade}`),
                      datasets: [
                        {
                          data: advancedData.academics.gradeDistribution.map((g) => g.count),
                          backgroundColor: [
                            '#10b981',
                            '#3b82f6',
                            '#8b5cf6',
                            '#f59e0b',
                            '#ef4444',
                            '#64748b',
                          ],
                        },
                      ],
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                    }}
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-xs text-muted-foreground border border-dashed rounded-lg">
                    No published grade records for this period.
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Chart 4: Fee Payment Methods (Admin) or Homework Completion */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  {advancedData?.finances ? 'Fee Collection by Payment Channel' : 'Assessment Outcome Summary'}
                </CardTitle>
                <CardDescription className="text-xs">
                  {advancedData?.finances
                    ? 'Breakdown of successful revenue receipts by payment method'
                    : 'Ratio of passed vs failed published evaluations'}
                </CardDescription>
              </CardHeader>
              <CardContent className="h-64 flex items-center justify-center">
                {isLoading ? (
                  <Skeleton className="h-full w-full rounded-lg" />
                ) : advancedData?.finances?.paymentMethods &&
                  advancedData.finances.paymentMethods.length > 0 ? (
                  <Doughnut
                    data={{
                      labels: advancedData.finances.paymentMethods.map(
                        (pm) => pm.method.replace('_', ' ').toUpperCase()
                      ),
                      datasets: [
                        {
                          data: advancedData.finances.paymentMethods.map((pm) => pm.amount),
                          backgroundColor: ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#64748b'],
                        },
                      ],
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                    }}
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-xs text-muted-foreground border border-dashed rounded-lg">
                    No payment transaction records for this period.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Class-Wise Attendance Early-Intervention Monitor */}
          {advancedData?.attendance.classWiseAttendance &&
            advancedData.attendance.classWiseAttendance.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center justify-between">
                    <span>Class Attendance & Threshold Monitor</span>
                    <Badge variant="outline" className="text-xs">
                      Threshold: {advancedData.attendance.threshold}%
                    </Badge>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Cohorts below institutional threshold require administrative intervention
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="border-b bg-muted/40 uppercase font-semibold text-muted-foreground">
                        <tr>
                          <th className="py-2.5 px-3">Class Cohort</th>
                          <th className="py-2.5 px-3">Total Recorded Days</th>
                          <th className="py-2.5 px-3">Present / Late</th>
                          <th className="py-2.5 px-3">Attendance Rate</th>
                          <th className="py-2.5 px-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {advancedData.attendance.classWiseAttendance.map((cw, idx) => {
                          const isBelow = cw.rate < advancedData.attendance.threshold;
                          return (
                            <tr key={idx} className="hover:bg-muted/20">
                              <td className="py-2.5 px-3 font-semibold">{cw.className}</td>
                              <td className="py-2.5 px-3">{cw.total}</td>
                              <td className="py-2.5 px-3 text-emerald-600 font-medium">{cw.present}</td>
                              <td className="py-2.5 px-3 font-bold">{cw.rate}%</td>
                              <td className="py-2.5 px-3">
                                {isBelow ? (
                                  <Badge variant="destructive" className="text-[10px]">
                                    Below Threshold ({cw.rate}%)
                                  </Badge>
                                ) : (
                                  <Badge variant="secondary" className="text-[10px] bg-emerald-100 text-emerald-800">
                                    Compliant
                                  </Badge>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* TAB 2: Attendance Report */}
      {/* ---------------------------------------------------------------------- */}
      {activeTab === 'attendance' && (
        <div className="space-y-6">
          {/* Summary Strip */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <Card>
              <CardContent className="p-3.5">
                <span className="text-[11px] text-muted-foreground uppercase font-semibold block">Overall Rate</span>
                <span className="text-2xl font-bold text-emerald-600 block mt-1">
                  {attendanceData?.summary.attendanceRate || 0}%
                </span>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3.5">
                <span className="text-[11px] text-muted-foreground uppercase font-semibold block">Present</span>
                <span className="text-2xl font-bold text-foreground block mt-1">
                  {attendanceData?.summary.presentCount || 0}
                </span>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3.5">
                <span className="text-[11px] text-muted-foreground uppercase font-semibold block">Late</span>
                <span className="text-2xl font-bold text-amber-600 block mt-1">
                  {attendanceData?.summary.lateCount || 0}
                </span>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3.5">
                <span className="text-[11px] text-muted-foreground uppercase font-semibold block">Absent</span>
                <span className="text-2xl font-bold text-rose-600 block mt-1">
                  {attendanceData?.summary.absentCount || 0}
                </span>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3.5">
                <span className="text-[11px] text-muted-foreground uppercase font-semibold block">Leave / Excused</span>
                <span className="text-2xl font-bold text-blue-600 block mt-1">
                  {attendanceData?.summary.leaveCount || 0}
                </span>
              </CardContent>
            </Card>
          </div>

          {/* Class-Wise Attendance Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Class-Wise Attendance Breakdown</CardTitle>
              <CardDescription className="text-xs">
                Performance across cohorts for the active timeframe
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="border-b bg-muted/40 uppercase font-semibold text-muted-foreground">
                    <tr>
                      <th className="py-2.5 px-3">Class Cohort</th>
                      <th className="py-2.5 px-3">Total Recorded</th>
                      <th className="py-2.5 px-3">Present / Late</th>
                      <th className="py-2.5 px-3">Absent</th>
                      <th className="py-2.5 px-3">Attendance Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {attendanceData?.classSummaries && attendanceData.classSummaries.length > 0 ? (
                      attendanceData.classSummaries.map((c, idx) => (
                        <tr key={idx} className="hover:bg-muted/20">
                          <td className="py-2.5 px-3 font-semibold">{c.className}</td>
                          <td className="py-2.5 px-3">{c.total}</td>
                          <td className="py-2.5 px-3 text-emerald-600 font-medium">{c.present}</td>
                          <td className="py-2.5 px-3 text-rose-600 font-medium">{c.absent}</td>
                          <td className="py-2.5 px-3">
                            <Badge
                              variant="secondary"
                              className={
                                c.attendanceRate >= 85
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : c.attendanceRate >= 75
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-rose-100 text-rose-800'
                              }
                            >
                              {c.attendanceRate}%
                            </Badge>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-muted-foreground">
                          No class attendance records found for this period.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Frequent Absentees List */}
          {attendanceData?.frequentAbsentees && attendanceData.frequentAbsentees.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  Students With Highest Unexcused Absences
                </CardTitle>
                <CardDescription className="text-xs">
                  Early intervention list based on recorded absences during reporting period
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {attendanceData.frequentAbsentees.map((s, idx) => (
                    <div key={idx} className="p-3 border rounded-lg bg-muted/20 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-semibold text-foreground block">{s.studentName}</span>
                        <span className="text-muted-foreground text-[11px]">Adm: {s.admissionNumber}</span>
                      </div>
                      <Badge variant="destructive" className="text-xs">
                        {s.absenceCount} Absences
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* TAB 3: Financial Analytics (Admin Only) */}
      {/* ---------------------------------------------------------------------- */}
      {activeTab === 'finances' && financeData && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="bg-emerald-50/50 border-emerald-200">
              <CardContent className="p-4">
                <span className="text-xs font-semibold text-emerald-800 uppercase block">Net Revenue Collected</span>
                <span className="text-2xl font-bold text-emerald-700 mt-1 block">
                  ${financeData.collections.netCollected.toLocaleString()}
                </span>
                <span className="text-[11px] text-emerald-600 block mt-1">
                  Collection Rate: {financeData.collections.collectionRatePercentage}%
                </span>
              </CardContent>
            </Card>

            <Card className="bg-blue-50/50 border-blue-200">
              <CardContent className="p-4">
                <span className="text-xs font-semibold text-blue-800 uppercase block">Total Invoiced Amount</span>
                <span className="text-2xl font-bold text-blue-700 mt-1 block">
                  ${financeData.invoicing.totalInvoicedAmount.toLocaleString()}
                </span>
                <span className="text-[11px] text-blue-600 block mt-1">
                  Gross: ${financeData.collections.grossCollected.toLocaleString()}
                </span>
              </CardContent>
            </Card>

            <Card className="bg-amber-50/50 border-amber-200">
              <CardContent className="p-4">
                <span className="text-xs font-semibold text-amber-800 uppercase block">Outstanding Balance</span>
                <span className="text-2xl font-bold text-amber-700 mt-1 block">
                  ${financeData.invoicing.totalOutstandingBalance.toLocaleString()}
                </span>
                <span className="text-[11px] text-amber-600 block mt-1">
                  Unpaid invoices: {financeData.invoicing.invoiceCountsByStatus.issued || 0}
                </span>
              </CardContent>
            </Card>

            <Card className="bg-rose-50/50 border-rose-200">
              <CardContent className="p-4">
                <span className="text-xs font-semibold text-rose-800 uppercase block">Total Overdue Dues</span>
                <span className="text-2xl font-bold text-rose-700 mt-1 block">
                  ${financeData.invoicing.totalOverdueBalance.toLocaleString()}
                </span>
                <span className="text-[11px] text-rose-600 block mt-1">
                  Refunds: ${financeData.collections.refunds.toLocaleString()}
                </span>
              </CardContent>
            </Card>
          </div>

          {/* Payment Method Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Payment Method Breakdown</CardTitle>
              <CardDescription className="text-xs">
                Collections segmented by payment channel (Cash, Card, Bank, Online)
              </CardDescription>
            </CardHeader>
            <CardContent className="h-64">
              {financeData.paymentMethods && financeData.paymentMethods.length > 0 ? (
                <Bar
                  data={{
                    labels: financeData.paymentMethods.map((m) => m.method.toUpperCase()),
                    datasets: [
                      {
                        label: 'Collected Amount ($)',
                        data: financeData.paymentMethods.map((m) => m.amount),
                        backgroundColor: '#3b82f6',
                        borderRadius: 6,
                      },
                    ],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                  }}
                />
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-muted-foreground border border-dashed rounded-lg">
                  No payment transactions recorded for this period.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* TAB 4: Enrollment Report */}
      {/* ---------------------------------------------------------------------- */}
      {activeTab === 'enrollment' && enrollmentData && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <span className="text-xs text-muted-foreground font-medium block">Unique Active Students</span>
                <span className="text-2xl font-bold text-foreground mt-1 block">
                  {enrollmentData.summary.totalActiveStudents.toLocaleString()}
                </span>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <span className="text-xs text-muted-foreground font-medium block">All Registered Profiles</span>
                <span className="text-2xl font-bold text-foreground mt-1 block">
                  {enrollmentData.summary.totalStudentsAcrossAllStatuses.toLocaleString()}
                </span>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <span className="text-xs text-muted-foreground font-medium block">Active Cohorts</span>
                <span className="text-2xl font-bold text-blue-600 mt-1 block">
                  {enrollmentData.cohortDistribution.length}
                </span>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <span className="text-xs text-muted-foreground font-medium block">Transferred / Graduated</span>
                <span className="text-2xl font-bold text-muted-foreground mt-1 block">
                  {(enrollmentData.summary.statusDistribution.transferred || 0) + (enrollmentData.summary.statusDistribution.graduated || 0)}
                </span>
              </CardContent>
            </Card>
          </div>

          {/* Student Directory Table */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base">Student Cohort Roster</CardTitle>
                <CardDescription className="text-xs">
                  Showing {enrollmentData.students.length} of {enrollmentData.pagination.totalRecords} students
                </CardDescription>
              </div>
              <div className="relative w-64 no-print">
                <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
                <Input
                  placeholder="Filter name or admission #..."
                  className="h-8 pl-8 text-xs"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="border-b bg-muted/40 uppercase font-semibold text-muted-foreground">
                    <tr>
                      <th className="py-2.5 px-3">Admission #</th>
                      <th className="py-2.5 px-3">Student Name</th>
                      <th className="py-2.5 px-3">Class</th>
                      <th className="py-2.5 px-3">Section</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Admission Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {enrollmentData.students
                      .filter(
                        (s) =>
                          !searchTerm ||
                          s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          s.admissionNumber.toLowerCase().includes(searchTerm.toLowerCase())
                      )
                      .map((s, idx) => (
                        <tr key={idx} className="hover:bg-muted/20">
                          <td className="py-2.5 px-3 font-mono font-medium">{s.admissionNumber}</td>
                          <td className="py-2.5 px-3 font-semibold">{s.name}</td>
                          <td className="py-2.5 px-3">{s.class}</td>
                          <td className="py-2.5 px-3">{s.section}</td>
                          <td className="py-2.5 px-3">
                            <Badge
                              variant="secondary"
                              className={
                                s.status === 'active'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-muted text-muted-foreground'
                              }
                            >
                              {s.status}
                            </Badge>
                          </td>
                          <td className="py-2.5 px-3 text-muted-foreground">{s.admissionDate}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* TAB 5: Academic Performance */}
      {/* ---------------------------------------------------------------------- */}
      {activeTab === 'academics' && academicData && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <span className="text-xs text-muted-foreground font-medium block">Total Evaluated Assessments</span>
                <span className="text-2xl font-bold text-foreground mt-1 block">
                  {academicData.performanceSummary.totalEvaluatedAssessments.toLocaleString()}
                </span>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <span className="text-xs text-muted-foreground font-medium block">Overall Pass Rate</span>
                <span className="text-2xl font-bold text-emerald-600 mt-1 block">
                  {academicData.performanceSummary.passRatePercentage}%
                </span>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <span className="text-xs text-muted-foreground font-medium block">Average Percentage</span>
                <span className="text-2xl font-bold text-blue-600 mt-1 block">
                  {academicData.performanceSummary.averagePercentage}%
                </span>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <span className="text-xs text-muted-foreground font-medium block">Top / Lowest Score</span>
                <span className="text-xl font-bold text-purple-600 mt-1 block">
                  {academicData.performanceSummary.highestPercentage}% / {academicData.performanceSummary.lowestPercentage}%
                </span>
              </CardContent>
            </Card>
          </div>

          {/* Grade Distribution Bar Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Grade Distribution (Published Scorecards)</CardTitle>
              <CardDescription className="text-xs">
                Count of student grades across finalized assessments
              </CardDescription>
            </CardHeader>
            <CardContent className="h-64">
              {academicData.gradeDistribution && academicData.gradeDistribution.length > 0 ? (
                <Bar
                  data={{
                    labels: academicData.gradeDistribution.map((g) => g.grade),
                    datasets: [
                      {
                        label: 'Students Count',
                        data: academicData.gradeDistribution.map((g) => g.count),
                        backgroundColor: '#8b5cf6',
                        borderRadius: 6,
                      },
                    ],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                  }}
                />
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-muted-foreground border border-dashed rounded-lg">
                  No published exam scorecard records found.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* TAB 6: Homework Report */}
      {/* ---------------------------------------------------------------------- */}
      {activeTab === 'homework' && homeworkData && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <span className="text-xs text-muted-foreground font-medium block">Created Homework Tasks</span>
                <span className="text-2xl font-bold text-foreground mt-1 block">
                  {homeworkData.assignmentsCount}
                </span>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <span className="text-xs text-muted-foreground font-medium block">Unique Submissions</span>
                <span className="text-2xl font-bold text-blue-600 mt-1 block">
                  {homeworkData.submissions.totalUniqueSubmissions}
                </span>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <span className="text-xs text-muted-foreground font-medium block">On-Time Submissions</span>
                <span className="text-2xl font-bold text-emerald-600 mt-1 block">
                  {homeworkData.submissions.onTimeSubmissions}
                </span>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <span className="text-xs text-muted-foreground font-medium block">Late Submissions</span>
                <span className="text-2xl font-bold text-amber-600 mt-1 block">
                  {homeworkData.submissions.lateSubmissions}
                </span>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};
