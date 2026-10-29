import { Types } from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import {
  School,
  SchoolSettings,
  SchoolOnboarding,
  ImportHistory,
  AcademicSession,
  Class,
  Section,
  Subject,
  Teacher,
  Student,
  Parent,
  Enrollment,
  User,
  OTPVerification,
  AuditLog,
  IImportRowError,
} from '../models/index.js';
import { parseCsvString, sanitizeCsvFilename } from '../utils/csvParser.util.js';
import { buildCsvString, sanitizeCsvCell } from '../utils/csvExport.util.js';
import { ApiError } from '../utils/apiError.js';
import { logger } from '../utils/logger.js';

export interface OnboardingCounts {
  sessionsCount: number;
  classesCount: number;
  sectionsCount: number;
  subjectsCount: number;
  teachersCount: number;
  studentsCount: number;
  parentsCount: number;
  enrollmentsCount: number;
}

export interface OnboardingChecklist {
  profile: boolean;
  academicSession: boolean;
  academicStructure: boolean;
  staffSetup: boolean;
  studentSetup: boolean;
  enrollmentSetup: boolean;
}

export class OnboardingService {
  /**
   * Retrieves or initializes the onboarding status record for the school,
   * computing actual persisted database metrics and readiness checklists.
   */
  public static async getOnboardingStatus(schoolId: string | Types.ObjectId) {
    const sId = new Types.ObjectId(schoolId);

    let onboarding = await SchoolOnboarding.findOne({ schoolId: sId });
    if (!onboarding) {
      onboarding = await SchoolOnboarding.create({
        schoolId: sId,
        currentStep: 1,
        completedSteps: [],
        status: 'not_started',
        stepsData: {},
      });
    }

    // Query actual persisted database counts for this school
    const [
      sessionsCount,
      classesCount,
      sectionsCount,
      subjectsCount,
      teachersCount,
      studentsCount,
      parentsCount,
      enrollmentsCount,
      school,
      schoolSettings,
    ] = await Promise.all([
      AcademicSession.countDocuments({ schoolId: sId, isDeleted: false }),
      Class.countDocuments({ schoolId: sId, isDeleted: false }),
      Section.countDocuments({ schoolId: sId, isDeleted: false }),
      Subject.countDocuments({ schoolId: sId, isDeleted: false }),
      Teacher.countDocuments({ schoolId: sId, isDeleted: false }),
      Student.countDocuments({ schoolId: sId, isDeleted: false }),
      Parent.countDocuments({ schoolId: sId, isDeleted: false }),
      Enrollment.countDocuments({ schoolId: sId, isDeleted: false }),
      School.findById(sId),
      SchoolSettings.findOne({ schoolId: sId }),
    ]);

    const counts: OnboardingCounts = {
      sessionsCount,
      classesCount,
      sectionsCount,
      subjectsCount,
      teachersCount,
      studentsCount,
      parentsCount,
      enrollmentsCount,
    };

    const hasProfile = Boolean(
      school?.name &&
        school?.email &&
        (school?.phone || schoolSettings?.profile?.phone) &&
        (school?.timezone || schoolSettings?.regional?.timezone)
    );

    const checklist: OnboardingChecklist = {
      profile: hasProfile,
      academicSession: sessionsCount > 0,
      academicStructure: classesCount > 0 && sectionsCount > 0 && subjectsCount > 0,
      staffSetup: teachersCount > 0,
      studentSetup: studentsCount > 0,
      enrollmentSetup: enrollmentsCount > 0,
    };

    // Calculate completion percentage based on 6 core milestones
    const milestones = Object.values(checklist);
    const completedMilestones = milestones.filter(Boolean).length;
    const readinessPercentage = Math.round((completedMilestones / milestones.length) * 100);

    // If records exist and status was not_started, transition to in_progress
    if (onboarding.status === 'not_started' && completedMilestones > 0) {
      onboarding.status = 'in_progress';
      await onboarding.save();
    }

    return {
      onboarding,
      counts,
      checklist,
      readinessPercentage,
      school: {
        id: school?._id,
        name: school?.name,
        code: school?.code,
        email: school?.email,
        phone: school?.phone,
        status: school?.status,
        logo: school?.logo,
      },
    };
  }

  /**
   * Saves partial progress for a specific setup wizard step without resetting existing configuration.
   */
  public static async saveOnboardingStep(
    schoolId: string | Types.ObjectId,
    userId: string,
    step: number,
    data: any
  ) {
    const sId = new Types.ObjectId(schoolId);
    let onboarding = await SchoolOnboarding.findOne({ schoolId: sId });
    if (!onboarding) {
      onboarding = await SchoolOnboarding.create({
        schoolId: sId,
        currentStep: step,
        completedSteps: [],
        status: 'in_progress',
        stepsData: {},
      });
    }

    const stepKeyMap: Record<number, string> = {
      1: 'profile',
      2: 'academic',
      3: 'structure',
      4: 'staff',
      5: 'students',
      6: 'review',
    };

    const stepKey = stepKeyMap[step] || `step${step}`;
    const existingData = onboarding.stepsData || {};
    existingData[stepKey] = { ...(existingData[stepKey] || {}), ...data };

    onboarding.stepsData = existingData;
    onboarding.status = onboarding.status === 'completed' ? 'completed' : 'in_progress';

    if (!onboarding.completedSteps.includes(step)) {
      onboarding.completedSteps.push(step);
      onboarding.completedSteps.sort((a, b) => a - b);
    }

    onboarding.currentStep = Math.min(6, step + 1);
    await onboarding.save();

    // If step 1 (profile), sync back to School model and SchoolSettings
    if (step === 1 && data) {
      const updateFields: any = {};
      if (data.phone) updateFields.phone = data.phone;
      if (data.logo) updateFields.logo = data.logo;
      if (data.timezone) updateFields.timezone = data.timezone;
      if (data.currency) updateFields.currency = data.currency;
      if (data.address) updateFields.address = data.address;

      if (Object.keys(updateFields).length > 0) {
        await School.findByIdAndUpdate(sId, { $set: updateFields });
      }
    }

    // Audit log
    await AuditLog.create({
      schoolId: sId,
      userId: new Types.ObjectId(userId),
      action: 'UPDATE',
      resource: 'SchoolOnboarding',
      resourceId: onboarding._id.toString(),
      metadata: { step, stepKey, status: onboarding.status },
    });

    return onboarding;
  }

  /**
   * Validates all mandatory requirements against actual persisted records
   * and finalizes onboarding completion.
   */
  public static async completeOnboarding(
    schoolId: string | Types.ObjectId,
    userId: string
  ) {
    const sId = new Types.ObjectId(schoolId);
    const { counts, checklist } = await this.getOnboardingStatus(sId);

    const missingRequirements: string[] = [];
    if (!checklist.profile) missingRequirements.push('School Profile (Contact Phone & Timezone)');
    if (!checklist.academicSession) missingRequirements.push('At least one Academic Session');
    if (counts.classesCount === 0) missingRequirements.push('At least one Class');
    if (counts.sectionsCount === 0) missingRequirements.push('At least one Section');
    if (counts.subjectsCount === 0) missingRequirements.push('At least one Subject');
    if (!checklist.staffSetup) missingRequirements.push('At least one Staff / Teacher account');
    if (!checklist.studentSetup) missingRequirements.push('At least one Student record');

    if (missingRequirements.length > 0) {
      throw ApiError.badRequest(
        `Cannot complete onboarding. Mandatory requirements remain unfulfilled: ${missingRequirements.join(
          ', '
        )}`,
        missingRequirements
      );
    }

    const onboarding = await SchoolOnboarding.findOneAndUpdate(
      { schoolId: sId },
      {
        $set: {
          status: 'completed',
          completedAt: new Date(),
          completedBy: new Types.ObjectId(userId),
          currentStep: 6,
          completedSteps: [1, 2, 3, 4, 5, 6],
        },
      },
      { new: true, upsert: true }
    );

    // If school was in pending status, activate it
    await School.findByIdAndUpdate(sId, {
      $set: { status: 'active', activatedAt: new Date() },
    });

    await AuditLog.create({
      schoolId: sId,
      userId: new Types.ObjectId(userId),
      action: 'UPDATE',
      resource: 'SchoolOnboarding',
      resourceId: onboarding._id.toString(),
      metadata: {
        action: 'ONBOARDING_COMPLETED',
        completedAt: onboarding.completedAt,
        counts,
      },
    });

    return {
      success: true,
      message: 'School onboarding successfully verified and completed!',
      onboarding,
      counts,
    };
  }

  /**
   * Generates downloadable CSV template with documented columns and example row.
   */
  public static generateCsvTemplate(type: 'teachers' | 'students' | 'parents'): string {
    if (type === 'teachers') {
      const headers = [
        'Name*',
        'Email*',
        'Phone',
        'EmployeeId*',
        'Department*',
        'Designation',
        'Qualification',
        'Specializations',
      ];
      const sampleRows = [
        [
          'Sarah Jenkins',
          'sarah.jenkins@school.edu',
          '+1-555-0199',
          'EMP-101',
          'Mathematics',
          'Senior Teacher',
          'M.Sc Mathematics',
          'Algebra; Calculus',
        ],
        [
          'Robert Taylor',
          'robert.taylor@school.edu',
          '+1-555-0182',
          'EMP-102',
          'Science',
          'Head of Science',
          'B.Ed Chemistry',
          'Organic Chemistry',
        ],
      ];
      return buildCsvString(headers, sampleRows);
    }

    if (type === 'students') {
      const headers = [
        'Name*',
        'AdmissionNumber*',
        'Email',
        'DateOfBirth',
        'Gender',
        'BloodGroup',
        'AcademicSession*',
        'ClassName*',
        'SectionName*',
        'RollNumber',
        'Address',
        'EmergencyContactName',
        'EmergencyContactPhone',
      ];
      const sampleRows = [
        [
          'Alex Rivera',
          'STU-2026-001',
          'alex.rivera@student.edu',
          '2010-05-14',
          'male',
          'O+',
          '2026-2027',
          'Grade 9',
          'Section A',
          '01',
          '123 Maple Street',
          'Maria Rivera',
          '+1-555-0144',
        ],
        [
          'Emma Watson',
          'STU-2026-002',
          'emma.watson@student.edu',
          '2010-08-22',
          'female',
          'A+',
          '2026-2027',
          'Grade 9',
          'Section A',
          '02',
          '456 Oak Avenue',
          'John Watson',
          '+1-555-0177',
        ],
      ];
      return buildCsvString(headers, sampleRows);
    }

    // Parents
    const headers = [
      'Name*',
      'Email*',
      'Phone*',
      'StudentAdmissionNumber*',
      'Relationship*',
      'Occupation',
      'Address',
    ];
    const sampleRows = [
      [
        'David Rivera',
        'david.rivera@parent.edu',
        '+1-555-0188',
        'STU-2026-001',
        'father',
        'Civil Engineer',
        '123 Maple Street',
      ],
      [
        'Maria Rivera',
        'maria.rivera@parent.edu',
        '+1-555-0189',
        'STU-2026-001',
        'mother',
        'Architect',
        '123 Maple Street',
      ],
    ];
    return buildCsvString(headers, sampleRows);
  }

  /**
   * Stage A: Parses and previews CSV upload, performing rigorous row-by-row
   * validation, internal duplicate checks, and cross-reference validation.
   */
  public static async previewImport(
    schoolId: string | Types.ObjectId,
    userId: string,
    type: 'teachers' | 'students' | 'parents',
    csvContent: string,
    rawFilename = 'import.csv'
  ) {
    const sId = new Types.ObjectId(schoolId);
    const filename = sanitizeCsvFilename(rawFilename);

    const parsed = parseCsvString(csvContent, 1000);
    const { rows, totalRows } = parsed;

    if (totalRows === 0) {
      throw ApiError.badRequest('CSV file contains no data rows.');
    }

    const errors: IImportRowError[] = [];
    const validRows: any[] = [];
    let duplicateRows = 0;

    // Pre-load reference maps for this school to avoid N+1 DB calls
    if (type === 'teachers') {
      const existingEmployeeIds = new Set(
        (await Teacher.find({ schoolId: sId, isDeleted: false }).select('employeeId')).map(
          (t) => t.employeeId.toUpperCase()
        )
      );
      const existingUserEmails = new Set(
        (await User.find({ isDeleted: false }).select('email')).map((u) => u.email.toLowerCase())
      );
      const seenEmployeeIdsInFile = new Set<string>();
      const seenEmailsInFile = new Set<string>();

      for (let i = 0; i < rows.length; i++) {
        const rowNum = i + 2; // header is row 1
        const r = rows[i];
        const name = r.name || r['name*'] || '';
        const email = (r.email || r['email*'] || '').toLowerCase();
        const empId = (r.employeeid || r['employeeid*'] || '').toUpperCase();
        const dept = r.department || r['department*'] || 'General';
        const designation = r.designation || 'Teacher';

        let rowHasError = false;

        if (!name || name.length < 2) {
          errors.push({ row: rowNum, identifier: empId || name, field: 'name', message: 'Name is required (min 2 characters)' });
          rowHasError = true;
        }

        if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
          errors.push({ row: rowNum, identifier: empId || email, field: 'email', message: 'Valid email address is required' });
          rowHasError = true;
        } else if (seenEmailsInFile.has(email)) {
          errors.push({ row: rowNum, identifier: email, field: 'email', message: 'Duplicate email within the same CSV file' });
          duplicateRows++;
          rowHasError = true;
        } else if (existingUserEmails.has(email)) {
          errors.push({ row: rowNum, identifier: email, field: 'email', message: 'User with this email already exists in the system' });
          duplicateRows++;
          rowHasError = true;
        }

        if (!empId) {
          errors.push({ row: rowNum, identifier: name, field: 'employeeId', message: 'Employee ID is required' });
          rowHasError = true;
        } else if (seenEmployeeIdsInFile.has(empId)) {
          errors.push({ row: rowNum, identifier: empId, field: 'employeeId', message: 'Duplicate Employee ID within the same CSV file' });
          duplicateRows++;
          rowHasError = true;
        } else if (existingEmployeeIds.has(empId)) {
          errors.push({ row: rowNum, identifier: empId, field: 'employeeId', message: `Employee ID "${empId}" already exists in this school` });
          duplicateRows++;
          rowHasError = true;
        }

        seenEmployeeIdsInFile.add(empId);
        if (email) seenEmailsInFile.add(email);

        if (!rowHasError) {
          validRows.push({
            rowNumber: rowNum,
            name,
            email,
            phone: r.phone || '',
            employeeId: empId,
            department: dept,
            designation,
            qualification: r.qualification || '',
            specializations: r.specializations ? r.specializations.split(';').map((s) => s.trim()) : [],
          });
        }
      }
    } else if (type === 'students') {
      const existingAdmissionNumbers = new Set(
        (await Student.find({ schoolId: sId, isDeleted: false }).select('admissionNumber')).map(
          (s) => s.admissionNumber.toUpperCase()
        )
      );

      // Pre-load Sessions, Classes, Sections
      const sessions = await AcademicSession.find({ schoolId: sId, isDeleted: false });
      const classes = await Class.find({ schoolId: sId, isDeleted: false });
      const sections = await Section.find({ schoolId: sId, isDeleted: false });

      const sessionMap = new Map(sessions.map((s) => [s.name.toLowerCase().trim(), s._id]));
      const currentSession = sessions.find((s) => s.isCurrent) || sessions[0];
      const classMap = new Map(classes.map((c) => [c.name.toLowerCase().trim(), c._id]));
      const sectionMap = new Map(
        sections.map((sec) => [`${sec.classId.toString()}:${sec.name.toLowerCase().trim()}`, sec._id])
      );

      const seenAdmNosInFile = new Set<string>();

      for (let i = 0; i < rows.length; i++) {
        const rowNum = i + 2;
        const r = rows[i];
        const name = r.name || r['name*'] || '';
        const admNo = (r.admissionnumber || r['admissionnumber*'] || '').toUpperCase();
        const sessionName = (r.academicsession || r['academicsession*'] || '').toLowerCase().trim();
        const className = (r.classname || r['classname*'] || '').toLowerCase().trim();
        const sectionName = (r.sectionname || r['sectionname*'] || '').toLowerCase().trim();
        const gender = (r.gender || 'prefer_not_to_say').toLowerCase().trim();

        let rowHasError = false;

        if (!name || name.length < 2) {
          errors.push({ row: rowNum, identifier: admNo || name, field: 'name', message: 'Student name is required' });
          rowHasError = true;
        }

        if (!admNo) {
          errors.push({ row: rowNum, identifier: name, field: 'admissionNumber', message: 'Admission number is required' });
          rowHasError = true;
        } else if (seenAdmNosInFile.has(admNo)) {
          errors.push({ row: rowNum, identifier: admNo, field: 'admissionNumber', message: 'Duplicate Admission Number within the same CSV file' });
          duplicateRows++;
          rowHasError = true;
        } else if (existingAdmissionNumbers.has(admNo)) {
          errors.push({ row: rowNum, identifier: admNo, field: 'admissionNumber', message: `Admission Number "${admNo}" already exists in this school` });
          duplicateRows++;
          rowHasError = true;
        }

        // Validate references
        let resolvedSessionId = sessionMap.get(sessionName);
        if (!resolvedSessionId && currentSession) {
          resolvedSessionId = currentSession._id;
        }
        if (!resolvedSessionId) {
          errors.push({ row: rowNum, identifier: admNo, field: 'academicSession', message: `Academic Session "${sessionName}" not found` });
          rowHasError = true;
        }

        const resolvedClassId = classMap.get(className);
        if (!resolvedClassId) {
          errors.push({ row: rowNum, identifier: admNo, field: 'className', message: `Class "${r.classname}" not found in this school` });
          rowHasError = true;
        }

        let resolvedSectionId: Types.ObjectId | undefined;
        if (resolvedClassId) {
          resolvedSectionId = sectionMap.get(`${resolvedClassId.toString()}:${sectionName}`);
          if (!resolvedSectionId) {
            errors.push({ row: rowNum, identifier: admNo, field: 'sectionName', message: `Section "${r.sectionname}" not found in class "${r.classname}"` });
            rowHasError = true;
          }
        }

        const validGenders = ['male', 'female', 'other', 'prefer_not_to_say'];
        if (r.gender && !validGenders.includes(gender)) {
          errors.push({ row: rowNum, identifier: admNo, field: 'gender', message: `Gender must be one of: ${validGenders.join(', ')}` });
          rowHasError = true;
        }

        seenAdmNosInFile.add(admNo);

        if (!rowHasError) {
          validRows.push({
            rowNumber: rowNum,
            name,
            admissionNumber: admNo,
            email: r.email || '',
            dateOfBirth: r.dateofbirth ? new Date(r.dateofbirth) : undefined,
            gender: validGenders.includes(gender) ? gender : 'prefer_not_to_say',
            bloodGroup: r.bloodgroup || 'unknown',
            sessionId: resolvedSessionId,
            classId: resolvedClassId,
            sectionId: resolvedSectionId,
            rollNumber: r.rollnumber || '',
            address: r.address || '',
            emergencyContact: {
              name: r.emergencycontactname || '',
              relationship: 'Guardian',
              phone: r.emergencycontactphone || '',
            },
          });
        }
      }
    } else {
      // Parents
      const existingStudents = await Student.find({ schoolId: sId, isDeleted: false }).select(
        '_id admissionNumber'
      );
      const studentAdmMap = new Map(
        existingStudents.map((s) => [s.admissionNumber.toUpperCase(), s._id])
      );

      for (let i = 0; i < rows.length; i++) {
        const rowNum = i + 2;
        const r = rows[i];
        const name = r.name || r['name*'] || '';
        const email = (r.email || r['email*'] || '').toLowerCase();
        const phone = r.phone || r['phone*'] || '';
        const targetAdmNo = (r.studentadmissionnumber || r['studentadmissionnumber*'] || '').toUpperCase();
        const rel = (r.relationship || r['relationship*'] || 'guardian').toLowerCase();

        let rowHasError = false;

        if (!name) {
          errors.push({ row: rowNum, identifier: email, field: 'name', message: 'Parent name is required' });
          rowHasError = true;
        }

        if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
          errors.push({ row: rowNum, identifier: name, field: 'email', message: 'Valid email is required' });
          rowHasError = true;
        }

        if (!phone) {
          errors.push({ row: rowNum, identifier: email, field: 'phone', message: 'Contact phone number is required' });
          rowHasError = true;
        }

        const resolvedStudentId = studentAdmMap.get(targetAdmNo);
        if (!targetAdmNo) {
          errors.push({ row: rowNum, identifier: email, field: 'studentAdmissionNumber', message: 'Target student admission number is required' });
          rowHasError = true;
        } else if (!resolvedStudentId) {
          errors.push({ row: rowNum, identifier: targetAdmNo, field: 'studentAdmissionNumber', message: `Student with Admission Number "${targetAdmNo}" does not exist in this school` });
          rowHasError = true;
        }

        const validRelations = ['father', 'mother', 'guardian', 'other'];
        if (!validRelations.includes(rel)) {
          errors.push({ row: rowNum, identifier: targetAdmNo, field: 'relationship', message: `Relationship must be one of: ${validRelations.join(', ')}` });
          rowHasError = true;
        }

        if (!rowHasError) {
          validRows.push({
            rowNumber: rowNum,
            name,
            email,
            phone,
            studentProfileId: resolvedStudentId,
            studentAdmissionNumber: targetAdmNo,
            relationship: rel,
            occupation: r.occupation || '',
            address: r.address || '',
          });
        }
      }
    }

    const batchId = `batch_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const invalidRows = totalRows - validRows.length;

    // Cache the validated batch in ImportHistory
    await ImportHistory.create({
      schoolId: sId,
      userId: new Types.ObjectId(userId),
      batchId,
      importType: type,
      filename,
      status: 'preview',
      totalRows,
      validRows: validRows.length,
      invalidRows,
      importedRows: 0,
      failedRows: 0,
      duplicateRows,
      rowErrors: errors,
      summary: `Previewed ${totalRows} rows: ${validRows.length} valid, ${invalidRows} invalid (${duplicateRows} duplicates).`,
      stagedData: validRows,
    });

    return {
      batchId,
      importType: type,
      filename,
      totalRows,
      validRowsCount: validRows.length,
      invalidRowsCount: invalidRows,
      duplicateRowsCount: duplicateRows,
      previewRows: validRows.slice(0, 50),
      errors: errors.slice(0, 100),
    };
  }

  /**
   * Stage B: Executes confirmation of a validated batch, safely creating Users with
   * secure random bcrypt hashes, activation tokens, and profile records.
   */
  public static async confirmImport(
    schoolId: string | Types.ObjectId,
    userId: string,
    batchId: string,
    type: 'teachers' | 'students' | 'parents'
  ) {
    const sId = new Types.ObjectId(schoolId);

    const history = await ImportHistory.findOne({
      schoolId: sId,
      batchId,
    }).select('+stagedData');

    if (!history) {
      throw ApiError.notFound(`Import batch "${batchId}" not found for this school.`);
    }

    // Idempotency: Prevent double processing
    if (history.status === 'completed') {
      return {
        success: true,
        batchId,
        alreadyProcessed: true,
        message: 'This import batch has already been processed and finalized.',
        importedCount: history.importedRows,
        failedCount: history.failedRows,
      };
    }

    const stagedRows: any[] = history.stagedData || [];
    if (stagedRows.length === 0) {
      throw ApiError.badRequest('No valid rows available in this batch to import.');
    }

    let importedCount = 0;
    let failedCount = 0;
    const executionErrors: IImportRowError[] = [];

    if (type === 'teachers') {
      for (const row of stagedRows) {
        try {
          // Generate secure random initial password hash (never shared default password)
          const randomSecret = crypto.randomBytes(24).toString('hex');
          const passwordHash = await bcrypt.hash(randomSecret, 10);

          // Create User account
          const user = await User.create({
            name: row.name,
            email: row.email,
            passwordHash,
            role: 'teacher',
            schoolId: sId,
            isActive: true,
            emailVerified: false,
            phone: row.phone,
          });

          // Generate single-use secure activation OTP
          const activationCode = crypto.randomInt(100000, 999999).toString();
          const hashedOTP = await bcrypt.hash(activationCode, 10);
          await OTPVerification.create({
            schoolId: sId,
            identifier: row.email,
            hashedOTP,
            purpose: 'account_activation',
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
            isUsed: false,
            attempts: 0,
            maxAttempts: 5,
          });

          // Create Teacher Profile
          await Teacher.create({
            userId: user._id,
            schoolId: sId,
            employeeId: row.employeeId,
            department: row.department,
            designation: row.designation,
            qualification: row.qualification,
            specializations: row.specializations,
            status: 'active',
          });

          importedCount++;
        } catch (err: any) {
          failedCount++;
          executionErrors.push({
            row: row.rowNumber,
            identifier: row.employeeId || row.email,
            message: err.message || 'Failed to create teacher record',
          });
        }
      }
    } else if (type === 'students') {
      for (const row of stagedRows) {
        try {
          const studentEmail =
            row.email && row.email.includes('@')
              ? row.email
              : `${row.admissionNumber.toLowerCase()}@student.local`;

          const randomSecret = crypto.randomBytes(24).toString('hex');
          const passwordHash = await bcrypt.hash(randomSecret, 10);

          const user = await User.create({
            name: row.name,
            email: studentEmail,
            passwordHash,
            role: 'student',
            schoolId: sId,
            isActive: true,
            emailVerified: false,
          });

          const student = await Student.create({
            userId: user._id,
            schoolId: sId,
            admissionNumber: row.admissionNumber,
            dateOfBirth: row.dateOfBirth,
            gender: row.gender,
            bloodGroup: row.bloodGroup,
            currentSessionId: row.sessionId,
            currentClassId: row.classId,
            currentSectionId: row.sectionId,
            address: row.address,
            emergencyContact: row.emergencyContact,
            status: 'active',
          });

          // Create active Enrollment record
          if (row.sessionId && row.classId && row.sectionId) {
            await Enrollment.create({
              schoolId: sId,
              studentId: student._id,
              academicSessionId: row.sessionId,
              classId: row.classId,
              sectionId: row.sectionId,
              rollNumber: row.rollNumber,
              enrollmentDate: new Date(),
              status: 'enrolled',
            });
          }

          importedCount++;
        } catch (err: any) {
          failedCount++;
          executionErrors.push({
            row: row.rowNumber,
            identifier: row.admissionNumber,
            message: err.message || 'Failed to create student or enrollment',
          });
        }
      }
    } else {
      // Parents
      for (const row of stagedRows) {
        try {
          let user = await User.findOne({ email: row.email, schoolId: sId });
          if (!user) {
            const randomSecret = crypto.randomBytes(24).toString('hex');
            const passwordHash = await bcrypt.hash(randomSecret, 10);
            user = await User.create({
              name: row.name,
              email: row.email,
              passwordHash,
              role: 'parent',
              schoolId: sId,
              isActive: true,
              emailVerified: false,
              phone: row.phone,
            });
          }

          let parent = await Parent.findOne({ userId: user._id, schoolId: sId });
          if (!parent) {
            parent = await Parent.create({
              userId: user._id,
              schoolId: sId,
              children: [
                {
                  studentProfileId: row.studentProfileId,
                  relationship: row.relationship,
                  isPrimary: true,
                },
              ],
              status: 'active',
              address: row.address,
              occupation: row.occupation,
            });
          } else {
            // Append child if not already in list
            const alreadyLinked = parent.children.some(
              (c) => c.studentProfileId.toString() === row.studentProfileId.toString()
            );
            if (!alreadyLinked) {
              parent.children.push({
                studentProfileId: row.studentProfileId,
                relationship: row.relationship,
                isPrimary: false,
              });
              await parent.save();
            }
          }

          // Bidirectional link in Student.guardians
          await Student.findByIdAndUpdate(row.studentProfileId, {
            $addToSet: {
              guardians: {
                parentProfileId: parent._id,
                userId: user._id,
                relationship: row.relationship,
                isPrimary: true,
                canPickup: true,
              },
            },
          });

          importedCount++;
        } catch (err: any) {
          failedCount++;
          executionErrors.push({
            row: row.rowNumber,
            identifier: row.email,
            message: err.message || 'Failed to link parent to student',
          });
        }
      }
    }

    // Finalize ImportHistory
    history.status = failedCount === 0 ? 'completed' : importedCount > 0 ? 'partial' : 'failed';
    history.importedRows = importedCount;
    history.failedRows = failedCount;
    history.summary = `Processed ${stagedRows.length} rows: ${importedCount} created successfully, ${failedCount} failed.`;
    if (executionErrors.length > 0) {
      history.rowErrors = [...(history.rowErrors || []), ...executionErrors];
    }
    history.stagedData = []; // Clear staged data to free storage
    await history.save();

    await AuditLog.create({
      schoolId: sId,
      userId: new Types.ObjectId(userId),
      action: 'CREATE',
      resource: 'ImportHistory',
      resourceId: history._id.toString(),
      metadata: {
        batchId,
        importType: type,
        importedCount,
        failedCount,
        status: history.status,
      },
    });

    return {
      success: true,
      batchId,
      status: history.status,
      importedCount,
      failedCount,
      message: history.summary,
    };
  }

  /**
   * Retrieves paginated import history for the school.
   */
  public static async getImportHistory(
    schoolId: string | Types.ObjectId,
    page: number = 1,
    limit: number = 20
  ) {
    const sId = new Types.ObjectId(schoolId);
    const skip = (page - 1) * limit;

    const [imports, total] = await Promise.all([
      ImportHistory.find({ schoolId: sId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('userId', 'name email'),
      ImportHistory.countDocuments({ schoolId: sId }),
    ]);

    return {
      imports,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Generates a downloadable CSV error report for an import batch with formula injection defense.
   */
  public static async generateErrorReportCsv(
    batchId: string,
    schoolId: string | Types.ObjectId
  ): Promise<string> {
    const sId = new Types.ObjectId(schoolId);
    const history = await ImportHistory.findOne({ schoolId: sId, batchId });
    if (!history) {
      throw ApiError.notFound('Import record not found.');
    }

    const headers = ['Row', 'Identifier', 'Field', 'Error Message'];
    const errorRows = (history.rowErrors || []).map((err) => [
      err.row,
      err.identifier || 'N/A',
      err.field || 'N/A',
      err.message,
    ]);

    return buildCsvString(headers, errorRows);
  }
}
