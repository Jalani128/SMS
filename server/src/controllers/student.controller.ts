import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import mongoose, { Types } from 'mongoose';
import { Student, IStudent } from '../models/Student.model.js';
import { User, IUser } from '../models/User.model.js';
import { Enrollment } from '../models/Enrollment.model.js';
import { Class } from '../models/Class.model.js';
import { Section } from '../models/Section.model.js';
import { AcademicSession } from '../models/AcademicSession.model.js';
import { Parent } from '../models/Parent.model.js';
import { ApiError } from '../utils/apiError.js';
import { ApiResponse } from '../utils/apiResponse.js';

/**
 * Generate a unique admission number within the school tenant
 */
export const generateAdmissionNumber = async (schoolId: Types.ObjectId | string): Promise<string> => {
  const year = new Date().getFullYear();
  const count = await Student.countDocuments({ schoolId });
  let candidate = `ADM-${year}-${String(count + 1).padStart(4, '0')}`;
  
  // Guard against collisions if records were previously deleted or customized
  let exists = await Student.findOne({ schoolId, admissionNumber: candidate });
  let offset = 1;
  while (exists) {
    candidate = `ADM-${year}-${String(count + 1 + offset).padStart(4, '0')}`;
    exists = await Student.findOne({ schoolId, admissionNumber: candidate });
    offset++;
  }
  return candidate;
};

/**
 * GET /api/v1/students
 * List students with server-side pagination, search, and filtering
 */
export const getStudents = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const schoolId = req.schoolId;
    if (!schoolId) {
      return next(ApiError.forbidden('School tenant context required'));
    }

    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 10));
    const skip = (page - 1) * limit;

    const query: Record<string, any> = { schoolId };

    if (req.query.status) {
      query.status = req.query.status;
    }
    if (req.query.classId) {
      query.currentClassId = req.query.classId;
    }
    if (req.query.sectionId) {
      query.currentSectionId = req.query.sectionId;
    }
    if (req.query.academicSessionId) {
      query.currentSessionId = req.query.academicSessionId;
    }
    if (req.query.gender) {
      query.gender = req.query.gender;
    }

    // Search query matching admissionNumber, rollNumber, or User name/email
    const search = (req.query.search as string)?.trim();
    if (search) {
      const matchingUsers = await User.find({
        schoolId,
        role: 'student',
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { firstName: { $regex: search, $options: 'i' } },
          { lastName: { $regex: search, $options: 'i' } },
        ],
      }).select('_id');

      const userIds = matchingUsers.map((u) => u._id);

      query.$or = [
        { admissionNumber: { $regex: search, $options: 'i' } },
        { rollNumber: { $regex: search, $options: 'i' } },
        { userId: { $in: userIds } },
      ];
    }

    const [students, total] = await Promise.all([
      Student.find(query)
        .populate('userId', 'name firstName lastName email phone avatarUrl isActive')
        .populate('currentClassId', 'name code')
        .populate('currentSectionId', 'name code')
        .populate('currentSessionId', 'name code isCurrent')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Student.countDocuments(query),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    ApiResponse.success(
      res,
      {
        students,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      },
      'Students retrieved successfully'
    );
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/students/next-admission-number
 * Helper endpoint for previewing the next available admission number
 */
export const getNextAdmissionNumber = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const schoolId = req.schoolId;
    if (!schoolId) {
      return next(ApiError.forbidden('School tenant context required'));
    }
    const nextAdmissionNumber = await generateAdmissionNumber(schoolId);
    ApiResponse.success(res, { nextAdmissionNumber }, 'Next admission number generated');
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/students/:id
 * Retrieve single student profile with full enrollment history and guardian details
 */
export const getStudentById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const schoolId = req.schoolId;

    const student = await Student.findOne({ _id: id, schoolId })
      .populate('userId', 'name firstName lastName email phone avatarUrl isActive createdAt')
      .populate('currentClassId', 'name code')
      .populate('currentSectionId', 'name code')
      .populate('currentSessionId', 'name code startDate endDate isCurrent')
      .populate({
        path: 'guardians.parentProfileId',
        populate: { path: 'userId', select: 'name email phone avatarUrl' },
      });

    if (!student) {
      return next(ApiError.notFound('Student not found'));
    }

    // Fetch full enrollment history for profile view
    const enrollments = await Enrollment.find({ studentId: student._id, schoolId })
      .populate('classId', 'name code')
      .populate('sectionId', 'name code')
      .populate('academicSessionId', 'name code isCurrent')
      .sort({ createdAt: -1 });

    const studentData: any = student.toObject();
    studentData.enrollments = enrollments;

    // Administrative notes restricted to admin staff
    if (req.user?.role !== 'admin' && req.user?.role !== 'super_admin') {
      delete studentData.adminNotes;
    }

    ApiResponse.success(res, studentData, 'Student profile retrieved');
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/students
 * Admin enrolls new student (Creates User account + Student profile + initial Enrollment)
 */
export const createStudent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  let createdUser: IUser | null = null;

  try {
    const schoolId = req.schoolId;
    if (!schoolId) {
      return next(ApiError.forbidden('School tenant context required'));
    }

    const {
      firstName,
      lastName,
      email,
      phone,
      avatarUrl,
      admissionNumber: customAdmissionNumber,
      rollNumber,
      dateOfBirth,
      gender,
      bloodGroup,
      medicalNotes,
      adminNotes,
      address,
      admissionDate,
      emergencyContact,
      classId,
      sectionId,
      academicSessionId,
      parentProfileId,
      parentRelationship,
      isPrimaryGuardian,
    } = req.body;

    const normalizedEmail = email.toLowerCase().trim();

    // 1. Check duplicate User email within school
    const existingUser = await User.findOne({ schoolId, email: normalizedEmail });
    if (existingUser) {
      return next(ApiError.conflict(`A user with email '${normalizedEmail}' already exists in this school.`));
    }

    // 2. Validate or generate admissionNumber
    let admissionNumber = customAdmissionNumber?.trim().toUpperCase();
    if (admissionNumber) {
      const existingAdm = await Student.findOne({ schoolId, admissionNumber });
      if (existingAdm) {
        return next(ApiError.conflict(`Admission number '${admissionNumber}' is already in use at this school.`));
      }
    } else {
      admissionNumber = await generateAdmissionNumber(schoolId);
    }

    // 3. Validate referenced Class, Section, and AcademicSession if provided
    if (classId) {
      const cls = await Class.findOne({ _id: classId, schoolId });
      if (!cls) return next(ApiError.badRequest('Referenced Class not found in this school'));
    }
    if (sectionId) {
      const sec = await Section.findOne({ _id: sectionId, schoolId });
      if (!sec) return next(ApiError.badRequest('Referenced Section not found in this school'));
    }
    if (academicSessionId) {
      const sess = await AcademicSession.findOne({ _id: academicSessionId, schoolId });
      if (!sess) return next(ApiError.badRequest('Referenced Academic Session not found in this school'));
    }

    // 4. Create User account with server-assigned 'student' role and high-entropy initial hash
    const randomSecret = crypto.randomBytes(32).toString('hex');
    const initialPasswordHash = await (User as any).hashPassword(randomSecret);

    createdUser = await User.create({
      name: `${firstName} ${lastName}`.trim(),
      firstName,
      lastName,
      email: normalizedEmail,
      phone,
      avatarUrl,
      role: 'student',
      schoolId: new Types.ObjectId(schoolId),
      isActive: true,
      emailVerified: false,
      passwordHash: initialPasswordHash,
    });

    // 5. Build guardians array if parentProfileId is supplied
    const guardians: any[] = [];
    let parentDoc: any = null;
    if (parentProfileId) {
      parentDoc = await Parent.findOne({ _id: parentProfileId, schoolId });
      if (!parentDoc) {
        throw ApiError.badRequest('Referenced Parent profile not found in this school');
      }
      guardians.push({
        parentProfileId: parentDoc._id,
        userId: parentDoc.userId,
        relationship: parentRelationship || 'guardian',
        isPrimary: isPrimaryGuardian ?? true,
        canPickup: true,
      });
    }

    // 6. Create Student Profile
    const student = await Student.create({
      userId: createdUser._id,
      schoolId: new Types.ObjectId(schoolId),
      admissionNumber,
      rollNumber,
      currentClassId: classId ? new Types.ObjectId(classId) : undefined,
      currentSectionId: sectionId ? new Types.ObjectId(sectionId) : undefined,
      currentSessionId: academicSessionId ? new Types.ObjectId(academicSessionId) : undefined,
      dateOfBirth,
      gender: gender || 'prefer_not_to_say',
      bloodGroup: bloodGroup || 'unknown',
      medicalNotes,
      adminNotes,
      address,
      admissionDate: admissionDate || new Date(),
      emergencyContact,
      guardians,
      status: 'active',
    });

    // 7. Create initial Enrollment if academic details are present
    if (classId && sectionId && academicSessionId) {
      await Enrollment.create({
        schoolId: new Types.ObjectId(schoolId),
        studentId: student._id,
        academicSessionId: new Types.ObjectId(academicSessionId),
        classId: new Types.ObjectId(classId),
        sectionId: new Types.ObjectId(sectionId),
        rollNumber,
        enrollmentDate: admissionDate || new Date(),
        status: 'enrolled',
      });
    }

    // 8. Bidirectional link: Update Parent's children list
    if (parentDoc) {
      const alreadyLinked = parentDoc.children.some(
        (c: any) => c.studentProfileId.toString() === student._id.toString()
      );
      if (!alreadyLinked) {
        parentDoc.children.push({
          studentProfileId: student._id,
          relationship: parentRelationship || 'guardian',
          isPrimary: isPrimaryGuardian ?? true,
        });
        await parentDoc.save();
      }
    }

    const populatedStudent = await Student.findById(student._id)
      .populate('userId', 'name firstName lastName email phone avatarUrl isActive')
      .populate('currentClassId', 'name code')
      .populate('currentSectionId', 'name code')
      .populate('currentSessionId', 'name code isCurrent');

    ApiResponse.created(res, populatedStudent, 'Student admitted and profile created successfully');
  } catch (error) {
    // Rollback created user if subsequent profile step fails
    if (createdUser && createdUser._id) {
      await User.findByIdAndDelete(createdUser._id).catch(() => {});
    }
    next(error);
  }
};

/**
 * PATCH /api/v1/students/:id
 * Update student demographic, academic, or administrative details
 */
export const updateStudent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const schoolId = req.schoolId;

    const student = await Student.findOne({ _id: id, schoolId });
    if (!student) {
      return next(ApiError.notFound('Student not found'));
    }

    const {
      firstName,
      lastName,
      email,
      phone,
      avatarUrl,
      rollNumber,
      dateOfBirth,
      gender,
      bloodGroup,
      medicalNotes,
      adminNotes,
      address,
      emergencyContact,
      status,
    } = req.body;

    // Update User account fields if present
    if (firstName || lastName || email || phone || avatarUrl !== undefined) {
      const user = await User.findById(student.userId);
      if (user) {
        if (email && email.toLowerCase().trim() !== user.email) {
          const emailExists = await User.findOne({
            schoolId,
            email: email.toLowerCase().trim(),
            _id: { $ne: user._id },
          });
          if (emailExists) {
            return next(ApiError.conflict('Email is already registered to another account in this school'));
          }
          user.email = email.toLowerCase().trim();
        }
        if (firstName) user.firstName = firstName;
        if (lastName) user.lastName = lastName;
        if (firstName || lastName) {
          user.name = `${user.firstName || ''} ${user.lastName || ''}`.trim();
        }
        if (phone !== undefined) user.phone = phone;
        if (avatarUrl !== undefined) user.avatarUrl = avatarUrl;
        await user.save();
      }
    }

    // Update Student fields
    if (rollNumber !== undefined) student.rollNumber = rollNumber;
    if (dateOfBirth !== undefined) student.dateOfBirth = dateOfBirth;
    if (gender !== undefined) student.gender = gender;
    if (bloodGroup !== undefined) student.bloodGroup = bloodGroup;
    if (medicalNotes !== undefined) student.medicalNotes = medicalNotes;
    if (adminNotes !== undefined) student.adminNotes = adminNotes;
    if (address !== undefined) student.address = address;
    if (emergencyContact !== undefined) student.emergencyContact = emergencyContact;
    if (status !== undefined) student.status = status;

    await student.save();

    const updated = await Student.findById(student._id)
      .populate('userId', 'name firstName lastName email phone avatarUrl isActive')
      .populate('currentClassId', 'name code')
      .populate('currentSectionId', 'name code')
      .populate('currentSessionId', 'name code isCurrent');

    ApiResponse.success(res, updated, 'Student profile updated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/v1/students/:id/archive
 * Soft-archive student profile without destroying academic/financial records
 */
export const archiveStudent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const schoolId = req.schoolId;
    const { reason, status = 'inactive' } = req.body;

    const student = await Student.findOne({ _id: id, schoolId });
    if (!student) {
      return next(ApiError.notFound('Student not found'));
    }

    student.status = status;
    const archiveTimestamp = new Date().toISOString();
    const note = `[Archived on ${archiveTimestamp} by ${req.user?.userId}]: ${reason || 'Administrative status change'}`;
    student.adminNotes = student.adminNotes ? `${student.adminNotes}\n${note}` : note;
    await student.save();

    // Deactivate corresponding user account so student cannot log in
    if (student.userId) {
      await User.findByIdAndUpdate(student.userId, { isActive: false });
    }

    ApiResponse.success(
      res,
      {
        studentId: student._id,
        status: student.status,
        archivedAt: archiveTimestamp,
      },
      'Student profile archived successfully. Historical attendance, fees, and marks preserved.'
    );
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/students/:id/enrollments
 * Record a new or updated academic session enrollment for a student
 */
export const createStudentEnrollment = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const schoolId = req.schoolId;
    const { academicSessionId, classId, sectionId, rollNumber, remarks } = req.body;

    const student = await Student.findOne({ _id: id, schoolId });
    if (!student) {
      return next(ApiError.notFound('Student not found'));
    }

    // Verify tenant boundaries for class, section, session
    const [cls, sec, sess] = await Promise.all([
      Class.findOne({ _id: classId, schoolId }),
      Section.findOne({ _id: sectionId, schoolId }),
      AcademicSession.findOne({ _id: academicSessionId, schoolId }),
    ]);

    if (!cls) return next(ApiError.badRequest('Referenced Class does not belong to this school'));
    if (!sec) return next(ApiError.badRequest('Referenced Section does not belong to this school'));
    if (!sess) return next(ApiError.badRequest('Referenced Academic Session does not belong to this school'));

    // Check if enrollment exists for this session
    let enrollment = await Enrollment.findOne({
      schoolId,
      studentId: student._id,
      academicSessionId,
    });

    if (enrollment) {
      enrollment.classId = new Types.ObjectId(classId);
      enrollment.sectionId = new Types.ObjectId(sectionId);
      if (rollNumber !== undefined) enrollment.rollNumber = rollNumber;
      if (remarks !== undefined) enrollment.remarks = remarks;
      await enrollment.save();
    } else {
      enrollment = await Enrollment.create({
        schoolId: new Types.ObjectId(schoolId),
        studentId: student._id,
        academicSessionId: new Types.ObjectId(academicSessionId),
        classId: new Types.ObjectId(classId),
        sectionId: new Types.ObjectId(sectionId),
        rollNumber,
        remarks,
        status: 'enrolled',
      });
    }

    // Update current active pointers on student document
    student.currentSessionId = new Types.ObjectId(academicSessionId);
    student.currentClassId = new Types.ObjectId(classId);
    student.currentSectionId = new Types.ObjectId(sectionId);
    if (rollNumber) student.rollNumber = rollNumber;
    await student.save();

    const populatedEnrollment = await Enrollment.findById(enrollment._id)
      .populate('classId', 'name code')
      .populate('sectionId', 'name code')
      .populate('academicSessionId', 'name code isCurrent');

    ApiResponse.created(res, populatedEnrollment, 'Student enrollment recorded successfully');
  } catch (error) {
    next(error);
  }
};
