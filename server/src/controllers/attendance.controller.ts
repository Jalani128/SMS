import { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import {
  Attendance,
  Enrollment,
  Class,
  Section,
  Student,
  Parent,
  Teacher,
  AcademicSession,
  School,
  AuditLog,
} from '../models/index.js';
import { ApiError } from '../utils/apiError.js';
import { ApiResponse } from '../utils/apiResponse.js';
import {
  normalizeAttendanceDate,
  isFutureDate,
  checkTeacherClassAssignment,
  calculateAttendanceStats,
  sanitizeCsvCell,
  triggerParentAttendanceNotifications,
} from '../utils/attendance.util.js';

// Express async handler wrapper
const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) =>
  (req: Request, res: Response, next: NextFunction) =>
    Promise.resolve(fn(req, res, next)).catch(next);

/**
 * GET /api/attendance
 * Retrieves paginated list of attendance records with multi-criteria filtering
 */
export const getAttendanceList = asyncHandler(async (req: Request, res: Response) => {
  const schoolId = req.schoolId!;
  const user = req.user!;
  const {
    page = 1,
    limit = 20,
    academicSessionId,
    classId,
    sectionId,
    studentId,
    date,
    startDate,
    endDate,
    status,
  } = req.query;

  const query: any = { schoolId: new Types.ObjectId(schoolId) };

  // Role-based restrictions
  if (user?.role === 'student') {
    const student = await Student.findOne({ userId: user.userId, schoolId });
    if (!student) {
      throw ApiError.notFound('Student profile not found');
    }
    query.studentId = student._id;
  } else if (user?.role === 'parent') {
    const parent = await Parent.findOne({ userId: user.userId, schoolId });
    if (!parent) {
      throw ApiError.notFound('Parent profile not found');
    }
    const wardIds = parent.children.map((c) => c.studentProfileId);
    if (studentId) {
      if (!wardIds.some((id) => id.toString() === studentId.toString())) {
        throw ApiError.forbidden('Access denied: You are not authorized to view attendance for this student');
      }
      query.studentId = new Types.ObjectId(studentId as string);
    } else {
      query.studentId = { $in: wardIds };
    }
  } else if (user?.role === 'teacher') {
    if (classId && sectionId) {
      const isAssigned = await checkTeacherClassAssignment(user.userId, schoolId, classId as string, sectionId as string);
      if (!isAssigned) {
        throw ApiError.forbidden('Access denied: You are not assigned to this class section');
      }
    }
  }

  // Explicit filters
  if (studentId && (user?.role === 'admin' || user?.role === 'super_admin' || user?.role === 'teacher')) {
    query.studentId = new Types.ObjectId(studentId as string);
  }
  if (academicSessionId) {
    query.academicSessionId = new Types.ObjectId(academicSessionId as string);
  }
  if (classId) {
    query.classId = new Types.ObjectId(classId as string);
  }
  if (sectionId) {
    query.sectionId = new Types.ObjectId(sectionId as string);
  }
  if (status) {
    query.status = status;
  }

  // Date filtering
  if (date) {
    const normDate = normalizeAttendanceDate(date as string);
    query.date = normDate;
  } else if (startDate || endDate) {
    query.date = {};
    if (startDate) {
      query.date.$gte = normalizeAttendanceDate(startDate as string);
    }
    if (endDate) {
      query.date.$lte = normalizeAttendanceDate(endDate as string);
    }
  }

  const pageNum = Math.max(1, Number(page));
  const limitNum = Math.min(100, Math.max(1, Number(limit)));
  const skip = (pageNum - 1) * limitNum;

  const [records, total] = await Promise.all([
    Attendance.find(query)
      .sort({ date: -1, createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .populate({
        path: 'studentId',
        select: 'admissionNumber rollNumber userId',
        populate: { path: 'userId', select: 'name email' },
      })
      .populate('classId', 'name code')
      .populate('sectionId', 'name code')
      .populate('markedBy', 'name role')
      .lean(),
    Attendance.countDocuments(query),
  ]);

  return ApiResponse.success(res, {
    records,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum) || 1,
      hasNextPage: pageNum * limitNum < total,
      hasPrevPage: pageNum > 1,
    },
  });
});

/**
 * GET /api/attendance/daily
 * Retrieves daily roll roster for a specific class, section, and date, combining
 * active enrollments with any recorded attendance status.
 */
export const getDailyAttendance = asyncHandler(async (req: Request, res: Response) => {
  const schoolId = req.schoolId!;
  const user = req.user!;
  const { classId, sectionId, date, academicSessionId } = req.query;

  if (!classId || !sectionId || !date) {
    throw ApiError.badRequest('Class ID, Section ID, and Date are required');
  }

  // Teacher access check
  if (user?.role === 'teacher') {
    const isAssigned = await checkTeacherClassAssignment(user.userId, schoolId, classId as string, sectionId as string);
    if (!isAssigned) {
      throw ApiError.forbidden('Access denied: You are not authorized to take attendance for this class section');
    }
  }

  const school = await School.findById(schoolId);
  const timezone = school?.timezone || 'UTC';
  const normalizedDate = normalizeAttendanceDate(date as string, timezone);

  // Resolve session
  let sessionDoc: any;
  if (academicSessionId) {
    sessionDoc = await AcademicSession.findOne({ _id: academicSessionId, schoolId });
  } else {
    sessionDoc = await AcademicSession.findOne({ schoolId, isCurrent: true });
  }

  if (!sessionDoc) {
    sessionDoc = await AcademicSession.findOne({ schoolId }).sort({ createdAt: -1 });
  }

  // Fetch actively enrolled students in this class and section
  const enrollments = await Enrollment.find({
    schoolId: new Types.ObjectId(schoolId),
    classId: new Types.ObjectId(classId as string),
    sectionId: new Types.ObjectId(sectionId as string),
    status: 'enrolled',
    ...(sessionDoc ? { academicSessionId: sessionDoc._id } : {}),
  })
    .populate({
      path: 'studentId',
      select: 'admissionNumber rollNumber userId status',
      populate: { path: 'userId', select: 'name email avatarUrl isActive' },
    })
    .populate('classId', 'name code')
    .populate('sectionId', 'name code capacity')
    .sort({ rollNumber: 1, createdAt: 1 })
    .lean();

  // Fetch already recorded attendance for this date
  const existingAttendance = await Attendance.find({
    schoolId: new Types.ObjectId(schoolId),
    classId: new Types.ObjectId(classId as string),
    sectionId: new Types.ObjectId(sectionId as string),
    date: normalizedDate,
  }).lean();

  const attendanceMap = new Map<string, any>();
  for (const att of existingAttendance) {
    attendanceMap.set(att.studentId.toString(), att);
  }

  // Build complete roster
  const roster = enrollments.map((enr: any) => {
    const student = enr.studentId;
    const att = student ? attendanceMap.get(student._id.toString()) : null;

    return {
      enrollmentId: enr._id,
      studentId: student?._id,
      name: student?.userId?.name || 'Unknown Student',
      email: student?.userId?.email,
      avatarUrl: student?.userId?.avatarUrl,
      admissionNumber: student?.admissionNumber || '—',
      rollNumber: enr.rollNumber || student?.rollNumber || '—',
      attendance: att
        ? {
            _id: att._id,
            status: att.status,
            remarks: att.remarks || '',
            markedBy: att.markedBy,
            updatedAt: att.updatedAt,
          }
        : null,
    };
  });

  // Calculate day summary
  const markedRecords = Array.from(attendanceMap.values());
  const stats = calculateAttendanceStats(markedRecords);

  const [cls, sec] = await Promise.all([
    Class.findById(classId).select('name code').lean(),
    Section.findById(sectionId).select('name code capacity roomNumber').lean(),
  ]);

  return ApiResponse.success(res, {
    date: normalizedDate,
    academicSession: sessionDoc ? { _id: sessionDoc._id, name: sessionDoc.name, code: sessionDoc.code } : null,
    class: cls,
    section: sec,
    roster,
    summary: {
      totalEnrolled: enrollments.length,
      markedCount: markedRecords.length,
      unmarkedCount: Math.max(0, enrollments.length - markedRecords.length),
      presentCount: stats.presentCount,
      absentCount: stats.absentCount,
      lateCount: stats.lateCount,
      leaveCount: stats.leaveCount,
      attendancePercentage: stats.attendancePercentage,
    },
  });
});

/**
 * GET /api/attendance/student/:studentId
 * Retrieves attendance records and monthly percentage for a specific student.
 */
export const getStudentAttendance = asyncHandler(async (req: Request, res: Response) => {
  const schoolId = req.schoolId!;
  const user = req.user!;
  const studentId = req.params.studentId as string;
  const { academicSessionId, month, year, startDate, endDate, page = 1, limit = 31 } = req.query;

  // Authorization enforcement
  if (user?.role === 'student') {
    const currentStudent = await Student.findOne({ userId: user.userId, schoolId });
    if (!currentStudent || currentStudent._id.toString() !== studentId) {
      throw ApiError.forbidden('Access denied: You can only view your own attendance');
    }
  } else if (user?.role === 'parent') {
    const parent = await Parent.findOne({ userId: user.userId, schoolId });
    if (!parent) {
      throw ApiError.notFound('Parent profile not found');
    }
    const isLinked = parent.children.some((c) => c.studentProfileId.toString() === studentId);
    if (!isLinked) {
      throw ApiError.forbidden('Access denied: This student is not linked to your parent account');
    }
  }

  const student = await Student.findOne({ _id: studentId, schoolId })
    .populate('userId', 'name email avatarUrl')
    .lean();

  if (!student) {
    throw ApiError.notFound('Student profile not found');
  }

  const query: any = {
    schoolId: new Types.ObjectId(schoolId),
    studentId: new Types.ObjectId(studentId),
  };

  if (academicSessionId) {
    query.academicSessionId = new Types.ObjectId(academicSessionId as string);
  }

  if (month && year) {
    const m = Number(month);
    const y = Number(year);
    const startMonth = new Date(Date.UTC(y, m - 1, 1));
    const endMonth = new Date(Date.UTC(y, m, 0, 23, 59, 59, 999));
    query.date = { $gte: startMonth, $lte: endMonth };
  } else if (startDate || endDate) {
    query.date = {};
    if (startDate) query.date.$gte = normalizeAttendanceDate(startDate as string);
    if (endDate) query.date.$lte = normalizeAttendanceDate(endDate as string);
  }

  const pageNum = Math.max(1, Number(page));
  const limitNum = Math.min(100, Math.max(1, Number(limit)));
  const skip = (pageNum - 1) * limitNum;

  const [records, total, allStatsRecords] = await Promise.all([
    Attendance.find(query)
      .sort({ date: -1 })
      .skip(skip)
      .limit(limitNum)
      .populate('classId', 'name code')
      .populate('sectionId', 'name code')
      .lean(),
    Attendance.countDocuments(query),
    Attendance.find(query).select('status').lean(),
  ]);

  const stats = calculateAttendanceStats(allStatsRecords as any);

  return ApiResponse.success(res, {
    student: {
      _id: student._id,
      name: (student.userId as any)?.name,
      admissionNumber: student.admissionNumber,
      rollNumber: student.rollNumber,
    },
    records,
    summary: stats,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum) || 1,
    },
  });
});

/**
 * GET /api/attendance/class-summary
 * Returns KPI overview counts for a class section on a given date
 */
export const getClassSummary = asyncHandler(async (req: Request, res: Response) => {
  const schoolId = req.schoolId!;
  const { classId, sectionId, date, academicSessionId } = req.query;

  if (!classId || !sectionId || !date) {
    throw ApiError.badRequest('Class ID, Section ID, and Date are required');
  }

  const normalizedDate = normalizeAttendanceDate(date as string);

  const [totalEnrolled, records] = await Promise.all([
    Enrollment.countDocuments({
      schoolId: new Types.ObjectId(schoolId),
      classId: new Types.ObjectId(classId as string),
      sectionId: new Types.ObjectId(sectionId as string),
      status: 'enrolled',
      ...(academicSessionId ? { academicSessionId: new Types.ObjectId(academicSessionId as string) } : {}),
    }),
    Attendance.find({
      schoolId: new Types.ObjectId(schoolId),
      classId: new Types.ObjectId(classId as string),
      sectionId: new Types.ObjectId(sectionId as string),
      date: normalizedDate,
    }).lean(),
  ]);

  const stats = calculateAttendanceStats(records as any);

  return ApiResponse.success(res, {
    date: normalizedDate,
    totalEnrolled,
    markedCount: records.length,
    unmarkedCount: Math.max(0, totalEnrolled - records.length),
    presentCount: stats.presentCount,
    absentCount: stats.absentCount,
    lateCount: stats.lateCount,
    leaveCount: stats.leaveCount,
    attendancePercentage: stats.attendancePercentage,
  });
});

/**
 * POST /api/attendance/bulk
 * Idempotently submits class roster attendance in bulk with duplicate protection,
 * active enrollment verification, and per-record validation reports.
 */
export const submitBulkAttendance = asyncHandler(async (req: Request, res: Response) => {
  const schoolId = req.schoolId!;
  const user = req.user;
  const { academicSessionId, classId, sectionId, date, records } = req.body;

  if (!user) {
    throw ApiError.unauthorized('Authentication required');
  }

  // Teacher assignment check
  if (user.role === 'teacher') {
    const isAssigned = await checkTeacherClassAssignment(user.userId, schoolId, classId, sectionId);
    if (!isAssigned) {
      throw ApiError.forbidden('Access denied: You are not authorized to mark attendance for this class section');
    }
  } else if (user.role !== 'admin' && user.role !== 'super_admin') {
    throw ApiError.forbidden('Access denied: Only administrators and assigned teachers may submit attendance');
  }

  const school = await School.findById(schoolId);
  const timezone = school?.timezone || 'UTC';
  const normalizedDate = normalizeAttendanceDate(date, timezone);

  // Future date check
  if (isFutureDate(normalizedDate, timezone)) {
    throw ApiError.badRequest('Attendance cannot be recorded for future calendar dates');
  }

  // Session check
  const sessionDoc = await AcademicSession.findOne({ _id: academicSessionId, schoolId });
  if (!sessionDoc) {
    throw ApiError.notFound('Academic session not found for this school');
  }

  // Session date bounds check
  if (sessionDoc.startDate && normalizedDate < new Date(sessionDoc.startDate)) {
    throw ApiError.badRequest(`Attendance date cannot precede academic session start date (${sessionDoc.startDate.toISOString().substring(0, 10)})`);
  }
  if (sessionDoc.endDate && normalizedDate > new Date(sessionDoc.endDate)) {
    throw ApiError.badRequest(`Attendance date cannot exceed academic session end date (${sessionDoc.endDate.toISOString().substring(0, 10)})`);
  }

  // Fetch active enrollments for this class, section, and session
  const activeEnrollments = await Enrollment.find({
    schoolId: new Types.ObjectId(schoolId),
    academicSessionId: new Types.ObjectId(academicSessionId),
    classId: new Types.ObjectId(classId),
    sectionId: new Types.ObjectId(sectionId),
    status: 'enrolled',
  }).select('studentId').lean();

  const activeStudentIdSet = new Set<string>(activeEnrollments.map((e) => e.studentId.toString()));

  const errors: Array<{ studentId: string; reason: string }> = [];
  const validBulkOps: any[] = [];
  const validRecordsForNotification: Array<{ studentId: string; status: string; remarks?: string }> = [];

  for (const item of records) {
    const sId = item.studentId.toString();

    // Verify active enrollment
    if (!activeStudentIdSet.has(sId)) {
      errors.push({
        studentId: sId,
        reason: 'Student is not actively enrolled in the specified class and section for this academic session',
      });
      continue;
    }

    validBulkOps.push({
      updateOne: {
        filter: {
          schoolId: new Types.ObjectId(schoolId),
          studentId: new Types.ObjectId(sId),
          date: normalizedDate,
        },
        update: {
          $set: {
            schoolId: new Types.ObjectId(schoolId),
            academicSessionId: new Types.ObjectId(academicSessionId),
            classId: new Types.ObjectId(classId),
            sectionId: new Types.ObjectId(sectionId),
            studentId: new Types.ObjectId(sId),
            date: normalizedDate,
            status: item.status,
            remarks: item.remarks ? String(item.remarks).trim() : '',
            markedBy: new Types.ObjectId(user.userId),
          },
        },
        upsert: true,
      },
    });

    validRecordsForNotification.push({
      studentId: sId,
      status: item.status,
      remarks: item.remarks,
    });
  }

  let createdCount = 0;
  let updatedCount = 0;

  if (validBulkOps.length > 0) {
    const result = await Attendance.bulkWrite(validBulkOps, { ordered: false });
    createdCount = result.upsertedCount || 0;
    updatedCount = result.modifiedCount || 0;
  }

  // Dispatch non-blocking parent notifications for absent/late marks
  triggerParentAttendanceNotifications(schoolId, validRecordsForNotification, normalizedDate);

  return ApiResponse.success(res, {
    summary: {
      total: records.length,
      created: createdCount,
      updated: updatedCount,
      skipped: 0,
      rejected: errors.length,
    },
    errors,
  });
});

/**
 * PATCH /api/attendance/:id
 * Corrects an existing attendance record and logs an immutable audit trail entry.
 */
export const updateAttendanceRecord = asyncHandler(async (req: Request, res: Response) => {
  const schoolId = req.schoolId!;
  const user = req.user;
  const { id } = req.params;
  const { status, remarks, reason } = req.body;

  if (!user) {
    throw ApiError.unauthorized('Authentication required');
  }

  const attendance = await Attendance.findOne({ _id: id, schoolId });
  if (!attendance) {
    throw ApiError.notFound('Attendance record not found');
  }

  // Teacher authority check
  if (user.role === 'teacher') {
    const isAssigned = await checkTeacherClassAssignment(
      user.userId,
      schoolId,
      attendance.classId,
      attendance.sectionId
    );
    if (!isAssigned) {
      throw ApiError.forbidden('Access denied: You are not authorized to edit attendance for this class section');
    }
  } else if (user.role !== 'admin' && user.role !== 'super_admin') {
    throw ApiError.forbidden('Access denied: Only administrators and assigned teachers may modify attendance');
  }

  const previousStatus = attendance.status;
  const previousRemarks = attendance.remarks || '';

  attendance.status = status;
  if (remarks !== undefined) {
    attendance.remarks = String(remarks).trim();
  }
  attendance.markedBy = new Types.ObjectId(user.userId);
  await attendance.save();

  // Create audit log entry for historical transparency
  await AuditLog.create({
    actorId: new Types.ObjectId(user.userId),
    actorRole: user.role,
    schoolId: new Types.ObjectId(schoolId),
    action: 'ATTENDANCE_CORRECTION',
    targetResource: 'Attendance',
    targetResourceId: attendance._id,
    metadata: {
      attendanceId: attendance._id,
      studentId: attendance.studentId,
      classId: attendance.classId,
      sectionId: attendance.sectionId,
      date: attendance.date,
      previousStatus,
      newStatus: status,
      previousRemarks,
      newRemarks: attendance.remarks,
      reason: String(reason).trim(),
    },
    timestamp: new Date(),
  });

  return ApiResponse.success(res, attendance, 'Attendance record corrected and audited successfully');
});

/**
 * GET /api/attendance/reports/monthly
 * Generates monthly student-level and class-level attendance summary matrices.
 */
export const getMonthlyReport = asyncHandler(async (req: Request, res: Response) => {
  const schoolId = req.schoolId!;
  const user = req.user;
  const { classId, sectionId, academicSessionId, month, year, studentId } = req.query;

  const currentYear = year ? Number(year) : new Date().getFullYear();
  const currentMonth = month ? Number(month) : new Date().getMonth() + 1;

  const startOfMonth = new Date(Date.UTC(currentYear, currentMonth - 1, 1));
  const endOfMonth = new Date(Date.UTC(currentYear, currentMonth, 0, 23, 59, 59, 999));

  // Role permissions
  if (user?.role === 'student') {
    const student = await Student.findOne({ userId: user.userId, schoolId });
    if (!student) throw ApiError.notFound('Student profile not found');
    return getStudentAttendance(req, res, () => {});
  } else if (user?.role === 'parent') {
    const parent = await Parent.findOne({ userId: user.userId, schoolId });
    if (!parent) throw ApiError.notFound('Parent profile not found');
    if (!studentId) {
      throw ApiError.badRequest('Student ID parameter is required for parent report access');
    }
    const isLinked = parent.children.some((c) => c.studentProfileId.toString() === studentId.toString());
    if (!isLinked) {
      throw ApiError.forbidden('Access denied: You are not authorized to view reports for this student');
    }
  }

  const query: any = {
    schoolId: new Types.ObjectId(schoolId),
    date: { $gte: startOfMonth, $lte: endOfMonth },
  };

  if (academicSessionId) query.academicSessionId = new Types.ObjectId(academicSessionId as string);
  if (classId) query.classId = new Types.ObjectId(classId as string);
  if (sectionId) query.sectionId = new Types.ObjectId(sectionId as string);
  if (studentId) query.studentId = new Types.ObjectId(studentId as string);

  // Teacher check
  if (user?.role === 'teacher' && classId && sectionId) {
    const isAssigned = await checkTeacherClassAssignment(user.userId, schoolId, classId as string, sectionId as string);
    if (!isAssigned) {
      throw ApiError.forbidden('Access denied: You are not authorized to view reports for this class section');
    }
  }

  // Fetch all matching records
  const records = await Attendance.find(query)
    .populate({
      path: 'studentId',
      select: 'admissionNumber rollNumber userId',
      populate: { path: 'userId', select: 'name' },
    })
    .lean();

  // Aggregate stats per student
  const studentMap = new Map<string, any>();

  for (const r of records) {
    const sId = r.studentId ? (r.studentId as any)._id?.toString() : null;
    if (!sId) continue;

    if (!studentMap.has(sId)) {
      studentMap.set(sId, {
        studentId: sId,
        name: (r.studentId as any)?.userId?.name || 'Unknown',
        admissionNumber: (r.studentId as any)?.admissionNumber || '—',
        rollNumber: (r.studentId as any)?.rollNumber || '—',
        present: 0,
        absent: 0,
        late: 0,
        leave: 0,
        totalDays: 0,
      });
    }

    const item = studentMap.get(sId);
    item.totalDays += 1;
    if (r.status === 'present') item.present += 1;
    else if (r.status === 'absent') item.absent += 1;
    else if (r.status === 'late') item.late += 1;
    else if (r.status === 'leave') item.leave += 1;
  }

  const studentRows = Array.from(studentMap.values()).map((row) => {
    const percentage =
      row.totalDays > 0 ? Number((((row.present + row.late) / row.totalDays) * 100).toFixed(1)) : 0.0;
    return { ...row, percentage };
  });

  const totalSchoolDaysRecorded = Math.max(...studentRows.map((r) => r.totalDays), 0);
  const classStats = calculateAttendanceStats(records as any);

  return ApiResponse.success(res, {
    month: currentMonth,
    year: currentYear,
    totalRecords: records.length,
    recordedInstructionalDays: totalSchoolDaysRecorded,
    students: studentRows,
    classSummary: {
      presentCount: classStats.presentCount,
      absentCount: classStats.absentCount,
      lateCount: classStats.lateCount,
      leaveCount: classStats.leaveCount,
      averagePercentage: classStats.attendancePercentage,
    },
  });
});

/**
 * GET /api/attendance/reports/export
 * Generates and streams sanitized CSV export of attendance records with formula escaping
 */
export const exportAttendanceCsv = asyncHandler(async (req: Request, res: Response) => {
  const schoolId = req.schoolId!;
  const user = req.user;
  const { classId, sectionId, academicSessionId, startDate, endDate, month, year, studentId } = req.query;

  // Authorization check for teacher / parent / student
  if (user?.role === 'teacher' && classId && sectionId) {
    const isAssigned = await checkTeacherClassAssignment(user.userId, schoolId, classId as string, sectionId as string);
    if (!isAssigned) {
      throw ApiError.forbidden('Access denied: You are not authorized to export attendance for this section');
    }
  } else if (user?.role === 'parent') {
    const parent = await Parent.findOne({ userId: user.userId, schoolId });
    if (!parent) throw ApiError.notFound('Parent profile not found');
    if (!studentId || !parent.children.some((c) => c.studentProfileId.toString() === studentId.toString())) {
      throw ApiError.forbidden('Access denied: You can only export attendance for your linked ward');
    }
  } else if (user?.role === 'student') {
    const student = await Student.findOne({ userId: user.userId, schoolId });
    if (!student || student._id.toString() !== studentId) {
      throw ApiError.forbidden('Access denied: You can only export your own attendance records');
    }
  }

  const query: any = { schoolId: new Types.ObjectId(schoolId) };

  if (academicSessionId) query.academicSessionId = new Types.ObjectId(academicSessionId as string);
  if (classId) query.classId = new Types.ObjectId(classId as string);
  if (sectionId) query.sectionId = new Types.ObjectId(sectionId as string);
  if (studentId) query.studentId = new Types.ObjectId(studentId as string);

  if (month && year) {
    const m = Number(month);
    const y = Number(year);
    query.date = {
      $gte: new Date(Date.UTC(y, m - 1, 1)),
      $lte: new Date(Date.UTC(y, m, 0, 23, 59, 59, 999)),
    };
  } else if (startDate || endDate) {
    query.date = {};
    if (startDate) query.date.$gte = normalizeAttendanceDate(startDate as string);
    if (endDate) query.date.$lte = normalizeAttendanceDate(endDate as string);
  }

  const records = await Attendance.find(query)
    .sort({ date: -1 })
    .populate({
      path: 'studentId',
      select: 'admissionNumber rollNumber userId',
      populate: { path: 'userId', select: 'name' },
    })
    .populate('classId', 'name code')
    .populate('sectionId', 'name code')
    .lean();

  const csvRows: string[] = [];
  // CSV Header
  csvRows.push(
    ['Student Name', 'Admission No', 'Roll No', 'Class', 'Section', 'Date', 'Status', 'Remarks']
      .map(sanitizeCsvCell)
      .join(',')
  );

  for (const r of records) {
    const student = r.studentId as any;
    const name = student?.userId?.name || 'Unknown Student';
    const admNo = student?.admissionNumber || '—';
    const rollNo = student?.rollNumber || '—';
    const clsName = (r.classId as any)?.name || 'Class';
    const secName = (r.sectionId as any)?.name || 'Section';
    const dateStr = r.date ? new Date(r.date).toISOString().substring(0, 10) : '';
    const statusStr = r.status ? r.status.toUpperCase() : '';
    const remarksStr = r.remarks || '';

    csvRows.push(
      [name, admNo, rollNo, clsName, secName, dateStr, statusStr, remarksStr]
        .map(sanitizeCsvCell)
        .join(',')
    );
  }

  const csvString = csvRows.join('\r\n');
  const filename = `attendance-report-${new Date().toISOString().substring(0, 10)}.csv`;

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  return res.status(200).send(csvString);
});
