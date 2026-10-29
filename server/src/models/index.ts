// Core School & Identity Models
export * from './School.model.js';
export * from './SchoolSettings.model.js';
export * from './User.model.js';
export * from './Student.model.js';
export * from './Teacher.model.js';
export * from './Parent.model.js';

// Academic Architecture Models
export * from './AcademicSession.model.js';
export * from './Class.model.js';
export * from './Section.model.js';
export * from './Subject.model.js';
export * from './SubjectAssignment.model.js';
export * from './Enrollment.model.js';
export * from './Timetable.model.js';

// Attendance Model
export * from './Attendance.model.js';

// Financial & Invoicing Models
export * from './FeeStructure.model.js';
export * from './Invoice.model.js';
export * from './Payment.model.js';
export * from './StudentConcession.model.js';

// Homework & Learning Material Models
export * from './Homework.model.js';
export * from './AssignmentSubmission.model.js';
export * from './StudyMaterial.model.js';

// Examination & Grading Models
export * from './Exam.model.js';
export * from './ExamSubject.model.js';
export * from './Mark.model.js';
export * from './GradingScale.model.js';

// Communication, Security & Audit Models
export * from './Conversation.model.js';
export * from './Message.model.js';
export * from './Notification.model.js';
export * from './NotificationPreference.model.js';
export * from './Announcement.model.js';
export * from './OTPVerification.model.js';
export * from './AuditLog.model.js';

// Onboarding & Data Import Models (Phase 23)
export * from './SchoolOnboarding.model.js';
export * from './ImportHistory.model.js';

// Operations, Tasks & Approval Models (Phase 24)
export * from './OperationalTask.model.js';
export * from './ApprovalRequest.model.js';

// Disaster Recovery & Backup Inventory Models (Phase 28)
export * from './BackupLog.model.js';

// Plugins
export * from './plugins/tenantIsolation.plugin.js';
export * from './plugins/softDelete.plugin.js';
