import { Types } from 'mongoose';
import { ApiError } from '../utils/apiError.js';
import { Student } from '../models/Student.model.js';
import { Teacher } from '../models/Teacher.model.js';
import { Parent } from '../models/Parent.model.js';
import { Class } from '../models/Class.model.js';
import { Section } from '../models/Section.model.js';
import { Enrollment } from '../models/Enrollment.model.js';
import { Attendance } from '../models/Attendance.model.js';
import { Invoice } from '../models/Invoice.model.js';
import { Payment } from '../models/Payment.model.js';
import { Homework } from '../models/Homework.model.js';
import { AssignmentSubmission } from '../models/AssignmentSubmission.model.js';
import { Mark } from '../models/Mark.model.js';
import { SchoolSettings } from '../models/SchoolSettings.model.js';
import { OperationalTask } from '../models/OperationalTask.model.js';
import { ApprovalRequest } from '../models/ApprovalRequest.model.js';
import { verifyTeacherAuthorization } from '../utils/homework.util.js';
import { analyticsCache, buildAnalyticsCacheKey } from '../utils/cache.js';
/**
 * Robust CSV Cell Sanitizer preventing spreadsheet formula injection (DDE attacks)
 * and properly escaping RFC-4180 quotes, commas, and line breaks.
 */
export const sanitizeCsvCell = (value) => {
    if (value === null || value === undefined) {
        return '""';
    }
    let str = String(value).trim();
    // Prevent formula injection if cell begins with =, +, -, @, \t, or \r
    if (/^[=+\-@\t\r]/.test(str)) {
        str = `'${str}`;
    }
    // Escape inner double quotes by doubling them up
    const escaped = str.replace(/"/g, '""');
    return `"${escaped}"`;
};
/**
 * Calculates date range boundaries with maximum 365-day safeguard
 */
export const calculateDateBoundaries = (timeframe, startDateStr, endDateStr) => {
    const now = new Date();
    let end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    let start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30, 0, 0, 0, 0);
    if (timeframe === 'today') {
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    }
    else if (timeframe === 'week') {
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7, 0, 0, 0, 0);
    }
    else if (timeframe === 'month') {
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30, 0, 0, 0, 0);
    }
    else if (timeframe === 'term') {
        start = new Date(now.getFullYear(), now.getMonth() - 4, now.getDate(), 0, 0, 0, 0);
    }
    else if (timeframe === 'year') {
        start = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate(), 0, 0, 0, 0);
    }
    else if (startDateStr || endDateStr) {
        if (startDateStr) {
            start = new Date(startDateStr);
            start.setHours(0, 0, 0, 0);
        }
        if (endDateStr) {
            end = new Date(endDateStr);
            end.setHours(23, 59, 59, 999);
        }
    }
    // Enforce chronological ordering
    if (start > end) {
        const temp = start;
        start = end;
        end = temp;
    }
    // Enforce maximum 365-day range to prevent runaway queries
    const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays > 366) {
        start = new Date(end.getTime() - 365 * 24 * 60 * 60 * 1000);
        start.setHours(0, 0, 0, 0);
    }
    return { startDate: start, endDate: end };
};
export class ReportService {
    /**
     * 1. Overview Dashboard Analytics
     */
    static async getDashboardAnalytics(schoolId, user, filters) {
        const cacheKey = buildAnalyticsCacheKey(schoolId, user.role, 'dashboard', filters);
        const cached = analyticsCache.get(cacheKey);
        if (cached) {
            return cached;
        }
        const schoolObjectId = new Types.ObjectId(schoolId);
        const { startDate, endDate } = calculateDateBoundaries(filters.timeframe, filters.startDate, filters.endDate);
        // 1. Core Entity Counts
        const [activeStudents, activeTeachers, activeClasses, activeSections] = await Promise.all([
            Student.countDocuments({ schoolId: schoolObjectId, status: 'active' }),
            Teacher.countDocuments({ schoolId: schoolObjectId, status: 'active' }),
            Class.countDocuments({ schoolId: schoolObjectId, status: 'active' }),
            Section.countDocuments({ schoolId: schoolObjectId, status: 'active' }),
        ]);
        // 2. Today's Attendance Metric
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);
        const todayAttendance = await Attendance.aggregate([
            {
                $match: {
                    schoolId: schoolObjectId,
                    attendanceDate: { $gte: todayStart, $lte: todayEnd },
                },
            },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 },
                },
            },
        ]);
        let todayPresent = 0;
        let todayLate = 0;
        let todayTotal = 0;
        for (const item of todayAttendance) {
            todayTotal += item.count;
            if (item._id === 'present')
                todayPresent += item.count;
            if (item._id === 'late')
                todayLate += item.count;
        }
        const todayAttendanceRate = todayTotal > 0 ? Number((((todayPresent + todayLate) / todayTotal) * 100).toFixed(1)) : 0.0;
        // 3. Attendance Trend (Daily aggregated over bounded period)
        const attendanceTrends = await Attendance.aggregate([
            {
                $match: {
                    schoolId: schoolObjectId,
                    attendanceDate: { $gte: startDate, $lte: endDate },
                },
            },
            {
                $group: {
                    _id: {
                        $dateToString: { format: '%Y-%m-%d', date: '$attendanceDate' },
                    },
                    total: { $sum: 1 },
                    present: {
                        $sum: { $cond: [{ $in: ['$status', ['present', 'late']] }, 1, 0] },
                    },
                },
            },
            { $sort: { _id: 1 } },
        ]);
        const formattedAttendanceTrends = attendanceTrends.map((t) => ({
            date: t._id,
            total: t.total,
            present: t.present,
            rate: t.total > 0 ? Number(((t.present / t.total) * 100).toFixed(1)) : 0.0,
        }));
        // 4. Financial Metrics (Authorized exclusively for Admin and SuperAdmin)
        let financialSummary = null;
        const isAdmin = user.role === 'admin' || user.role === 'super_admin';
        if (isAdmin) {
            const paymentAggregation = await Payment.aggregate([
                {
                    $match: {
                        schoolId: schoolObjectId,
                        paidAt: { $gte: startDate, $lte: endDate },
                        status: 'successful',
                        isReversed: { $ne: true },
                    },
                },
                {
                    $group: {
                        _id: null,
                        totalGrossCollected: { $sum: '$amount' },
                        successfulCount: { $sum: 1 },
                    },
                },
            ]);
            const refundAggregation = await Payment.aggregate([
                {
                    $match: {
                        schoolId: schoolObjectId,
                        paidAt: { $gte: startDate, $lte: endDate },
                        status: 'refunded',
                    },
                },
                {
                    $group: {
                        _id: null,
                        totalRefunded: { $sum: '$amount' },
                    },
                },
            ]);
            const totalGross = parseFloat(paymentAggregation[0]?.totalGrossCollected?.toString() || '0');
            const totalRefunds = parseFloat(refundAggregation[0]?.totalRefunded?.toString() || '0');
            const netCollected = Math.max(0, Math.round((totalGross - totalRefunds) * 100) / 100);
            // Outstanding and Overdue Invoices
            const now = new Date();
            const unpaidInvoices = await Invoice.find({
                schoolId: schoolObjectId,
                status: { $in: ['issued', 'partially_paid', 'overdue'] },
            })
                .select('balanceAmount totalAmount dueDate status')
                .lean();
            let totalOutstandingBalance = 0;
            let totalOverdueBalance = 0;
            let overdueCount = 0;
            for (const inv of unpaidInvoices) {
                const bal = parseFloat(inv.balanceAmount ? inv.balanceAmount.toString() : '0');
                totalOutstandingBalance += bal;
                if (inv.dueDate && new Date(inv.dueDate) < now) {
                    totalOverdueBalance += bal;
                    overdueCount++;
                }
            }
            financialSummary = {
                grossCollected: Math.round(totalGross * 100) / 100,
                netCollected,
                refunds: Math.round(totalRefunds * 100) / 100,
                outstandingBalance: Math.round(totalOutstandingBalance * 100) / 100,
                overdueBalance: Math.round(totalOverdueBalance * 100) / 100,
                unpaidInvoicesCount: unpaidInvoices.length,
                overdueInvoicesCount: overdueCount,
            };
        }
        // 5. Recent Academic Performance (Published Results Only)
        const academicPerformance = await Mark.aggregate([
            {
                $match: {
                    schoolId: schoolObjectId,
                    publicationStatus: 'published',
                    isAbsent: false,
                    isExempt: false,
                },
            },
            {
                $group: {
                    _id: null,
                    totalEvaluated: { $sum: 1 },
                    passedCount: { $sum: { $cond: ['$isPassed', 1, 0] } },
                    avgPercentage: { $avg: '$percentage' },
                },
            },
        ]);
        const evaluatedCount = academicPerformance[0]?.totalEvaluated || 0;
        const passedCount = academicPerformance[0]?.passedCount || 0;
        const avgScore = academicPerformance[0]?.avgPercentage
            ? Number(academicPerformance[0].avgPercentage.toFixed(1))
            : 0.0;
        const overallPassRate = evaluatedCount > 0 ? Number(((passedCount / evaluatedCount) * 100).toFixed(1)) : 0.0;
        // 6. Homework Completion Trend
        const homeworkStats = await AssignmentSubmission.aggregate([
            { $match: { schoolId: schoolObjectId } },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 },
                },
            },
        ]);
        let totalSubmissions = 0;
        let lateSubmissions = 0;
        let gradedSubmissions = 0;
        for (const h of homeworkStats) {
            totalSubmissions += h.count;
            if (h._id === 'late')
                lateSubmissions += h.count;
            if (h._id === 'graded')
                gradedSubmissions += h.count;
        }
        const result = {
            reportingPeriod: {
                startDate: startDate.toISOString().split('T')[0],
                endDate: endDate.toISOString().split('T')[0],
            },
            entityCounts: {
                students: activeStudents,
                teachers: activeTeachers,
                classes: activeClasses,
                sections: activeSections,
            },
            attendance: {
                todayTotal,
                todayPresent: todayPresent + todayLate,
                todayAttendanceRate,
                trends: formattedAttendanceTrends,
            },
            finances: financialSummary,
            academics: {
                evaluatedCount,
                passedCount,
                averagePercentage: avgScore,
                passRate: overallPassRate,
            },
            homework: {
                totalSubmissions,
                lateSubmissions,
                gradedSubmissions,
            },
        };
        analyticsCache.set(cacheKey, result, 30000, schoolId);
        return result;
    }
    /**
     * 2. Attendance Reports with Class-Wise Summaries and Absenteeism Insights
     */
    static async getAttendanceReport(schoolId, user, filters) {
        const schoolObjectId = new Types.ObjectId(schoolId);
        const { startDate, endDate } = calculateDateBoundaries(filters.timeframe, filters.startDate, filters.endDate);
        const matchQuery = {
            schoolId: schoolObjectId,
            attendanceDate: { $gte: startDate, $lte: endDate },
        };
        if (filters.academicSessionId) {
            matchQuery.academicSessionId = new Types.ObjectId(filters.academicSessionId);
        }
        if (filters.classId) {
            matchQuery.classId = new Types.ObjectId(filters.classId);
        }
        if (filters.sectionId) {
            matchQuery.sectionId = new Types.ObjectId(filters.sectionId);
        }
        if (filters.studentId) {
            matchQuery.studentId = new Types.ObjectId(filters.studentId);
        }
        // Teacher assignment authorization restriction
        if (user.role === 'teacher') {
            const teacherProfile = await Teacher.findOne({ userId: user._id, schoolId: schoolObjectId });
            if (teacherProfile?.assignedClassIds && teacherProfile.assignedClassIds.length > 0) {
                if (filters.classId) {
                    const authorized = teacherProfile.assignedClassIds.some((c) => c.toString() === filters.classId);
                    if (!authorized) {
                        throw ApiError.forbidden('Teachers cannot access attendance reports for unassigned classes.');
                    }
                }
                else {
                    matchQuery.classId = { $in: teacherProfile.assignedClassIds };
                }
            }
        }
        // Overall Status Breakdown
        const statusAggregation = await Attendance.aggregate([
            { $match: matchQuery },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 },
                },
            },
        ]);
        let presentCount = 0;
        let absentCount = 0;
        let lateCount = 0;
        let leaveCount = 0;
        for (const item of statusAggregation) {
            if (item._id === 'present')
                presentCount = item.count;
            else if (item._id === 'absent')
                absentCount = item.count;
            else if (item._id === 'late')
                lateCount = item.count;
            else if (item._id === 'leave')
                leaveCount = item.count;
        }
        const totalRecords = presentCount + absentCount + lateCount + leaveCount;
        // Standard formula: Present and Late count towards attended attendance; Leave/excused tracked separately
        const attendanceRate = totalRecords > 0
            ? Number((((presentCount + lateCount) / totalRecords) * 100).toFixed(1))
            : 0.0;
        // Daily Trend
        const dailyBreakdown = await Attendance.aggregate([
            { $match: matchQuery },
            {
                $group: {
                    _id: { $dateToString: { format: '%Y-%m-%d', date: '$attendanceDate' } },
                    total: { $sum: 1 },
                    present: { $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] } },
                    absent: { $sum: { $cond: [{ $eq: ['$status', 'absent'] }, 1, 0] } },
                    late: { $sum: { $cond: [{ $eq: ['$status', 'late'] }, 1, 0] } },
                    leave: { $sum: { $cond: [{ $eq: ['$status', 'leave'] }, 1, 0] } },
                },
            },
            { $sort: { _id: 1 } },
        ]);
        // Class-Wise Attendance Summary
        const classSummaryAggregation = await Attendance.aggregate([
            { $match: matchQuery },
            {
                $group: {
                    _id: '$classId',
                    total: { $sum: 1 },
                    present: { $sum: { $cond: [{ $in: ['$status', ['present', 'late']] }, 1, 0] } },
                    absent: { $sum: { $cond: [{ $eq: ['$status', 'absent'] }, 1, 0] } },
                },
            },
            {
                $lookup: {
                    from: 'classes',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'classDoc',
                },
            },
            { $unwind: { path: '$classDoc', preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    classId: '$_id',
                    className: { $ifNull: ['$classDoc.name', 'Unassigned Class'] },
                    total: 1,
                    present: 1,
                    absent: 1,
                    attendanceRate: {
                        $cond: [
                            { $gt: ['$total', 0] },
                            { $round: [{ $multiply: [{ $divide: ['$present', '$total'] }, 100] }, 1] },
                            0,
                        ],
                    },
                },
            },
            { $sort: { className: 1 } },
        ]);
        // Frequent Absentees (Top 10 students with highest absences in the period)
        const frequentAbsentees = await Attendance.aggregate([
            { $match: { ...matchQuery, status: 'absent' } },
            {
                $group: {
                    _id: '$studentId',
                    absenceCount: { $sum: 1 },
                },
            },
            { $sort: { absenceCount: -1 } },
            { $limit: 10 },
            {
                $lookup: {
                    from: 'students',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'studentDoc',
                },
            },
            { $unwind: '$studentDoc' },
            {
                $lookup: {
                    from: 'users',
                    localField: 'studentDoc.userId',
                    foreignField: '_id',
                    as: 'userDoc',
                },
            },
            { $unwind: { path: '$userDoc', preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    studentId: '$_id',
                    admissionNumber: '$studentDoc.admissionNumber',
                    studentName: {
                        $concat: [
                            { $ifNull: ['$userDoc.firstName', 'Student'] },
                            ' ',
                            { $ifNull: ['$userDoc.lastName', ''] },
                        ],
                    },
                    absenceCount: 1,
                },
            },
        ]);
        return {
            reportingPeriod: {
                startDate: startDate.toISOString().split('T')[0],
                endDate: endDate.toISOString().split('T')[0],
            },
            summary: {
                totalRecordedDays: totalRecords,
                presentCount,
                absentCount,
                lateCount,
                leaveCount,
                attendanceRate,
            },
            dailyTrends: dailyBreakdown.map((d) => ({
                date: d._id,
                total: d.total,
                present: d.present,
                absent: d.absent,
                late: d.late,
                leave: d.leave,
                rate: d.total > 0 ? Number((((d.present + d.late) / d.total) * 100).toFixed(1)) : 0.0,
            })),
            classSummaries: classSummaryAggregation,
            frequentAbsentees,
        };
    }
    /**
     * 3. Fee & Financial Reports (Admin Only)
     */
    static async getFeeFinanceReport(schoolId, user, filters) {
        if (user.role !== 'admin' && user.role !== 'super_admin') {
            throw ApiError.forbidden('Access denied: Only school administrators can access financial reports.');
        }
        const schoolObjectId = new Types.ObjectId(schoolId);
        const { startDate, endDate } = calculateDateBoundaries(filters.timeframe, filters.startDate, filters.endDate);
        // 1. Payment Collections (Gross, Net, Refunds)
        const payments = await Payment.find({
            schoolId: schoolObjectId,
            paidAt: { $gte: startDate, $lte: endDate },
        })
            .select('amount status method isReversed paidAt')
            .lean();
        let grossCollected = 0;
        let totalRefunds = 0;
        let successfulCount = 0;
        let refundedCount = 0;
        const methodBreakdown = {
            cash: 0,
            card: 0,
            bank_transfer: 0,
            cheque: 0,
            online: 0,
            other: 0,
        };
        for (const p of payments) {
            const amt = parseFloat(p.amount ? p.amount.toString() : '0');
            if (p.status === 'successful' && !p.isReversed) {
                grossCollected += amt;
                successfulCount++;
                const m = p.method || 'other';
                methodBreakdown[m] = (methodBreakdown[m] || 0) + amt;
            }
            else if (p.status === 'refunded' || p.isReversed) {
                totalRefunds += amt;
                refundedCount++;
            }
        }
        const netCollected = Math.max(0, Math.round((grossCollected - totalRefunds) * 100) / 100);
        // 2. Invoicing Statistics & Aging Balances
        const invoiceQuery = { schoolId: schoolObjectId };
        if (filters.academicSessionId) {
            invoiceQuery.academicSessionId = new Types.ObjectId(filters.academicSessionId);
        }
        if (filters.classId) {
            invoiceQuery.classId = new Types.ObjectId(filters.classId);
        }
        const invoices = await Invoice.find(invoiceQuery)
            .select('totalAmount discountAmount paidAmount lateFee balanceAmount dueDate status classId')
            .lean();
        let totalInvoiced = 0;
        let totalOutstandingBalance = 0;
        let totalOverdueBalance = 0;
        const statusCounts = {
            paid: 0,
            partially_paid: 0,
            issued: 0,
            overdue: 0,
            draft: 0,
            cancelled: 0,
        };
        const now = new Date();
        for (const inv of invoices) {
            const tot = parseFloat(inv.totalAmount ? inv.totalAmount.toString() : '0');
            const bal = parseFloat(inv.balanceAmount ? inv.balanceAmount.toString() : '0');
            totalInvoiced += tot;
            if (inv.status && statusCounts[inv.status] !== undefined) {
                statusCounts[inv.status]++;
            }
            if (['issued', 'partially_paid', 'overdue'].includes(inv.status)) {
                totalOutstandingBalance += bal;
                if (inv.dueDate && new Date(inv.dueDate) < now) {
                    totalOverdueBalance += bal;
                }
            }
        }
        const collectionRate = totalInvoiced > 0 ? Number(((grossCollected / totalInvoiced) * 100).toFixed(1)) : 0.0;
        return {
            reportingPeriod: {
                startDate: startDate.toISOString().split('T')[0],
                endDate: endDate.toISOString().split('T')[0],
            },
            collections: {
                grossCollected: Math.round(grossCollected * 100) / 100,
                netCollected,
                refunds: Math.round(totalRefunds * 100) / 100,
                successfulTransactions: successfulCount,
                refundedTransactions: refundedCount,
                collectionRatePercentage: collectionRate,
            },
            invoicing: {
                totalInvoicedAmount: Math.round(totalInvoiced * 100) / 100,
                totalOutstandingBalance: Math.round(totalOutstandingBalance * 100) / 100,
                totalOverdueBalance: Math.round(totalOverdueBalance * 100) / 100,
                invoiceCountsByStatus: statusCounts,
            },
            paymentMethods: Object.entries(methodBreakdown).map(([method, amount]) => ({
                method,
                amount: Math.round(amount * 100) / 100,
            })),
        };
    }
    /**
     * 4. Student Enrollment Reports with Duplicate-Free Unique Student Counts
     */
    static async getStudentEnrollmentReport(schoolId, user, filters) {
        const schoolObjectId = new Types.ObjectId(schoolId);
        // 1. Total Unique Active Student Count
        const totalActiveStudents = await Student.countDocuments({
            schoolId: schoolObjectId,
            status: 'active',
        });
        const statusBreakdown = await Student.aggregate([
            { $match: { schoolId: schoolObjectId } },
            { $group: { _id: '$status', count: { $sum: 1 } } },
        ]);
        // 2. Class & Section Enrolled Breakdown (deduplicating multiple session records)
        const enrollmentMatch = { schoolId: schoolObjectId, status: 'enrolled' };
        if (filters.academicSessionId) {
            enrollmentMatch.academicSessionId = new Types.ObjectId(filters.academicSessionId);
        }
        const classEnrollments = await Enrollment.aggregate([
            { $match: enrollmentMatch },
            {
                $group: {
                    _id: { classId: '$classId', sectionId: '$sectionId' },
                    uniqueStudents: { $addToSet: '$studentId' },
                },
            },
            {
                $project: {
                    classId: '$_id.classId',
                    sectionId: '$_id.sectionId',
                    studentCount: { $size: '$uniqueStudents' },
                },
            },
            {
                $lookup: {
                    from: 'classes',
                    localField: 'classId',
                    foreignField: '_id',
                    as: 'classDoc',
                },
            },
            { $unwind: { path: '$classDoc', preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: 'sections',
                    localField: 'sectionId',
                    foreignField: '_id',
                    as: 'sectionDoc',
                },
            },
            { $unwind: { path: '$sectionDoc', preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    classId: 1,
                    className: { $ifNull: ['$classDoc.name', 'Unassigned Class'] },
                    sectionId: 1,
                    sectionName: { $ifNull: ['$sectionDoc.name', 'Unassigned Section'] },
                    studentCount: 1,
                },
            },
            { $sort: { className: 1, sectionName: 1 } },
        ]);
        // 3. Paginated Student Records
        const page = filters.page || 1;
        const limit = filters.limit || 20;
        const skip = (page - 1) * limit;
        const studentFilter = { schoolId: schoolObjectId };
        if (filters.classId)
            studentFilter.currentClassId = new Types.ObjectId(filters.classId);
        if (filters.sectionId)
            studentFilter.currentSectionId = new Types.ObjectId(filters.sectionId);
        const [students, totalFiltered] = await Promise.all([
            Student.find(studentFilter)
                .populate('userId', 'firstName lastName email gender')
                .populate('currentClassId', 'name')
                .populate('currentSectionId', 'name')
                .skip(skip)
                .limit(limit)
                .sort({ admissionNumber: 1 }),
            Student.countDocuments(studentFilter),
        ]);
        const formattedStudents = students.map((s) => ({
            studentId: s._id.toString(),
            admissionNumber: s.admissionNumber,
            name: `${s.userId?.firstName || ''} ${s.userId?.lastName || ''}`.trim(),
            email: s.userId?.email || '',
            class: s.currentClassId?.name || '--',
            section: s.currentSectionId?.name || '--',
            status: s.status,
            admissionDate: s.admissionDate ? s.admissionDate.toISOString().split('T')[0] : '--',
        }));
        return {
            summary: {
                totalActiveStudents,
                totalStudentsAcrossAllStatuses: statusBreakdown.reduce((acc, curr) => acc + curr.count, 0),
                statusDistribution: statusBreakdown.reduce((acc, item) => ({ ...acc, [item._id]: item.count }), {}),
            },
            cohortDistribution: classEnrollments,
            pagination: {
                page,
                limit,
                totalPages: Math.ceil(totalFiltered / limit),
                totalRecords: totalFiltered,
            },
            students: formattedStudents,
        };
    }
    /**
     * 5. Academic Performance Reports (Finalized/Published Results Only)
     */
    static async getAcademicPerformanceReport(schoolId, user, filters) {
        const schoolObjectId = new Types.ObjectId(schoolId);
        const matchQuery = { schoolId: schoolObjectId };
        // Student & Parent role restriction: strictly published marks only
        if (user.role === 'student' || user.role === 'parent') {
            matchQuery.publicationStatus = 'published';
        }
        else {
            // For Admin and Teacher, default to published or verified
            matchQuery.publicationStatus = { $in: ['verified', 'published'] };
        }
        if (filters.academicSessionId) {
            matchQuery.academicSessionId = new Types.ObjectId(filters.academicSessionId);
        }
        if (filters.examId) {
            matchQuery.examId = new Types.ObjectId(filters.examId);
        }
        // Exclude unfinalized, absent, and exempt marks from percentage denominator
        matchQuery.isAbsent = false;
        matchQuery.isExempt = false;
        // Overall Marks Performance Summary
        const overallStats = await Mark.aggregate([
            { $match: matchQuery },
            {
                $group: {
                    _id: null,
                    totalEvaluated: { $sum: 1 },
                    passedCount: { $sum: { $cond: ['$isPassed', 1, 0] } },
                    avgScore: { $avg: '$percentage' },
                    highestScore: { $max: '$percentage' },
                    lowestScore: { $min: '$percentage' },
                },
            },
        ]);
        const totalEvaluated = overallStats[0]?.totalEvaluated || 0;
        const passedCount = overallStats[0]?.passedCount || 0;
        const passRate = totalEvaluated > 0 ? Number(((passedCount / totalEvaluated) * 100).toFixed(1)) : 0.0;
        const averagePercentage = overallStats[0]?.avgScore
            ? Number(overallStats[0].avgScore.toFixed(1))
            : 0.0;
        const highestPercentage = overallStats[0]?.highestScore
            ? Number(overallStats[0].highestScore.toFixed(1))
            : 0.0;
        const lowestPercentage = overallStats[0]?.lowestScore
            ? Number(overallStats[0].lowestScore.toFixed(1))
            : 0.0;
        // Grade Distribution
        const gradeDistribution = await Mark.aggregate([
            { $match: matchQuery },
            {
                $group: {
                    _id: { $ifNull: ['$grade', 'Ungraded'] },
                    count: { $sum: 1 },
                },
            },
            { $sort: { _id: 1 } },
        ]);
        return {
            performanceSummary: {
                totalEvaluatedAssessments: totalEvaluated,
                passedCount,
                failedCount: Math.max(0, totalEvaluated - passedCount),
                passRatePercentage: passRate,
                averagePercentage,
                highestPercentage,
                lowestPercentage,
            },
            gradeDistribution: gradeDistribution.map((g) => ({
                grade: g._id,
                count: g.count,
            })),
        };
    }
    /**
     * 6. Homework and Assignment Reports
     */
    static async getHomeworkReport(schoolId, user, filters) {
        const schoolObjectId = new Types.ObjectId(schoolId);
        const { startDate, endDate } = calculateDateBoundaries(filters.timeframe, filters.startDate, filters.endDate);
        const homeworkQuery = {
            schoolId: schoolObjectId,
            createdAt: { $gte: startDate, $lte: endDate },
        };
        if (filters.academicSessionId) {
            homeworkQuery.academicSessionId = new Types.ObjectId(filters.academicSessionId);
        }
        if (filters.classId) {
            homeworkQuery.classId = new Types.ObjectId(filters.classId);
        }
        if (filters.subjectId) {
            homeworkQuery.subjectId = new Types.ObjectId(filters.subjectId);
        }
        const assignments = await Homework.find(homeworkQuery)
            .select('_id title classId sectionId subjectId dueDate status')
            .lean();
        const assignmentIds = assignments.map((a) => a._id);
        // Aggregate submissions, deduplicating resubmissions per student-homework pair
        const submissions = await AssignmentSubmission.aggregate([
            {
                $match: {
                    schoolId: schoolObjectId,
                    homeworkId: { $in: assignmentIds },
                },
            },
            {
                $group: {
                    _id: { homeworkId: '$homeworkId', studentId: '$studentId' },
                    status: { $last: '$status' },
                    submittedAt: { $last: '$submittedAt' },
                },
            },
        ]);
        let onTimeCount = 0;
        let lateCount = 0;
        let gradedCount = 0;
        for (const sub of submissions) {
            if (sub.status === 'late')
                lateCount++;
            else if (sub.status === 'graded')
                gradedCount++;
            else
                onTimeCount++;
        }
        const uniqueSubmissionsCount = submissions.length;
        return {
            reportingPeriod: {
                startDate: startDate.toISOString().split('T')[0],
                endDate: endDate.toISOString().split('T')[0],
            },
            assignmentsCount: assignments.length,
            submissions: {
                totalUniqueSubmissions: uniqueSubmissionsCount,
                onTimeSubmissions: onTimeCount,
                lateSubmissions: lateCount,
                gradedSubmissions: gradedCount,
            },
        };
    }
    /**
     * 7. Consolidated Single Student Report (Role-Protected)
     */
    static async getStudentReport(schoolId, user, studentId) {
        const schoolObjectId = new Types.ObjectId(schoolId);
        const studentObjectId = new Types.ObjectId(studentId);
        // 1. Role Authorization Matrix
        if (user.role === 'student') {
            const selfStudent = await Student.findOne({ userId: user._id, schoolId: schoolObjectId });
            if (!selfStudent || selfStudent._id.toString() !== studentId) {
                throw ApiError.forbidden('Students can only access their own performance reports.');
            }
        }
        else if (user.role === 'parent') {
            const parentProfile = await Parent.findOne({ userId: user._id, schoolId: schoolObjectId });
            const isLinkedWard = parentProfile?.children.some((c) => c.studentProfileId.toString() === studentId);
            if (!isLinkedWard) {
                throw ApiError.forbidden('Parents can only access reports for their authenticated linked children.');
            }
        }
        // 2. Fetch Student Profile
        const student = await Student.findOne({ _id: studentObjectId, schoolId: schoolObjectId })
            .populate('userId', 'firstName lastName email gender')
            .populate('currentClassId', 'name')
            .populate('currentSectionId', 'name');
        if (!student) {
            throw ApiError.notFound('Student profile not found in your school records.');
        }
        // Teacher Class Assignment Verification
        if (user.role === 'teacher') {
            const teacherProfile = await Teacher.findOne({ userId: user._id, schoolId: schoolObjectId });
            if (student.currentClassId && teacherProfile) {
                const authorized = await verifyTeacherAuthorization(schoolObjectId, teacherProfile._id, student.currentClassId._id, student.currentSectionId?._id);
                if (!authorized) {
                    throw ApiError.forbidden('Teachers cannot access reports for students outside their assigned classes.');
                }
            }
        }
        // 3. Attendance Summary
        const attendanceRecords = await Attendance.find({
            schoolId: schoolObjectId,
            studentId: studentObjectId,
        })
            .select('status attendanceDate')
            .lean();
        let present = 0;
        let absent = 0;
        let late = 0;
        let leave = 0;
        for (const a of attendanceRecords) {
            if (a.status === 'present')
                present++;
            else if (a.status === 'absent')
                absent++;
            else if (a.status === 'late')
                late++;
            else if (a.status === 'leave')
                leave++;
        }
        const totalDays = present + absent + late + leave;
        const attendanceRate = totalDays > 0 ? Number((((present + late) / totalDays) * 100).toFixed(1)) : 0.0;
        // 4. Academic Scorecard (Published marks only for student/parent)
        const marksQuery = { schoolId: schoolObjectId, studentId: studentObjectId };
        if (user.role === 'student' || user.role === 'parent') {
            marksQuery.publicationStatus = 'published';
        }
        const marks = await Mark.find(marksQuery)
            .populate('examId', 'name')
            .populate('examSubjectId', 'maxMarks passMarks')
            .sort({ createdAt: -1 })
            .lean();
        const academicResults = marks.map((m) => ({
            examName: m.examId?.name || 'Assessment',
            marksObtained: m.marksObtained,
            maxMarks: m.maxMarksSnapshot || m.examSubjectId?.maxMarks || 100,
            percentage: m.percentage,
            grade: m.grade || '--',
            isPassed: m.isPassed,
            isAbsent: m.isAbsent,
        }));
        // 5. Fee Ledger (Excluded for students, permitted for Admin & Parent)
        let feeSummary = null;
        if (user.role === 'admin' || user.role === 'super_admin' || user.role === 'parent') {
            const invoices = await Invoice.find({
                schoolId: schoolObjectId,
                studentId: studentObjectId,
            })
                .select('invoiceNumber totalAmount balanceAmount dueDate status')
                .lean();
            let totalInvoiced = 0;
            let totalBalance = 0;
            for (const inv of invoices) {
                totalInvoiced += parseFloat(inv.totalAmount?.toString() || '0');
                totalBalance += parseFloat(inv.balanceAmount?.toString() || '0');
            }
            feeSummary = {
                totalInvoiced: Math.round(totalInvoiced * 100) / 100,
                outstandingBalance: Math.round(totalBalance * 100) / 100,
                invoices: invoices.map((inv) => ({
                    invoiceNumber: inv.invoiceNumber,
                    balance: parseFloat(inv.balanceAmount?.toString() || '0'),
                    status: inv.status,
                    dueDate: inv.dueDate ? inv.dueDate.toISOString().split('T')[0] : '--',
                })),
            };
        }
        return {
            profile: {
                studentId: student._id.toString(),
                admissionNumber: student.admissionNumber,
                name: `${student.userId?.firstName || ''} ${student.userId?.lastName || ''}`.trim(),
                class: student.currentClassId?.name || '--',
                section: student.currentSectionId?.name || '--',
                status: student.status,
            },
            attendance: {
                totalDays,
                present,
                absent,
                late,
                leave,
                attendanceRate,
            },
            academics: academicResults,
            fees: feeSummary,
        };
    }
    /**
     * 8. CSV Export Serializer with Full Formula Injection Protection
     */
    static generateCsv(reportType, data) {
        const lines = [];
        if (reportType === 'attendance') {
            lines.push(['Date', 'Total Recorded', 'Present', 'Absent', 'Late', 'Leave', 'Attendance Rate %'].map(sanitizeCsvCell).join(','));
            if (Array.isArray(data.dailyTrends)) {
                for (const row of data.dailyTrends) {
                    lines.push([
                        sanitizeCsvCell(row.date),
                        sanitizeCsvCell(row.total),
                        sanitizeCsvCell(row.present),
                        sanitizeCsvCell(row.absent),
                        sanitizeCsvCell(row.late),
                        sanitizeCsvCell(row.leave),
                        sanitizeCsvCell(row.rate),
                    ].join(','));
                }
            }
        }
        else if (reportType === 'fees') {
            lines.push(['Category', 'Amount ($)'].map(sanitizeCsvCell).join(','));
            if (data.collections) {
                lines.push([sanitizeCsvCell('Gross Collections'), sanitizeCsvCell(data.collections.grossCollected)].join(','));
                lines.push([sanitizeCsvCell('Refunds & Reversals'), sanitizeCsvCell(data.collections.refunds)].join(','));
                lines.push([sanitizeCsvCell('Net Collections'), sanitizeCsvCell(data.collections.netCollected)].join(','));
            }
            if (data.invoicing) {
                lines.push([sanitizeCsvCell('Total Invoiced'), sanitizeCsvCell(data.invoicing.totalInvoicedAmount)].join(','));
                lines.push([sanitizeCsvCell('Outstanding Balance'), sanitizeCsvCell(data.invoicing.totalOutstandingBalance)].join(','));
                lines.push([sanitizeCsvCell('Overdue Balance'), sanitizeCsvCell(data.invoicing.totalOverdueBalance)].join(','));
            }
        }
        else if (reportType === 'students') {
            lines.push(['Admission Number', 'Student Name', 'Class', 'Section', 'Status', 'Admission Date'].map(sanitizeCsvCell).join(','));
            if (Array.isArray(data.students)) {
                for (const s of data.students) {
                    lines.push([
                        sanitizeCsvCell(s.admissionNumber),
                        sanitizeCsvCell(s.name),
                        sanitizeCsvCell(s.class),
                        sanitizeCsvCell(s.section),
                        sanitizeCsvCell(s.status),
                        sanitizeCsvCell(s.admissionDate),
                    ].join(','));
                }
            }
        }
        else if (reportType === 'academic') {
            lines.push(['Metric', 'Value'].map(sanitizeCsvCell).join(','));
            if (data.performanceSummary) {
                lines.push([sanitizeCsvCell('Total Evaluated Assessments'), sanitizeCsvCell(data.performanceSummary.totalEvaluatedAssessments)].join(','));
                lines.push([sanitizeCsvCell('Pass Rate %'), sanitizeCsvCell(data.performanceSummary.passRatePercentage)].join(','));
                lines.push([sanitizeCsvCell('Average Percentage %'), sanitizeCsvCell(data.performanceSummary.averagePercentage)].join(','));
                lines.push([sanitizeCsvCell('Highest Score %'), sanitizeCsvCell(data.performanceSummary.highestPercentage)].join(','));
                lines.push([sanitizeCsvCell('Lowest Score %'), sanitizeCsvCell(data.performanceSummary.lowestPercentage)].join(','));
            }
        }
        else if (reportType === 'homework') {
            lines.push(['Metric', 'Count'].map(sanitizeCsvCell).join(','));
            lines.push([sanitizeCsvCell('Total Created Assignments'), sanitizeCsvCell(data.assignmentsCount)].join(','));
            if (data.submissions) {
                lines.push([sanitizeCsvCell('Unique Submissions'), sanitizeCsvCell(data.submissions.totalUniqueSubmissions)].join(','));
                lines.push([sanitizeCsvCell('On-Time Submissions'), sanitizeCsvCell(data.submissions.onTimeSubmissions)].join(','));
                lines.push([sanitizeCsvCell('Late Submissions'), sanitizeCsvCell(data.submissions.lateSubmissions)].join(','));
                lines.push([sanitizeCsvCell('Graded Submissions'), sanitizeCsvCell(data.submissions.gradedSubmissions)].join(','));
            }
        }
        return lines.join('\r\n');
    }
    /**
     * 8. Phase 25: Comprehensive Advanced Analytics Overview with Period Comparisons
     */
    static async getAdvancedAnalyticsOverview(schoolId, user, filters) {
        const cacheKey = buildAnalyticsCacheKey(schoolId, user.role, 'advanced-overview', filters);
        const cached = analyticsCache.get(cacheKey);
        if (cached) {
            return cached;
        }
        const schoolObjectId = new Types.ObjectId(schoolId);
        const { startDate, endDate } = calculateDateBoundaries(filters.timeframe, filters.startDate, filters.endDate);
        // Compute previous equivalent comparison period
        const durationMs = Math.max(86400000, endDate.getTime() - startDate.getTime());
        const prevEndDate = new Date(startDate.getTime() - 1);
        const prevStartDate = new Date(prevEndDate.getTime() - durationMs);
        const settings = await SchoolSettings.findOne({ schoolId: schoolObjectId });
        const currency = settings?.regional?.currencyCode || 'USD';
        const lowAttThreshold = settings?.attendance?.minimumAttendancePercentage || 75;
        const isAdmin = user.role === 'admin' || user.role === 'super_admin';
        // -----------------------------------------------------------------------
        // A. Student Enrollment Analytics
        // -----------------------------------------------------------------------
        const [totalActiveStudents, totalEnrolledAllTime, newAdmissionsCurrent, newAdmissionsPrior, statusCountsAgg, cohortAgg,] = await Promise.all([
            Student.countDocuments({ schoolId: schoolObjectId, status: 'active', isDeleted: false }),
            Student.countDocuments({ schoolId: schoolObjectId, isDeleted: false }),
            Student.countDocuments({
                schoolId: schoolObjectId,
                admissionDate: { $gte: startDate, $lte: endDate },
                isDeleted: false,
            }),
            Student.countDocuments({
                schoolId: schoolObjectId,
                admissionDate: { $gte: prevStartDate, $lte: prevEndDate },
                isDeleted: false,
            }),
            Student.aggregate([
                { $match: { schoolId: schoolObjectId, isDeleted: false } },
                { $group: { _id: '$status', count: { $sum: 1 } } },
            ]),
            Class.aggregate([
                { $match: { schoolId: schoolObjectId, isDeleted: false } },
                {
                    $lookup: {
                        from: 'students',
                        localField: '_id',
                        foreignField: 'classId',
                        as: 'classStudents',
                    },
                },
                {
                    $project: {
                        className: '$name',
                        studentCount: {
                            $size: {
                                $filter: {
                                    input: '$classStudents',
                                    as: 's',
                                    cond: { $and: [{ $eq: ['$$s.status', 'active'] }, { $eq: ['$$s.isDeleted', false] }] },
                                },
                            },
                        },
                    },
                },
                { $sort: { className: 1 } },
            ]),
        ]);
        const admissionsGrowthPercentage = newAdmissionsPrior > 0
            ? Number((((newAdmissionsCurrent - newAdmissionsPrior) / newAdmissionsPrior) * 100).toFixed(1))
            : newAdmissionsCurrent > 0
                ? 100.0
                : 0.0;
        const statusBreakdown = {
            active: 0,
            inactive: 0,
            transferred: 0,
            graduated: 0,
        };
        for (const sc of statusCountsAgg) {
            if (sc._id)
                statusBreakdown[sc._id] = sc.count;
        }
        // -----------------------------------------------------------------------
        // B. Attendance Analytics
        // -----------------------------------------------------------------------
        const [currentAttAgg, priorAttAgg, classWiseAttAgg, studentLowAttAgg] = await Promise.all([
            Attendance.aggregate([
                {
                    $match: {
                        schoolId: schoolObjectId,
                        date: { $gte: startDate, $lte: endDate },
                        isDeleted: false,
                    },
                },
                {
                    $group: {
                        _id: '$status',
                        count: { $sum: 1 },
                    },
                },
            ]),
            Attendance.aggregate([
                {
                    $match: {
                        schoolId: schoolObjectId,
                        date: { $gte: prevStartDate, $lte: prevEndDate },
                        isDeleted: false,
                    },
                },
                {
                    $group: {
                        _id: '$status',
                        count: { $sum: 1 },
                    },
                },
            ]),
            Attendance.aggregate([
                {
                    $match: {
                        schoolId: schoolObjectId,
                        date: { $gte: startDate, $lte: endDate },
                        isDeleted: false,
                    },
                },
                {
                    $group: {
                        _id: '$classId',
                        total: { $sum: 1 },
                        present: {
                            $sum: { $cond: [{ $in: ['$status', ['present', 'late']] }, 1, 0] },
                        },
                    },
                },
                {
                    $lookup: {
                        from: 'classes',
                        localField: '_id',
                        foreignField: '_id',
                        as: 'classDoc',
                    },
                },
                {
                    $project: {
                        classId: '$_id',
                        className: { $ifNull: [{ $arrayElemAt: ['$classDoc.name', 0] }, 'Unassigned'] },
                        total: 1,
                        present: 1,
                        rate: {
                            $cond: [{ $gt: ['$total', 0] }, { $multiply: [{ $divide: ['$present', '$total'] }, 100] }, 0],
                        },
                    },
                },
                { $sort: { className: 1 } },
            ]),
            Attendance.aggregate([
                {
                    $match: {
                        schoolId: schoolObjectId,
                        date: { $gte: startDate, $lte: endDate },
                        isDeleted: false,
                    },
                },
                {
                    $group: {
                        _id: '$studentId',
                        totalRecorded: { $sum: 1 },
                        presentCount: {
                            $sum: { $cond: [{ $in: ['$status', ['present', 'late']] }, 1, 0] },
                        },
                    },
                },
                {
                    $project: {
                        studentId: '$_id',
                        totalRecorded: 1,
                        presentCount: 1,
                        rate: {
                            $cond: [
                                { $gt: ['$totalRecorded', 0] },
                                { $multiply: [{ $divide: ['$presentCount', '$totalRecorded'] }, 100] },
                                0,
                            ],
                        },
                    },
                },
                { $match: { rate: { $lt: lowAttThreshold }, totalRecorded: { $gte: 3 } } },
            ]),
        ]);
        let currPresent = 0;
        let currLate = 0;
        let currAbsent = 0;
        let currLeave = 0;
        let currTotal = 0;
        for (const item of currentAttAgg) {
            currTotal += item.count;
            if (item._id === 'present')
                currPresent += item.count;
            if (item._id === 'late')
                currLate += item.count;
            if (item._id === 'absent')
                currAbsent += item.count;
            if (item._id === 'leave')
                currLeave += item.count;
        }
        const currentAttendanceRate = currTotal > 0 ? Number((((currPresent + currLate) / currTotal) * 100).toFixed(1)) : 0.0;
        let priorTotal = 0;
        let priorPresent = 0;
        for (const item of priorAttAgg) {
            priorTotal += item.count;
            if (item._id === 'present' || item._id === 'late')
                priorPresent += item.count;
        }
        const priorAttendanceRate = priorTotal > 0 ? Number(((priorPresent / priorTotal) * 100).toFixed(1)) : 0.0;
        const attendanceRateDelta = Number((currentAttendanceRate - priorAttendanceRate).toFixed(1));
        // -----------------------------------------------------------------------
        // C. Fee Collection & Financial Analytics (Authorized for Admin)
        // -----------------------------------------------------------------------
        let financialData = null;
        if (isAdmin) {
            const [currentPaymentAgg, currentRefundAgg, priorPaymentAgg, priorRefundAgg, allInvoices, paymentMethodsAgg,] = await Promise.all([
                Payment.aggregate([
                    {
                        $match: {
                            schoolId: schoolObjectId,
                            paidAt: { $gte: startDate, $lte: endDate },
                            status: 'successful',
                            isReversed: { $ne: true },
                        },
                    },
                    {
                        $group: {
                            _id: null,
                            grossCollected: { $sum: '$amount' },
                            transactionCount: { $sum: 1 },
                        },
                    },
                ]),
                Payment.aggregate([
                    {
                        $match: {
                            schoolId: schoolObjectId,
                            paidAt: { $gte: startDate, $lte: endDate },
                            status: 'refunded',
                        },
                    },
                    { $group: { _id: null, totalRefunded: { $sum: '$amount' } } },
                ]),
                Payment.aggregate([
                    {
                        $match: {
                            schoolId: schoolObjectId,
                            paidAt: { $gte: prevStartDate, $lte: prevEndDate },
                            status: 'successful',
                            isReversed: { $ne: true },
                        },
                    },
                    { $group: { _id: null, grossCollected: { $sum: '$amount' } } },
                ]),
                Payment.aggregate([
                    {
                        $match: {
                            schoolId: schoolObjectId,
                            paidAt: { $gte: prevStartDate, $lte: prevEndDate },
                            status: 'refunded',
                        },
                    },
                    { $group: { _id: null, totalRefunded: { $sum: '$amount' } } },
                ]),
                Invoice.find({
                    schoolId: schoolObjectId,
                    isDeleted: false,
                    status: { $ne: 'cancelled' },
                })
                    .select('totalAmount paidAmount balanceAmount dueDate status classId')
                    .lean(),
                Payment.aggregate([
                    {
                        $match: {
                            schoolId: schoolObjectId,
                            paidAt: { $gte: startDate, $lte: endDate },
                            status: 'successful',
                            isReversed: { $ne: true },
                        },
                    },
                    {
                        $group: {
                            _id: '$paymentMethod',
                            totalAmount: { $sum: '$amount' },
                            count: { $sum: 1 },
                        },
                    },
                ]),
            ]);
            const currGross = Number(currentPaymentAgg[0]?.grossCollected?.toString() || '0');
            const currRefunds = Number(currentRefundAgg[0]?.totalRefunded?.toString() || '0');
            const currNet = Math.max(0, currGross - currRefunds);
            const priorGross = Number(priorPaymentAgg[0]?.grossCollected?.toString() || '0');
            const priorRefunds = Number(priorRefundAgg[0]?.totalRefunded?.toString() || '0');
            const priorNet = Math.max(0, priorGross - priorRefunds);
            const collectionGrowthPercentage = priorNet > 0
                ? Number((((currNet - priorNet) / priorNet) * 100).toFixed(1))
                : currNet > 0
                    ? 100.0
                    : 0.0;
            let totalInvoiced = 0;
            let totalOutstanding = 0;
            let totalOverdue = 0;
            let overdueInvoicesCount = 0;
            const now = new Date();
            for (const inv of allInvoices) {
                const total = Number(inv.totalAmount?.toString() || '0');
                const balance = inv.balanceAmount !== undefined
                    ? Number(inv.balanceAmount.toString())
                    : total - Number(inv.paidAmount?.toString() || '0');
                totalInvoiced += total;
                if (balance > 0) {
                    totalOutstanding += balance;
                    if (inv.dueDate && new Date(inv.dueDate) < now) {
                        totalOverdue += balance;
                        overdueInvoicesCount++;
                    }
                }
            }
            financialData = {
                currency,
                grossCollected: Math.round(currGross * 100) / 100,
                netCollected: Math.round(currNet * 100) / 100,
                refunds: Math.round(currRefunds * 100) / 100,
                priorNetCollected: Math.round(priorNet * 100) / 100,
                collectionGrowthPercentage,
                totalInvoiced: Math.round(totalInvoiced * 100) / 100,
                totalOutstanding: Math.round(totalOutstanding * 100) / 100,
                totalOverdue: Math.round(totalOverdue * 100) / 100,
                overdueInvoicesCount,
                paymentMethods: paymentMethodsAgg.map((pm) => ({
                    method: pm._id || 'other',
                    amount: Math.round(Number(pm.totalAmount?.toString() || '0') * 100) / 100,
                    count: pm.count,
                })),
            };
        }
        // -----------------------------------------------------------------------
        // D. Academic Performance Analytics (Published Results Only)
        // -----------------------------------------------------------------------
        const [academicAgg, gradeDistAgg, supportCount] = await Promise.all([
            Mark.aggregate([
                {
                    $match: {
                        schoolId: schoolObjectId,
                        publicationStatus: 'published',
                        isAbsent: false,
                        isExempt: false,
                    },
                },
                {
                    $group: {
                        _id: null,
                        totalEvaluated: { $sum: 1 },
                        passedCount: { $sum: { $cond: ['$isPassed', 1, 0] } },
                        avgScore: { $avg: '$percentage' },
                        highestScore: { $max: '$percentage' },
                        lowestScore: { $min: '$percentage' },
                    },
                },
            ]),
            Mark.aggregate([
                {
                    $match: {
                        schoolId: schoolObjectId,
                        publicationStatus: 'published',
                        isAbsent: false,
                        isExempt: false,
                        grade: { $exists: true, $ne: '' },
                    },
                },
                {
                    $group: {
                        _id: '$grade',
                        count: { $sum: 1 },
                    },
                },
                { $sort: { _id: 1 } },
            ]),
            Mark.countDocuments({
                schoolId: schoolObjectId,
                publicationStatus: 'published',
                isAbsent: false,
                isExempt: false,
                percentage: { $lt: 50 },
            }),
        ]);
        const totalEvaluated = academicAgg[0]?.totalEvaluated || 0;
        const passedAssessments = academicAgg[0]?.passedCount || 0;
        const averageScore = academicAgg[0]?.avgScore ? Number(academicAgg[0].avgScore.toFixed(1)) : 0.0;
        const passRatePercentage = totalEvaluated > 0 ? Number(((passedAssessments / totalEvaluated) * 100).toFixed(1)) : 0.0;
        // -----------------------------------------------------------------------
        // E. Homework & Assignment Analytics
        // -----------------------------------------------------------------------
        const [hwPublishedCount, hwSubmissionsAgg] = await Promise.all([
            Homework.countDocuments({
                schoolId: schoolObjectId,
                status: 'published',
                createdAt: { $gte: startDate, $lte: endDate },
                isDeleted: false,
            }),
            AssignmentSubmission.aggregate([
                {
                    $match: {
                        schoolId: schoolObjectId,
                        submittedAt: { $gte: startDate, $lte: endDate },
                        isDeleted: false,
                    },
                },
                {
                    $group: {
                        _id: null,
                        totalSubmissions: { $sum: 1 },
                        onTimeSubmissions: { $sum: { $cond: ['$isLate', 0, 1] } },
                        lateSubmissions: { $sum: { $cond: ['$isLate', 1, 0] } },
                        gradedSubmissions: { $sum: { $cond: ['$isGradeReleased', 1, 0] } },
                    },
                },
            ]),
        ]);
        const totalSubmissions = hwSubmissionsAgg[0]?.totalSubmissions || 0;
        const onTimeSubmissions = hwSubmissionsAgg[0]?.onTimeSubmissions || 0;
        const lateSubmissions = hwSubmissionsAgg[0]?.lateSubmissions || 0;
        const gradedSubmissions = hwSubmissionsAgg[0]?.gradedSubmissions || 0;
        const pendingGradingCount = Math.max(0, totalSubmissions - gradedSubmissions);
        // -----------------------------------------------------------------------
        // F. Operations & Workload Analytics (Admin Only)
        // -----------------------------------------------------------------------
        let operationsData = null;
        if (isAdmin) {
            const [activeTeachersCount, openTasksCount, overdueTasksCount, completedTasksCount, pendingApprovalsCount,] = await Promise.all([
                Teacher.countDocuments({ schoolId: schoolObjectId, status: 'active', isDeleted: false }),
                OperationalTask.countDocuments({
                    schoolId: schoolObjectId,
                    status: { $in: ['pending', 'in_progress'] },
                    isDeleted: false,
                }),
                OperationalTask.countDocuments({
                    schoolId: schoolObjectId,
                    status: { $in: ['pending', 'in_progress'] },
                    dueDate: { $lt: new Date() },
                    isDeleted: false,
                }),
                OperationalTask.countDocuments({
                    schoolId: schoolObjectId,
                    status: 'completed',
                    isDeleted: false,
                }),
                ApprovalRequest.countDocuments({
                    schoolId: schoolObjectId,
                    status: 'pending',
                    isDeleted: false,
                }),
            ]);
            operationsData = {
                activeTeachersCount,
                openTasksCount,
                overdueTasksCount,
                completedTasksCount,
                pendingApprovalsCount,
            };
        }
        // -----------------------------------------------------------------------
        // G. Transparent Decision Support Insights
        // -----------------------------------------------------------------------
        const insights = [];
        // Attendance Insight
        if (attendanceRateDelta > 0) {
            insights.push({
                category: 'attendance',
                title: 'Attendance Upward Velocity',
                observation: `Campus attendance rate increased by ${attendanceRateDelta}% compared to the prior period (${currentAttendanceRate}% vs ${priorAttendanceRate}%).`,
                trend: 'positive',
            });
        }
        else if (attendanceRateDelta < 0) {
            insights.push({
                category: 'attendance',
                title: 'Attendance Softening Notice',
                observation: `Attendance rate contracted by ${Math.abs(attendanceRateDelta)}% compared to the prior period. ${studentLowAttAgg.length} students have fallen below the ${lowAttThreshold}% threshold.`,
                trend: 'negative',
            });
        }
        else {
            insights.push({
                category: 'attendance',
                title: 'Steady Attendance Velocity',
                observation: `Overall attendance rate remained stable at ${currentAttendanceRate}% over the evaluated window.`,
                trend: 'neutral',
            });
        }
        // Financial Insight (Admin)
        if (isAdmin && financialData) {
            if (financialData.collectionGrowthPercentage > 0) {
                insights.push({
                    category: 'finances',
                    title: 'Strong Collection Realization',
                    observation: `Net tuition collections grew by +${financialData.collectionGrowthPercentage}% period-over-period, yielding ${currency} ${financialData.netCollected.toLocaleString()}.`,
                    trend: 'positive',
                });
            }
            else {
                insights.push({
                    category: 'finances',
                    title: 'Outstanding Receivables Attention',
                    observation: `${currency} ${financialData.totalOverdue.toLocaleString()} remains overdue across ${financialData.overdueInvoicesCount} invoices. Consider triggering automated fee follow-ups.`,
                    trend: 'neutral',
                });
            }
        }
        // Academic Insight
        if (totalEvaluated > 0) {
            insights.push({
                category: 'academics',
                title: 'Assessment Mastery Summary',
                observation: `Published examinations reflect an overall pass rate of ${passRatePercentage}% with an institutional average score of ${averageScore}%. ${supportCount} assessments require academic support intervention.`,
                trend: passRatePercentage >= 80 ? 'positive' : 'neutral',
            });
        }
        // Homework Insight
        if (hwPublishedCount > 0) {
            insights.push({
                category: 'homework',
                title: 'Assignment Evaluation Flow',
                observation: `${totalSubmissions} submissions recorded across ${hwPublishedCount} published assignments. ${pendingGradingCount} submissions currently await faculty evaluation.`,
                trend: pendingGradingCount > 10 ? 'neutral' : 'positive',
            });
        }
        // Operations Insight (Admin)
        if (isAdmin && operationsData) {
            insights.push({
                category: 'operations',
                title: 'Institutional Workflow Status',
                observation: `${operationsData.openTasksCount} operational tasks currently in progress (${operationsData.overdueTasksCount} overdue) with ${operationsData.pendingApprovalsCount} administrative approvals pending.`,
                trend: operationsData.overdueTasksCount > 0 ? 'negative' : 'positive',
            });
        }
        const result = {
            reportingPeriod: {
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString(),
            },
            comparisonPeriod: {
                startDate: prevStartDate.toISOString(),
                endDate: prevEndDate.toISOString(),
            },
            enrollment: {
                totalActiveStudents,
                totalEnrolledAllTime,
                newAdmissionsCurrent,
                newAdmissionsPrior,
                admissionsGrowthPercentage,
                statusBreakdown,
                cohortDistribution: cohortAgg.map((c) => ({
                    className: c.className,
                    studentCount: c.studentCount,
                })),
            },
            attendance: {
                currentAttendanceRate,
                priorAttendanceRate,
                attendanceRateDelta,
                statusCounts: {
                    present: currPresent,
                    late: currLate,
                    absent: currAbsent,
                    leave: currLeave,
                    total: currTotal,
                },
                classWiseAttendance: classWiseAttAgg.map((cw) => ({
                    classId: cw.classId?.toString(),
                    className: cw.className,
                    rate: Number(cw.rate.toFixed(1)),
                    total: cw.total,
                    present: cw.present,
                })),
                lowAttendanceCount: studentLowAttAgg.length,
                threshold: lowAttThreshold,
            },
            finances: financialData,
            academics: {
                totalEvaluated,
                passedAssessments,
                averageScore,
                passRatePercentage,
                highestScore: academicAgg[0]?.highestScore ? Number(academicAgg[0].highestScore.toFixed(1)) : 0,
                lowestScore: academicAgg[0]?.lowestScore ? Number(academicAgg[0].lowestScore.toFixed(1)) : 0,
                gradeDistribution: gradeDistAgg.map((gd) => ({
                    grade: gd._id,
                    count: gd.count,
                })),
                supportRequiredCount: supportCount,
            },
            homework: {
                publishedAssignmentsCount: hwPublishedCount,
                totalSubmissions,
                onTimeSubmissions,
                lateSubmissions,
                gradedSubmissions,
                pendingGradingCount,
            },
            operations: operationsData,
            insights,
        };
        analyticsCache.set(cacheKey, result, 30000, schoolId);
        return result;
    }
    /**
     * 9. Phase 25: Export Comprehensive Advanced Analytics as Formatted RFC-4180 CSV
     */
    static exportAdvancedAnalyticsCsv(data) {
        const lines = [];
        lines.push([
            sanitizeCsvCell('EDUMANAGE ADVANCED ANALYTICS & INSTITUTIONAL PERFORMANCE REPORT'),
        ].join(','));
        lines.push([
            sanitizeCsvCell('Reporting Window'),
            sanitizeCsvCell(`${data.reportingPeriod?.startDate} to ${data.reportingPeriod?.endDate}`),
        ].join(','));
        lines.push([
            sanitizeCsvCell('Comparison Window'),
            sanitizeCsvCell(`${data.comparisonPeriod?.startDate} to ${data.comparisonPeriod?.endDate}`),
        ].join(','));
        lines.push('');
        // Section 1: Executive KPI Metrics
        lines.push([sanitizeCsvCell('--- 1. EXECUTIVE KPI SUMMARY ---')].join(','));
        lines.push(['Category', 'Metric', 'Current Period', 'Prior Period / Benchmark'].map(sanitizeCsvCell).join(','));
        lines.push([
            sanitizeCsvCell('Enrollment'),
            sanitizeCsvCell('Active Students'),
            sanitizeCsvCell(data.enrollment?.totalActiveStudents),
            sanitizeCsvCell('Total All Time: ' + data.enrollment?.totalEnrolledAllTime),
        ].join(','));
        lines.push([
            sanitizeCsvCell('Enrollment'),
            sanitizeCsvCell('New Admissions'),
            sanitizeCsvCell(data.enrollment?.newAdmissionsCurrent),
            sanitizeCsvCell(data.enrollment?.newAdmissionsPrior + ` (${data.enrollment?.admissionsGrowthPercentage}%)`),
        ].join(','));
        lines.push([
            sanitizeCsvCell('Attendance'),
            sanitizeCsvCell('Attendance Rate'),
            sanitizeCsvCell(data.attendance?.currentAttendanceRate + '%'),
            sanitizeCsvCell(data.attendance?.priorAttendanceRate + `% (${data.attendance?.attendanceRateDelta >= 0 ? '+' : ''}${data.attendance?.attendanceRateDelta}%)`),
        ].join(','));
        if (data.finances) {
            lines.push([
                sanitizeCsvCell('Finances'),
                sanitizeCsvCell('Net Tuition Collections'),
                sanitizeCsvCell(data.finances.currency + ' ' + data.finances.netCollected),
                sanitizeCsvCell(data.finances.currency + ' ' + data.finances.priorNetCollected + ` (${data.finances.collectionGrowthPercentage}%)`),
            ].join(','));
            lines.push([
                sanitizeCsvCell('Finances'),
                sanitizeCsvCell('Total Invoiced'),
                sanitizeCsvCell(data.finances.currency + ' ' + data.finances.totalInvoiced),
                sanitizeCsvCell('Outstanding: ' + data.finances.currency + ' ' + data.finances.totalOutstanding),
            ].join(','));
        }
        lines.push([
            sanitizeCsvCell('Academics'),
            sanitizeCsvCell('Overall Pass Rate'),
            sanitizeCsvCell(data.academics?.passRatePercentage + '%'),
            sanitizeCsvCell('Avg Score: ' + data.academics?.averageScore + '%'),
        ].join(','));
        lines.push([
            sanitizeCsvCell('Homework'),
            sanitizeCsvCell('Submissions Recorded'),
            sanitizeCsvCell(data.homework?.totalSubmissions),
            sanitizeCsvCell('Pending Grading: ' + data.homework?.pendingGradingCount),
        ].join(','));
        lines.push('');
        // Section 2: Attendance by Class Breakdown
        if (Array.isArray(data.attendance?.classWiseAttendance) && data.attendance.classWiseAttendance.length > 0) {
            lines.push([sanitizeCsvCell('--- 2. CLASS-WISE ATTENDANCE BREAKDOWN ---')].join(','));
            lines.push(['Class Name', 'Recorded Days', 'Present Records', 'Attendance Rate %'].map(sanitizeCsvCell).join(','));
            for (const row of data.attendance.classWiseAttendance) {
                lines.push([
                    sanitizeCsvCell(row.className),
                    sanitizeCsvCell(row.total),
                    sanitizeCsvCell(row.present),
                    sanitizeCsvCell(row.rate + '%'),
                ].join(','));
            }
            lines.push('');
        }
        // Section 3: Cohort Distribution
        if (Array.isArray(data.enrollment?.cohortDistribution) && data.enrollment.cohortDistribution.length > 0) {
            lines.push([sanitizeCsvCell('--- 3. STUDENT COHORT DISTRIBUTION ---')].join(','));
            lines.push(['Class Name', 'Active Students Enrolled'].map(sanitizeCsvCell).join(','));
            for (const row of data.enrollment.cohortDistribution) {
                lines.push([
                    sanitizeCsvCell(row.className),
                    sanitizeCsvCell(row.studentCount),
                ].join(','));
            }
            lines.push('');
        }
        // Section 4: Transparent Insights
        if (Array.isArray(data.insights) && data.insights.length > 0) {
            lines.push([sanitizeCsvCell('--- 4. INSTITUTIONAL PERFORMANCE INSIGHTS ---')].join(','));
            lines.push(['Domain', 'Observation Title', 'Observation Details'].map(sanitizeCsvCell).join(','));
            for (const ins of data.insights) {
                lines.push([
                    sanitizeCsvCell(ins.category?.toUpperCase()),
                    sanitizeCsvCell(ins.title),
                    sanitizeCsvCell(ins.observation),
                ].join(','));
            }
        }
        return lines.join('\r\n');
    }
}
