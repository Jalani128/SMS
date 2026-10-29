import React from 'react';
import { Card, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import {
  GraduationCap,
  Users,
  CalendarCheck,
  CreditCard,
  Bell,
  Sparkles,
} from 'lucide-react';

interface QuickActionDockProps {
  onAddStudent: () => void;
  onAddTeacher: () => void;
  onRecordAttendance: () => void;
  onCreateInvoice: () => void;
  onCreateAnnouncement: () => void;
}

export const QuickActionDock: React.FC<QuickActionDockProps> = ({
  onAddStudent,
  onAddTeacher,
  onRecordAttendance,
  onCreateInvoice,
  onCreateAnnouncement,
}) => {
  return (
    <Card className="bg-gradient-to-r from-card to-muted/30 border">
      <CardContent className="p-5 sm:p-6">
        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold tracking-tight text-foreground">
              Administrative Quick Actions
            </h3>
          </div>
          <span className="text-[11px] text-muted-foreground hidden sm:inline">
            Interactive modal dialogs & shortcuts
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {/* Action 1: Add Student */}
          <Button
            variant="outline"
            onClick={onAddStudent}
            className="h-auto py-3 px-3.5 flex flex-col items-start gap-1 text-left bg-card hover:bg-card/90 hover:border-primary/50 transition-all cursor-pointer group"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 group-hover:scale-105 transition-transform">
              <GraduationCap className="h-4 w-4" />
            </div>
            <span className="text-xs font-semibold text-foreground mt-1">Add Student</span>
            <span className="text-[10px] text-muted-foreground truncate w-full">Quick admission</span>
          </Button>

          {/* Action 2: Add Teacher */}
          <Button
            variant="outline"
            onClick={onAddTeacher}
            className="h-auto py-3 px-3.5 flex flex-col items-start gap-1 text-left bg-card hover:bg-card/90 hover:border-emerald-500/50 transition-all cursor-pointer group"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 group-hover:scale-105 transition-transform">
              <Users className="h-4 w-4" />
            </div>
            <span className="text-xs font-semibold text-foreground mt-1">Add Teacher</span>
            <span className="text-[10px] text-muted-foreground truncate w-full">Onboard faculty</span>
          </Button>

          {/* Action 3: Record Attendance */}
          <Button
            variant="outline"
            onClick={onRecordAttendance}
            className="h-auto py-3 px-3.5 flex flex-col items-start gap-1 text-left bg-card hover:bg-card/90 hover:border-purple-500/50 transition-all cursor-pointer group"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 group-hover:scale-105 transition-transform">
              <CalendarCheck className="h-4 w-4" />
            </div>
            <span className="text-xs font-semibold text-foreground mt-1">Record Attendance</span>
            <span className="text-[10px] text-muted-foreground truncate w-full">Class roll call</span>
          </Button>

          {/* Action 4: Create Fee Invoice */}
          <Button
            variant="outline"
            onClick={onCreateInvoice}
            className="h-auto py-3 px-3.5 flex flex-col items-start gap-1 text-left bg-card hover:bg-card/90 hover:border-amber-500/50 transition-all cursor-pointer group"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 group-hover:scale-105 transition-transform">
              <CreditCard className="h-4 w-4" />
            </div>
            <span className="text-xs font-semibold text-foreground mt-1">Create Fee Invoice</span>
            <span className="text-[10px] text-muted-foreground truncate w-full">Batch tuition billing</span>
          </Button>

          {/* Action 5: Create Announcement */}
          <Button
            variant="outline"
            onClick={onCreateAnnouncement}
            className="h-auto py-3 px-3.5 flex flex-col items-start gap-1 text-left bg-card hover:bg-card/90 hover:border-rose-500/50 transition-all cursor-pointer group col-span-2 sm:col-span-1"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 group-hover:scale-105 transition-transform">
              <Bell className="h-4 w-4" />
            </div>
            <span className="text-xs font-semibold text-foreground mt-1">Announcement</span>
            <span className="text-[10px] text-muted-foreground truncate w-full">Broadcast notice</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
