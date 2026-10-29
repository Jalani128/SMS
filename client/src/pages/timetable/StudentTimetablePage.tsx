import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { PageHeader } from '../../components/shared/PageHeader';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Skeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import {
  CalendarDays,
  Clock,
  Printer,
  RotateCw,
  BookOpen,
  MapPin,
  Coffee,
  User,
} from 'lucide-react';
import { timetableService } from '../../services/timetable.service';
import { TimetableSlot, DayOfWeek } from '../../types/timetable';

const DAYS_OF_WEEK: { label: string; value: DayOfWeek }[] = [
  { label: 'Monday', value: 'monday' },
  { label: 'Tuesday', value: 'tuesday' },
  { label: 'Wednesday', value: 'wednesday' },
  { label: 'Thursday', value: 'thursday' },
  { label: 'Friday', value: 'friday' },
  { label: 'Saturday', value: 'saturday' },
];

export const StudentTimetablePage: React.FC = () => {
  const [slots, setSlots] = useState<TimetableSlot[]>([]);
  const [todayData, setTodayData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<string>('all');

  const loadStudentSchedule = useCallback(async () => {
    setIsLoading(true);
    try {
      const [resList, resToday] = await Promise.all([
        timetableService.getTimetableList(),
        timetableService.getTodaySchedule(),
      ]);
      setSlots(resList.data);
      setTodayData(resToday);
    } catch (err) {
      console.error('Failed to load student schedule:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStudentSchedule();
  }, [loadStudentSchedule]);

  const groupedSlots = useMemo(() => {
    const groups: Record<DayOfWeek, TimetableSlot[]> = {
      monday: [],
      tuesday: [],
      wednesday: [],
      thursday: [],
      friday: [],
      saturday: [],
      sunday: [],
    };

    slots.forEach((s) => {
      if (groups[s.dayOfWeek]) {
        groups[s.dayOfWeek].push(s);
      }
    });

    Object.keys(groups).forEach((d) => {
      groups[d as DayOfWeek].sort((a, b) => a.startTime.localeCompare(b.startTime));
    });

    return groups;
  }, [slots]);

  return (
    <div className="space-y-6">
      <div className="print:hidden">
        <PageHeader
          title="Class Timetable & Daily Schedule"
          description="Track your daily class schedule, classroom locations, assigned teachers, and live lesson progression."
          actions={
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-1.5">
                <Printer className="h-4 w-4" />
                <span>Print Timetable</span>
              </Button>
              <Button variant="outline" size="sm" onClick={loadStudentSchedule} className="gap-1.5">
                <RotateCw className="h-4 w-4" />
                <span>Refresh</span>
              </Button>
            </div>
          }
        />
      </div>

      {/* Today's Ongoing / Upcoming Lesson Widget (Hidden in print) */}
      {todayData && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:hidden">
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 shadow-sm flex items-start gap-3">
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-primary">
                Current Class Period
              </span>
              {todayData.currentLesson ? (
                <div className="mt-1">
                  <div className="font-bold text-sm text-foreground">
                    {typeof todayData.currentLesson.subjectId === 'object'
                      ? todayData.currentLesson.subjectId?.name
                      : 'Active Period'}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {todayData.currentLesson.startTime} – {todayData.currentLesson.endTime} | Room:{' '}
                    {todayData.currentLesson.room}
                  </div>
                </div>
              ) : (
                <div className="text-xs text-muted-foreground mt-1">No ongoing class period right now.</div>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-border/80 bg-card p-4 shadow-sm flex items-start gap-3">
            <div className="p-2 bg-muted rounded-lg text-muted-foreground">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Next Upcoming Class
              </span>
              {todayData.nextLesson ? (
                <div className="mt-1">
                  <div className="font-bold text-sm text-foreground">
                    {typeof todayData.nextLesson.subjectId === 'object'
                      ? todayData.nextLesson.subjectId?.name
                      : 'Upcoming Period'}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    Starts at {todayData.nextLesson.startTime} | Room: {todayData.nextLesson.room}
                  </div>
                </div>
              ) : (
                <div className="text-xs text-muted-foreground mt-1">No further periods scheduled today.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Weekday Switcher (Hidden in print) */}
      <div className="flex items-center gap-1 bg-muted/30 p-1.5 rounded-lg border w-fit print:hidden">
        <button
          onClick={() => setSelectedDay('all')}
          className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
            selectedDay === 'all'
              ? 'bg-background shadow-xs text-foreground font-semibold'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          All Days
        </button>
        {DAYS_OF_WEEK.map((d) => (
          <button
            key={d.value}
            onClick={() => setSelectedDay(d.value)}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
              selectedDay === d.value
                ? 'bg-background shadow-xs text-foreground font-semibold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {d.label}
          </button>
        ))}
      </div>

      {/* Schedule Grid */}
      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-28 w-full rounded-xl" />
          <Skeleton className="h-28 w-full rounded-xl" />
        </div>
      ) : slots.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="No Class Schedule Published"
          description="Your section's timetable has not yet been published for this academic term."
        />
      ) : (
        <div className="space-y-4">
          {DAYS_OF_WEEK.map((day) => {
            const daySlots = groupedSlots[day.value];
            if (selectedDay !== 'all' && selectedDay !== day.value) return null;
            if (daySlots.length === 0 && selectedDay !== day.value) return null;

            return (
              <div key={day.value} className="rounded-xl border border-border/80 bg-card p-4 shadow-sm space-y-3">
                <div className="flex items-center justify-between border-b pb-2">
                  <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-primary" />
                    <span>{day.label}</span>
                  </h3>
                  <span className="text-xs text-muted-foreground font-medium">
                    {daySlots.length} Periods
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {daySlots.map((slot) => {
                    const subjectName =
                      typeof slot.subjectId === 'object'
                        ? slot.subjectId?.name || 'Recess / Break'
                        : slot.entryType === 'break'
                        ? 'Recess / Break'
                        : 'Class';
                    const teacherName =
                      typeof slot.teacherId === 'object'
                        ? slot.teacherId?.userId?.name || 'Instructor'
                        : 'Staff';
                    const isBreak = slot.entryType === 'break';

                    return (
                      <div
                        key={slot._id}
                        className={`rounded-lg border p-3 flex flex-col justify-between ${
                          isBreak ? 'bg-amber-50/40 border-amber-300' : 'bg-background border-border/70'
                        }`}
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Badge variant="outline" className="text-[10px] font-bold">
                              Period {slot.periodNumber}
                            </Badge>
                            <span className="text-[10px] font-mono text-muted-foreground">
                              {slot.startTime} – {slot.endTime}
                            </span>
                          </div>

                          <div className="font-bold text-xs text-foreground flex items-center gap-1.5">
                            {isBreak ? <Coffee className="h-3.5 w-3.5 text-amber-600" /> : <BookOpen className="h-3.5 w-3.5 text-primary" />}
                            <span>{subjectName}</span>
                          </div>

                          {!isBreak && (
                            <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                              <User className="h-3 w-3" />
                              <span>{teacherName}</span>
                            </div>
                          )}

                          <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/30">
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              <span>{slot.room}</span>
                            </div>
                            <span className="capitalize text-[10px]">{slot.entryType}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default StudentTimetablePage;
