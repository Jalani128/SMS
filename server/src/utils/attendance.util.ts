import { Types } from 'mongoose';
import { Teacher } from '../models/Teacher.model.js';
import { Section } from '../models/Section.model.js';
import { SubjectAssignment } from '../models/SubjectAssignment.model.js';
import { Parent } from '../models/Parent.model.js';
import { Notification } from '../models/Notification.model.js';
import { logger } from './logger.js';

/**
 * Normalizes an incoming date string or Date object to a consistent UTC midnight
 * representation of the school-local calendar day in the given timezone.
 */
export const normalizeAttendanceDate = (
  dateInput: Date | string,
  timezone: string = 'UTC'
): Date => {
  if (typeof dateInput === 'string') {
    // If input is YYYY-MM-DD format (standard ISO date without time component)
    const ymdMatch = dateInput.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (ymdMatch) {
      const [, y, m, d] = ymdMatch;
      return new Date(`${y}-${m}-${d}T00:00:00.000Z`);
    }
  }

  const rawDate = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (isNaN(rawDate.getTime())) {
    throw new Error('Invalid date provided for attendance marking');
  }

  // Format date parts in the school's configured timezone
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const parts = formatter.formatToParts(rawDate);
    const y = parts.find((p) => p.type === 'year')?.value;
    const m = parts.find((p) => p.type === 'month')?.value;
    const d = parts.find((p) => p.type === 'day')?.value;

    if (y && m && d) {
      return new Date(`${y}-${m}-${d}T00:00:00.000Z`);
    }
  } catch (err) {
    logger.warn(`[Timezone] Fallback to UTC for invalid timezone: ${timezone}`);
  }

  // Fallback to UTC day
  const d = new Date(rawDate);
  d.setUTCHours(0, 0, 0, 0);
  return d;
};

/**
 * Returns today's normalized calendar day in the given timezone.
 */
export const getTodayInTimezone = (timezone: string = 'UTC'): Date => {
  return normalizeAttendanceDate(new Date(), timezone);
};

/**
 * Determines whether a given normalized attendance date falls in the future
 * relative to the current calendar date in the school's timezone.
 */
export const isFutureDate = (normalizedDate: Date, timezone: string = 'UTC'): boolean => {
  const today = getTodayInTimezone(timezone);
  return normalizedDate.getTime() > today.getTime();
};

/**
 * Verifies whether an authenticated teacher has valid administrative authority to
 * mark or update attendance for a specific class and section.
 * Authority is established if:
 * 1. The teacher is designated as the homeroom / Class Teacher for the Section.
 * 2. OR the teacher is actively assigned to teach a subject in that Class and Section.
 */
export const checkTeacherClassAssignment = async (
  teacherUserId: string | Types.ObjectId,
  schoolId: string | Types.ObjectId,
  classId: string | Types.ObjectId,
  sectionId: string | Types.ObjectId
): Promise<boolean> => {
  // Find the Teacher profile corresponding to this User
  const teacher = await Teacher.findOne({
    userId: new Types.ObjectId(teacherUserId.toString()),
    schoolId: new Types.ObjectId(schoolId.toString()),
    status: 'active',
  });

  if (!teacher) {
    return false;
  }

  const teacherId = teacher._id;

  // 1. Check if designated class teacher for the section
  const isClassTeacher = await Section.exists({
    _id: new Types.ObjectId(sectionId.toString()),
    schoolId: new Types.ObjectId(schoolId.toString()),
    classTeacherId: teacherId,
  });

  if (isClassTeacher) {
    return true;
  }

  // 2. Check if assigned to teach any active subject in this class / section
  const hasSubjectAssignment = await SubjectAssignment.exists({
    schoolId: new Types.ObjectId(schoolId.toString()),
    teacherId: teacherId,
    classId: new Types.ObjectId(classId.toString()),
    status: 'active',
    $or: [
      { sectionId: new Types.ObjectId(sectionId.toString()) },
      { sectionId: null },
      { sectionId: { $exists: false } },
    ],
  });

  return !!hasSubjectAssignment;
};

/**
 * Calculates attendance summary statistics and percentage based on standard SMS policy.
 *
 * POLICY SPECIFICATION:
 * - Total Days = present + absent + late + leave
 * - Present Rate = (present + late) / totalDays * 100
 * - Late arrivals are recorded as attended presence with a timestamp/status flag.
 * - Approved leaves are excused non-attendance.
 * - If totalDays == 0, percentage is 0.0%.
 */
export const calculateAttendanceStats = (
  records: Array<{ status: 'present' | 'absent' | 'late' | 'leave' }>
) => {
  let present = 0;
  let absent = 0;
  let late = 0;
  let leave = 0;

  for (const r of records) {
    if (r.status === 'present') present++;
    else if (r.status === 'absent') absent++;
    else if (r.status === 'late') late++;
    else if (r.status === 'leave') leave++;
  }

  const total = present + absent + late + leave;
  const percentage = total > 0 ? Number((((present + late) / total) * 100).toFixed(1)) : 0.0;

  return {
    totalRecordedDays: total,
    presentCount: present,
    absentCount: absent,
    lateCount: late,
    leaveCount: leave,
    attendancePercentage: percentage,
  };
};

/**
 * Escapes CSV cell values to prevent CSV Formula Injection (DDE attacks).
 * If a cell begins with '=', '+', '-', or '@', it is prepended with a single quote.
 * Quotes and commas are properly escaped.
 */
export const sanitizeCsvCell = (value: any): string => {
  if (value === null || value === undefined) {
    return '""';
  }

  let str = String(value).trim();

  // Prevent spreadsheet formula execution (DDE / CSV Injection)
  if (str.startsWith('=') || str.startsWith('+') || str.startsWith('-') || str.startsWith('@')) {
    str = `'${str}`;
  }

  // Double up quotes
  const escaped = str.replace(/"/g, '""');
  return `"${escaped}"`;
};

/**
 * Opt-in non-blocking notification trigger for absent and late student marks.
 * Dispatches in-app Notification records to verified parents linked to the student.
 * Never blocks the main bulk save transaction if notification delivery fails.
 */
export const triggerParentAttendanceNotifications = async (
  schoolId: Types.ObjectId | string,
  records: Array<{ studentId: Types.ObjectId | string; status: string; remarks?: string }>,
  date: Date
): Promise<void> => {
  try {
    const formattedDate = date.toISOString().substring(0, 10);

    for (const record of records) {
      if (record.status !== 'absent' && record.status !== 'late') {
        continue;
      }

      // Find parents linked to this student
      const parents = await Parent.find({
        schoolId: new Types.ObjectId(schoolId.toString()),
        'children.studentProfileId': new Types.ObjectId(record.studentId.toString()),
        status: 'active',
      });

      for (const parent of parents) {
        // Prevent duplicate notification for the same student, parent, and date
        const existing = await Notification.exists({
          schoolId: new Types.ObjectId(schoolId.toString()),
          recipientId: parent.userId,
          category: 'attendance',
          title: { $regex: new RegExp(`${formattedDate}`) },
          resourceId: new Types.ObjectId(record.studentId.toString()),
        });

        if (!existing) {
          const statusText = record.status === 'absent' ? 'marked Absent' : 'marked Late';
          await Notification.create({
            schoolId: new Types.ObjectId(schoolId.toString()),
            recipientId: parent.userId,
            category: 'attendance',
            priority: record.status === 'absent' ? 'high' : 'normal',
            title: `Attendance Notice: Student ${statusText} on ${formattedDate}`,
            content: `Your ward was ${statusText} for daily roll call on ${formattedDate}.${
              record.remarks ? ` Remarks: ${record.remarks}` : ''
            }`,
            resourceType: 'Attendance',
            resourceId: new Types.ObjectId(record.studentId.toString()),
            isRead: false,
          });
        }
      }
    }
  } catch (err: any) {
    logger.warn(`[AttendanceNotification] Non-blocking notification dispatch notice: ${err.message}`);
  }
};
