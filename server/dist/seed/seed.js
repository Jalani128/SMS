import { Types } from 'mongoose';
import { connectDB, closeDB } from '../config/db.js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { School, User, Student, Teacher, Parent, AcademicSession, Class, Section, Subject, Enrollment, Timetable, Attendance, FeeStructure, Invoice, Payment, Homework, AssignmentSubmission, Exam, ExamSubject, Mark, Announcement, } from '../models/index.js';
export const runSeed = async () => {
    // CRITICAL PRODUCTION SAFETY GUARD: Never seed demo users or records in production
    if (env.NODE_ENV === 'production') {
        throw new Error('SEED ABORTED: Seeding demo records in production is strictly prohibited.');
    }
    logger.info('[Seed] Initializing Phase 2 development database seed...');
    const connected = await connectDB();
    if (!connected) {
        logger.warn('[Seed] MongoDB is not running locally or unreachable. Ensure MongoDB is running to execute seed.');
        return;
    }
    try {
        const demoPassword = process.env.DEMO_USER_PASSWORD || 'SchoolDemo@2026';
        const passwordHash = await User.hashPassword(demoPassword);
        // 1. Create or update Demo School
        logger.info('[Seed] Seeding Demo School: Greenwood International Academy...');
        let school = await School.findOne({ slug: 'greenwood-international-academy' });
        if (!school) {
            school = await School.create({
                name: 'Greenwood International Academy',
                slug: 'greenwood-international-academy',
                code: 'GIA-2026',
                email: 'info@greenwood.edu',
                phone: '+1 (555) 234-5678',
                address: {
                    street: '450 Innovation Parkway',
                    city: 'Silicon Valley',
                    state: 'California',
                    postalCode: '94025',
                    country: 'United States',
                },
                status: 'active',
                emailVerificationStatus: 'verified',
                timezone: 'America/Los_Angeles',
                currency: 'USD',
                settings: {
                    academicYear: '2026-2027',
                    currency: 'USD',
                    timezone: 'America/Los_Angeles',
                    attendanceThreshold: 75,
                    feeDueGraceDays: 10,
                },
                activatedAt: new Date(),
            });
        }
        const schoolId = school._id;
        // 2. Create or update Academic Session
        logger.info('[Seed] Seeding Academic Session: 2026-2027...');
        let session = await AcademicSession.findOne({ schoolId, code: 'AY-2026-2027' });
        if (!session) {
            session = await AcademicSession.create({
                schoolId,
                name: '2026-2027 Academic Year',
                code: 'AY-2026-2027',
                startDate: new Date('2026-08-15T00:00:00.000Z'),
                endDate: new Date('2027-06-15T00:00:00.000Z'),
                isCurrent: true,
                status: 'active',
                terms: [
                    {
                        name: 'Term 1 (Fall)',
                        startDate: new Date('2026-08-15T00:00:00.000Z'),
                        endDate: new Date('2026-12-20T00:00:00.000Z'),
                    },
                    {
                        name: 'Term 2 (Spring)',
                        startDate: new Date('2027-01-10T00:00:00.000Z'),
                        endDate: new Date('2027-06-15T00:00:00.000Z'),
                    },
                ],
            });
        }
        const sessionId = session._id;
        // 3. Create Classes
        logger.info('[Seed] Seeding Classes: Grade 9 & Grade 10...');
        let class9 = await Class.findOne({ schoolId, code: 'G9' });
        if (!class9) {
            class9 = await Class.create({
                schoolId,
                name: 'Grade 9',
                code: 'G9',
                order: 9,
                description: 'Freshman High School Division',
            });
        }
        let class10 = await Class.findOne({ schoolId, code: 'G10' });
        if (!class10) {
            class10 = await Class.create({
                schoolId,
                name: 'Grade 10',
                code: 'G10',
                order: 10,
                description: 'Sophomore High School Division',
            });
        }
        const class10Id = class10._id;
        // 4. Create Sections
        logger.info('[Seed] Seeding Sections for Grade 10...');
        let section10A = await Section.findOne({ schoolId, classId: class10Id, code: 'A' });
        if (!section10A) {
            section10A = await Section.create({
                schoolId,
                classId: class10Id,
                name: 'Section A',
                code: 'A',
                capacity: 35,
                roomNumber: 'Room 204',
            });
        }
        const section10AId = section10A._id;
        // 5. Create Subjects
        logger.info('[Seed] Seeding Subjects: Physics, Mathematics, History...');
        let subPhysics = await Subject.findOne({ schoolId, code: 'PHY-101' });
        if (!subPhysics) {
            subPhysics = await Subject.create({
                schoolId,
                name: 'AP Physics Mechanics',
                code: 'PHY-101',
                type: 'core',
                department: 'Science',
                creditHours: 4,
            });
        }
        let subMath = await Subject.findOne({ schoolId, code: 'MTH-201' });
        if (!subMath) {
            subMath = await Subject.create({
                schoolId,
                name: 'Calculus BC',
                code: 'MTH-201',
                type: 'core',
                department: 'Mathematics',
                creditHours: 4,
            });
        }
        const physicsId = subPhysics._id;
        // 6. Create Users & Role Profiles
        logger.info('[Seed] Seeding User Accounts (Admin, Teacher, Student, Parent)...');
        // Super Admin (Platform-wide)
        await User.findOneAndUpdate({ email: 'superadmin@edumanage.global' }, {
            name: 'Global Platform Admin',
            email: 'superadmin@edumanage.global',
            passwordHash,
            role: 'super_admin',
            isActive: true,
            emailVerified: true,
        }, { upsert: true, new: true });
        // School Admin
        const adminUser = await User.findOneAndUpdate({ schoolId, email: 'admin@greenwood.edu' }, {
            name: 'Dr. Arthur Vance',
            email: 'admin@greenwood.edu',
            passwordHash,
            role: 'admin',
            schoolId,
            isActive: true,
            emailVerified: true,
        }, { upsert: true, new: true });
        // Teacher User & Profile
        const teacherUser = await User.findOneAndUpdate({ schoolId, email: 'clara.oswald@greenwood.edu' }, {
            name: 'Prof. Clara Oswald',
            email: 'clara.oswald@greenwood.edu',
            passwordHash,
            role: 'teacher',
            schoolId,
            isActive: true,
            emailVerified: true,
        }, { upsert: true, new: true });
        const teacherProfile = await Teacher.findOneAndUpdate({ schoolId, userId: teacherUser._id }, {
            schoolId,
            userId: teacherUser._id,
            employeeId: 'FAC-102',
            department: 'Science',
            designation: 'Senior Faculty',
            qualification: 'M.Sc. Theoretical Physics',
            specializations: ['Mechanics', 'Thermodynamics'],
            joiningDate: new Date('2022-08-01'),
            status: 'active',
        }, { upsert: true, new: true });
        // Update section class teacher
        section10A.classTeacherId = teacherProfile._id;
        await section10A.save();
        // Student User
        const studentUser = await User.findOneAndUpdate({ schoolId, email: 'liam.chen@student.greenwood.edu' }, {
            name: 'Liam Chen',
            email: 'liam.chen@student.greenwood.edu',
            passwordHash,
            role: 'student',
            schoolId,
            isActive: true,
            emailVerified: true,
        }, { upsert: true, new: true });
        // Parent User
        const parentUser = await User.findOneAndUpdate({ schoolId, email: 'sarah.chen@parent.example.com' }, {
            name: 'Sarah Chen',
            email: 'sarah.chen@parent.example.com',
            passwordHash,
            role: 'parent',
            schoolId,
            isActive: true,
            emailVerified: true,
        }, { upsert: true, new: true });
        // Student Profile
        const studentProfile = await Student.findOneAndUpdate({ schoolId, userId: studentUser._id }, {
            schoolId,
            userId: studentUser._id,
            admissionNumber: 'GIA-8812',
            rollNumber: '12',
            currentSessionId: sessionId,
            currentClassId: class10Id,
            currentSectionId: section10AId,
            dateOfBirth: new Date('2010-04-12'),
            gender: 'male',
            bloodGroup: 'O+',
            status: 'active',
            emergencyContact: {
                name: 'Sarah Chen',
                relationship: 'Mother',
                phone: '+1 555-0112',
            },
        }, { upsert: true, new: true });
        // Parent Profile linking to Student Ward
        const parentProfile = await Parent.findOneAndUpdate({ schoolId, userId: parentUser._id }, {
            schoolId,
            userId: parentUser._id,
            children: [
                {
                    studentProfileId: studentProfile._id,
                    relationship: 'mother',
                    isPrimary: true,
                },
            ],
            occupation: 'Software Engineer',
            alternatePhone: '+1 555-0113',
            address: '128 Willow Creek Lane, Silicon Valley, CA',
            status: 'active',
        }, { upsert: true, new: true });
        // Link parent profile back onto student guardians array
        studentProfile.guardians = [
            {
                parentProfileId: parentProfile._id,
                userId: parentUser._id,
                relationship: 'mother',
                isPrimary: true,
                canPickup: true,
            },
        ];
        await studentProfile.save();
        // 7. Enrollment
        logger.info('[Seed] Seeding Student Enrollment...');
        await Enrollment.findOneAndUpdate({ schoolId, studentId: studentProfile._id, academicSessionId: sessionId }, {
            schoolId,
            studentId: studentProfile._id,
            academicSessionId: sessionId,
            classId: class10Id,
            sectionId: section10AId,
            rollNumber: '12',
            status: 'enrolled',
            enrollmentDate: new Date('2026-08-15'),
        }, { upsert: true, new: true });
        // 8. Timetable Slot
        logger.info('[Seed] Seeding Class Timetable Slot...');
        await Timetable.findOneAndUpdate({
            schoolId,
            academicSessionId: sessionId,
            classId: class10Id,
            sectionId: section10AId,
            dayOfWeek: 'monday',
            startTime: '08:30',
        }, {
            schoolId,
            academicSessionId: sessionId,
            classId: class10Id,
            sectionId: section10AId,
            subjectId: physicsId,
            teacherId: teacherProfile._id,
            dayOfWeek: 'monday',
            startTime: '08:30',
            endTime: '09:15',
            room: 'Lab 302',
            status: 'active',
        }, { upsert: true, new: true });
        // 9. Attendance
        logger.info('[Seed] Seeding Attendance Record...');
        const attendanceDate = new Date();
        attendanceDate.setUTCHours(0, 0, 0, 0);
        await Attendance.findOneAndUpdate({ schoolId, studentId: studentProfile._id, date: attendanceDate }, {
            schoolId,
            studentId: studentProfile._id,
            academicSessionId: sessionId,
            classId: class10Id,
            sectionId: section10AId,
            date: attendanceDate,
            status: 'present',
            markedBy: teacherUser._id,
            remarks: 'Punctual and attentive',
        }, { upsert: true, new: true });
        // 10. Fee Structure & Invoice
        logger.info('[Seed] Seeding Fee Structure & Sample Invoice (Decimal128)...');
        let feeStructure = await FeeStructure.findOne({ schoolId, academicSessionId: sessionId, classId: class10Id });
        if (!feeStructure) {
            feeStructure = await FeeStructure.create({
                schoolId,
                academicSessionId: sessionId,
                classId: class10Id,
                name: 'Grade 10 Annual Comprehensive Fee',
                lineItems: [
                    {
                        name: 'Tuition Fee (Term 1)',
                        amount: Types.Decimal128.fromString('1100.00'),
                        frequency: 'term',
                        isOptional: false,
                    },
                    {
                        name: 'Physics Laboratory Fee',
                        amount: Types.Decimal128.fromString('150.00'),
                        frequency: 'term',
                        isOptional: false,
                    },
                ],
                concessions: [],
            });
        }
        const sampleInvoice = await Invoice.findOneAndUpdate({ schoolId, invoiceNumber: 'INV-2026-0001' }, {
            schoolId,
            studentId: studentProfile._id,
            academicSessionId: sessionId,
            feeStructureId: feeStructure._id,
            invoiceNumber: 'INV-2026-0001',
            lineItems: [
                {
                    name: 'Tuition Fee (Term 1)',
                    amount: Types.Decimal128.fromString('1100.00'),
                    quantity: 1,
                    total: Types.Decimal128.fromString('1100.00'),
                },
                {
                    name: 'Physics Laboratory Fee',
                    amount: Types.Decimal128.fromString('150.00'),
                    quantity: 1,
                    total: Types.Decimal128.fromString('150.00'),
                },
            ],
            totalAmount: Types.Decimal128.fromString('1250.00'),
            discountAmount: Types.Decimal128.fromString('0.00'),
            paidAmount: Types.Decimal128.fromString('1250.00'),
            dueDate: new Date('2026-09-30'),
            status: 'paid',
            issuedAt: new Date('2026-08-20'),
            paidAt: new Date('2026-09-15'),
        }, { upsert: true, new: true });
        // Payment record with idempotencyKey
        await Payment.findOneAndUpdate({ schoolId, idempotencyKey: 'DEMO_IDEMP_PAY_0001' }, {
            schoolId,
            invoiceId: sampleInvoice._id,
            studentId: studentProfile._id,
            paymentNumber: 'PAY-2026-0001',
            idempotencyKey: 'DEMO_IDEMP_PAY_0001',
            amount: Types.Decimal128.fromString('1250.00'),
            currency: 'USD',
            method: 'card',
            provider: 'manual',
            providerReference: 'AUTH_CH_8829402',
            status: 'successful',
            paidAt: new Date('2026-09-15'),
            recordedBy: adminUser._id,
            notes: 'Term 1 tuition cleared via card voucher',
        }, { upsert: true, new: true });
        // 11. Homework & Submission
        logger.info('[Seed] Seeding Homework & Student Submission...');
        const homework = await Homework.findOneAndUpdate({ schoolId, classId: class10Id, title: 'Thermodynamics Unit Lab Report' }, {
            schoolId,
            academicSessionId: sessionId,
            classId: class10Id,
            sectionId: section10AId,
            subjectId: physicsId,
            teacherId: teacherProfile._id,
            title: 'Thermodynamics Unit Lab Report',
            instructions: 'Complete experimental observations on heat transfer and submit laboratory write-up.',
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            maxMarks: 100,
            status: 'published',
        }, { upsert: true, new: true });
        await AssignmentSubmission.findOneAndUpdate({ schoolId, homeworkId: homework._id, studentId: studentProfile._id }, {
            schoolId,
            homeworkId: homework._id,
            studentId: studentProfile._id,
            status: 'graded',
            marksObtained: 94,
            teacherFeedback: 'Outstanding analytical rigor in thermal expansion calculations.',
            gradedBy: teacherProfile._id,
            gradedAt: new Date(),
        }, { upsert: true, new: true });
        // 12. Examination, ExamSubject, and Marks
        logger.info('[Seed] Seeding Examination & Marks...');
        const exam = await Exam.findOneAndUpdate({ schoolId, academicSessionId: sessionId, name: 'Term 1 Midterm Examinations' }, {
            schoolId,
            academicSessionId: sessionId,
            name: 'Term 1 Midterm Examinations',
            term: 'Term 1',
            startDate: new Date('2026-10-25'),
            endDate: new Date('2026-11-05'),
            status: 'scheduled',
        }, { upsert: true, new: true });
        const examSubject = await ExamSubject.findOneAndUpdate({ schoolId, examId: exam._id, classId: class10Id, subjectId: physicsId }, {
            schoolId,
            examId: exam._id,
            academicSessionId: sessionId,
            classId: class10Id,
            subjectId: physicsId,
            examDate: new Date('2026-10-28'),
            startTime: '09:00',
            endTime: '12:00',
            maxMarks: 100,
            passMarks: 40,
            room: 'Lab 302',
            status: 'completed',
        }, { upsert: true, new: true });
        await Mark.findOneAndUpdate({ schoolId, examSubjectId: examSubject._id, studentId: studentProfile._id }, {
            schoolId,
            examId: exam._id,
            examSubjectId: examSubject._id,
            academicSessionId: sessionId,
            studentId: studentProfile._id,
            enrollmentId: (await Enrollment.findOne({ studentId: studentProfile._id }))._id,
            marksObtained: 94,
            grade: 'A',
            isAbsent: false,
            remarks: 'Top score in cohort',
            enteredBy: teacherUser._id,
            publicationStatus: 'published',
        }, { upsert: true, new: true });
        // 13. Announcement
        logger.info('[Seed] Seeding Campus Announcement...');
        await Announcement.findOneAndUpdate({ schoolId, title: 'Parent-Teacher Conference Schedule' }, {
            schoolId,
            title: 'Parent-Teacher Conference Schedule',
            content: 'Parent-Teacher conferences for Term 1 will be conducted on Friday, October 24th.',
            targetAudience: 'all',
            authorId: adminUser._id,
            publishedAt: new Date(),
            status: 'published',
        }, { upsert: true, new: true });
        logger.info('===============================================================');
        logger.info(' Phase 2 Development Database Seed Complete!');
        logger.info(` School: ${school.name} (ID: ${schoolId})`);
        logger.info(' Demo Accounts Seeded (Password: DemoPassword123! or $DEMO_USER_PASSWORD):');
        logger.info(' - Super Admin: superadmin@edumanage.global');
        logger.info(' - School Admin: admin@greenwood.edu');
        logger.info(' - Teacher: clara.oswald@greenwood.edu');
        logger.info(' - Student: liam.chen@student.greenwood.edu');
        logger.info(' - Parent: sarah.chen@parent.example.com');
        logger.info('===============================================================');
    }
    catch (error) {
        logger.error('[Seed] Error encountered during database seed:', error);
        throw error;
    }
    finally {
        await closeDB();
    }
};
// Execute if run directly from CLI
if (import.meta.url.endsWith(process.argv[1]) || process.argv[1]?.includes('seed.ts')) {
    runSeed().catch((err) => {
        console.error(err);
        process.exit(1);
    });
}
