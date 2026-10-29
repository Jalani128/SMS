import { connectDB, closeDB } from '../config/db.js';
import { logger } from '../utils/logger.js';
import { School, User, Student, Teacher, Parent, AcademicSession, Class, Section, Subject, Enrollment, Timetable, Attendance, FeeStructure, Invoice, Payment, Homework, AssignmentSubmission, StudyMaterial, Exam, ExamSubject, Mark, Conversation, Message, Notification, NotificationPreference, SchoolSettings, OTPVerification, AuditLog, SubjectAssignment, StudentConcession, GradingScale, Announcement, SchoolOnboarding, ImportHistory, OperationalTask, ApprovalRequest, BackupLog, } from '../models/index.js';
const models = [
    { name: 'School', model: School },
    { name: 'User', model: User },
    { name: 'Student', model: Student },
    { name: 'Teacher', model: Teacher },
    { name: 'Parent', model: Parent },
    { name: 'AcademicSession', model: AcademicSession },
    { name: 'Class', model: Class },
    { name: 'Section', model: Section },
    { name: 'Subject', model: Subject },
    { name: 'SubjectAssignment', model: SubjectAssignment },
    { name: 'Enrollment', model: Enrollment },
    { name: 'Timetable', model: Timetable },
    { name: 'Attendance', model: Attendance },
    { name: 'FeeStructure', model: FeeStructure },
    { name: 'StudentConcession', model: StudentConcession },
    { name: 'Invoice', model: Invoice },
    { name: 'Payment', model: Payment },
    { name: 'Homework', model: Homework },
    { name: 'AssignmentSubmission', model: AssignmentSubmission },
    { name: 'StudyMaterial', model: StudyMaterial },
    { name: 'Exam', model: Exam },
    { name: 'ExamSubject', model: ExamSubject },
    { name: 'Mark', model: Mark },
    { name: 'GradingScale', model: GradingScale },
    { name: 'Conversation', model: Conversation },
    { name: 'Message', model: Message },
    { name: 'Notification', model: Notification },
    { name: 'NotificationPreference', model: NotificationPreference },
    { name: 'Announcement', model: Announcement },
    { name: 'SchoolSettings', model: SchoolSettings },
    { name: 'OTPVerification', model: OTPVerification },
    { name: 'AuditLog', model: AuditLog },
    { name: 'SchoolOnboarding', model: SchoolOnboarding },
    { name: 'ImportHistory', model: ImportHistory },
    { name: 'OperationalTask', model: OperationalTask },
    { name: 'ApprovalRequest', model: ApprovalRequest },
    { name: 'BackupLog', model: BackupLog },
];
export const buildAllIndexes = async () => {
    logger.info('[Migration] Connecting to MongoDB to build and sync production indexes...');
    const connected = await connectDB();
    if (!connected) {
        logger.warn('[Migration] Cannot connect to MongoDB. Skipping live index build.');
        return;
    }
    let totalIndexesBuilt = 0;
    for (const { name, model } of models) {
        try {
            await model.createIndexes();
            logger.info(`[Indexes] Model ${name} indexes synchronized successfully.`);
            totalIndexesBuilt++;
        }
        catch (err) {
            logger.error(`[Indexes] Error building indexes for ${name}: ${err.message}`);
        }
    }
    logger.info(`[Migration] Finished index build across ${totalIndexesBuilt}/${models.length} models.`);
    await closeDB();
};
if (process.argv[1]?.includes('buildIndexes')) {
    buildAllIndexes()
        .then(() => {
        logger.info('[Migration] Index build script completed successfully.');
        process.exit(0);
    })
        .catch((err) => {
        logger.error('[Migration] Index build failed:', err);
        process.exit(1);
    });
}
