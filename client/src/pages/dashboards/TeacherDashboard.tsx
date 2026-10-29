import React, { useState } from 'react';
import { PageHeader } from '../../components/shared/PageHeader';
import { StatCard } from '../../components/shared/StatCard';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table';
import {
  BookOpen,
  Users,
  ClipboardList,
  CalendarDays,
  CheckCircle2,
  Clock,
  Sparkles,
} from 'lucide-react';

export const TeacherDashboard: React.FC = () => {
  const [attendanceSubmitted, setAttendanceSubmitted] = useState<Record<string, boolean>>({
    'Grade 10-A': true,
    'Grade 11-Physics': false,
  });

  const todayClasses = [
    { period: 'Period 1 (08:30 - 09:15)', class: 'Grade 10-A', subject: 'AP Physics', room: 'Lab 302', students: 28 },
    { period: 'Period 3 (10:15 - 11:00)', class: 'Grade 11-Physics', subject: 'Thermodynamics', room: 'Hall B', students: 32 },
    { period: 'Period 5 (12:30 - 01:15)', class: 'Grade 9-Science', subject: 'General Mechanics', room: 'Room 104', students: 25 },
  ];

  const pendingGrading = [
    { id: 'hw-1', student: 'Ethan Walker', title: 'Newtonian Laws Lab Report', submitted: '2 hours ago', status: 'Pending Review' },
    { id: 'hw-2', student: 'Chloe Bennett', title: 'Thermodynamics Problem Set #4', submitted: '4 hours ago', status: 'Pending Review' },
    { id: 'hw-3', student: 'Aiden Reed', title: 'Optics Reflection Essay', submitted: 'Yesterday', status: 'Late Submission' },
  ];

  return (
    <div className="space-y-6">
      <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50/70 dark:bg-emerald-950/30 text-emerald-950 dark:text-emerald-200 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 text-white shrink-0">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <span className="font-bold text-xs uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
              Teacher Faculty Workspace
            </span>
            <p className="text-xs text-emerald-900/80 dark:text-emerald-300/80 mt-0.5">
              Role-tailored dashboard with class management, quick attendance, and grading flows.
            </p>
          </div>
        </div>
        <Badge variant="success">Teacher Active</Badge>
      </div>

      <PageHeader
        title="Teacher Portal & Schedule"
        description="Daily teaching agenda, student grading queues, and class rosters"
        badge={<Badge variant="success">Prof. Clara Oswald</Badge>}
        actions={
          <Button variant="default" size="sm" className="gap-1.5 text-xs">
            <ClipboardList className="h-3.5 w-3.5" />
            Create Assignment
          </Button>
        }
      />

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="My Assigned Classes"
          value="4 Classes"
          description="Grades 9, 10 & 11"
          customIcon={BookOpen}
        />
        <StatCard
          title="Enrolled Students"
          value="118 Students"
          description="Active across cohorts"
          customIcon={Users}
        />
        <StatCard
          title="Assignments To Grade"
          value="18 Items"
          change="3 new today"
          isPositive={false}
          customIcon={ClipboardList}
        />
        <StatCard
          title="Upcoming Exam"
          value="Oct 28"
          description="Midterm Physics Part 1"
          customIcon={CalendarDays}
        />
      </div>

      {/* Class Schedule & Quick Attendance */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Today's Teaching Schedule</CardTitle>
            <CardDescription className="text-xs">Classes scheduled for current academic timetable</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {todayClasses.map((item, idx) => (
                <div
                  key={idx}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-lg border bg-muted/20 hover:bg-muted/40 transition-colors gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">{item.subject}</span>
                      <Badge variant="secondary" className="text-[10px]">{item.class}</Badge>
                      <span className="text-xs text-muted-foreground">• {item.room}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>{item.period}</span>
                      <span>({item.students} students enrolled)</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {attendanceSubmitted[item.class] ? (
                      <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium">
                        <CheckCircle2 className="h-4 w-4" />
                        Attendance Logged
                      </span>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs h-8"
                        onClick={() =>
                          setAttendanceSubmitted((prev) => ({ ...prev, [item.class]: true }))
                        }
                      >
                        Take Attendance
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Grading Action Queue */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Grading Queue</CardTitle>
            <CardDescription className="text-xs">Submissions awaiting score review</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingGrading.map((item) => (
                <div key={item.id} className="p-3 rounded-lg border bg-card space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-foreground">{item.student}</span>
                    <Badge variant={item.status === 'Pending Review' ? 'warning' : 'destructive'} className="text-[10px]">
                      {item.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{item.title}</p>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] text-muted-foreground">{item.submitted}</span>
                    <Button variant="ghost" size="sm" className="h-6 text-[11px] px-2 text-primary">
                      Grade Now →
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sample Roster Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Grade 10-A Student Roster Overview</CardTitle>
          <CardDescription className="text-xs">Preview of attendance percentages and current coursework scores</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student Name</TableHead>
                <TableHead>Roll Number</TableHead>
                <TableHead>Attendance Rate</TableHead>
                <TableHead>Physics Score</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium">Sophia Martinez</TableCell>
                <TableCell>GIA-9042</TableCell>
                <TableCell>98.2%</TableCell>
                <TableCell>94 / 100 (A)</TableCell>
                <TableCell><Badge variant="success">Excellent</Badge></TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Liam Chen</TableCell>
                <TableCell>GIA-8812</TableCell>
                <TableCell>96.0%</TableCell>
                <TableCell>89 / 100 (B+)</TableCell>
                <TableCell><Badge variant="info">Good Standing</Badge></TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Marcus Brody</TableCell>
                <TableCell>GIA-8761</TableCell>
                <TableCell>88.4%</TableCell>
                <TableCell>76 / 100 (C)</TableCell>
                <TableCell><Badge variant="warning">Needs Support</Badge></TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
