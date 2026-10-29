import mongoose, { Types } from 'mongoose';
import { getAIProvider } from './ai/index.js';
import { ApiError } from '../utils/apiError.js';
import { School } from '../models/School.model.js';
import { Student } from '../models/Student.model.js';
import { Teacher } from '../models/Teacher.model.js';
import { Parent } from '../models/Parent.model.js';
import { Subject } from '../models/Subject.model.js';
import { Class } from '../models/Class.model.js';
import { AcademicSession } from '../models/AcademicSession.model.js';
import { Attendance } from '../models/Attendance.model.js';
import { Invoice } from '../models/Invoice.model.js';
import { Payment } from '../models/Payment.model.js';
import { Mark } from '../models/Mark.model.js';
import { StudyMaterial } from '../models/StudyMaterial.model.js';
import { SubjectAssignment } from '../models/SubjectAssignment.model.js';
import { AssignmentSubmission } from '../models/AssignmentSubmission.model.js';
import { verifyTeacherAuthorization } from '../utils/homework.util.js';
const getSchoolNameSafe = async (schoolId) => {
    try {
        if (mongoose.connection.readyState === 1) {
            const school = await School.findById(schoolId);
            if (school?.name)
                return school.name;
        }
    }
    catch {
        // Fallback if database query is unavailable
    }
    return 'EduManage Academy';
};
export class AIService {
    /**
     * 1. Multi-tenant Role-Scoped Chat Copilot
     */
    static async chat(params) {
        const { user, schoolId, message } = params;
        const provider = getAIProvider();
        const schoolName = await getSchoolNameSafe(schoolId);
        let roleContext = '';
        if (user.role === 'admin' || user.role === 'super_admin') {
            const studentCount = await Student.countDocuments({ schoolId, status: 'active' });
            const teacherCount = await Teacher.countDocuments({ schoolId, status: 'active' });
            const classCount = await Class.countDocuments({ schoolId, status: 'active' });
            const activeSession = await AcademicSession.findOne({ schoolId, status: 'active' });
            roleContext = `You are an AI Administrator Assistant for ${schoolName}.
Current verified institution context:
- Enrolled Active Students: ${studentCount}
- Active Teachers: ${teacherCount}
- Active Classes: ${classCount}
- Current Academic Session: ${activeSession?.name || 'Active Session'}
You have permission to assist the administrator with attendance trends, fee administration, curriculum oversight, and school announcements. Always provide clear, executive-level responses.`;
        }
        else if (user.role === 'teacher') {
            const teacherProfile = await Teacher.findOne({ userId: user._id, schoolId });
            let assignedInfo = 'General Faculty';
            if (teacherProfile) {
                const assignments = await SubjectAssignment.find({
                    teacherId: teacherProfile._id,
                    schoolId,
                    status: 'active',
                }).populate('classId', 'name').populate('subjectId', 'name');
                if (assignments.length > 0) {
                    const classSubjectList = assignments
                        .map((a) => `${a.subjectId?.name || 'Subject'} (${a.classId?.name || 'Class'})`)
                        .join(', ');
                    assignedInfo = `Assigned classes & subjects: ${classSubjectList}`;
                }
            }
            roleContext = `You are an AI Teacher Assistant for ${schoolName}.
User: Teacher ${user.firstName} ${user.lastName}.
${assignedInfo}.
You help with lesson planning, quiz preparation, explaining pedagogic concepts, and drafting report comments. Respect teacher workload and provide structured, classroom-ready materials.`;
        }
        else if (user.role === 'student') {
            const studentProfile = await Student.findOne({ userId: user._id, schoolId })
                .populate('currentClassId', 'name')
                .populate('currentSectionId', 'name');
            const className = studentProfile?.currentClassId?.name || 'General Grade';
            const sectionName = studentProfile?.currentSectionId?.name || 'A';
            roleContext = `You are an AI Study Companion for ${user.firstName} ${user.lastName}, a student in ${className} (Section ${sectionName}) at ${schoolName}.
Your goal is to guide learning through step-by-step explanations, helpful hints, and examples.
CRITICAL SAFETY & ACADEMIC INTEGRITY:
- Never provide direct solutions to cheat on tests or assignments.
- Never reveal private teacher answer keys or unpublished materials.
- Explain concepts using age-appropriate language suitable for ${className}.`;
        }
        else if (user.role === 'parent') {
            const parentProfile = await Parent.findOne({ userId: user._id, schoolId });
            let wardsDescription = 'No linked student profiles currently on file.';
            if (parentProfile?.children && parentProfile.children.length > 0) {
                const childIds = parentProfile.children.map((c) => c.studentProfileId);
                const children = await Student.find({ _id: { $in: childIds }, schoolId })
                    .populate('userId', 'firstName lastName')
                    .populate('currentClassId', 'name');
                const childSummaries = children.map((c) => {
                    const childName = `${c.userId?.firstName || ''} ${c.userId?.lastName || ''}`.trim();
                    const childClass = c.currentClassId?.name || 'Class';
                    return `${childName} (${childClass}, Admission #${c.admissionNumber})`;
                });
                wardsDescription = `Authenticated linked children: ${childSummaries.join('; ')}`;
            }
            roleContext = `You are an AI Family Assistant for ${user.firstName} ${user.lastName}, a parent at ${schoolName}.
${wardsDescription}.
CRITICAL PRIVACY:
- You may ONLY discuss and answer questions concerning the parent's authenticated linked children listed above.
- You must NEVER discuss, confirm, or reveal any data regarding other students or families.
- Maintain a warm, encouraging, and supportive partnership tone.`;
        }
        const systemPrompt = `${roleContext}
General School Assistant Rules:
- If asked about data not available in context, politely explain the boundary rather than fabricating figures.
- Keep responses concise, well-formatted, and helpful.`;
        const reply = await provider.generateText(message, {
            systemPrompt,
            temperature: 0.7,
        });
        return { reply, role: user.role };
    }
    /**
     * 2. Student Homework Helper with Age-Appropriate Guidance
     */
    static async homeworkHelp(params) {
        const { user, schoolId, question, subjectId, topic, studyMaterialId } = params;
        const provider = getAIProvider();
        let gradeLevel = 'Middle School';
        let subjectName = 'General Studies';
        let studyMaterialContext = '';
        // Verify student profile
        const studentProfile = await Student.findOne({ userId: user._id, schoolId }).populate('currentClassId', 'name');
        if (studentProfile?.currentClassId) {
            gradeLevel = studentProfile.currentClassId.name || gradeLevel;
        }
        if (subjectId) {
            const subject = await Subject.findOne({ _id: subjectId, schoolId });
            if (subject) {
                subjectName = subject.name;
            }
        }
        if (studyMaterialId) {
            const material = await StudyMaterial.findOne({ _id: studyMaterialId, schoolId });
            if (!material) {
                throw ApiError.notFound('Referenced study material not found in your school.');
            }
            // Check student authorization: student cannot access unpublished study materials
            if (user.role === 'student' && material.status !== 'published') {
                throw ApiError.forbidden('Students cannot access unpublished study materials.');
            }
            studyMaterialContext = `\nApproved Reference Material: "${material.title}". Description: ${material.description || 'N/A'}`;
        }
        const systemPrompt = `You are a dedicated Academic Homework Guide for a student in ${gradeLevel} studying ${subjectName}.
Rules:
1. Explain the underlying concepts in clear, age-appropriate language suitable for ${gradeLevel}.
2. Offer 2 to 3 pedagogical hints that guide the student toward figuring out the solution themselves.
3. Provide 1 to 2 similar practice questions for self-check.
4. Do not simply provide an immediate one-line solution to direct homework questions; encourage deep understanding.
5. Do not pretend to know an unstated teacher marking rubric.`;
        const prompt = `Student Question / Topic:
"${question}"
${topic ? `Topic: ${topic}` : ''}
${studyMaterialContext}

Please structure your response into:
1. Guided Concept Explanation
2. Helpful Step-by-Step Hints
3. Practice Questions`;
        const schemaDescription = `{
  "explanation": "Clear age-appropriate concept explanation (string)",
  "hints": ["Hint 1", "Hint 2"],
  "practiceQuestions": ["Practice question 1", "Practice question 2"]
}`;
        const structured = await provider.generateStructured(prompt, schemaDescription, { systemPrompt });
        return {
            explanation: structured.explanation,
            hints: Array.isArray(structured.hints) ? structured.hints : [],
            practiceQuestions: Array.isArray(structured.practiceQuestions)
                ? structured.practiceQuestions
                : [],
            gradeLevel,
        };
    }
    /**
     * 3. AI Quiz Generator with Strict Teacher Assignment Verification & JSON Schema Validation
     */
    static async generateQuiz(params) {
        const { user, schoolId, subjectId, classId, sectionId, topic, questionCount, difficulty, questionType, marksPerQuestion = 1, studyMaterialId, } = params;
        const provider = getAIProvider();
        // Verify school entity existence
        const [targetClass, targetSubject] = await Promise.all([
            Class.findOne({ _id: classId, schoolId }),
            Subject.findOne({ _id: subjectId, schoolId }),
        ]);
        if (!targetClass) {
            throw ApiError.notFound('Target class not found in this school.');
        }
        if (!targetSubject) {
            throw ApiError.notFound('Target subject not found in this school.');
        }
        // Server-side teacher authorization check
        if (user.role === 'teacher') {
            const teacherProfile = await Teacher.findOne({ userId: user._id, schoolId });
            if (!teacherProfile) {
                throw ApiError.forbidden('Teacher profile not found for authenticated account.');
            }
            const isAuthorized = await verifyTeacherAuthorization(new Types.ObjectId(schoolId), teacherProfile._id, new Types.ObjectId(classId), sectionId ? new Types.ObjectId(sectionId) : undefined, new Types.ObjectId(subjectId));
            if (!isAuthorized) {
                throw ApiError.forbidden('You are not authorized to create quizzes for this class, section, or subject.');
            }
        }
        let materialContext = '';
        if (studyMaterialId) {
            const material = await StudyMaterial.findOne({ _id: studyMaterialId, schoolId });
            if (!material) {
                throw ApiError.notFound('Study material reference not found in your school.');
            }
            materialContext = `Reference Study Material: "${material.title}". Summary: ${material.description || 'None'}`;
        }
        const systemPrompt = `You are an expert curriculum assessment developer.
Target Class: ${targetClass.name}
Subject: ${targetSubject.name}
Topic: ${topic}
Difficulty: ${difficulty}
Question Type: ${questionType}
Question Count: ${questionCount}
Marks per question: ${marksPerQuestion}
${materialContext}

Generate high-quality, pedagogically accurate quiz questions adhering strictly to the JSON schema.`;
        let schemaDescription = '';
        if (questionType === 'multiple_choice') {
            schemaDescription = `[
  {
    "question": "Question text here",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": "Option A (must exactly match one item in options array)",
    "explanation": "Brief reasoning for the correct option"
  }
]`;
        }
        else if (questionType === 'true_false') {
            schemaDescription = `[
  {
    "question": "Statement text here",
    "correctAnswer": "True",
    "explanation": "Brief explanation"
  }
] (correctAnswer must be either 'True' or 'False')`;
        }
        else {
            schemaDescription = `[
  {
    "question": "Question prompt here",
    "suggestedAnswer": "Key points expected in student answer",
    "markingRubric": "Criteria for awarding marks"
  }
]`;
        }
        const prompt = `Generate exactly ${questionCount} ${difficulty} level questions of type "${questionType}" for the topic "${topic}".`;
        const rawQuestions = await provider.generateStructured(prompt, schemaDescription, {
            systemPrompt,
            temperature: 0.3,
        });
        if (!Array.isArray(rawQuestions) || rawQuestions.length === 0) {
            throw ApiError.badGateway('AI provider failed to generate structured quiz questions.');
        }
        // Validate structured question format
        const validatedQuestions = rawQuestions.map((q, idx) => {
            if (!q.question || typeof q.question !== 'string') {
                throw ApiError.badGateway(`Quiz question #${idx + 1} is missing valid question text.`);
            }
            if (questionType === 'multiple_choice') {
                if (!Array.isArray(q.options) || q.options.length < 2) {
                    throw ApiError.badGateway(`Quiz question #${idx + 1} does not have at least 2 valid options.`);
                }
                if (!q.correctAnswer || !q.options.includes(q.correctAnswer)) {
                    // Fallback to first option if exact string match is off
                    q.correctAnswer = q.options[0];
                }
            }
            else if (questionType === 'true_false') {
                const normalized = String(q.correctAnswer).toLowerCase();
                q.correctAnswer = normalized.startsWith('t') ? 'True' : 'False';
            }
            return {
                ...q,
                marks: marksPerQuestion,
            };
        });
        return {
            title: `${topic} Quiz (${difficulty.toUpperCase()})`,
            topic,
            subjectId,
            classId,
            sectionId,
            difficulty,
            questionType,
            totalMarks: validatedQuestions.length * marksPerQuestion,
            questions: validatedQuestions,
            isDraft: true,
        };
    }
    /**
     * 4. AI Report-Card Comment Generator with Factual Records Only
     */
    static async generateReportCardComment(params) {
        const { user, schoolId, studentId, subjectId, academicSessionId, strengths = [], areasForImprovement = [], tone = 'encouraging', length = 'medium', } = params;
        const provider = getAIProvider();
        // Verify student exists and belongs to tenant school
        const student = await Student.findOne({ _id: studentId, schoolId }).populate('userId', 'firstName lastName');
        if (!student) {
            throw ApiError.notFound('Student profile not found in your school.');
        }
        const studentUser = student.userId;
        const studentName = `${studentUser?.firstName || 'Student'} ${studentUser?.lastName || ''}`.trim();
        // Teacher authorization check: teacher can only generate comments for students in assigned classes
        if (user.role === 'teacher') {
            const teacherProfile = await Teacher.findOne({ userId: user._id, schoolId });
            if (!teacherProfile) {
                throw ApiError.forbidden('Teacher profile not found.');
            }
            if (student.currentClassId) {
                const isAuthorized = await verifyTeacherAuthorization(new Types.ObjectId(schoolId), teacherProfile._id, student.currentClassId, student.currentSectionId || undefined, subjectId ? new Types.ObjectId(subjectId) : undefined);
                if (!isAuthorized) {
                    throw ApiError.forbidden('You are not authorized to access records for students outside your assigned classes.');
                }
            }
        }
        // 1. Fetch factual attendance statistics
        const attendanceFilter = { schoolId, studentId: student._id };
        if (academicSessionId) {
            attendanceFilter.academicSessionId = academicSessionId;
        }
        const attendanceRecords = await Attendance.find(attendanceFilter);
        let presentCount = 0;
        let absentCount = 0;
        let lateCount = 0;
        for (const rec of attendanceRecords) {
            if (rec.status === 'present')
                presentCount++;
            else if (rec.status === 'absent')
                absentCount++;
            else if (rec.status === 'late')
                lateCount++;
        }
        const totalDays = attendanceRecords.length;
        const attendanceRate = totalDays > 0 ? Math.round((presentCount / totalDays) * 100) : 0;
        const hasAttendanceRecords = totalDays > 0;
        // 2. Fetch factual academic marks
        const marksFilter = { schoolId, studentId: student._id };
        if (academicSessionId) {
            marksFilter.academicSessionId = academicSessionId;
        }
        const marksRecords = await Mark.find(marksFilter);
        let totalScoreSum = 0;
        let scoredItemsCount = 0;
        for (const m of marksRecords) {
            if (typeof m.percentage === 'number') {
                totalScoreSum += m.percentage;
                scoredItemsCount++;
            }
            else if (typeof m.marksObtained === 'number' && m.maxMarksSnapshot) {
                totalScoreSum += (m.marksObtained / m.maxMarksSnapshot) * 100;
                scoredItemsCount++;
            }
        }
        const averageScore = scoredItemsCount > 0 ? Math.round(totalScoreSum / scoredItemsCount) : 0;
        const hasMarksRecords = scoredItemsCount > 0;
        // Construct factual context (never invent missing data)
        const factualContext = `
Student: ${studentName}
Attendance Summary: ${hasAttendanceRecords
            ? `${presentCount} present, ${absentCount} absent, ${lateCount} late out of ${totalDays} school days (${attendanceRate}% attendance).`
            : 'No attendance records recorded for this evaluation period.'}
Academic Marks Summary: ${hasMarksRecords
            ? `Average score: ${averageScore}% across ${scoredItemsCount} evaluated subjects/assessments.`
            : 'No official marks recorded for this evaluation period.'}
Teacher Observed Strengths: ${strengths.length > 0 ? strengths.join(', ') : 'Consistent effort and positive classroom participation'}
Areas for Improvement: ${areasForImprovement.length > 0 ? areasForImprovement.join(', ') : 'Continued focus on consistency and revision'}`;
        const systemPrompt = `You are a professional educational assessor generating a draft report-card comment.
Tone: ${tone}
Length: ${length}
CRITICAL ETHICAL & ACCURACY RULES:
- Base all comments strictly on the provided factual attendance and performance summary.
- If attendance or marks are marked as "No records recorded", explicitly acknowledge that academic or attendance data is pending or not recorded; DO NOT invent imaginary percentages, exam grades, or fake figures.
- Provide a constructive, respectful, non-discriminatory comment suitable for official school reports.
- Avoid unsupported medical, psychological, or character diagnoses.`;
        const prompt = `Generate a report-card comment based on these factual records:
${factualContext}`;
        const comment = await provider.generateText(prompt, {
            systemPrompt,
            temperature: 0.6,
        });
        return {
            studentId: student._id.toString(),
            studentName,
            attendanceSummary: {
                totalDays,
                present: presentCount,
                absent: absentCount,
                attendanceRate,
                hasRecords: hasAttendanceRecords,
            },
            academicSummary: {
                averageScore,
                subjectsEvaluated: scoredItemsCount,
                hasRecords: hasMarksRecords,
            },
            comment,
            isDraft: true,
        };
    }
    /**
     * 5. AI Fee-Reminder Generator with Database-Verified Outstanding Balances
     */
    static async generateFeeReminder(params) {
        const { user, schoolId, invoiceId, tone = 'standard', additionalInstructions } = params;
        const provider = getAIProvider();
        // Only admin and super_admin can generate fee reminders
        if (user.role !== 'admin' && user.role !== 'super_admin') {
            throw ApiError.forbidden('Only school administrators can generate fee reminders.');
        }
        const invoice = await Invoice.findOne({ _id: invoiceId, schoolId });
        if (!invoice) {
            throw ApiError.notFound('Invoice not found in your school records.');
        }
        // Verify invoice balance and payment status strictly in database
        const balance = parseFloat(invoice.balanceAmount ? invoice.balanceAmount.toString() : '0');
        if (invoice.status === 'paid' || balance <= 0) {
            throw ApiError.badRequest('Invoice is already fully paid. Cannot generate a fee reminder.');
        }
        if (invoice.status === 'cancelled') {
            throw ApiError.badRequest('Invoice has been cancelled. Cannot generate a fee reminder.');
        }
        const schoolName = await getSchoolNameSafe(schoolId);
        // Retrieve recipient contact names
        let recipientName = 'Parent / Guardian';
        const student = await Student.findById(invoice.studentId).populate('userId', 'firstName lastName');
        const studentName = student
            ? `${student.userId?.firstName || ''} ${student.userId?.lastName || ''}`.trim()
            : 'Student';
        if (invoice.parentId) {
            const parent = await Parent.findById(invoice.parentId).populate('userId', 'firstName lastName');
            if (parent) {
                recipientName = `${parent.userId?.firstName || ''} ${parent.userId?.lastName || ''}`.trim();
            }
        }
        const dueDateFormatted = invoice.dueDate
            ? new Date(invoice.dueDate).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
            })
            : 'Upcoming';
        const systemPrompt = `You are an administrative communication aide for ${schoolName}.
Draft a polite, professional, and clear fee-reminder notice.
Tone: ${tone}
Strict Rule: Use ONLY the verified outstanding balance and due date provided. Never demand payments not recorded in the invoice.`;
        const prompt = `Please draft a fee reminder message:
Recipient: ${recipientName}
Student: ${studentName}
Invoice Number: ${invoice.invoiceNumber}
Verified Outstanding Balance: $${balance.toFixed(2)}
Due Date: ${dueDateFormatted}
${additionalInstructions ? `Additional School Instructions: ${additionalInstructions}` : ''}

Output format:
Subject: <clear email subject>
Body: <respectful message text>`;
        const schemaDescription = `{
  "subject": "Email/Notification subject line",
  "body": "Complete draft reminder text"
}`;
        const structured = await provider.generateStructured(prompt, schemaDescription, { systemPrompt });
        return {
            invoiceId: invoice._id.toString(),
            invoiceNumber: invoice.invoiceNumber,
            recipientName,
            balanceAmount: balance,
            dueDate: dueDateFormatted,
            subject: structured.subject,
            draftMessage: structured.body,
            isDraft: true,
        };
    }
    /**
     * 6. AI Notice and Event Planning Assistant
     */
    static async generateNotice(params) {
        const { user, schoolId, title, eventType, targetAudience, date, location, instructions, tone = 'formal', } = params;
        // Only admin and teachers are authorized
        if (user.role !== 'admin' && user.role !== 'super_admin' && user.role !== 'teacher') {
            throw ApiError.forbidden('Only school administrators and faculty can generate school notices.');
        }
        const provider = getAIProvider();
        const schoolName = await getSchoolNameSafe(schoolId);
        const systemPrompt = `You are a school communications coordinator drafting an official announcement for ${schoolName}.
Tone: ${tone}
Target Audience: ${targetAudience}
Event Type: ${eventType}
Rules:
- Structure the notice with an attention-grabbing heading, concise details, actionable instructions, and a warm closing.
- Do NOT invent fake dates, school holidays, or official administrative policies not provided in the inputs.`;
        const prompt = `Notice Title: ${title}
Target Audience: ${targetAudience}
Date / Time: ${date || 'To be scheduled'}
Location / Venue: ${location || 'School Campus'}
${instructions ? `Instructions / Details: ${instructions}` : ''}

Draft the complete notice text ready for administrative review.`;
        const draftNotice = await provider.generateText(prompt, {
            systemPrompt,
            temperature: 0.7,
        });
        return {
            title,
            eventType,
            targetAudience,
            date,
            location,
            draftNotice,
            isDraft: true,
        };
    }
    /**
     * 7. AI School Insights with Server-Calculated Aggregations (No Natural-to-SQL or Raw DB Access)
     */
    static async getSchoolInsights(params) {
        const { user, schoolId, insightType, classId, academicSessionId } = params;
        const provider = getAIProvider();
        // Teacher restriction: Teachers cannot view school-wide finances
        if (user.role === 'teacher' &&
            (insightType === 'fee_collection' || insightType === 'outstanding_fees')) {
            throw ApiError.forbidden('Teachers do not have permission to view institutional financial insights.');
        }
        const schoolObjectId = new Types.ObjectId(schoolId);
        let statistics = {};
        let hasData = false;
        if (insightType === 'enrollment_counts') {
            const matchFilter = { schoolId: schoolObjectId };
            if (classId)
                matchFilter.currentClassId = new Types.ObjectId(classId);
            const [totalStudents, activeCount, transferredCount] = await Promise.all([
                Student.countDocuments(matchFilter),
                Student.countDocuments({ ...matchFilter, status: 'active' }),
                Student.countDocuments({ ...matchFilter, status: 'transferred' }),
            ]);
            const classBreakdown = await Student.aggregate([
                { $match: matchFilter },
                { $group: { _id: '$currentClassId', count: { $sum: 1 } } },
            ]);
            statistics = {
                totalStudents,
                activeStudents: activeCount,
                transferredStudents: transferredCount,
                classesCount: classBreakdown.length,
            };
            hasData = totalStudents > 0;
        }
        else if (insightType === 'attendance_trends') {
            const matchFilter = { schoolId: schoolObjectId };
            if (classId)
                matchFilter.classId = new Types.ObjectId(classId);
            if (academicSessionId)
                matchFilter.academicSessionId = new Types.ObjectId(academicSessionId);
            const attendanceAggregation = await Attendance.aggregate([
                { $match: matchFilter },
                {
                    $group: {
                        _id: '$status',
                        count: { $sum: 1 },
                    },
                },
            ]);
            let present = 0;
            let absent = 0;
            let late = 0;
            let leave = 0;
            for (const item of attendanceAggregation) {
                if (item._id === 'present')
                    present = item.count;
                else if (item._id === 'absent')
                    absent = item.count;
                else if (item._id === 'late')
                    late = item.count;
                else if (item._id === 'leave')
                    leave = item.count;
            }
            const totalRecorded = present + absent + late + leave;
            const attendanceRate = totalRecorded > 0 ? Math.round((present / totalRecorded) * 100) : 0;
            statistics = {
                totalAttendanceEntries: totalRecorded,
                present,
                absent,
                late,
                leave,
                attendanceRatePercent: attendanceRate,
            };
            hasData = totalRecorded > 0;
        }
        else if (insightType === 'fee_collection') {
            const paymentAggregation = await Payment.aggregate([
                { $match: { schoolId: schoolObjectId, status: 'completed' } },
                {
                    $group: {
                        _id: null,
                        totalCollected: { $sum: '$amount' },
                        transactionCount: { $sum: 1 },
                    },
                },
            ]);
            const totalCollected = paymentAggregation[0]?.totalCollected || 0;
            const transactionCount = paymentAggregation[0]?.transactionCount || 0;
            const invoices = await Invoice.find({ schoolId: schoolObjectId });
            let totalInvoiced = 0;
            for (const inv of invoices) {
                totalInvoiced += parseFloat(inv.totalAmount ? inv.totalAmount.toString() : '0');
            }
            const collectionRate = totalInvoiced > 0 ? Math.round((totalCollected / totalInvoiced) * 100) : 0;
            statistics = {
                totalInvoiced,
                totalCollected,
                transactionCount,
                collectionRatePercent: collectionRate,
            };
            hasData = transactionCount > 0 || invoices.length > 0;
        }
        else if (insightType === 'outstanding_fees') {
            const unpaidInvoices = await Invoice.find({
                schoolId: schoolObjectId,
                status: { $in: ['issued', 'partially_paid', 'overdue'] },
            });
            let totalOutstandingBalance = 0;
            let overdueCount = 0;
            const now = new Date();
            for (const inv of unpaidInvoices) {
                const bal = parseFloat(inv.balanceAmount ? inv.balanceAmount.toString() : '0');
                totalOutstandingBalance += bal;
                if (inv.dueDate && new Date(inv.dueDate) < now) {
                    overdueCount++;
                }
            }
            statistics = {
                unpaidInvoiceCount: unpaidInvoices.length,
                overdueInvoiceCount: overdueCount,
                totalOutstandingBalance: Math.round(totalOutstandingBalance * 100) / 100,
            };
            hasData = unpaidInvoices.length > 0;
        }
        else if (insightType === 'academic_performance') {
            const matchFilter = { schoolId: schoolObjectId };
            if (academicSessionId)
                matchFilter.academicSessionId = new Types.ObjectId(academicSessionId);
            const markStats = await Mark.aggregate([
                { $match: matchFilter },
                {
                    $group: {
                        _id: null,
                        totalMarksEntered: { $sum: 1 },
                        avgPercentage: { $avg: '$percentage' },
                    },
                },
            ]);
            const totalMarksEntered = markStats[0]?.totalMarksEntered || 0;
            const avgPercentage = markStats[0]?.avgPercentage
                ? Math.round(markStats[0].avgPercentage)
                : 0;
            statistics = {
                totalMarksRecorded: totalMarksEntered,
                schoolWideAveragePercentage: avgPercentage,
            };
            hasData = totalMarksEntered > 0;
        }
        else if (insightType === 'homework_completion') {
            const submissionCounts = await AssignmentSubmission.aggregate([
                { $match: { schoolId: schoolObjectId } },
                {
                    $group: {
                        _id: '$status',
                        count: { $sum: 1 },
                    },
                },
            ]);
            let totalSubmissions = 0;
            let gradedCount = 0;
            let lateCount = 0;
            for (const group of submissionCounts) {
                totalSubmissions += group.count;
                if (group._id === 'graded')
                    gradedCount += group.count;
                if (group._id === 'late')
                    lateCount += group.count;
            }
            statistics = {
                totalSubmissions,
                gradedCount,
                lateCount,
            };
            hasData = totalSubmissions > 0;
        }
        if (!hasData) {
            return {
                insightType,
                reportingPeriod: 'Selected Academic Term',
                statistics,
                summary: 'No records found for the requested criteria in the database. No metrics or trends could be derived.',
                hasData: false,
            };
        }
        const prompt = `Here are verified, server-calculated metrics for the school:
Insight Type: ${insightType}
Calculated Metrics: ${JSON.stringify(statistics, null, 2)}

Provide a concise 2-3 bullet point executive summary highlighting key operational takeaways based ONLY on these numbers. Do not invent any additional statistics.`;
        const summary = await provider.generateText(prompt, {
            temperature: 0.4,
            systemPrompt: 'You are an Institutional Analytics Advisor. Summarize factual school metrics concisely.',
        });
        return {
            insightType,
            reportingPeriod: 'Current Academic Year',
            statistics,
            summary,
            hasData: true,
        };
    }
}
