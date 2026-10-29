import React from 'react';
import { PageHeader } from '../../components/shared/PageHeader';
import { StatCard } from '../../components/shared/StatCard';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table';
import {
  GraduationCap,
  CalendarCheck,
  ClipboardList,
  Award,
  Sparkles,
  BookOpen,
} from 'lucide-react';

export const StudentDashboard: React.FC = () => {
  const scheduleToday = [
    { time: '08:30 AM', subject: 'AP Physics', room: 'Lab 302', teacher: 'Prof. Clara Oswald' },
    { time: '09:30 AM', subject: 'Calculus BC', room: 'Room 201', teacher: 'Dr. Arthur Vance' },
    { time: '11:00 AM', subject: 'World History', room: 'Hall 12', teacher: 'Ms. Eleanor Davies' },
    { time: '01:30 PM', subject: 'Computer Science', room: 'Comp Lab 1', teacher: 'Mr. David Sterling' },
  ];

  const pendingAssignments = [
    { title: 'Thermodynamics Lab Report', subject: 'AP Physics', due: 'Tomorrow at 11:59 PM', urgency: 'warning' as const },
    { title: 'Derivatives Problem Set 6', subject: 'Calculus BC', due: 'In 3 days', urgency: 'neutral' as const },
    { title: 'Renaissance Essay Draft', subject: 'World History', due: 'Friday, Oct 24', urgency: 'neutral' as const },
  ];

  return (
    <div className="space-y-6">
      <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-900 bg-amber-50/70 dark:bg-amber-950/30 text-amber-950 dark:text-amber-200 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-600 text-white shrink-0">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <span className="font-bold text-xs uppercase tracking-wider text-amber-800 dark:text-amber-300">
              Student Academic Dashboard
            </span>
            <p className="text-xs text-amber-900/80 dark:text-amber-300/80 mt-0.5">
              Personalized timetable, assignments, attendance records, and study companion.
            </p>
          </div>
        </div>
        <Badge variant="warning">Student: Liam Chen (Grade 10-A)</Badge>
      </div>

      <PageHeader
        title="Student Learning Hub"
        description="Daily timetable, assignment submission trackers, and academic performance"
        badge={<Badge variant="warning">Grade 10-A</Badge>}
        actions={
          <Button variant="default" size="sm" className="gap-1.5 text-xs">
            <BookOpen className="h-3.5 w-3.5" />
            Open Study Materials
          </Button>
        }
      />

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Attendance Record"
          value="96.0%"
          change="+1.5%"
          isPositive={true}
          description="172 / 180 Days Attended"
          customIcon={CalendarCheck}
        />
        <StatCard
          title="Cumulative GPA"
          value="3.82 / 4.0"
          change="Top 5%"
          isPositive={true}
          description="Honors Scholar List"
          customIcon={Award}
        />
        <StatCard
          title="Due Assignments"
          value="3 Tasks"
          description="1 due within 24h"
          customIcon={ClipboardList}
        />
        <StatCard
          title="Next Examination"
          value="Oct 28"
          description="Midterm Physics Exam"
          customIcon={GraduationCap}
        />
      </div>

      {/* Timetable & Assignments */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Today's Class Schedule</CardTitle>
            <CardDescription className="text-xs">Tuesday, Oct 20th — Term 1 Curriculum</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {scheduleToday.map((period, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 rounded-lg border bg-muted/20 hover:bg-muted/40 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold text-xs">
                      {period.time.split(' ')[0]}
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm">{period.subject}</h4>
                      <p className="text-xs text-muted-foreground">
                        {period.teacher} • <span className="font-medium text-foreground">{period.room}</span>
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {period.time}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Pending Homework */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Pending Homework</CardTitle>
            <CardDescription className="text-xs">Submissions with upcoming deadlines</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingAssignments.map((hw, idx) => (
                <div key={idx} className="p-3 rounded-lg border bg-card space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-foreground">{hw.title}</span>
                    <Badge variant={hw.urgency} className="text-[10px]">
                      {hw.due}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{hw.subject}</p>
                  <div className="pt-1 flex justify-end">
                    <Button variant="outline" size="sm" className="h-7 text-xs">
                      Submit Work
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Grades Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Recent Graded Assessments</CardTitle>
          <CardDescription className="text-xs">Verified academic marks recorded for Term 1</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Subject</TableHead>
                <TableHead>Assessment Name</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Grade</TableHead>
                <TableHead>Teacher Remark</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium">AP Physics</TableCell>
                <TableCell>Mechanics & Optics Unit Quiz</TableCell>
                <TableCell>94 / 100</TableCell>
                <TableCell><Badge variant="success">A</Badge></TableCell>
                <TableCell className="text-xs text-muted-foreground">Exceptional analytical problem solving</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Calculus BC</TableCell>
                <TableCell>Integration by Parts Exam</TableCell>
                <TableCell>88 / 100</TableCell>
                <TableCell><Badge variant="info">B+</Badge></TableCell>
                <TableCell className="text-xs text-muted-foreground">Solid comprehension, review trigonometric substitutions</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">World History</TableCell>
                <TableCell>Industrial Revolution Paper</TableCell>
                <TableCell>91 / 100</TableCell>
                <TableCell><Badge variant="success">A-</Badge></TableCell>
                <TableCell className="text-xs text-muted-foreground">Well researched and structured historical argument</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
