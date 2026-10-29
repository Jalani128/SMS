import { Types } from 'mongoose';
import { Timetable, ITimetable, DayOfWeek } from '../models/Timetable.model.js';

export interface ConflictCheckParams {
  schoolId: Types.ObjectId;
  academicSessionId: Types.ObjectId;
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  teacherId?: Types.ObjectId;
  sectionId?: Types.ObjectId;
  room?: string;
  excludeSlotId?: Types.ObjectId;
}

export interface ConflictCheckResult {
  hasConflict: boolean;
  conflictType?: 'teacher' | 'section' | 'room';
  conflictingSlot?: Partial<ITimetable>;
  message?: string;
}

const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

/**
 * Validates 24-hour HH:mm time format.
 */
export const isValid24HourTime = (time: string): boolean => {
  return timeRegex.test(time);
};

/**
 * Validates that startTime is strictly earlier than endTime.
 */
export const isValidTimeRange = (startTime: string, endTime: string): boolean => {
  if (!isValid24HourTime(startTime) || !isValid24HourTime(endTime)) return false;
  return startTime < endTime;
};

/**
 * Checks whether two half-open time intervals [startA, endA) and [startB, endB) overlap.
 * Adjacent periods (e.g. 09:00-10:00 and 10:00-11:00) DO NOT conflict.
 */
export const isTimeIntervalOverlapping = (
  startA: string,
  endA: string,
  startB: string,
  endB: string
): boolean => {
  return startA < endB && startB < endA;
};

/**
 * Server-side mandatory conflict detection.
 * Evaluates requested slot against active timetable entries for:
 * 1. Teacher double-booking (no overlapping lessons for the same teacher)
 * 2. Class section overlap (no simultaneous periods in the same section)
 * 3. Room conflict (no simultaneous usage of the same room)
 */
export const checkTimetableConflicts = async (
  params: ConflictCheckParams
): Promise<ConflictCheckResult> => {
  const {
    schoolId,
    academicSessionId,
    dayOfWeek,
    startTime,
    endTime,
    teacherId,
    sectionId,
    room,
    excludeSlotId,
  } = params;

  // Base query for the same school, session, weekday, active status
  const baseFilter: any = {
    schoolId,
    academicSessionId,
    dayOfWeek,
    status: { $ne: 'archived' },
    isDeleted: false,
  };

  if (excludeSlotId) {
    baseFilter._id = { $ne: excludeSlotId };
  }

  // Fetch all existing slots on this weekday for candidate matching
  // Using half-open condition: existing.startTime < requested.endTime AND requested.startTime < existing.endTime
  const overlappingTimeFilter = {
    ...baseFilter,
    startTime: { $lt: endTime },
    endTime: { $gt: startTime },
  };

  // 1. Check Section Conflict
  if (sectionId) {
    const sectionConflict = await Timetable.findOne({
      ...overlappingTimeFilter,
      sectionId,
    })
      .populate('subjectId', 'name code')
      .populate('teacherId', 'employeeId userId');

    if (sectionConflict) {
      const subjectName = (sectionConflict.subjectId as any)?.name || 'Class period';
      return {
        hasConflict: true,
        conflictType: 'section',
        conflictingSlot: sectionConflict.toObject(),
        message: `Section schedule conflict: Section is already scheduled for ${subjectName} between ${sectionConflict.startTime} and ${sectionConflict.endTime} (Period ${sectionConflict.periodNumber}) on ${dayOfWeek}.`,
      };
    }
  }

  // 2. Check Teacher Conflict (if teacher is specified and not a break)
  if (teacherId) {
    const teacherConflict = await Timetable.findOne({
      ...overlappingTimeFilter,
      teacherId,
    })
      .populate('classId', 'name')
      .populate('sectionId', 'name')
      .populate('subjectId', 'name');

    if (teacherConflict) {
      const className = (teacherConflict.classId as any)?.name || 'another class';
      const sectionName = (teacherConflict.sectionId as any)?.name || '';
      return {
        hasConflict: true,
        conflictType: 'teacher',
        conflictingSlot: teacherConflict.toObject(),
        message: `Teacher schedule conflict: Assigned teacher is already booked for ${className} ${sectionName} between ${teacherConflict.startTime} and ${teacherConflict.endTime} on ${dayOfWeek}.`,
      };
    }
  }

  // 3. Check Room Conflict (if room is specified)
  if (room && room.trim().length > 0) {
    const normalizedRoom = room.trim();
    const roomConflict = await Timetable.findOne({
      ...overlappingTimeFilter,
      room: { $regex: new RegExp(`^${normalizedRoom}$`, 'i') },
    })
      .populate('classId', 'name')
      .populate('sectionId', 'name');

    if (roomConflict) {
      const className = (roomConflict.classId as any)?.name || 'another class';
      const sectionName = (roomConflict.sectionId as any)?.name || '';
      return {
        hasConflict: true,
        conflictType: 'room',
        conflictingSlot: roomConflict.toObject(),
        message: `Room conflict: Room "${room}" is already reserved for ${className} ${sectionName} between ${roomConflict.startTime} and ${roomConflict.endTime} on ${dayOfWeek}.`,
      };
    }
  }

  return { hasConflict: false };
};
