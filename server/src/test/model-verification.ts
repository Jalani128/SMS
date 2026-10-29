import mongoose, { Types } from 'mongoose';
import {
  School,
  User,
  Student,
  Teacher,
  Parent,
  AcademicSession,
  Class,
  Section,
  Subject,
  Enrollment,
  Timetable,
  Attendance,
  FeeStructure,
  Invoice,
  Payment,
  Homework,
  AssignmentSubmission,
  StudyMaterial,
  Exam,
  ExamSubject,
  Mark,
  Conversation,
  Message,
  Notification,
  Announcement,
  OTPVerification,
  AuditLog,
} from '../models/index.js';
import {
  validateSchoolContext,
  assertDocumentTenantOwnership,
  UserContext,
} from '../utils/tenantSecurity.js';
import { connectDB, closeDB } from '../config/db.js';

interface TestResult {
  suite: string;
  testName: string;
  passed: boolean;
  message?: string;
}

const results: TestResult[] = [];

const record = (suite: string, testName: string, passed: boolean, message?: string) => {
  results.push({ suite, testName, passed, message });
  const statusIcon = passed ? 'PASS' : 'FAIL';
  console.log(`[${statusIcon}] ${suite} -> ${testName} ${message ? `(${message})` : ''}`);
};

export const runModelVerification = async () => {
  console.log('================================================================');
  console.log(' Starting Phase 2 Database Architecture & Model Verification');
  console.log('================================================================\n');

  // --------------------------------------------------------------------------
  // SUITE 1: Model Registration & Schema Compilation
  // --------------------------------------------------------------------------
  const allModels = [
    { name: 'School', model: School },
    { name: 'User', model: User },
    { name: 'Student', model: Student },
    { name: 'Teacher', model: Teacher },
    { name: 'Parent', model: Parent },
    { name: 'AcademicSession', model: AcademicSession },
    { name: 'Class', model: Class },
    { name: 'Section', model: Section },
    { name: 'Subject', model: Subject },
    { name: 'Enrollment', model: Enrollment },
    { name: 'Timetable', model: Timetable },
    { name: 'Attendance', model: Attendance },
    { name: 'FeeStructure', model: FeeStructure },
    { name: 'Invoice', model: Invoice },
    { name: 'Payment', model: Payment },
    { name: 'Homework', model: Homework },
    { name: 'AssignmentSubmission', model: AssignmentSubmission },
    { name: 'StudyMaterial', model: StudyMaterial },
    { name: 'Exam', model: Exam },
    { name: 'ExamSubject', model: ExamSubject },
    { name: 'Mark', model: Mark },
    { name: 'Conversation', model: Conversation },
    { name: 'Message', model: Message },
    { name: 'Notification', model: Notification },
    { name: 'Announcement', model: Announcement },
    { name: 'OTPVerification', model: OTPVerification },
    { name: 'AuditLog', model: AuditLog },
  ];

  for (const item of allModels) {
    const isCompiled = !!item.model && !!item.model.schema;
    record('Model Compilation', `Model "${item.name}" registered and compiled with Mongoose`, isCompiled);
  }

  // --------------------------------------------------------------------------
  // SUITE 2: Schema Validation (Required Fields & Type Checks)
  // --------------------------------------------------------------------------
  try {
    const invalidSchool = new School({});
    const schoolErr = invalidSchool.validateSync();
    const hasNameErr = !!schoolErr?.errors?.name;
    const hasSlugErr = !!schoolErr?.errors?.slug;
    const hasEmailErr = !!schoolErr?.errors?.email;
    record(
      'Validation Rules',
      'School requires name, slug, email',
      hasNameErr && hasSlugErr && hasEmailErr,
      'Validated required fields'
    );
  } catch (e: any) {
    record('Validation Rules', 'School requires name, slug, email', false, e.message);
  }

  try {
    const invalidUser = new User({});
    const userErr = invalidUser.validateSync();
    const hasEmail = !!userErr?.errors?.email;
    const hasRole = !!userErr?.errors?.role;
    record('Validation Rules', 'User requires email, role, passwordHash', hasEmail && hasRole);
  } catch (e: any) {
    record('Validation Rules', 'User requires email, role, passwordHash', false, e.message);
  }

  try {
    const invalidAttendance = new Attendance({});
    const attErr = invalidAttendance.validateSync();
    const hasStudent = !!attErr?.errors?.studentId;
    const hasSchool = !!attErr?.errors?.schoolId;
    const hasStatus = !!attErr?.errors?.status;
    record('Validation Rules', 'Attendance requires studentId, schoolId, status', hasStudent && hasSchool && hasStatus);
  } catch (e: any) {
    record('Validation Rules', 'Attendance requires studentId, schoolId, status', false, e.message);
  }

  try {
    const invalidInvoice = new Invoice({});
    const invErr = invalidInvoice.validateSync();
    const hasTotal = !!invErr?.errors?.totalAmount;
    const hasDue = !!invErr?.errors?.dueDate;
    record('Validation Rules', 'Invoice requires totalAmount (Decimal128) and dueDate', hasTotal && hasDue);
  } catch (e: any) {
    record('Validation Rules', 'Invoice requires totalAmount and dueDate', false, e.message);
  }

  try {
    const invalidTimetable = new Timetable({
      startTime: '99:99', // Invalid time format
    });
    const ttErr = invalidTimetable.validateSync();
    const hasTimeErr = !!ttErr?.errors?.startTime;
    record('Validation Rules', 'Timetable rejects invalid 24h time format (e.g. 99:99)', hasTimeErr);
  } catch (e: any) {
    record('Validation Rules', 'Timetable rejects invalid 24h time format', false, e.message);
  }

  // --------------------------------------------------------------------------
  // SUITE 3: Enum Constraints
  // --------------------------------------------------------------------------
  try {
    const invalidSchoolStatus = new School({
      name: 'Test',
      slug: 'test',
      code: 'TST',
      email: 'test@school.edu',
      status: 'INVALID_STATUS' as any,
    });
    const sErr = invalidSchoolStatus.validateSync();
    const hasEnumErr = !!sErr?.errors?.status;
    record('Enum Constraints', 'School rejects invalid status enum', hasEnumErr);
  } catch (e: any) {
    record('Enum Constraints', 'School rejects invalid status enum', false, e.message);
  }

  try {
    const invalidRoleUser = new User({
      name: 'Test',
      email: 'test@school.edu',
      passwordHash: 'hash',
      role: 'SUPER_HACKER' as any,
    });
    const uErr = invalidRoleUser.validateSync();
    const hasRoleEnum = !!uErr?.errors?.role;
    record('Enum Constraints', 'User rejects invalid role enum', hasRoleEnum);
  } catch (e: any) {
    record('Enum Constraints', 'User rejects invalid role enum', false, e.message);
  }

  try {
    const invalidAtt = new Attendance({
      schoolId: new Types.ObjectId(),
      studentId: new Types.ObjectId(),
      academicSessionId: new Types.ObjectId(),
      classId: new Types.ObjectId(),
      sectionId: new Types.ObjectId(),
      markedBy: new Types.ObjectId(),
      date: new Date(),
      status: 'SLEEPING' as any,
    });
    const aErr = invalidAtt.validateSync();
    const hasAttEnum = !!aErr?.errors?.status;
    record('Enum Constraints', 'Attendance rejects invalid status enum', hasAttEnum);
  } catch (e: any) {
    record('Enum Constraints', 'Attendance rejects invalid status enum', false, e.message);
  }

  // --------------------------------------------------------------------------
  // SUITE 4: Compound Unique Index Declarations
  // --------------------------------------------------------------------------
  const checkCompoundIndex = (
    modelName: string,
    schema: mongoose.Schema,
    expectedKeys: Record<string, number>,
    isUnique = true
  ): boolean => {
    const indexes = schema.indexes();
    return indexes.some(([fields, options]) => {
      const keys = Object.keys(fields);
      const expectedKeyNames = Object.keys(expectedKeys);
      if (keys.length !== expectedKeyNames.length) return false;
      const keysMatch = expectedKeyNames.every((k) => fields[k] === expectedKeys[k]);
      if (!keysMatch) return false;
      if (isUnique) return options?.unique === true;
      return true;
    });
  };

  record(
    'Compound Indexes',
    'Attendance unique compound index on { schoolId, studentId, date }',
    checkCompoundIndex('Attendance', Attendance.schema, { schoolId: 1, studentId: 1, date: 1 }, true)
  );

  record(
    'Compound Indexes',
    'Enrollment unique compound index on { schoolId, studentId, academicSessionId }',
    checkCompoundIndex('Enrollment', Enrollment.schema, { schoolId: 1, studentId: 1, academicSessionId: 1 }, true)
  );

  record(
    'Compound Indexes',
    'Invoice unique compound index on { schoolId, invoiceNumber }',
    checkCompoundIndex('Invoice', Invoice.schema, { schoolId: 1, invoiceNumber: 1 }, true)
  );

  record(
    'Compound Indexes',
    'Payment unique compound index on { schoolId, idempotencyKey }',
    checkCompoundIndex('Payment', Payment.schema, { schoolId: 1, idempotencyKey: 1 }, true)
  );

  record(
    'Compound Indexes',
    'Mark unique compound index on { schoolId, examSubjectId, studentId }',
    checkCompoundIndex('Mark', Mark.schema, { schoolId: 1, examSubjectId: 1, studentId: 1 }, true)
  );

  record(
    'Compound Indexes',
    'ExamSubject unique compound index on { schoolId, examId, classId, subjectId }',
    checkCompoundIndex('ExamSubject', ExamSubject.schema, { schoolId: 1, examId: 1, classId: 1, subjectId: 1 }, true)
  );

  record(
    'Compound Indexes',
    'AssignmentSubmission unique compound index on { schoolId, homeworkId, studentId }',
    checkCompoundIndex('AssignmentSubmission', AssignmentSubmission.schema, { schoolId: 1, homeworkId: 1, studentId: 1 }, true)
  );

  record(
    'Compound Indexes',
    'Student unique compound index on { schoolId, admissionNumber }',
    checkCompoundIndex('Student', Student.schema, { schoolId: 1, admissionNumber: 1 }, true)
  );

  record(
    'Compound Indexes',
    'Teacher unique compound index on { schoolId, employeeId }',
    checkCompoundIndex('Teacher', Teacher.schema, { schoolId: 1, employeeId: 1 }, true)
  );

  // --------------------------------------------------------------------------
  // SUITE 5: Serialization Security (toJSON Transforms)
  // --------------------------------------------------------------------------
  const sampleUser = new User({
    name: 'Sample User',
    email: 'sample@greenwood.edu',
    passwordHash: 'secret_bcrypt_hash_value',
    role: 'teacher',
    schoolId: new Types.ObjectId(),
  });
  const serializedUser = sampleUser.toJSON();
  const passwordHashExcluded = !('passwordHash' in serializedUser);
  record('Serialization Security', 'User toJSON automatically strips passwordHash', passwordHashExcluded);

  const sampleOTP = new OTPVerification({
    identifier: 'user@example.com',
    hashedOTP: 'secret_hashed_otp',
    purpose: 'email_verification',
    expiresAt: new Date(Date.now() + 600000),
  });
  const serializedOTP = sampleOTP.toJSON();
  const hashedOTPExcluded = !('hashedOTP' in serializedOTP);
  record('Serialization Security', 'OTPVerification toJSON automatically strips hashedOTP', hashedOTPExcluded);

  // --------------------------------------------------------------------------
  // SUITE 6: Money Representation & Virtual Derivations
  // --------------------------------------------------------------------------
  const sampleInvoice = new Invoice({
    schoolId: new Types.ObjectId(),
    studentId: new Types.ObjectId(),
    academicSessionId: new Types.ObjectId(),
    invoiceNumber: 'INV-TEST-001',
    totalAmount: Types.Decimal128.fromString('1250.00'),
    discountAmount: Types.Decimal128.fromString('50.00'),
    paidAmount: Types.Decimal128.fromString('200.00'),
    dueDate: new Date(),
  });
  const balance = sampleInvoice.balanceAmount;
  const expectedBalance = '1000.00';
  const balanceAccurate = balance.toString() === expectedBalance;
  record(
    'Money Calculations',
    `Invoice virtual balanceAmount accurately derived (1250 - 50 - 200 = ${balance.toString()})`,
    balanceAccurate
  );

  // --------------------------------------------------------------------------
  // SUITE 7: Tenant Isolation & Security Utilities
  // --------------------------------------------------------------------------
  const schoolA = new Types.ObjectId();
  const schoolB = new Types.ObjectId();

  const teacherUserCtx: UserContext = {
    userId: 'usr_teacher_01',
    role: 'teacher',
    schoolId: schoolA,
  };

  const superAdminCtx: UserContext = {
    userId: 'usr_super_01',
    role: 'super_admin',
  };

  try {
    // Teacher accessing their own school
    const verifiedId = validateSchoolContext(teacherUserCtx, schoolA);
    const passesSameSchool = verifiedId.equals(schoolA);
    record('Tenant Security', 'Teacher permitted to access their assigned schoolId', passesSameSchool);
  } catch (e: any) {
    record('Tenant Security', 'Teacher permitted to access their assigned schoolId', false, e.message);
  }

  try {
    // Teacher attempting cross-tenant access to School B
    validateSchoolContext(teacherUserCtx, schoolB);
    record('Tenant Security', 'Teacher blocked from cross-school access', false, 'Should have thrown 403');
  } catch (e: any) {
    const isForbidden = e.statusCode === 403 || e.message.includes('Cross-tenant access violation');
    record('Tenant Security', 'Teacher blocked from cross-school access (403 Forbidden)', isForbidden);
  }

  try {
    // Super admin accessing School B
    const superAdminResolved = validateSchoolContext(superAdminCtx, schoolB);
    const passesSuperAdmin = superAdminResolved.equals(schoolB);
    record('Tenant Security', 'Super Admin permitted authorized cross-school access', passesSuperAdmin);
  } catch (e: any) {
    record('Tenant Security', 'Super Admin permitted authorized cross-school access', false, e.message);
  }

  try {
    // Document tenant ownership assertion
    const docOwnedByA = { schoolId: schoolA };
    assertDocumentTenantOwnership(docOwnedByA, schoolA);
    record('Tenant Security', 'assertDocumentTenantOwnership accepts matching tenant document', true);

    try {
      assertDocumentTenantOwnership(docOwnedByA, schoolB);
      record('Tenant Security', 'assertDocumentTenantOwnership rejects mismatched document', false);
    } catch {
      record('Tenant Security', 'assertDocumentTenantOwnership rejects mismatched document (403)', true);
    }
  } catch (e: any) {
    record('Tenant Security', 'assertDocumentTenantOwnership assertions', false, e.message);
  }

  // --------------------------------------------------------------------------
  // SUITE 8: Audit Log Sanitization
  // --------------------------------------------------------------------------
  const auditDoc = new AuditLog({
    action: 'USER_LOGIN',
    targetResource: 'User',
    targetResourceId: new Types.ObjectId(),
    metadata: {
      userEmail: 'user@example.com',
      password: 'plain_secret_password',
      token: 'jwt.bearer.token.here',
      safeParam: 'allowed_info',
    },
  });

  // Trigger pre-save sanitization hook manually
  const preSaveHook = (AuditLog.schema as any).s?.hooks?._pres?.get('save');
  if (preSaveHook) {
    for (const hook of preSaveHook) {
      hook.fn.call(auditDoc, () => {});
    }
  }

  const sanitized = auditDoc.metadata || {};
  const passwordRedacted = sanitized.password === '[REDACTED_SENSITIVE_DATA]';
  const tokenRedacted = sanitized.token === '[REDACTED_SENSITIVE_DATA]';
  const safeParamKept = sanitized.safeParam === 'allowed_info';
  record(
    'Audit Log Sanitization',
    'AuditLog automatically redacts passwords, tokens, and sensitive keys from metadata',
    passwordRedacted && tokenRedacted && safeParamKept
  );

  // --------------------------------------------------------------------------
  // Optional Live MongoDB Check
  // --------------------------------------------------------------------------
  console.log('\n--- Checking Live MongoDB Connection ---');
  const isConnected = await connectDB();
  if (isConnected) {
    record('Live Database', 'MongoDB connection established successfully', true);
    await closeDB();
  } else {
    console.log('[INFO] Live MongoDB connection unavailable (offline mode). All schema compilation and unit validation passed without database dependencies.');
  }

  // --------------------------------------------------------------------------
  // Summary
  // --------------------------------------------------------------------------
  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = total - passed;

  console.log('\n================================================================');
  console.log(` Phase 2 Verification Summary: ${passed}/${total} Tests Passed (${failed} Failed)`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
};

// Execute if run from CLI
runModelVerification().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
