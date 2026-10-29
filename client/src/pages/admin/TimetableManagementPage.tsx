import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { PageHeader } from '../../components/shared/PageHeader';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Dialog } from '../../components/ui/Dialog';
import { Skeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import {
  CalendarDays,
  Plus,
  RotateCw,
  Copy,
  Printer,
  Edit2,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  BookOpen,
  MapPin,
  User,
  Coffee,
} from 'lucide-react';
import { timetableService } from '../../services/timetable.service';
import {
  TimetableSlot,
  DayOfWeek,
  TimetableEntryType,
} from '../../types/timetable';

const DAYS_OF_WEEK: { label: string; value: DayOfWeek }[] = [
  { label: 'Monday', value: 'monday' },
  { label: 'Tuesday', value: 'tuesday' },
  { label: 'Wednesday', value: 'wednesday' },
  { label: 'Thursday', value: 'thursday' },
  { label: 'Friday', value: 'friday' },
  { label: 'Saturday', value: 'saturday' },
];

export const TimetableManagementPage: React.FC = () => {
  const [slots, setSlots] = useState<TimetableSlot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<string>('all');
  const [selectedClass, setSelectedClass] = useState('cls-10');
  const [selectedSection, setSelectedSection] = useState('sec-10a');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<TimetableSlot | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    dayOfWeek: 'monday' as DayOfWeek,
    periodNumber: 1,
    startTime: '08:30',
    endTime: '09:25',
    room: 'Lab 302',
    entryType: 'lecture' as TimetableEntryType,
    subjectId: 'sub-phy',
    teacherId: 't-1',
    notes: '',
  });

  // Copy Day Form state
  const [copySourceDay, setCopySourceDay] = useState<DayOfWeek>('monday');
  const [copyTargetDay, setCopyTargetDay] = useState<DayOfWeek>('wednesday');
  const [copyOverwrite, setCopyOverwrite] = useState(false);
  const [copyPreviewConflicts, setCopyPreviewConflicts] = useState<any[] | null>(null);

  // Status & Notification
  const [conflictError, setConflictError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const loadTimetable = useCallback(async () => {
    setIsLoading(true);
    setConflictError(null);
    try {
      const res = await timetableService.getTimetableList({
        classId: selectedClass,
        sectionId: selectedSection,
        dayOfWeek: selectedDay !== 'all' ? selectedDay : undefined,
      });
      setSlots(res.data);
    } catch (err) {
      console.error('Failed to load timetable:', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedClass, selectedSection, selectedDay]);

  useEffect(() => {
    loadTimetable();
  }, [loadTimetable]);

  // Group slots by Day of Week
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

    // Sort periods inside each day
    Object.keys(groups).forEach((day) => {
      groups[day as DayOfWeek].sort((a, b) => a.startTime.localeCompare(b.startTime));
    });

    return groups;
  }, [slots]);

  // Handle Save Slot
  const handleSaveSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    setConflictError(null);

    try {
      await timetableService.createTimetableSlot({
        academicSessionId: 'session-2026',
        classId: selectedClass,
        sectionId: selectedSection,
        subjectId: formData.entryType === 'break' ? null : formData.subjectId,
        teacherId: formData.entryType === 'break' ? null : formData.teacherId,
        dayOfWeek: formData.dayOfWeek,
        startTime: formData.startTime,
        endTime: formData.endTime,
        room: formData.room,
        periodNumber: Number(formData.periodNumber),
        entryType: formData.entryType,
        notes: formData.notes,
        status: 'active',
      });

      showToast(`Period slot added successfully for ${formData.dayOfWeek}`);
      setIsAddModalOpen(false);
      loadTimetable();
    } catch (err: any) {
      setConflictError(err.message || 'Timetable conflict detected. Please verify teacher, section, or room.');
    }
  };

  // Handle Edit Slot Submit
  const handleUpdateSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlot) return;
    setConflictError(null);

    try {
      await timetableService.updateTimetableSlot(selectedSlot._id, {
        dayOfWeek: formData.dayOfWeek,
        startTime: formData.startTime,
        endTime: formData.endTime,
        room: formData.room,
        periodNumber: Number(formData.periodNumber),
        entryType: formData.entryType,
        subjectId: formData.entryType === 'break' ? null : formData.subjectId,
        teacherId: formData.entryType === 'break' ? null : formData.teacherId,
        notes: formData.notes,
      });

      showToast('Timetable slot updated successfully');
      setIsEditModalOpen(false);
      loadTimetable();
    } catch (err: any) {
      setConflictError(err.message || 'Timetable conflict detected during update.');
    }
  };

  // Open Edit Dialog
  const handleOpenEdit = (slot: TimetableSlot) => {
    setSelectedSlot(slot);
    setFormData({
      dayOfWeek: slot.dayOfWeek,
      periodNumber: slot.periodNumber,
      startTime: slot.startTime,
      endTime: slot.endTime,
      room: slot.room,
      entryType: slot.entryType,
      subjectId: typeof slot.subjectId === 'object' ? slot.subjectId?._id || 'sub-phy' : 'sub-phy',
      teacherId: typeof slot.teacherId === 'object' ? slot.teacherId?._id || 't-1' : 't-1',
      notes: slot.notes || '',
    });
    setConflictError(null);
    setIsEditModalOpen(true);
  };

  // Handle Archive Slot
  const handleArchiveSlot = async (id: string) => {
    if (!window.confirm('Are you sure you want to archive this timetable period slot?')) return;
    try {
      await timetableService.archiveTimetableSlot(id);
      showToast('Slot archived');
      loadTimetable();
    } catch (err: any) {
      alert(err.message || 'Failed to archive slot');
    }
  };

  // Handle Copy Day Preview / Execute
  const handlePreviewCopyDay = async () => {
    setCopyPreviewConflicts(null);
    const res = await timetableService.copyDaySchedule({
      academicSessionId: 'session-2026',
      sectionId: selectedSection,
      sourceDay: copySourceDay,
      targetDay: copyTargetDay,
      previewOnly: true,
    });
    setCopyPreviewConflicts(res.conflicts || []);
  };

  const handleExecuteCopyDay = async () => {
    try {
      const res = await timetableService.copyDaySchedule({
        academicSessionId: 'session-2026',
        sectionId: selectedSection,
        sourceDay: copySourceDay,
        targetDay: copyTargetDay,
        overwriteExisting: copyOverwrite,
        previewOnly: false,
      });

      if (res.conflicts && res.conflicts.length > 0 && !copyOverwrite) {
        setCopyPreviewConflicts(res.conflicts);
        return;
      }

      showToast(`Schedule successfully copied to ${copyTargetDay}`);
      setIsCopyModalOpen(false);
      loadTimetable();
    } catch (err: any) {
      alert(err.message || 'Failed to copy day schedule');
    }
  };

  // Print Action
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Page Header (Hidden in Print) */}
      <div className="print:hidden">
        <PageHeader
          title="Academic Timetable & Bell Schedule"
          description="Manage weekly period schedules, conflict-free classroom room allocations, teacher master timetables, and period duplication."
          actions={
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handlePrint} className="gap-1.5">
                <Printer className="h-4 w-4" />
                <span>Print Schedule</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setCopyPreviewConflicts(null);
                  setIsCopyModalOpen(true);
                }}
                className="gap-1.5"
              >
                <Copy className="h-4 w-4" />
                <span>Copy Day</span>
              </Button>
              <Button variant="outline" size="sm" onClick={loadTimetable} className="gap-1.5">
                <RotateCw className="h-4 w-4" />
                <span>Refresh</span>
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={() => {
                  setFormData({
                    dayOfWeek: 'monday',
                    periodNumber: slots.length + 1,
                    startTime: '08:30',
                    endTime: '09:25',
                    room: 'Lab 302',
                    entryType: 'lecture',
                    subjectId: 'sub-phy',
                    teacherId: 't-1',
                    notes: '',
                  });
                  setConflictError(null);
                  setIsAddModalOpen(true);
                }}
                className="gap-1.5"
              >
                <Plus className="h-4 w-4" />
                <span>Add Period Slot</span>
              </Button>
            </div>
          }
        />
      </div>

      {/* Toast Banner */}
      {toastMessage && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-lg text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2 print:hidden">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Printable Header Banner (Only visible in Print) */}
      <div className="hidden print:block border-b pb-4 mb-4 text-center">
        <h1 className="text-xl font-bold">EduManage Academy — Master Timetable</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Academic Year 2026-2027 | Class: Grade 10 - Section A | Room 301
        </p>
      </div>

      {/* Filter Row (Hidden in Print) */}
      <div className="rounded-xl border border-border/80 bg-card p-4 shadow-sm space-y-3 print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="space-y-1">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase">Class Cohort</span>
              <select
                aria-label="Class Cohort"
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="h-8 px-2.5 rounded-md border border-input bg-background text-xs"
              >
                <option value="cls-10">Grade 10</option>
                <option value="cls-9">Grade 9</option>
                <option value="cls-11">Grade 11 - Science</option>
              </select>
            </div>

            <div className="space-y-1">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase">Section</span>
              <select
                aria-label="Section"
                value={selectedSection}
                onChange={(e) => setSelectedSection(e.target.value)}
                className="h-8 px-2.5 rounded-md border border-input bg-background text-xs"
              >
                <option value="sec-10a">Section A (Room 301)</option>
                <option value="sec-10b">Section B (Room 302)</option>
              </select>
            </div>
          </div>

          {/* Weekday Switcher */}
          <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-lg">
            <button
              onClick={() => setSelectedDay('all')}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
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
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  selectedDay === d.value
                    ? 'bg-background shadow-xs text-foreground font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Timetable Weekly Matrix Grid */}
      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
      ) : slots.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="No Timetable Periods Configured"
          description="There are currently no scheduled periods for this class and section. Click 'Add Period Slot' to build the schedule."
        />
      ) : (
        <div className="space-y-4">
          {DAYS_OF_WEEK.map((day) => {
            const daySlots = groupedSlots[day.value];
            if (selectedDay !== 'all' && selectedDay !== day.value) return null;
            if (daySlots.length === 0 && selectedDay !== day.value) return null;

            return (
              <div
                key={day.value}
                className="rounded-xl border border-border/80 bg-card p-4 shadow-sm space-y-3"
              >
                <div className="flex items-center justify-between border-b pb-2">
                  <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-primary" />
                    <span>{day.label}</span>
                  </h3>
                  <span className="text-xs text-muted-foreground font-medium">
                    {daySlots.length} {daySlots.length === 1 ? 'Period' : 'Periods'}
                  </span>
                </div>

                {daySlots.length === 0 ? (
                  <div className="py-4 text-center text-xs text-muted-foreground italic">
                    No scheduled periods on {day.label}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {daySlots.map((slot) => {
                      const subjectName =
                        typeof slot.subjectId === 'object'
                          ? slot.subjectId?.name || 'Recess / Break'
                          : slot.entryType === 'break'
                          ? 'Recess / Break'
                          : 'Instruction';

                      const teacherName =
                        typeof slot.teacherId === 'object'
                          ? slot.teacherId?.userId?.name || 'Assigned Staff'
                          : 'Staff';

                      const isBreak = slot.entryType === 'break';

                      return (
                        <div
                          key={slot._id}
                          className={`rounded-lg border p-3 flex flex-col justify-between transition-all ${
                            isBreak
                              ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800'
                              : 'bg-background border-border/70 hover:border-primary/50'
                          }`}
                        >
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <Badge
                                variant="outline"
                                className={`text-[10px] font-bold ${
                                  isBreak
                                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300'
                                    : 'bg-primary/10 text-primary border-primary/20'
                                }`}
                              >
                                Period {slot.periodNumber}
                              </Badge>

                              <Badge variant="outline" className="text-[10px] uppercase font-mono">
                                {slot.startTime} – {slot.endTime}
                              </Badge>
                            </div>

                            <div>
                              <div className="font-bold text-xs text-foreground flex items-center gap-1">
                                {isBreak ? (
                                  <Coffee className="h-3.5 w-3.5 text-amber-600" />
                                ) : (
                                  <BookOpen className="h-3.5 w-3.5 text-primary" />
                                )}
                                <span>{subjectName}</span>
                              </div>

                              {!isBreak && (
                                <div className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                                  <User className="h-3 w-3" />
                                  <span>{teacherName}</span>
                                </div>
                              )}
                            </div>

                            <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/40">
                              <div className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                <span>{slot.room}</span>
                              </div>
                              <span className="capitalize text-[10px] font-medium">{slot.entryType}</span>
                            </div>
                          </div>

                          {/* Action Controls (Hidden in Print) */}
                          <div className="flex items-center justify-end gap-1 pt-2 mt-2 border-t border-border/30 print:hidden">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenEdit(slot)}
                              className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                            >
                              <Edit2 className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleArchiveSlot(slot._id)}
                              className="h-6 w-6 p-0 text-muted-foreground hover:text-rose-600"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* MODAL 1: Add Period Slot Dialog */}
      {/* ---------------------------------------------------------------------- */}
      <Dialog
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Schedule Timetable Period Slot"
        description="Configure period timings, teacher assignment, room, and server-validated conflict checks."
        className="max-w-lg"
      >
        <form onSubmit={handleSaveSlot} className="space-y-4 pt-2">
          {conflictError && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 rounded-lg text-rose-800 dark:text-rose-300 text-xs flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{conflictError}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Day of Week</label>
              <select
                aria-label="Day of Week"
                value={formData.dayOfWeek}
                onChange={(e) => setFormData({ ...formData, dayOfWeek: e.target.value as DayOfWeek })}
                className="w-full h-9 px-3 rounded-md border border-input bg-background text-xs"
              >
                {DAYS_OF_WEEK.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Period Number</label>
              <Input
                type="number"
                min={1}
                value={formData.periodNumber}
                onChange={(e) => setFormData({ ...formData, periodNumber: Number(e.target.value) })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Start Time (24h)</label>
              <Input
                type="time"
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">End Time (24h)</label>
              <Input
                type="time"
                value={formData.endTime}
                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Entry Type</label>
              <select
                aria-label="Entry Type"
                value={formData.entryType}
                onChange={(e) =>
                  setFormData({ ...formData, entryType: e.target.value as TimetableEntryType })
                }
                className="w-full h-9 px-3 rounded-md border border-input bg-background text-xs"
              >
                <option value="lecture">Lecture / Classroom</option>
                <option value="lab">Science / Computer Lab</option>
                <option value="break">Recess / Lunch Break</option>
                <option value="activity">Sports / Activity</option>
                <option value="assembly">School Assembly</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Room / Laboratory</label>
              <Input
                type="text"
                placeholder="e.g. Lab 302"
                value={formData.room}
                onChange={(e) => setFormData({ ...formData, room: e.target.value })}
                required
              />
            </div>
          </div>

          {formData.entryType !== 'break' && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Subject</label>
                <select
                  aria-label="Subject"
                  value={formData.subjectId}
                  onChange={(e) => setFormData({ ...formData, subjectId: e.target.value })}
                  className="w-full h-9 px-3 rounded-md border border-input bg-background text-xs"
                  required
                >
                  <option value="sub-phy">AP Physics (PHY-101)</option>
                  <option value="sub-mat">Calculus BC (MTH-201)</option>
                  <option value="sub-his">World History (HIS-101)</option>
                  <option value="sub-eng">English Literature (ENG-101)</option>
                  <option value="sub-chem">Chemistry (CHM-101)</option>
                  <option value="sub-cs">Computer Science (CS-101)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Assigned Teacher</label>
                <select
                  aria-label="Assigned Teacher"
                  value={formData.teacherId}
                  onChange={(e) => setFormData({ ...formData, teacherId: e.target.value })}
                  className="w-full h-9 px-3 rounded-md border border-input bg-background text-xs"
                  required
                >
                  <option value="t-1">Dr. Robert Oppenheimer (TCH-001)</option>
                  <option value="t-2">Katherine Johnson (TCH-002)</option>
                  <option value="t-3">Howard Zinn (TCH-003)</option>
                  <option value="t-4">Toni Morrison (TCH-004)</option>
                  <option value="t-5">Alan Turing (TCH-005)</option>
                  <option value="t-6">Marie Curie (TCH-006)</option>
                </select>
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Notes / Instructions</label>
            <Input
              type="text"
              placeholder="e.g. Lab equipment must be prepped 15 mins prior"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsAddModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="default" size="sm">
              Save Period Slot
            </Button>
          </div>
        </form>
      </Dialog>

      {/* ---------------------------------------------------------------------- */}
      {/* MODAL 2: Edit Period Slot Dialog */}
      {/* ---------------------------------------------------------------------- */}
      <Dialog
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Timetable Period Slot"
        description="Update slot timings or classroom assignment with self-conflict exclusion."
        className="max-w-lg"
      >
        <form onSubmit={handleUpdateSlot} className="space-y-4 pt-2">
          {conflictError && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 rounded-lg text-rose-800 dark:text-rose-300 text-xs flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{conflictError}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Day of Week</label>
              <select
                aria-label="Day of Week"
                value={formData.dayOfWeek}
                onChange={(e) => setFormData({ ...formData, dayOfWeek: e.target.value as DayOfWeek })}
                className="w-full h-9 px-3 rounded-md border border-input bg-background text-xs"
              >
                {DAYS_OF_WEEK.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Period Number</label>
              <Input
                type="number"
                min={1}
                value={formData.periodNumber}
                onChange={(e) => setFormData({ ...formData, periodNumber: Number(e.target.value) })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Start Time</label>
              <Input
                type="time"
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">End Time</label>
              <Input
                type="time"
                value={formData.endTime}
                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Room</label>
              <Input
                type="text"
                value={formData.room}
                onChange={(e) => setFormData({ ...formData, room: e.target.value })}
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Entry Type</label>
              <select
                aria-label="Entry Type"
                value={formData.entryType}
                onChange={(e) =>
                  setFormData({ ...formData, entryType: e.target.value as TimetableEntryType })
                }
                className="w-full h-9 px-3 rounded-md border border-input bg-background text-xs"
              >
                <option value="lecture">Lecture</option>
                <option value="lab">Lab</option>
                <option value="break">Break</option>
                <option value="activity">Activity</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsEditModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="default" size="sm">
              Update Slot
            </Button>
          </div>
        </form>
      </Dialog>

      {/* ---------------------------------------------------------------------- */}
      {/* MODAL 3: Copy Day Schedule Dialog */}
      {/* ---------------------------------------------------------------------- */}
      <Dialog
        isOpen={isCopyModalOpen}
        onClose={() => setIsCopyModalOpen(false)}
        title="Copy Day Timetable"
        description="Duplicate an entire weekday schedule to another day with automated conflict pre-flight checks."
        className="max-w-md"
      >
        <div className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Source Day</label>
              <select
                aria-label="Source Day"
                value={copySourceDay}
                onChange={(e) => setCopySourceDay(e.target.value as DayOfWeek)}
                className="w-full h-9 px-3 rounded-md border border-input bg-background text-xs"
              >
                {DAYS_OF_WEEK.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Target Day</label>
              <select
                aria-label="Target Day"
                value={copyTargetDay}
                onChange={(e) => setCopyTargetDay(e.target.value as DayOfWeek)}
                className="w-full h-9 px-3 rounded-md border border-input bg-background text-xs"
              >
                {DAYS_OF_WEEK.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="overwriteTarget"
              checked={copyOverwrite}
              onChange={(e) => setCopyOverwrite(e.target.checked)}
              className="rounded border-input text-primary"
            />
            <label htmlFor="overwriteTarget" className="text-xs text-foreground cursor-pointer">
              Archive existing slots on {copyTargetDay} before copying
            </label>
          </div>

          {/* Conflict Preview Report */}
          {copyPreviewConflicts && (
            <div className="p-3 bg-muted/40 rounded-lg text-xs space-y-2">
              <div className="font-semibold text-foreground flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <span>Pre-flight Report: {copyPreviewConflicts.length} Conflict(s)</span>
              </div>
              {copyPreviewConflicts.length === 0 ? (
                <p className="text-emerald-700 dark:text-emerald-400">
                  All periods are conflict-free and ready to be copied!
                </p>
              ) : (
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {copyPreviewConflicts.map((c, i) => (
                    <div key={i} className="text-rose-700 dark:text-rose-400 text-[11px] p-1 bg-rose-50 dark:bg-rose-950/40 rounded">
                      {c.conflictReason || `Period ${c.sourcePeriodNumber} (${c.startTime}-${c.endTime}) conflicts.`}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-between pt-3 border-t">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handlePreviewCopyDay}
              className="text-xs"
            >
              Check Conflicts
            </Button>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsCopyModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={handleExecuteCopyDay}
              >
                Execute Copy
              </Button>
            </div>
          </div>
        </div>
      </Dialog>
    </div>
  );
};

export default TimetableManagementPage;
