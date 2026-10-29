import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { Exam, IExam, ExamStatus } from '../models/Exam.model.js';
import { ExamSubject, IExamSubject } from '../models/ExamSubject.model.js';
import { Mark, IMark } from '../models/Mark.model.js';
import { GradingScale } from '../models/GradingScale.model.js';
import { School } from '../models/School.model.js';
import { Student } from '../models/Student.model.js';
import { Teacher } from '../models/Teacher.model.js';
import { Parent } from '../models/Parent.model.js';
import { Enrollment } from '../models/Enrollment.model.js';
import { AcademicSession } from '../models/AcademicSession.model.js';
import { Class } from '../models/Class.model.js';
import { Section } from '../models/Section.model.js';
import { Subject } from '../models/Subject.model.js';
import { SubjectAssignment } from '../models/SubjectAssignment.model.js';
import {
  createExamSchema,
  updateExamSchema,
  createExamSubjectSchema,
  updateExamSubjectSchema,
  bulkMarksEntrySchema,
  correctMarkSchema,
  createGradingScaleSchema,
  queryExamSchema,
} from '../validations/exam.validation.js';
import { checkExamScheduleConflicts } from '../utils/examScheduleConflict.util.js';
import {
  calculateStudentExamResult,
  calculateClassAnalytics,
} from '../utils/resultCalculation.util.js';
import {
  DEFAULT_GRADE_BANDS,
  validateGradingBands,
  calculateGradeForPercentage,
  roundPercentage,
} from '../utils/grading.util.js';
import { buildCsvString } from '../utils/csvExport.util.js';
import { logger } from '../utils/logger.js';

// Helper to extract schoolId and userId
const getContext = (req: Request) => {
  const schoolIdStr = (req.schoolId || req.user?.schoolId) as string | undefined;
  const userIdStr = req.user?.userId;

  return {
    schoolId: schoolIdStr ? new Types.ObjectId(schoolIdStr) : undefined,
    userId: userIdStr ? new Types.ObjectId(userIdStr) : undefined,
    role: req.user?.role,
  };
};

// ============================================================================
// 1. List Examinations (Role-Aware)
// ============================================================================
export const listExams = async (req: Request, res: Response): Promise<void> => {
  try {
    const { schoolId, role, userId } = getContext(req);
    if (!schoolId) {
      res.status(401).json({ success: false, message: 'School context required' });
      return;
    }

    const queryParsed = queryExamSchema.safeParse(req.query);
    if (!queryParsed.success) {
      res.status(400).json({ success: false, message: queryParsed.error.issues[0]?.message || 'Invalid query' });
      return;
    }

    const { academicSessionId, classId, sectionId, examType, status, search } = queryParsed.data;
    const filter: any = { schoolId };

    if (academicSessionId) filter.academicSessionId = new Types.ObjectId(academicSessionId);
    if (classId) filter.classId = new Types.ObjectId(classId);
    if (sectionId) filter.sectionId = new Types.ObjectId(sectionId);
    if (examType) filter.examType = examType;

    // Role-based visibility
    if (role === 'student') {
      filter.status = 'published';
      // Find student's class
      const studentProfile = await Student.findOne({ schoolId, userId });
      if (studentProfile) {
        const activeEnrollment = await Enrollment.findOne({
          schoolId,
          studentId: studentProfile._id,
          status: 'enrolled',
        });
        if (activeEnrollment) {
          filter.$or = [{ classId: activeEnrollment.classId }, { classId: { $exists: false } }, { classId: null }];
        }
      }
    } else if (role === 'parent') {
      filter.status = 'published';
    } else if (role === 'teacher') {
      if (status) {
        filter.status = status;
      } else {
        filter.status = { $ne: 'archived' };
      }
    } else {
      // Admin
      if (status) {
        filter.status = status;
      } else {
        filter.status = { $ne: 'archived' };
      }
    }

    if (search) {
      filter.name = { $regex: search.trim(), $options: 'i' };
    }

    const exams = await Exam.find(filter)
      .populate('academicSessionId', 'name isCurrent startDate endDate')
      .populate('classId', 'name code')
      .populate('sectionId', 'name')
      .populate('createdBy', 'firstName lastName email')
      .sort({ startDate: -1, createdAt: -1 });

    res.json({
      success: true,
      data: exams,
      count: exams.length,
    });
  } catch (err: any) {
    logger.error(`Error in listExams: ${err.message}`);
    res.status(500).json({ success: false, message: 'Internal server error listing exams' });
  }
};

// ============================================================================
// 2. Get Single Exam Details
// ============================================================================
export const getExamById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { schoolId, role } = getContext(req);
    const id = String(req.params.id);

    if (!schoolId || !Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: 'Valid School and Exam ID required' });
      return;
    }

    const exam = await Exam.findOne({ _id: id, schoolId })
      .populate('academicSessionId', 'name isCurrent startDate endDate')
      .populate('classId', 'name code')
      .populate('sectionId', 'name')
      .populate('createdBy', 'firstName lastName email');

    if (!exam) {
      res.status(404).json({ success: false, message: 'Examination not found' });
      return;
    }

    // Role security check: students and parents can only see published exams
    if ((role === 'student' || role === 'parent') && exam.status !== 'published') {
      res.status(403).json({ success: false, message: 'Results for this examination have not been published yet' });
      return;
    }

    // Fetch associated exam subjects
    const subjects = await ExamSubject.find({ examId: id, schoolId })
      .populate('subjectId', 'name code type')
      .populate('classId', 'name code')
      .populate('sectionId', 'name')
      .populate('teacherId', 'employeeId')
      .sort({ examDate: 1, startTime: 1 });

    res.json({
      success: true,
      data: {
        ...exam.toJSON(),
        subjects,
      },
    });
  } catch (err: any) {
    logger.error(`Error in getExamById: ${err.message}`);
    res.status(500).json({ success: false, message: 'Internal server error getting exam' });
  }
};

// ============================================================================
// 3. Create Examination
// ============================================================================
export const createExam = async (req: Request, res: Response): Promise<void> => {
  try {
    const { schoolId, userId } = getContext(req);
    if (!schoolId) {
      res.status(401).json({ success: false, message: 'School context required' });
      return;
    }

    const parsed = createExamSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, message: parsed.error.issues[0]?.message || 'Invalid payload' });
      return;
    }

    const {
      name,
      academicSessionId,
      examType,
      classId,
      sectionId,
      term,
      startDate,
      endDate,
      description,
      instructions,
      status,
    } = parsed.data;

    // Verify session belongs to school
    const session = await AcademicSession.findOne({ _id: academicSessionId, schoolId });
    if (!session) {
      res.status(400).json({ success: false, message: 'Academic session not found in this school' });
      return;
    }

    // If classId specified, verify it belongs to school
    if (classId) {
      const cls = await Class.findOne({ _id: classId, schoolId });
      if (!cls) {
        res.status(400).json({ success: false, message: 'Class not found in this school' });
        return;
      }
    }

    // If sectionId specified, verify it belongs to school & class
    if (sectionId && classId) {
      const sec = await Section.findOne({ _id: sectionId, classId, schoolId });
      if (!sec) {
        res.status(400).json({ success: false, message: 'Section not found for the given class' });
        return;
      }
    }

    // Check duplicate exam name within school, session, and class scope
    const duplicateQuery: any = {
      schoolId,
      academicSessionId,
      name: { $regex: `^${name.trim()}$`, $options: 'i' },
      status: { $ne: 'archived' },
    };
    if (classId) {
      duplicateQuery.classId = classId;
    } else {
      duplicateQuery.classId = { $exists: false };
    }

    const existingExam = await Exam.findOne(duplicateQuery);
    if (existingExam) {
      res.status(409).json({
        success: false,
        message: `An examination named "${name}" already exists for this session and class scope.`,
      });
      return;
    }

    const newExam = await Exam.create({
      schoolId,
      academicSessionId,
      name: name.trim(),
      examType,
      classId: classId ? new Types.ObjectId(classId) : undefined,
      sectionId: sectionId ? new Types.ObjectId(sectionId) : undefined,
      term,
      startDate,
      endDate,
      description,
      instructions,
      status: status || 'draft',
      createdBy: userId,
    });

    res.status(201).json({
      success: true,
      message: 'Examination created successfully',
      data: newExam,
    });
  } catch (err: any) {
    logger.error(`Error in createExam: ${err.message}`);
    res.status(500).json({ success: false, message: 'Internal server error creating exam' });
  }
};

// ============================================================================
// 4. Update Examination
// ============================================================================
export const updateExam = async (req: Request, res: Response): Promise<void> => {
  try {
    const { schoolId } = getContext(req);
    const id = String(req.params.id);

    if (!schoolId || !Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: 'Valid School and Exam ID required' });
      return;
    }

    const parsed = updateExamSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, message: parsed.error.issues[0]?.message || 'Invalid payload' });
      return;
    }

    const exam = await Exam.findOne({ _id: id, schoolId });
    if (!exam) {
      res.status(404).json({ success: false, message: 'Examination not found' });
      return;
    }

    // Status transition rules:
    // If exam is published, regular status regression directly to draft is blocked to preserve consistency
    const nextStatus = parsed.data.status;
    if (nextStatus && exam.status === 'published' && nextStatus === 'draft') {
      res.status(400).json({
        success: false,
        message: 'Cannot revert a published examination directly to draft. Use unpublish/archive workflow instead.',
      });
      return;
    }

    // Apply updates
    Object.assign(exam, parsed.data);
    await exam.save();

    res.json({
      success: true,
      message: 'Examination updated successfully',
      data: exam,
    });
  } catch (err: any) {
    logger.error(`Error in updateExam: ${err.message}`);
    res.status(500).json({ success: false, message: 'Internal server error updating exam' });
  }
};

// ============================================================================
// 5. Archive Examination
// ============================================================================
export const archiveExam = async (req: Request, res: Response): Promise<void> => {
  try {
    const { schoolId } = getContext(req);
    const id = String(req.params.id);

    if (!schoolId || !Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: 'Valid School and Exam ID required' });
      return;
    }

    const exam = await Exam.findOneAndUpdate(
      { _id: id, schoolId },
      { $set: { status: 'archived' } },
      { new: true }
    );

    if (!exam) {
      res.status(404).json({ success: false, message: 'Examination not found' });
      return;
    }

    res.json({
      success: true,
      message: 'Examination archived successfully',
      data: exam,
    });
  } catch (err: any) {
    logger.error(`Error in archiveExam: ${err.message}`);
    res.status(500).json({ success: false, message: 'Internal server error archiving exam' });
  }
};

// ============================================================================
// 6. Delete Examination (Strict Safeguards)
// ============================================================================
export const deleteExam = async (req: Request, res: Response): Promise<void> => {
  try {
    const { schoolId } = getContext(req);
    const id = String(req.params.id);

    if (!schoolId || !Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: 'Valid School and Exam ID required' });
      return;
    }

    const exam = await Exam.findOne({ _id: id, schoolId });
    if (!exam) {
      res.status(404).json({ success: false, message: 'Examination not found' });
      return;
    }

    // 1. Prevent deleting published exams
    if (exam.status === 'published') {
      res.status(400).json({
        success: false,
        message: 'Cannot delete a published examination. Archive it to preserve historical report cards.',
      });
      return;
    }

    // 2. Prevent deleting exams with existing student marks
    const markCount = await Mark.countDocuments({ examId: id, schoolId });
    if (markCount > 0) {
      res.status(400).json({
        success: false,
        message: `Cannot delete examination: ${markCount} student marks have already been recorded. Archive it instead.`,
      });
      return;
    }

    // Delete associated exam subjects
    await ExamSubject.deleteMany({ examId: id, schoolId });
    await exam.deleteOne();

    res.json({
      success: true,
      message: 'Examination and schedule entries deleted successfully',
    });
  } catch (err: any) {
    logger.error(`Error in deleteExam: ${err.message}`);
    res.status(500).json({ success: false, message: 'Internal server error deleting exam' });
  }
};

// ============================================================================
// 7. List Exam Subjects
// ============================================================================
export const listExamSubjects = async (req: Request, res: Response): Promise<void> => {
  try {
    const { schoolId, role } = getContext(req);
    const examId = String(req.params.examId);

    if (!schoolId || !Types.ObjectId.isValid(examId)) {
      res.status(400).json({ success: false, message: 'Valid School and Exam ID required' });
      return;
    }

    const exam = await Exam.findOne({ _id: examId, schoolId });
    if (!exam) {
      res.status(404).json({ success: false, message: 'Examination not found' });
      return;
    }

    if ((role === 'student' || role === 'parent') && exam.status !== 'published') {
      res.status(403).json({ success: false, message: 'Results not published yet' });
      return;
    }

    const subjects = await ExamSubject.find({ examId, schoolId })
      .populate('subjectId', 'name code type')
      .populate('classId', 'name code')
      .populate('sectionId', 'name')
      .populate('teacherId', 'employeeId')
      .sort({ examDate: 1, startTime: 1 });

    res.json({
      success: true,
      data: subjects,
      count: subjects.length,
    });
  } catch (err: any) {
    logger.error(`Error in listExamSubjects: ${err.message}`);
    res.status(500).json({ success: false, message: 'Internal server error listing exam subjects' });
  }
};

// ============================================================================
// 8. Create Exam Subject Slot (with Conflict Detection)
// ============================================================================
export const createExamSubject = async (req: Request, res: Response): Promise<void> => {
  try {
    const { schoolId, userId } = getContext(req);
    const examId = String(req.params.examId);

    if (!schoolId || !Types.ObjectId.isValid(examId)) {
      res.status(400).json({ success: false, message: 'Valid School and Exam ID required' });
      return;
    }

    const parsed = createExamSubjectSchema.safeParse({ ...req.body, examId });
    if (!parsed.success) {
      res.status(400).json({ success: false, message: parsed.error.issues[0]?.message || 'Invalid payload' });
      return;
    }

    const {
      classId,
      sectionId,
      subjectId,
      teacherId,
      examDate,
      startTime,
      endTime,
      maxMarks,
      passMarks,
      room,
      instructions,
      status,
    } = parsed.data;

    const exam = await Exam.findOne({ _id: examId, schoolId });
    if (!exam) {
      res.status(404).json({ success: false, message: 'Examination not found' });
      return;
    }

    if (exam.status === 'published') {
      res.status(400).json({
        success: false,
        message: 'Cannot add exam subjects to an already published examination.',
      });
      return;
    }

    // Verify duplicate subject within same exam & class
    const duplicateSubject = await ExamSubject.findOne({
      schoolId,
      examId,
      classId,
      subjectId,
    });
    if (duplicateSubject) {
      res.status(409).json({
        success: false,
        message: 'This subject has already been scheduled for this examination and class.',
      });
      return;
    }

    // Server-side Conflict Detection (Class, Teacher, Room)
    const conflictCheck = await checkExamScheduleConflicts({
      schoolId,
      academicSessionId: exam.academicSessionId,
      classId: new Types.ObjectId(classId),
      sectionId: sectionId ? new Types.ObjectId(sectionId) : undefined,
      examDate,
      startTime,
      endTime,
      teacherId: teacherId ? new Types.ObjectId(teacherId) : undefined,
      room,
    });

    if (conflictCheck.hasConflict) {
      res.status(409).json({
        success: false,
        message: conflictCheck.message,
        conflictType: conflictCheck.conflictType,
        conflictingSubject: conflictCheck.conflictingSubject,
      });
      return;
    }

    const newExamSubject = await ExamSubject.create({
      schoolId,
      examId,
      academicSessionId: exam.academicSessionId,
      classId,
      sectionId,
      subjectId,
      teacherId,
      examDate,
      startTime,
      endTime,
      maxMarks,
      passMarks,
      room,
      instructions,
      status: status || 'scheduled',
      createdBy: userId,
    });

    res.status(201).json({
      success: true,
      message: 'Exam subject scheduled successfully',
      data: newExamSubject,
    });
  } catch (err: any) {
    logger.error(`Error in createExamSubject: ${err.message}`);
    res.status(500).json({ success: false, message: 'Internal server error scheduling exam subject' });
  }
};

// ============================================================================
// 9. Update Exam Subject Slot
// ============================================================================
export const updateExamSubject = async (req: Request, res: Response): Promise<void> => {
  try {
    const { schoolId } = getContext(req);
    const examId = String(req.params.examId);
    const examSubjectId = String(req.params.subjectId);

    if (!schoolId || !Types.ObjectId.isValid(examId) || !Types.ObjectId.isValid(examSubjectId)) {
      res.status(400).json({ success: false, message: 'Valid IDs required' });
      return;
    }

    const parsed = updateExamSubjectSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, message: parsed.error.issues[0]?.message || 'Invalid payload' });
      return;
    }

    const existingSlot = await ExamSubject.findOne({ _id: examSubjectId, examId, schoolId });
    if (!existingSlot) {
      res.status(404).json({ success: false, message: 'Exam subject not found' });
      return;
    }

    // Check conflict if timing/room/teacher changes
    const targetDate = parsed.data.examDate || existingSlot.examDate;
    const targetStart = parsed.data.startTime || existingSlot.startTime;
    const targetEnd = parsed.data.endTime || existingSlot.endTime;
    const targetTeacher =
      parsed.data.teacherId !== undefined
        ? parsed.data.teacherId ? new Types.ObjectId(parsed.data.teacherId) : undefined
        : existingSlot.teacherId;
    const targetRoom = parsed.data.room !== undefined ? (parsed.data.room || undefined) : existingSlot.room;

    const conflictCheck = await checkExamScheduleConflicts({
      schoolId,
      academicSessionId: existingSlot.academicSessionId,
      classId: existingSlot.classId,
      sectionId: existingSlot.sectionId,
      examDate: targetDate,
      startTime: targetStart,
      endTime: targetEnd,
      teacherId: targetTeacher,
      room: targetRoom,
      excludeExamSubjectId: existingSlot._id,
    });

    if (conflictCheck.hasConflict) {
      res.status(409).json({
        success: false,
        message: conflictCheck.message,
        conflictType: conflictCheck.conflictType,
      });
      return;
    }

    Object.assign(existingSlot, parsed.data);
    await existingSlot.save();

    res.json({
      success: true,
      message: 'Exam subject updated successfully',
      data: existingSlot,
    });
  } catch (err: any) {
    logger.error(`Error in updateExamSubject: ${err.message}`);
    res.status(500).json({ success: false, message: 'Internal server error updating exam subject' });
  }
};

// ============================================================================
// 10. Delete Exam Subject Slot
// ============================================================================
export const deleteExamSubject = async (req: Request, res: Response): Promise<void> => {
  try {
    const { schoolId } = getContext(req);
    const examId = String(req.params.examId);
    const examSubjectId = String(req.params.subjectId);

    if (!schoolId || !Types.ObjectId.isValid(examId) || !Types.ObjectId.isValid(examSubjectId)) {
      res.status(400).json({ success: false, message: 'Valid IDs required' });
      return;
    }

    // Check if marks are already recorded
    const markCount = await Mark.countDocuments({ schoolId, examSubjectId });
    if (markCount > 0) {
      res.status(400).json({
        success: false,
        message: `Cannot remove exam subject: ${markCount} student marks are already recorded.`,
      });
      return;
    }

    const deleted = await ExamSubject.findOneAndDelete({ _id: examSubjectId, examId, schoolId });
    if (!deleted) {
      res.status(404).json({ success: false, message: 'Exam subject not found' });
      return;
    }

    res.json({
      success: true,
      message: 'Exam subject removed successfully',
    });
  } catch (err: any) {
    logger.error(`Error in deleteExamSubject: ${err.message}`);
    res.status(500).json({ success: false, message: 'Internal server error deleting exam subject' });
  }
};

// ============================================================================
// 11. Get Eligible Student Roster & Existing Marks
// ============================================================================
export const getSubjectRosterAndMarks = async (req: Request, res: Response): Promise<void> => {
  try {
    const { schoolId, role, userId } = getContext(req);
    const examId = String(req.params.examId);
    const examSubjectId = String(req.params.subjectId);

    if (!schoolId || !Types.ObjectId.isValid(examId) || !Types.ObjectId.isValid(examSubjectId)) {
      res.status(400).json({ success: false, message: 'Valid IDs required' });
      return;
    }

    const examSubject = await ExamSubject.findOne({ _id: examSubjectId, examId, schoolId })
      .populate('subjectId', 'name code')
      .populate('classId', 'name code')
      .populate('sectionId', 'name');

    if (!examSubject) {
      res.status(404).json({ success: false, message: 'Exam subject not found' });
      return;
    }

    // If teacher, verify authorization to grade this subject
    if (role === 'teacher' && userId) {
      const teacherProfile = await Teacher.findOne({ schoolId, userId });
      if (teacherProfile) {
        const isAssignedExaminer =
          examSubject.teacherId && examSubject.teacherId.toString() === teacherProfile._id.toString();

        if (!isAssignedExaminer) {
          const assignment = await SubjectAssignment.findOne({
            schoolId,
            teacherId: teacherProfile._id,
            classId: examSubject.classId,
            subjectId: examSubject.subjectId,
            status: 'active',
          });
          if (!assignment) {
            res.status(403).json({
              success: false,
              message: 'You are not authorized to view or enter marks for this class and subject.',
            });
            return;
          }
        }
      }
    }

    // Query active enrollments for this class (and section if specified)
    const enrollmentQuery: any = {
      schoolId,
      academicSessionId: examSubject.academicSessionId,
      classId: examSubject.classId,
      status: 'enrolled',
    };
    if (examSubject.sectionId) {
      enrollmentQuery.sectionId = examSubject.sectionId;
    }

    const enrollments = await Enrollment.find(enrollmentQuery)
      .populate({
        path: 'studentId',
        select: 'admissionNumber rollNumber gender userId',
        populate: {
          path: 'userId',
          select: 'name firstName lastName',
        },
      })
      .sort({ rollNumber: 1 });

    // Load existing marks
    const marks = await Mark.find({
      schoolId,
      examSubjectId,
    }).lean();

    const markMap = new Map<string, any>();
    for (const m of marks) {
      markMap.set(m.studentId.toString(), m);
    }

    // Build roster
    const roster = enrollments.map((enr: any) => {
      const student = enr.studentId;
      const user = student?.userId;
      const studentName = user?.firstName
        ? `${user.firstName} ${user.lastName || ''}`.trim()
        : user?.name || 'Student';
      const existingMark = student ? markMap.get(student._id.toString()) : undefined;

      return {
        studentId: student?._id,
        enrollmentId: enr._id,
        firstName: user?.firstName,
        lastName: user?.lastName,
        name: studentName,
        admissionNumber: student?.admissionNumber,
        rollNumber: student?.rollNumber || enr.rollNumber,
        markId: existingMark?._id,
        marksObtained: existingMark?.marksObtained,
        percentage: existingMark?.percentage,
        grade: existingMark?.grade,
        isAbsent: existingMark?.isAbsent || false,
        isExempt: existingMark?.isExempt || false,
        remarks: existingMark?.remarks || '',
        publicationStatus: existingMark?.publicationStatus || 'draft',
      };
    });

    res.json({
      success: true,
      data: {
        examSubject,
        roster,
        totalEligible: roster.length,
        maxMarks: examSubject.maxMarks,
        passMarks: examSubject.passMarks,
      },
    });
  } catch (err: any) {
    logger.error(`Error in getSubjectRosterAndMarks: ${err.message}`);
    res.status(500).json({ success: false, message: 'Internal server error fetching roster' });
  }
};

// ============================================================================
// 12. Bulk Save Student Marks (Draft or Submitted)
// ============================================================================
export const bulkSaveMarks = async (req: Request, res: Response): Promise<void> => {
  try {
    const { schoolId, role, userId } = getContext(req);
    const examId = String(req.params.examId);
    const examSubjectId = String(req.params.subjectId);

    if (!schoolId || !userId || !Types.ObjectId.isValid(examId) || !Types.ObjectId.isValid(examSubjectId)) {
      res.status(400).json({ success: false, message: 'Valid IDs required' });
      return;
    }

    const parsed = bulkMarksEntrySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, message: parsed.error.issues[0]?.message || 'Invalid payload' });
      return;
    }

    const { marks, saveAs } = parsed.data;

    const examSubject = await ExamSubject.findOne({ _id: examSubjectId, examId, schoolId });
    if (!examSubject) {
      res.status(404).json({ success: false, message: 'Exam subject not found' });
      return;
    }

    const exam = await Exam.findOne({ _id: examId, schoolId });
    if (!exam) {
      res.status(404).json({ success: false, message: 'Exam not found' });
      return;
    }

    // If exam is published, lock normal bulk entry
    if (exam.status === 'published') {
      res.status(400).json({
        success: false,
        message: 'This examination has already been published. Use the authorized correction workflow to modify published marks.',
      });
      return;
    }

    // Teacher authorization check
    if (role === 'teacher') {
      const teacherProfile = await Teacher.findOne({ schoolId, userId });
      if (teacherProfile) {
        const isExaminer =
          examSubject.teacherId && examSubject.teacherId.toString() === teacherProfile._id.toString();
        if (!isExaminer) {
          const assignment = await SubjectAssignment.findOne({
            schoolId,
            teacherId: teacherProfile._id,
            classId: examSubject.classId,
            subjectId: examSubject.subjectId,
            status: 'active',
          });
          if (!assignment) {
            res.status(403).json({
              success: false,
              message: 'You are not authorized to submit marks for this subject.',
            });
            return;
          }
        }
      }
    }

    // Load active grading scale
    const customScale = await GradingScale.findOne({ schoolId, isDefault: true }).lean();
    const gradeBands = customScale?.bands || DEFAULT_GRADE_BANDS;

    // Validate per-student marks and collect validation errors
    const errors: Array<{ studentId: string; error: string }> = [];
    const validRows: any[] = [];

    for (const item of marks) {
      // 1. If exempt
      if (item.isExempt) {
        validRows.push({
          studentId: item.studentId,
          marksObtained: undefined,
          percentage: undefined,
          grade: 'EX',
          isPassed: true,
          isAbsent: false,
          isExempt: true,
          remarks: item.remarks,
        });
        continue;
      }

      // 2. If absent
      if (item.isAbsent) {
        validRows.push({
          studentId: item.studentId,
          marksObtained: 0,
          percentage: 0,
          grade: 'AB',
          isPassed: false,
          isAbsent: true,
          isExempt: false,
          remarks: item.remarks,
        });
        continue;
      }

      // 3. If scored
      if (item.marksObtained !== undefined && item.marksObtained !== null) {
        if (item.marksObtained < 0) {
          errors.push({ studentId: item.studentId, error: 'Marks cannot be negative' });
          continue;
        }
        if (item.marksObtained > examSubject.maxMarks) {
          errors.push({
            studentId: item.studentId,
            error: `Marks (${item.marksObtained}) cannot exceed maximum marks (${examSubject.maxMarks})`,
          });
          continue;
        }

        const pct = roundPercentage((item.marksObtained / examSubject.maxMarks) * 100);
        const gradeInfo = calculateGradeForPercentage(pct, gradeBands);
        const isPassed = item.marksObtained >= examSubject.passMarks && gradeInfo.isPassing;

        validRows.push({
          studentId: item.studentId,
          marksObtained: item.marksObtained,
          percentage: pct,
          grade: gradeInfo.grade,
          isPassed,
          isAbsent: false,
          isExempt: false,
          remarks: item.remarks,
        });
      } else {
        // Missing marks (leave unentered or clear)
        validRows.push({
          studentId: item.studentId,
          marksObtained: undefined,
          percentage: undefined,
          grade: undefined,
          isPassed: undefined,
          isAbsent: false,
          isExempt: false,
          remarks: item.remarks,
        });
      }
    }

    if (errors.length > 0) {
      res.status(400).json({
        success: false,
        message: 'Some student mark records failed validation',
        errors,
      });
      return;
    }

    // Upsert marks safely
    const savedRecords: any[] = [];
    for (const row of validRows) {
      // Find active enrollment to snapshot enrollmentId
      const enrollment = await Enrollment.findOne({
        schoolId,
        studentId: row.studentId,
        academicSessionId: examSubject.academicSessionId,
        classId: examSubject.classId,
      });

      const updatePayload: any = {
        schoolId,
        examId,
        examSubjectId,
        academicSessionId: examSubject.academicSessionId,
        studentId: row.studentId,
        enrollmentId: enrollment?._id || new Types.ObjectId(),
        maxMarksSnapshot: examSubject.maxMarks,
        marksObtained: row.marksObtained,
        percentage: row.percentage,
        grade: row.grade,
        isPassed: row.isPassed,
        isAbsent: row.isAbsent,
        isExempt: row.isExempt,
        remarks: row.remarks,
        enteredBy: userId,
        publicationStatus: saveAs, // 'draft' | 'submitted'
      };

      const record = await Mark.findOneAndUpdate(
        { schoolId, examSubjectId, studentId: row.studentId },
        { $set: updatePayload },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      savedRecords.push(record);
    }

    res.json({
      success: true,
      message: `Successfully saved ${savedRecords.length} marks records as ${saveAs}.`,
      data: { count: savedRecords.length, status: saveAs },
    });
  } catch (err: any) {
    logger.error(`Error in bulkSaveMarks: ${err.message}`);
    res.status(500).json({ success: false, message: 'Internal server error saving marks' });
  }
};

// ============================================================================
// 13. Verify Marks Completeness & Health
// ============================================================================
export const verifyExamMarks = async (req: Request, res: Response): Promise<void> => {
  try {
    const { schoolId, userId } = getContext(req);
    const examId = String(req.params.examId);

    if (!schoolId || !Types.ObjectId.isValid(examId)) {
      res.status(400).json({ success: false, message: 'Valid School and Exam ID required' });
      return;
    }

    const exam = await Exam.findOne({ _id: examId, schoolId });
    if (!exam) {
      res.status(404).json({ success: false, message: 'Examination not found' });
      return;
    }

    const examSubjects = await ExamSubject.find({ examId, schoolId }).populate('subjectId', 'name code');
    if (examSubjects.length === 0) {
      res.status(400).json({ success: false, message: 'No subjects have been scheduled for this exam yet' });
      return;
    }

    // Find all enrolled students across all scheduled classes
    const classIds = [...new Set(examSubjects.map((es) => es.classId.toString()))];
    const enrollments = await Enrollment.find({
      schoolId,
      academicSessionId: exam.academicSessionId,
      classId: { $in: classIds.map((c) => new Types.ObjectId(c)) },
      status: 'enrolled',
    }).populate({
      path: 'studentId',
      select: 'admissionNumber rollNumber userId',
      populate: {
        path: 'userId',
        select: 'name firstName lastName',
      },
    });

    const marks = await Mark.find({ schoolId, examId }).lean();
    const markKeySet = new Set(
      marks
        .filter((m) => m.marksObtained !== undefined || m.isAbsent || m.isExempt)
        .map((m) => `${m.studentId.toString()}_${m.examSubjectId.toString()}`)
    );

    const missingEntries: any[] = [];
    let completeCount = 0;
    let incompleteCount = 0;

    for (const enr of enrollments) {
      const student: any = enr.studentId;
      if (!student) continue;

      const user = student.userId;
      const studentName = user?.firstName
        ? `${user.firstName} ${user.lastName || ''}`.trim()
        : user?.name || 'Student';

      const applicableSubjects = examSubjects.filter((es) => es.classId.toString() === enr.classId.toString());
      let studentIncomplete = false;

      for (const es of applicableSubjects) {
        const key = `${student._id.toString()}_${es._id.toString()}`;
        if (!markKeySet.has(key)) {
          studentIncomplete = true;
          missingEntries.push({
            studentId: student._id,
            studentName,
            admissionNumber: student.admissionNumber,
            examSubjectId: es._id,
            subjectName: (es.subjectId as any)?.name || 'Subject',
          });
        }
      }

      if (studentIncomplete) incompleteCount++;
      else completeCount++;
    }

    const isReadyForPublication = missingEntries.length === 0;

    // If requested to mark verified
    if (req.body.markAsVerified && isReadyForPublication) {
      await Mark.updateMany(
        { schoolId, examId, publicationStatus: { $in: ['draft', 'submitted'] } },
        { $set: { publicationStatus: 'verified', verifiedBy: userId, verifiedAt: new Date() } }
      );
    }

    res.json({
      success: true,
      data: {
        totalEligibleStudents: enrollments.length,
        completeCount,
        incompleteCount,
        isReadyForPublication,
        missingEntriesCount: missingEntries.length,
        missingEntries: missingEntries.slice(0, 50), // Show up to first 50
      },
    });
  } catch (err: any) {
    logger.error(`Error in verifyExamMarks: ${err.message}`);
    res.status(500).json({ success: false, message: 'Internal server error verifying marks' });
  }
};

// ============================================================================
// 14. Publish Examination Results
// ============================================================================
export const publishExamResults = async (req: Request, res: Response): Promise<void> => {
  try {
    const { schoolId, userId } = getContext(req);
    const examId = String(req.params.examId);

    if (!schoolId || !userId || !Types.ObjectId.isValid(examId)) {
      res.status(400).json({ success: false, message: 'Valid School and Exam ID required' });
      return;
    }

    const exam = await Exam.findOne({ _id: examId, schoolId });
    if (!exam) {
      res.status(404).json({ success: false, message: 'Examination not found' });
      return;
    }

    if (exam.status === 'published') {
      res.status(400).json({ success: false, message: 'This examination is already published' });
      return;
    }

    const examSubjects = await ExamSubject.find({ examId, schoolId });
    if (examSubjects.length === 0) {
      res.status(400).json({ success: false, message: 'Cannot publish exam with no scheduled subjects' });
      return;
    }

    // Verify completeness: ensure no eligible enrolled student has missing marks
    const classIds = [...new Set(examSubjects.map((es) => es.classId.toString()))];
    const enrollments = await Enrollment.find({
      schoolId,
      academicSessionId: exam.academicSessionId,
      classId: { $in: classIds.map((c) => new Types.ObjectId(c)) },
      status: 'enrolled',
    });

    const marks = await Mark.find({ schoolId, examId }).lean();
    const markKeySet = new Set(
      marks
        .filter((m) => m.marksObtained !== undefined || m.isAbsent || m.isExempt)
        .map((m) => `${m.studentId.toString()}_${m.examSubjectId.toString()}`)
    );

    for (const enr of enrollments) {
      const applicableSubjects = examSubjects.filter((es) => es.classId.toString() === enr.classId.toString());
      for (const es of applicableSubjects) {
        const key = `${enr.studentId.toString()}_${es._id.toString()}`;
        if (!markKeySet.has(key)) {
          res.status(400).json({
            success: false,
            message: 'Cannot publish examination results with incomplete marks. All eligible students must have marks entered, or be marked absent/exempt.',
          });
          return;
        }
      }
    }

    // Lock all marks: set publicationStatus to 'published'
    await Mark.updateMany(
      { schoolId, examId },
      { $set: { publicationStatus: 'published', verifiedBy: userId, verifiedAt: new Date() } }
    );

    // Update exam status to published
    exam.status = 'published';
    exam.publishedBy = userId;
    exam.publishedAt = new Date();
    await exam.save();

    res.json({
      success: true,
      message: 'Examination results successfully published and locked.',
      data: exam,
    });
  } catch (err: any) {
    logger.error(`Error in publishExamResults: ${err.message}`);
    res.status(500).json({ success: false, message: 'Internal server error publishing exam' });
  }
};

// ============================================================================
// 15. Post-Publication Authorized Mark Correction
// ============================================================================
export const correctMark = async (req: Request, res: Response): Promise<void> => {
  try {
    const { schoolId, userId } = getContext(req);
    const markId = String(req.params.markId);

    if (!schoolId || !userId || !Types.ObjectId.isValid(markId)) {
      res.status(400).json({ success: false, message: 'Valid School and Mark ID required' });
      return;
    }

    const parsed = correctMarkSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, message: parsed.error.issues[0]?.message || 'Invalid correction payload' });
      return;
    }

    const { marksObtained, isAbsent, isExempt, reason, remarks } = parsed.data;

    const mark = await Mark.findOne({ _id: markId, schoolId });
    if (!mark) {
      res.status(404).json({ success: false, message: 'Mark record not found' });
      return;
    }

    const examSubject = await ExamSubject.findOne({ _id: mark.examSubjectId, schoolId });
    if (!examSubject) {
      res.status(404).json({ success: false, message: 'Associated exam subject not found' });
      return;
    }

    if (marksObtained !== undefined && marksObtained !== null) {
      if (marksObtained < 0 || marksObtained > examSubject.maxMarks) {
        res.status(400).json({
          success: false,
          message: `Marks obtained must be between 0 and ${examSubject.maxMarks}`,
        });
        return;
      }
    }

    // Load grading scale
    const customScale = await GradingScale.findOne({ schoolId, isDefault: true }).lean();
    const gradeBands = customScale?.bands || DEFAULT_GRADE_BANDS;

    // Snapshot audit history
    const previousMarks = mark.marksObtained;
    const previousStatus = mark.publicationStatus;

    if (!mark.correctionHistory) {
      mark.correctionHistory = [];
    }
    mark.correctionHistory.push({
      correctedBy: userId,
      previousMarks,
      newMarks: marksObtained ?? undefined,
      previousStatus,
      newStatus: mark.publicationStatus,
      reason: reason.trim(),
      correctedAt: new Date(),
    });

    // Update marks
    if (isExempt) {
      mark.isExempt = true;
      mark.isAbsent = false;
      mark.marksObtained = undefined;
      mark.percentage = undefined;
      mark.grade = 'EX';
      mark.isPassed = true;
    } else if (isAbsent) {
      mark.isAbsent = true;
      mark.isExempt = false;
      mark.marksObtained = 0;
      mark.percentage = 0;
      mark.grade = 'AB';
      mark.isPassed = false;
    } else if (marksObtained !== undefined && marksObtained !== null) {
      mark.isAbsent = false;
      mark.isExempt = false;
      mark.marksObtained = marksObtained;
      const pct = roundPercentage((marksObtained / examSubject.maxMarks) * 100);
      mark.percentage = pct;
      const gradeInfo = calculateGradeForPercentage(pct, gradeBands);
      mark.grade = gradeInfo.grade;
      mark.isPassed = marksObtained >= examSubject.passMarks && gradeInfo.isPassing;
    }

    if (remarks) mark.remarks = remarks;
    await mark.save();

    res.json({
      success: true,
      message: 'Mark corrected and audit history updated successfully',
      data: mark,
    });
  } catch (err: any) {
    logger.error(`Error in correctMark: ${err.message}`);
    res.status(500).json({ success: false, message: 'Internal server error correcting mark' });
  }
};

// ============================================================================
// 16. Student Report Card (Role & Ward Authorized)
// ============================================================================
export const getStudentReportCard = async (req: Request, res: Response): Promise<void> => {
  try {
    const { schoolId, role, userId } = getContext(req);
    const examId = String(req.params.examId);
    const studentId = String(req.params.studentId);

    if (!schoolId || !Types.ObjectId.isValid(examId) || !Types.ObjectId.isValid(studentId)) {
      res.status(400).json({ success: false, message: 'Valid IDs required' });
      return;
    }

    const exam = await Exam.findOne({ _id: examId, schoolId }).populate('academicSessionId', 'name isCurrent');
    if (!exam) {
      res.status(404).json({ success: false, message: 'Examination not found' });
      return;
    }

    // Role checks
    if (role === 'student' && userId) {
      if (exam.status !== 'published') {
        res.status(403).json({ success: false, message: 'Results for this examination have not been published yet' });
        return;
      }
      const studentProfile = await Student.findOne({ schoolId, userId });
      if (!studentProfile || studentProfile._id.toString() !== studentId) {
        res.status(403).json({ success: false, message: 'Unauthorized: You can only view your own report card' });
        return;
      }
    } else if (role === 'parent' && userId) {
      if (exam.status !== 'published') {
        res.status(403).json({ success: false, message: 'Results for this examination have not been published yet' });
        return;
      }
      const parentProfile = await Parent.findOne({ schoolId, userId });
      const isWard = parentProfile?.children?.some((child) => child.studentProfileId.toString() === studentId);
      if (!isWard) {
        res.status(403).json({ success: false, message: 'Unauthorized: This student is not registered under your parent account' });
        return;
      }
    }

    const student = await Student.findOne({ _id: studentId, schoolId }).populate<{ userId: any }>('userId');
    if (!student) {
      res.status(404).json({ success: false, message: 'Student not found' });
      return;
    }

    const user = student.userId;
    const studentName = user?.firstName
      ? `${user.firstName} ${user.lastName || ''}`.trim()
      : user?.name || 'Student';

    const enrollment = await Enrollment.findOne({
      schoolId,
      studentId,
      academicSessionId: exam.academicSessionId,
    })
      .populate('classId', 'name code')
      .populate('sectionId', 'name');

    const school = await School.findById(schoolId);

    // Fetch exam subjects for this student's class
    const examSubjects = await ExamSubject.find({
      examId,
      schoolId,
      classId: enrollment?.classId?._id || exam.classId,
    })
      .populate('subjectId', 'name code')
      .sort({ examDate: 1, startTime: 1 });

    const marks = await Mark.find({
      schoolId,
      examId,
      studentId,
    }).lean();

    const customScale = await GradingScale.findOne({ schoolId, isDefault: true }).lean();
    const gradeBands = customScale?.bands || DEFAULT_GRADE_BANDS;

    const studentResult = calculateStudentExamResult(
      studentId,
      examSubjects,
      marks as any[],
      gradeBands,
      {
        name: studentName,
        admissionNumber: student.admissionNumber,
        rollNumber: student.rollNumber || enrollment?.rollNumber,
        classId: (enrollment?.classId as any)?.name,
        sectionId: (enrollment?.sectionId as any)?.name,
      }
    );

    // Populate subject names in subjectResults
    for (const sr of studentResult.subjectResults) {
      const match = examSubjects.find((es) => es._id.toString() === sr.examSubjectId);
      if (match) {
        sr.subjectName = (match.subjectId as any)?.name || 'Subject';
        sr.subjectCode = (match.subjectId as any)?.code || '';
      }
    }

    res.json({
      success: true,
      data: {
        school: {
          name: school?.name || 'School Management System',
          address: school?.address,
          email: school?.email,
          phone: school?.phone,
          logoUrl: school?.logo,
        },
        student: {
          id: student._id,
          name: studentName,
          admissionNumber: student.admissionNumber,
          rollNumber: student.rollNumber || enrollment?.rollNumber,
          className: (enrollment?.classId as any)?.name || 'N/A',
          sectionName: (enrollment?.sectionId as any)?.name || 'N/A',
        },
        exam: {
          id: exam._id,
          name: exam.name,
          term: exam.term,
          startDate: exam.startDate,
          endDate: exam.endDate,
          status: exam.status,
          publishedAt: exam.publishedAt,
          academicSessionName: (exam.academicSessionId as any)?.name || 'Current Session',
        },
        result: studentResult,
      },
    });
  } catch (err: any) {
    logger.error(`Error in getStudentReportCard: ${err.message}`);
    res.status(500).json({ success: false, message: 'Internal server error generating report card' });
  }
};

// ============================================================================
// 17. Class Performance Analytics
// ============================================================================
export const getExamClassAnalytics = async (req: Request, res: Response): Promise<void> => {
  try {
    const { schoolId } = getContext(req);
    const examId = String(req.params.examId);

    if (!schoolId || !Types.ObjectId.isValid(examId)) {
      res.status(400).json({ success: false, message: 'Valid School and Exam ID required' });
      return;
    }

    const exam = await Exam.findOne({ _id: examId, schoolId });
    if (!exam) {
      res.status(404).json({ success: false, message: 'Examination not found' });
      return;
    }

    const examSubjects = await ExamSubject.find({ examId, schoolId })
      .populate('subjectId', 'name code')
      .sort({ examDate: 1 });

    const classIds = [...new Set(examSubjects.map((es) => es.classId.toString()))];
    const enrollments = await Enrollment.find({
      schoolId,
      academicSessionId: exam.academicSessionId,
      classId: { $in: classIds.map((c) => new Types.ObjectId(c)) },
      status: 'enrolled',
    }).populate({
      path: 'studentId',
      select: 'admissionNumber rollNumber userId',
      populate: {
        path: 'userId',
        select: 'name firstName lastName',
      },
    });

    const marks = await Mark.find({ schoolId, examId }).lean();
    const customScale = await GradingScale.findOne({ schoolId, isDefault: true }).lean();
    const gradeBands = customScale?.bands || DEFAULT_GRADE_BANDS;

    const studentResults = enrollments.map((enr: any) => {
      const student = enr.studentId;
      const user = student?.userId;
      const studentName = user?.firstName
        ? `${user.firstName} ${user.lastName || ''}`.trim()
        : user?.name || 'Unknown';

      return calculateStudentExamResult(
        student?._id?.toString() || enr._id.toString(),
        examSubjects.filter((es) => es.classId.toString() === enr.classId.toString()),
        marks as any[],
        gradeBands,
        {
          name: studentName,
          admissionNumber: student?.admissionNumber,
          rollNumber: student?.rollNumber || enr.rollNumber,
        }
      );
    });

    const analytics = calculateClassAnalytics(examId, examSubjects, studentResults);

    res.json({
      success: true,
      data: {
        analytics,
        studentResults,
      },
    });
  } catch (err: any) {
    logger.error(`Error in getExamClassAnalytics: ${err.message}`);
    res.status(500).json({ success: false, message: 'Internal server error computing analytics' });
  }
};

// ============================================================================
// 18. Export Class Results as CSV (Formula-Safe)
// ============================================================================
export const exportExamResultsCsv = async (req: Request, res: Response): Promise<void> => {
  try {
    const { schoolId } = getContext(req);
    const examId = String(req.params.examId);

    if (!schoolId || !Types.ObjectId.isValid(examId)) {
      res.status(400).json({ success: false, message: 'Valid School and Exam ID required' });
      return;
    }

    const exam = await Exam.findOne({ _id: examId, schoolId });
    if (!exam) {
      res.status(404).json({ success: false, message: 'Examination not found' });
      return;
    }

    const examSubjects = await ExamSubject.find({ examId, schoolId }).populate('subjectId', 'name code');
    const classIds = [...new Set(examSubjects.map((es) => es.classId.toString()))];
    const enrollments = await Enrollment.find({
      schoolId,
      academicSessionId: exam.academicSessionId,
      classId: { $in: classIds.map((c) => new Types.ObjectId(c)) },
      status: 'enrolled',
    }).populate({
      path: 'studentId',
      select: 'admissionNumber rollNumber userId',
      populate: {
        path: 'userId',
        select: 'name firstName lastName',
      },
    });

    const marks = await Mark.find({ schoolId, examId }).lean();
    const customScale = await GradingScale.findOne({ schoolId, isDefault: true }).lean();
    const gradeBands = customScale?.bands || DEFAULT_GRADE_BANDS;

    const studentResults = enrollments.map((enr: any) => {
      const student = enr.studentId;
      const user = student?.userId;
      const studentName = user?.firstName
        ? `${user.firstName} ${user.lastName || ''}`.trim()
        : user?.name || 'Unknown';

      return calculateStudentExamResult(
        student?._id?.toString() || enr._id.toString(),
        examSubjects.filter((es) => es.classId.toString() === enr.classId.toString()),
        marks as any[],
        gradeBands,
        {
          name: studentName,
          admissionNumber: student?.admissionNumber,
          rollNumber: student?.rollNumber || enr.rollNumber,
        }
      );
    });

    // Build CSV Headers
    const headers = ['Admission No', 'Student Name', 'Roll No'];
    for (const es of examSubjects) {
      headers.push(`${(es.subjectId as any)?.name || 'Subject'} (${es.maxMarks})`);
    }
    headers.push('Total Obtained', 'Total Max', 'Percentage', 'Grade', 'Result');

    // Build CSV Rows
    const rows: (string | number | boolean | null | undefined)[][] = [];
    for (const sr of studentResults) {
      const row: (string | number | boolean | null | undefined)[] = [
        sr.admissionNumber || '',
        sr.studentName || '',
        sr.rollNumber || '',
      ];

      for (const es of examSubjects) {
        const subResult = sr.subjectResults.find((s) => s.examSubjectId === es._id.toString());
        if (subResult?.status === 'EXEMPT') {
          row.push('EXEMPT');
        } else if (subResult?.status === 'ABSENT') {
          row.push('ABSENT');
        } else if (subResult?.status === 'SCORED' && subResult.marksObtained !== undefined) {
          row.push(subResult.marksObtained);
        } else {
          row.push('MISSING');
        }
      }

      row.push(
        sr.totalMarksObtained,
        sr.totalMaxMarks,
        `${sr.overallPercentage}%`,
        sr.overallGrade,
        sr.overallResult
      );
      rows.push(row);
    }

    const csvContent = buildCsvString(headers, rows);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="results-${exam.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}.csv"`
    );
    res.status(200).send(csvContent);
  } catch (err: any) {
    logger.error(`Error in exportExamResultsCsv: ${err.message}`);
    res.status(500).json({ success: false, message: 'Internal server error exporting results' });
  }
};

// ============================================================================
// 19. Grading Scale Management
// ============================================================================
export const listGradingScales = async (req: Request, res: Response): Promise<void> => {
  try {
    const { schoolId } = getContext(req);
    if (!schoolId) {
      res.status(401).json({ success: false, message: 'School context required' });
      return;
    }

    const scales = await GradingScale.find({ schoolId }).sort({ isDefault: -1, createdAt: -1 });

    res.json({
      success: true,
      data: scales.length > 0 ? scales : [{ name: 'Default Standard Scale', isDefault: true, bands: DEFAULT_GRADE_BANDS }],
    });
  } catch (err: any) {
    logger.error(`Error in listGradingScales: ${err.message}`);
    res.status(500).json({ success: false, message: 'Internal server error listing grading scales' });
  }
};

export const createGradingScale = async (req: Request, res: Response): Promise<void> => {
  try {
    const { schoolId } = getContext(req);
    if (!schoolId) {
      res.status(401).json({ success: false, message: 'School context required' });
      return;
    }

    const parsed = createGradingScaleSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, message: parsed.error.issues[0]?.message || 'Invalid payload' });
      return;
    }

    const { name, description, isDefault, bands } = parsed.data;

    // Validate bands
    const bandValidation = validateGradingBands(bands);
    if (!bandValidation.isValid) {
      res.status(400).json({ success: false, message: bandValidation.error });
      return;
    }

    if (isDefault) {
      await GradingScale.updateMany({ schoolId }, { $set: { isDefault: false } });
    }

    const scale = await GradingScale.create({
      schoolId,
      name: name.trim(),
      description,
      isDefault: isDefault ?? false,
      bands,
    });

    res.status(201).json({
      success: true,
      message: 'Grading scale configured successfully',
      data: scale,
    });
  } catch (err: any) {
    logger.error(`Error in createGradingScale: ${err.message}`);
    res.status(500).json({ success: false, message: 'Internal server error creating grading scale' });
  }
};
