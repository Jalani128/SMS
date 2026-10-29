import React from 'react';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import '../../lib/chart';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Skeleton } from '../ui/Skeleton';
import {
  AttendanceChartData,
  FeeChartData,
  StudentDistributionData,
  AcademicPerformanceData,
} from '../../services/dashboard.service';
import {
  CalendarCheck,
  CreditCard,
  PieChart,
  GraduationCap,
  HelpCircle,
} from 'lucide-react';
import { formatCurrency } from '../../lib/utils';

// ---------------------------------------------------------------------------
// Chart A: Attendance Velocity Trend (Line Chart)
// ---------------------------------------------------------------------------
interface AttendanceTrendChartProps {
  data?: AttendanceChartData;
  isLoading?: boolean;
  timeframe: 'week' | 'month' | 'year';
  onTimeframeChange: (tf: 'week' | 'month' | 'year') => void;
  isDevMock?: boolean;
}

export const AttendanceTrendChart: React.FC<AttendanceTrendChartProps> = ({
  data,
  isLoading,
  timeframe,
  onTimeframeChange,
  isDevMock,
}) => {
  if (isLoading || !data) {
    return (
      <Card className="h-full">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div className="space-y-1">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-56" />
          </div>
          <Skeleton className="h-6 w-24 rounded-full" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          boxWidth: 12,
          font: { size: 11, family: 'Inter, system-ui, sans-serif' },
          color: '#64748b',
        },
      },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        padding: 10,
        cornerRadius: 8,
        titleFont: { size: 12 },
        bodyFont: { size: 11 },
        callbacks: {
          label: (context: any) => ` ${context.dataset.label}: ${context.parsed.y}%`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { font: { size: 11 }, color: '#94a3b8' },
      },
      y: {
        min: 60,
        max: 100,
        grid: { color: 'rgba(226, 232, 240, 0.6)' },
        ticks: {
          font: { size: 11 },
          color: '#94a3b8',
          callback: (value: any) => `${value}%`,
        },
      },
    },
  };

  return (
    <Card className="h-full" role="region" aria-label="Campus Attendance Trend Chart">
      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-2 gap-2">
        <div>
          <div className="flex items-center gap-2">
            <CalendarCheck className="h-4 w-4 text-primary" />
            <CardTitle className="text-base font-semibold">Campus Attendance Trend</CardTitle>
            {isDevMock && (
              <Badge variant="outline" className="text-[9px] py-0 font-mono text-amber-600 dark:text-amber-400">
                Mock
              </Badge>
            )}
          </div>
          <CardDescription className="text-xs mt-0.5">
            Daily student presence velocity compared against institutional 75% threshold
          </CardDescription>
        </div>

        <div className="flex items-center gap-1.5 self-end sm:self-auto">
          <div className="flex items-center border rounded-lg p-0.5 bg-muted/40 text-xs">
            <button
              onClick={() => onTimeframeChange('week')}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                timeframe === 'week' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Weekly
            </button>
            <button
              onClick={() => onTimeframeChange('month')}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                timeframe === 'month' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Monthly
            </button>
          </div>
          <Badge variant="success" className="text-xs font-semibold py-0.5">
            {data.averageRate}
          </Badge>
        </div>
      </CardHeader>

      <CardContent>
        <div className="h-64 w-full">
          <Line data={data} options={lineOptions} aria-label="Line chart displaying weekly attendance percentages" />
        </div>
      </CardContent>
    </Card>
  );
};

// ---------------------------------------------------------------------------
// Chart B: Fee Collections & Invoicing (Bar Chart)
// ---------------------------------------------------------------------------
interface FeeCollectionChartProps {
  data?: FeeChartData;
  isLoading?: boolean;
  currency?: string;
  isDevMock?: boolean;
}

export const FeeCollectionChart: React.FC<FeeCollectionChartProps> = ({
  data,
  isLoading,
  currency = 'USD',
  isDevMock,
}) => {
  if (isLoading || !data) {
    return (
      <Card className="h-full">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div className="space-y-1">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-56" />
          </div>
          <Skeleton className="h-6 w-24 rounded-full" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          boxWidth: 12,
          font: { size: 11, family: 'Inter, system-ui, sans-serif' },
          color: '#64748b',
        },
      },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        padding: 10,
        cornerRadius: 8,
        titleFont: { size: 12 },
        bodyFont: { size: 11 },
        callbacks: {
          label: (context: any) => {
            const rawVal = context.parsed.y * 1000;
            return ` ${context.dataset.label}: ${formatCurrency(rawVal, currency)}`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { font: { size: 11 }, color: '#94a3b8' },
      },
      y: {
        grid: { color: 'rgba(226, 232, 240, 0.6)' },
        ticks: {
          font: { size: 11 },
          color: '#94a3b8',
          callback: (value: any) => `${value}k`,
        },
      },
    },
  };

  return (
    <Card className="h-full" role="region" aria-label="Monthly Fee Collection Bar Chart">
      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-2 gap-2">
        <div>
          <div className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-emerald-500" />
            <CardTitle className="text-base font-semibold">Tuition & Fee Realization</CardTitle>
            {isDevMock && (
              <Badge variant="outline" className="text-[9px] py-0 font-mono text-amber-600 dark:text-amber-400">
                Mock
              </Badge>
            )}
          </div>
          <CardDescription className="text-xs mt-0.5">
            Monthly collected revenue vs institutional targets in {currency}
          </CardDescription>
        </div>

        <Badge variant="info" className="text-xs font-semibold py-0.5">
          {data.ytdTotal}
        </Badge>
      </CardHeader>

      <CardContent>
        <div className="h-64 w-full">
          <Bar data={data} options={barOptions} aria-label="Bar chart showing monthly fee collection targets and realized revenues" />
        </div>
      </CardContent>
    </Card>
  );
};

// ---------------------------------------------------------------------------
// Chart C: Student Distribution (Doughnut Chart)
// ---------------------------------------------------------------------------
interface StudentDistributionChartProps {
  data?: StudentDistributionData;
  isLoading?: boolean;
  isDevMock?: boolean;
}

export const StudentDistributionChart: React.FC<StudentDistributionChartProps> = ({
  data,
  isLoading,
  isDevMock,
}) => {
  if (isLoading || !data) {
    return (
      <Card className="h-full">
        <CardHeader>
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-3 w-48" />
        </CardHeader>
        <CardContent className="flex justify-center">
          <Skeleton className="h-56 w-56 rounded-full" />
        </CardContent>
      </Card>
    );
  }

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          boxWidth: 10,
          font: { size: 10, family: 'Inter, system-ui, sans-serif' },
          color: '#64748b',
          padding: 12,
        },
      },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        padding: 10,
        cornerRadius: 8,
        callbacks: {
          label: (context: any) => ` ${context.label}: ${context.parsed} Students`,
        },
      },
    },
    cutout: '72%',
  };

  return (
    <Card className="h-full flex flex-col justify-between" role="region" aria-label="Student Division Distribution Doughnut Chart">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PieChart className="h-4 w-4 text-purple-500" />
            <CardTitle className="text-base font-semibold">Student Cohort Distribution</CardTitle>
          </div>
          {isDevMock && (
            <Badge variant="outline" className="text-[9px] py-0 font-mono text-amber-600 dark:text-amber-400">
              Mock
            </Badge>
          )}
        </div>
        <CardDescription className="text-xs">
          Enrollment distribution across academic divisions
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col items-center justify-center flex-1 py-4">
        <div className="h-56 w-full relative flex items-center justify-center">
          <Doughnut data={data} options={doughnutOptions} aria-label="Doughnut chart of student division distribution" />
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-2xl font-bold tracking-tight text-foreground">{data.totalEnrolled.toLocaleString()}</span>
            <span className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">Enrolled</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// ---------------------------------------------------------------------------
// Chart D: Academic Performance Chart (Conditioned on Examination Data)
// ---------------------------------------------------------------------------
interface AcademicPerformanceChartProps {
  data?: AcademicPerformanceData;
  isLoading?: boolean;
}

export const AcademicPerformanceChart: React.FC<AcademicPerformanceChartProps> = ({
  data,
  isLoading,
}) => {
  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <Skeleton className="h-4 w-44" />
          <Skeleton className="h-3 w-60" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-56 w-full rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  // If no examination data exists yet (per Step 5 requirement: show no misleading sample statistics)
  if (!data?.hasData) {
    return (
      <Card className="h-full flex flex-col justify-between border-dashed" role="region" aria-label="Academic Examination Results">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-indigo-500" />
              <CardTitle className="text-base font-semibold">Academic Examination Benchmark</CardTitle>
            </div>
            <Badge variant="outline" className="text-[10px]">
              Pending Terms
            </Badge>
          </div>
          <CardDescription className="text-xs">
            Term-end subject score distribution and class averages
          </CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col items-center justify-center text-center p-8 space-y-3 flex-1">
          <div className="h-12 w-12 rounded-full bg-muted/80 flex items-center justify-center text-muted-foreground">
            <HelpCircle className="h-6 w-6 text-muted-foreground/60" />
          </div>
          <div className="max-w-xs">
            <h4 className="text-xs font-semibold text-foreground">No Published Examination Records</h4>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              {data?.emptyReason || 'Examination score analytics will activate automatically once teachers publish term assessment grades in Phase 5.'}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const examOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: { boxWidth: 10, font: { size: 10 } },
      },
    },
    scales: {
      x: { grid: { display: false }, ticks: { font: { size: 10 } } },
      y: { min: 0, max: 100, ticks: { font: { size: 10 } } },
    },
  };

  return (
    <Card className="h-full" role="region" aria-label="Academic Performance Breakdown">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Academic Examination Benchmark</CardTitle>
        <CardDescription className="text-xs">Published term average marks by department</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-56 w-full">
          <Bar data={data} options={examOptions} />
        </div>
      </CardContent>
    </Card>
  );
};
