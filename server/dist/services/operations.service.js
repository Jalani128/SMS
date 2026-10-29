import { Types } from 'mongoose';
import { Class, Section, Teacher, User, Attendance, Invoice, AssignmentSubmission, Exam, AuditLog, SubjectAssignment, OperationalTask, ApprovalRequest, } from '../models/index.js';
import { NotificationService } from './notification.service.js';
import { SchoolSettingsService } from './schoolSettings.service.js';
import { ApiError } from '../utils/apiError.js';
import { logger } from '../utils/logger.js';
export class OperationsService {
    /**
     * Helper: Resolves the school's local date and weekday in its configured timezone
     */
    static getSchoolLocalDate(timezone = 'UTC', date = new Date()) {
        try {
            const formatter = new Intl.DateTimeFormat('en-CA', {
                timeZone: timezone,
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
            });
            const dateStr = formatter.format(date); // "YYYY-MM-DD"
            const dayOfWeek = new Intl.DateTimeFormat('en-US', {
                timeZone: timezone,
                weekday: 'long',
            })
                .format(date)
                .toLowerCase();
            const [year, month, day] = dateStr.split('-').map(Number);
            return { dateStr, dayOfWeek, year, month, day };
        }
        catch {
            const iso = date.toISOString().split('T')[0];
            const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
            return {
                dateStr: iso,
                dayOfWeek: days[date.getUTCDay()],
                year: date.getUTCFullYear(),
                month: date.getUTCMonth() + 1,
                day: date.getUTCDate(),
            };
        }
    }
    /**
     * Helper: Record operational audit trail entry
     */
    static async logAudit(schoolId, action, targetResource, actorId, actorRole, metadata) {
        try {
            await AuditLog.create({
                schoolId,
                action,
                targetResource,
                actorId: actorId ? new Types.ObjectId(actorId) : undefined,
                actorRole,
                metadata: metadata || {},
                timestamp: new Date(),
            });
        }
        catch (err) {
            logger.warn(`[OperationsService] Audit log write skipped: ${err.message}`);
        }
    }
    // =========================================================================
    // 1. Centralized Daily Operations Dashboard
    // =========================================================================
    static async getOperationsDashboard(schoolId) {
        const sId = new Types.ObjectId(schoolId);
        const settings = await SchoolSettingsService.getOrCreateSettings(sId);
        const timezone = settings.regional?.timezone || 'UTC';
        const currency = settings.regional?.currencyCode || 'USD';
        const { dateStr, dayOfWeek } = this.getSchoolLocalDate(timezone);
        const startOfToday = new Date(`${dateStr}T00:00:00.000Z`);
        const endOfToday = new Date(`${dateStr}T23:59:59.999Z`);
        // Check working day status
        const workingDays = settings.academic?.workingDays || [
            'monday',
            'tuesday',
            'wednesday',
            'thursday',
            'friday',
        ];
        const isWorkingDay = workingDays.includes(dayOfWeek);
        // 1. Attendance status for today
        const classes = await Class.find({ schoolId: sId, isDeleted: false })
            .select('_id name')
            .lean();
        const sections = await Section.find({ schoolId: sId, isDeleted: false })
            .select('_id name classId')
            .lean();
        // Group active classes & sections
        const activeClassMap = {};
        for (const cls of classes) {
            const clsSections = sections.filter((s) => s.classId.toString() === cls._id.toString());
            if (clsSections.length > 0) {
                for (const sec of clsSections) {
                    activeClassMap[`${cls._id}_${sec._id}`] = {
                        classId: cls._id.toString(),
                        className: cls.name,
                        sectionId: sec._id.toString(),
                        sectionName: sec.name,
                    };
                }
            }
            else {
                activeClassMap[`${cls._id}_none`] = {
                    classId: cls._id.toString(),
                    className: cls.name,
                };
            }
        }
        const totalTrackedUnits = Object.keys(activeClassMap).length;
        // Distinct class & section attendance records marked today
        const markedRecords = await Attendance.aggregate([
            {
                $match: {
                    schoolId: sId,
                    date: { $gte: startOfToday, $lte: endOfToday },
                    isDeleted: false,
                },
            },
            {
                $group: {
                    _id: { classId: '$classId', sectionId: '$sectionId' },
                    count: { $sum: 1 },
                },
            },
        ]);
        const markedKeys = new Set(markedRecords.map((r) => r._id.sectionId ? `${r._id.classId}_${r._id.sectionId}` : `${r._id.classId}_none`));
        const missingClassesList = [];
        // Find teacher assignments for missing classes
        const assignments = await SubjectAssignment.find({
            schoolId: sId,
            status: 'active',
            isDeleted: false,
        })
            .select('classId sectionId teacherId')
            .populate('teacherId', 'firstName lastName email')
            .lean();
        for (const [key, info] of Object.entries(activeClassMap)) {
            if (!markedKeys.has(key)) {
                // Find assigned teacher
                const assign = assignments.find((a) => {
                    const matchClass = a.classId.toString() === info.classId;
                    const matchSec = !info.sectionId || (a.sectionId && a.sectionId.toString() === info.sectionId);
                    return matchClass && matchSec;
                });
                let assignedTeacher;
                if (assign && assign.teacherId) {
                    const tDoc = assign.teacherId;
                    assignedTeacher = {
                        id: tDoc._id?.toString() || '',
                        name: `${tDoc.firstName || ''} ${tDoc.lastName || ''}`.trim() || 'Assigned Faculty',
                        email: tDoc.email,
                    };
                }
                missingClassesList.push({
                    classId: info.classId,
                    className: info.className,
                    sectionId: info.sectionId,
                    sectionName: info.sectionName,
                    assignedTeacher,
                });
            }
        }
        const classesMarkedCount = totalTrackedUnits - missingClassesList.length;
        const completionPercentage = totalTrackedUnits > 0 ? Math.round((classesMarkedCount / totalTrackedUnits) * 100) : 100;
        // 2. Financial operations (authoritative balance)
        const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        const activeInvoices = await Invoice.find({
            schoolId: sId,
            isDeleted: false,
            status: { $nin: ['paid', 'cancelled', 'draft'] },
        })
            .select('balanceAmount totalAmount paidAmount dueDate')
            .lean();
        let overdueInvoicesCount = 0;
        let overdueAmount = 0;
        let dueSoonInvoicesCount = 0;
        let dueSoonAmount = 0;
        for (const inv of activeInvoices) {
            const balance = inv.balanceAmount !== undefined
                ? Number(inv.balanceAmount.toString())
                : Number(inv.totalAmount?.toString() || 0) - Number(inv.paidAmount?.toString() || 0);
            if (balance <= 0)
                continue;
            const due = new Date(inv.dueDate);
            if (due < startOfToday) {
                overdueInvoicesCount++;
                overdueAmount += balance;
            }
            else if (due <= sevenDaysFromNow) {
                dueSoonInvoicesCount++;
                dueSoonAmount += balance;
            }
        }
        // 3. Homework pending reviews
        const pendingHomeworkReviews = await AssignmentSubmission.countDocuments({
            schoolId: sId,
            isDeleted: false,
            isGradeReleased: false,
            gradedAt: { $exists: false },
        });
        // 4. Upcoming exams & missing marks
        const fourteenDaysFromNow = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
        const upcomingExamsDocs = await Exam.find({
            schoolId: sId,
            isDeleted: false,
            startDate: { $gte: startOfToday, $lte: fourteenDaysFromNow },
            status: { $ne: 'cancelled' },
        })
            .select('name startDate examType classId')
            .populate('classId', 'name')
            .sort({ startDate: 1 })
            .limit(5)
            .lean();
        const upcomingExams = upcomingExamsDocs.map((ex) => ({
            id: ex._id.toString(),
            name: ex.name,
            startDate: ex.startDate.toISOString().split('T')[0],
            examType: ex.examType,
            className: ex.classId?.name,
        }));
        // Completed exams awaiting marks publication
        const missingMarksExamsCount = await Exam.countDocuments({
            schoolId: sId,
            isDeleted: false,
            status: { $in: ['ongoing', 'completed'] },
            publishedAt: { $exists: false },
        });
        // 5. Operational tasks
        const openTasksCount = await OperationalTask.countDocuments({
            schoolId: sId,
            isDeleted: false,
            status: { $in: ['pending', 'in_progress'] },
        });
        const urgentTasksCount = await OperationalTask.countDocuments({
            schoolId: sId,
            isDeleted: false,
            status: { $in: ['pending', 'in_progress'] },
            priority: { $in: ['high', 'urgent'] },
        });
        const overdueTasksCount = await OperationalTask.countDocuments({
            schoolId: sId,
            isDeleted: false,
            status: { $in: ['pending', 'in_progress'] },
            dueDate: { $lt: startOfToday },
        });
        const recentTaskDocs = await OperationalTask.find({
            schoolId: sId,
            isDeleted: false,
        })
            .select('title priority status dueDate assignedTo')
            .populate('assignedTo', 'name')
            .sort({ createdAt: -1 })
            .limit(5)
            .lean();
        const recentTasks = recentTaskDocs.map((t) => ({
            id: t._id.toString(),
            title: t.title,
            priority: t.priority,
            status: t.status,
            dueDate: t.dueDate ? new Date(t.dueDate).toISOString().split('T')[0] : undefined,
            assignedToName: t.assignedTo?.name,
        }));
        // 6. Administrative approvals
        const pendingApprovalsCount = await ApprovalRequest.countDocuments({
            schoolId: sId,
            isDeleted: false,
            status: 'pending',
        });
        const recentApprovalDocs = await ApprovalRequest.find({
            schoolId: sId,
            isDeleted: false,
            status: 'pending',
        })
            .select('type title priority requestedBy createdAt')
            .populate('requestedBy', 'name')
            .sort({ createdAt: -1 })
            .limit(5)
            .lean();
        const recentApprovals = recentApprovalDocs.map((a) => ({
            id: a._id.toString(),
            type: a.type,
            title: a.title,
            priority: a.priority,
            requestedByName: a.requestedBy?.name,
            createdAt: new Date(a.createdAt).toISOString().split('T')[0],
        }));
        // 7. Inactive accounts
        const inactiveUsersCount = await User.countDocuments({
            schoolId: sId,
            isActive: false,
            isDeleted: false,
        });
        // 8. Recent administrative audit logs
        const recentAuditDocs = await AuditLog.find({
            schoolId: sId,
        })
            .select('action timestamp actorId targetResource details')
            .populate('actorId', 'name email role')
            .sort({ timestamp: -1 })
            .limit(8)
            .lean();
        const recentActivities = recentAuditDocs.map((log) => ({
            id: log._id.toString(),
            action: log.action,
            targetResource: log.targetResource,
            actorName: log.actorId?.name || 'System / Automated',
            actorRole: log.actorRole || log.actorId?.role,
            timestamp: log.timestamp.toISOString(),
        }));
        return {
            timezone,
            currentDate: dateStr,
            isWorkingDay,
            attendance: {
                classesTotal: totalTrackedUnits,
                classesMarked: classesMarkedCount,
                classesMissing: missingClassesList.length,
                completionPercentage,
                missingClasses: missingClassesList,
            },
            finance: {
                overdueInvoicesCount,
                overdueAmount: Math.round(overdueAmount * 100) / 100,
                dueSoonInvoicesCount,
                dueSoonAmount: Math.round(dueSoonAmount * 100) / 100,
                currency,
            },
            academic: {
                pendingHomeworkReviews,
                upcomingExamsCount: upcomingExamsDocs.length,
                missingMarksExamsCount,
                upcomingExams,
            },
            tasks: {
                openCount: openTasksCount,
                urgentCount: urgentTasksCount,
                overdueCount: overdueTasksCount,
                recentTasks,
            },
            approvals: {
                pendingCount: pendingApprovalsCount,
                recentApprovals,
            },
            userActivation: {
                inactiveUsersCount,
            },
            recentActivities,
        };
    }
    // =========================================================================
    // 2. Operational Task Management
    // =========================================================================
    static async listTasks(schoolId, user, filters) {
        const sId = new Types.ObjectId(schoolId);
        const query = { schoolId: sId, isDeleted: false };
        // RBAC: Staff/Teachers only see tasks assigned to them or created by them; Admins see all
        if (user.role === 'teacher') {
            query.$or = [{ assignedTo: new Types.ObjectId(user._id) }, { assignedBy: new Types.ObjectId(user._id) }];
        }
        else if (filters.assignedTo) {
            query.assignedTo = new Types.ObjectId(filters.assignedTo);
        }
        if (filters.status)
            query.status = filters.status;
        if (filters.category)
            query.category = filters.category;
        if (filters.priority)
            query.priority = filters.priority;
        if (filters.search) {
            query.$or = [
                { title: { $regex: filters.search, $options: 'i' } },
                { description: { $regex: filters.search, $options: 'i' } },
            ];
        }
        const page = Math.max(1, filters.page || 1);
        const limit = Math.min(100, Math.max(1, filters.limit || 20));
        const skip = (page - 1) * limit;
        const [tasks, total] = await Promise.all([
            OperationalTask.find(query)
                .populate('assignedTo', 'name email role')
                .populate('assignedBy', 'name email role')
                .populate('completedBy', 'name email')
                .sort({ status: 1, dueDate: 1, createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            OperationalTask.countDocuments(query),
        ]);
        return {
            tasks,
            pagination: {
                total,
                page,
                limit,
                pages: Math.ceil(total / limit),
            },
        };
    }
    static async createTask(schoolId, actor, data) {
        const sId = new Types.ObjectId(schoolId);
        const targetAssignee = await User.findOne({
            _id: new Types.ObjectId(data.assignedTo),
            schoolId: sId,
            isDeleted: false,
        });
        if (!targetAssignee) {
            throw ApiError.badRequest('Assigned staff member does not exist in this school.');
        }
        const task = await OperationalTask.create({
            schoolId: sId,
            title: data.title,
            description: data.description,
            category: data.category,
            priority: data.priority,
            status: 'pending',
            dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
            assignedTo: new Types.ObjectId(data.assignedTo),
            assignedBy: new Types.ObjectId(actor._id),
            relatedEntity: data.relatedEntity,
        });
        await this.logAudit(sId, 'CREATE_TASK', 'OperationalTask', actor._id, actor.role, {
            taskId: task._id,
            title: task.title,
            assignedTo: data.assignedTo,
        });
        // Notify assignee
        try {
            await NotificationService.createNotification({
                schoolId: sId,
                recipientId: data.assignedTo,
                category: 'notice',
                title: `Task Assigned: ${data.title}`,
                content: `You have been assigned an operational task: "${data.title}". Priority: ${data.priority.toUpperCase()}`,
                priority: data.priority === 'urgent' ? 'urgent' : 'normal',
                resourceType: 'OperationalTask',
                resourceId: task._id,
                actionUrl: '/admin/operations',
            });
        }
        catch (err) {
            logger.warn(`[OperationsService] Task assignment notification skipped: ${err.message}`);
        }
        return task;
    }
    static async updateTaskStatus(schoolId, taskId, actor, data) {
        const sId = new Types.ObjectId(schoolId);
        const task = await OperationalTask.findOne({
            _id: new Types.ObjectId(taskId),
            schoolId: sId,
            isDeleted: false,
        });
        if (!task) {
            throw ApiError.notFound('Operational task not found');
        }
        // Permission check: Admins can update any task; non-admins only their assigned tasks
        const isAssignee = task.assignedTo.toString() === actor._id.toString();
        const isAdmin = actor.role === 'admin' || actor.role === 'super_admin';
        if (!isAssignee && !isAdmin) {
            throw ApiError.forbidden('You are not authorized to update this task status');
        }
        // Status transition validation
        const validTransitions = {
            pending: ['in_progress', 'completed', 'cancelled'],
            in_progress: ['pending', 'completed', 'cancelled'],
            completed: ['in_progress'], // can reopen
            cancelled: ['pending'],
        };
        if (task.status !== data.status && !validTransitions[task.status].includes(data.status)) {
            throw ApiError.badRequest(`Invalid status transition from "${task.status}" to "${data.status}"`);
        }
        task.status = data.status;
        if (data.completionNotes !== undefined) {
            task.completionNotes = data.completionNotes;
        }
        if (data.status === 'completed') {
            task.completedAt = new Date();
            task.completedBy = new Types.ObjectId(actor._id);
        }
        else if (data.status === 'in_progress' || data.status === 'pending') {
            task.completedAt = null;
            task.completedBy = null;
        }
        await task.save();
        await this.logAudit(sId, 'UPDATE_TASK_STATUS', 'OperationalTask', actor._id, actor.role, {
            taskId: task._id,
            newStatus: data.status,
            notes: data.completionNotes,
        });
        return task;
    }
    static async deleteTask(schoolId, taskId, actor) {
        const sId = new Types.ObjectId(schoolId);
        const task = await OperationalTask.findOne({
            _id: new Types.ObjectId(taskId),
            schoolId: sId,
            isDeleted: false,
        });
        if (!task)
            throw ApiError.notFound('Task not found');
        task.isDeleted = true;
        await task.save();
        await this.logAudit(sId, 'DELETE_TASK', 'OperationalTask', actor._id, actor.role, {
            taskId: task._id,
        });
        return true;
    }
    // =========================================================================
    // 3. Administrative Approval Workflows
    // =========================================================================
    static async listApprovals(schoolId, user, filters) {
        const sId = new Types.ObjectId(schoolId);
        const query = { schoolId: sId, isDeleted: false };
        // RBAC: Non-admin users see only their submitted approval requests
        if (user.role !== 'admin' && user.role !== 'super_admin') {
            query.requestedBy = new Types.ObjectId(user._id);
        }
        if (filters.status)
            query.status = filters.status;
        if (filters.type)
            query.type = filters.type;
        if (filters.priority)
            query.priority = filters.priority;
        const page = Math.max(1, filters.page || 1);
        const limit = Math.min(100, Math.max(1, filters.limit || 20));
        const skip = (page - 1) * limit;
        const [approvals, total] = await Promise.all([
            ApprovalRequest.find(query)
                .populate('requestedBy', 'name email role')
                .populate('reviewedBy', 'name email role')
                .sort({ status: 1, createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            ApprovalRequest.countDocuments(query),
        ]);
        return {
            approvals,
            pagination: {
                total,
                page,
                limit,
                pages: Math.ceil(total / limit),
            },
        };
    }
    static async createApproval(schoolId, actor, data) {
        const sId = new Types.ObjectId(schoolId);
        // Rule: Check for conflicting duplicate pending approval for the same target resource
        if (data.targetId && data.targetModel && data.targetModel !== 'Other') {
            const existingPending = await ApprovalRequest.findOne({
                schoolId: sId,
                targetModel: data.targetModel,
                targetId: data.targetId,
                status: 'pending',
                isDeleted: false,
            });
            if (existingPending) {
                throw ApiError.badRequest(`A pending approval request already exists for this ${data.targetModel} record (Request ID: ${existingPending._id})`);
            }
        }
        const approval = await ApprovalRequest.create({
            schoolId: sId,
            type: data.type,
            title: data.title,
            description: data.description,
            reason: data.reason,
            status: 'pending',
            priority: data.priority,
            requestedBy: new Types.ObjectId(actor._id),
            targetModel: data.targetModel,
            targetId: data.targetId,
            payload: data.payload,
        });
        await this.logAudit(sId, 'CREATE_APPROVAL_REQUEST', 'ApprovalRequest', actor._id, actor.role, {
            approvalId: approval._id,
            type: approval.type,
            targetModel: approval.targetModel,
            targetId: approval.targetId,
        });
        // Notify School Administrators
        try {
            const admins = await User.find({
                schoolId: sId,
                role: { $in: ['admin', 'super_admin'] },
                isActive: true,
                isDeleted: false,
            });
            for (const admin of admins) {
                if (admin._id.toString() !== actor._id.toString()) {
                    await NotificationService.createNotification({
                        schoolId: sId,
                        recipientId: admin._id,
                        category: 'notice',
                        title: `Approval Required: ${data.title}`,
                        content: `New administrative approval request for ${data.type} submitted by staff.`,
                        priority: data.priority === 'urgent' ? 'urgent' : 'high',
                        resourceType: 'ApprovalRequest',
                        resourceId: approval._id,
                        actionUrl: '/admin/operations',
                    });
                }
            }
        }
        catch (err) {
            logger.warn(`[OperationsService] Admin approval notification skipped: ${err.message}`);
        }
        return approval;
    }
    static async reviewApproval(schoolId, approvalId, actor, data) {
        const sId = new Types.ObjectId(schoolId);
        const approval = await ApprovalRequest.findOne({
            _id: new Types.ObjectId(approvalId),
            schoolId: sId,
            isDeleted: false,
        });
        if (!approval)
            throw ApiError.notFound('Approval request not found');
        if (approval.status !== 'pending') {
            throw ApiError.badRequest(`Approval request has already been ${approval.status} on ${approval.reviewedAt?.toISOString()}`);
        }
        // MAKER-CHECKER SEPARATION OF DUTIES ENFORCEMENT:
        // Requester CANNOT approve their own request!
        if (approval.requestedBy.toString() === actor._id.toString() &&
            actor.role !== 'super_admin') {
            throw ApiError.forbidden('Separation of duties violation: You cannot approve or review your own administrative request.');
        }
        approval.status = data.action;
        approval.reviewedBy = new Types.ObjectId(actor._id);
        approval.reviewedAt = new Date();
        approval.reviewNotes = data.reviewNotes;
        // Execute approved action safely
        if (data.action === 'approved') {
            if (approval.type === 'staff_activation' && approval.targetId) {
                await User.updateOne({ _id: new Types.ObjectId(approval.targetId), schoolId: sId }, { $set: { isActive: true } });
            }
        }
        await approval.save();
        await this.logAudit(sId, `APPROVAL_${data.action.toUpperCase()}`, 'ApprovalRequest', actor._id, actor.role, {
            approvalId: approval._id,
            type: approval.type,
            decision: data.action,
            reviewNotes: data.reviewNotes,
        });
        // Notify requester of decision
        try {
            await NotificationService.createNotification({
                schoolId: sId,
                recipientId: approval.requestedBy,
                category: 'notice',
                title: `Approval Request ${data.action.toUpperCase()}: ${approval.title}`,
                content: `Your approval request "${approval.title}" has been ${data.action}.${data.reviewNotes ? ' Notes: ' + data.reviewNotes : ''}`,
                priority: data.action === 'rejected' ? 'high' : 'normal',
                resourceType: 'ApprovalRequest',
                resourceId: approval._id,
                actionUrl: '/admin/operations',
            });
        }
        catch (err) {
            logger.warn(`[OperationsService] Requester decision notification skipped: ${err.message}`);
        }
        return approval;
    }
    // =========================================================================
    // 4. Attendance Follow-Up Automation
    // =========================================================================
    static async sendAttendanceReminders(schoolId, actorId) {
        const sId = new Types.ObjectId(schoolId);
        const dashboard = await this.getOperationsDashboard(sId);
        if (!dashboard.isWorkingDay) {
            logger.info(`[OperationsService] Today (${dashboard.currentDate}) is not a working day. Skipping automated reminders.`);
            return { sentRemindersCount: 0, missingClassesCount: 0, isWorkingDay: false };
        }
        let sentCount = 0;
        for (const item of dashboard.attendance.missingClasses) {
            if (item.assignedTeacher && item.assignedTeacher.id) {
                const teacherUser = await Teacher.findById(item.assignedTeacher.id);
                const targetUserId = teacherUser?.userId;
                if (targetUserId) {
                    const idempotencyKey = `att_rem:${sId}:${item.classId}:${item.sectionId || 'none'}:${dashboard.currentDate}`;
                    const notif = await NotificationService.createNotification({
                        schoolId: sId,
                        recipientId: targetUserId,
                        category: 'attendance',
                        title: `Attendance Missing: ${item.className} ${item.sectionName || ''}`.trim(),
                        content: `Daily attendance for ${item.className} ${item.sectionName || ''} on ${dashboard.currentDate} has not been recorded yet. Please submit the attendance register.`,
                        priority: 'high',
                        resourceType: 'Attendance',
                        actionUrl: '/attendance',
                        idempotencyKey,
                    });
                    if (notif)
                        sentCount++;
                }
            }
        }
        await this.logAudit(sId, 'ATTENDANCE_REMINDER_AUTOMATION', 'Attendance', actorId, 'system', {
            date: dashboard.currentDate,
            missingCount: dashboard.attendance.missingClasses.length,
            sentReminders: sentCount,
        });
        return {
            sentRemindersCount: sentCount,
            missingClassesCount: dashboard.attendance.missingClasses.length,
            isWorkingDay: true,
        };
    }
    // =========================================================================
    // 5. Fee Follow-Up Automation
    // =========================================================================
    static async sendFeeReminders(schoolId, actorId) {
        const sId = new Types.ObjectId(schoolId);
        const settings = await SchoolSettingsService.getOrCreateSettings(sId);
        const timezone = settings.regional?.timezone || 'UTC';
        const { dateStr } = this.getSchoolLocalDate(timezone);
        const startOfToday = new Date(`${dateStr}T00:00:00.000Z`);
        const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        const eligibleInvoices = await Invoice.find({
            schoolId: sId,
            isDeleted: false,
            status: { $nin: ['paid', 'cancelled', 'draft'] },
        });
        let overdueCount = 0;
        let dueSoonCount = 0;
        for (const inv of eligibleInvoices) {
            const balance = inv.balanceAmount !== undefined
                ? Number(inv.balanceAmount.toString())
                : Number(inv.totalAmount?.toString() || 0) - Number(inv.paidAmount?.toString() || 0);
            // Exclude zero-balance or paid invoices
            if (balance <= 0)
                continue;
            const dueDate = new Date(inv.dueDate);
            if (dueDate < startOfToday) {
                // Overdue reminder
                const notif = await NotificationService.triggerFeeReminder({
                    schoolId: sId,
                    invoiceId: inv._id,
                    reminderType: 'overdue',
                });
                if (notif)
                    overdueCount++;
            }
            else if (dueDate <= sevenDaysFromNow) {
                // Due soon reminder
                const notif = await NotificationService.triggerFeeReminder({
                    schoolId: sId,
                    invoiceId: inv._id,
                    reminderType: 'due_soon',
                });
                if (notif)
                    dueSoonCount++;
            }
        }
        await this.logAudit(sId, 'FEE_REMINDER_AUTOMATION', 'Invoice', actorId, 'system', {
            overdueReminders: overdueCount,
            dueSoonReminders: dueSoonCount,
        });
        return {
            overdueRemindersCount: overdueCount,
            dueSoonRemindersCount: dueSoonCount,
        };
    }
    // =========================================================================
    // 6. Comprehensive Automation Runner
    // =========================================================================
    static async runDailyOperationsCheck(schoolId, actorId, types = ['attendance', 'fees', 'homework']) {
        const sId = new Types.ObjectId(schoolId);
        let attCount = 0;
        let feeCount = 0;
        let hwCount = 0;
        if (types.includes('attendance')) {
            const attResult = await this.sendAttendanceReminders(sId, actorId);
            attCount = attResult.sentRemindersCount;
        }
        if (types.includes('fees')) {
            const feeResult = await this.sendFeeReminders(sId, actorId);
            feeCount = feeResult.overdueRemindersCount + feeResult.dueSoonRemindersCount;
        }
        if (types.includes('homework')) {
            // Find unreviewed submissions older than 48 hours
            const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
            const unreviewedSubmissions = await AssignmentSubmission.find({
                schoolId: sId,
                isDeleted: false,
                isGradeReleased: false,
                submittedAt: { $lte: twoDaysAgo },
            }).populate('homeworkId');
            const homeworkMap = new Map();
            for (const sub of unreviewedSubmissions) {
                if (sub.homeworkId) {
                    homeworkMap.set(sub.homeworkId._id.toString(), sub.homeworkId);
                }
            }
            for (const [hwId, hw] of homeworkMap.entries()) {
                if (hw.teacherId) {
                    const teacher = await Teacher.findById(hw.teacherId);
                    if (teacher && teacher.userId) {
                        const todayStr = new Date().toISOString().split('T')[0];
                        const idempotencyKey = `hw_rem:${hwId}:${teacher.userId}:${todayStr}`;
                        const notif = await NotificationService.createNotification({
                            schoolId: sId,
                            recipientId: teacher.userId,
                            category: 'homework',
                            title: `Pending Grading: ${hw.title}`,
                            content: `Submissions for assignment "${hw.title}" are awaiting evaluation.`,
                            priority: 'normal',
                            resourceType: 'Homework',
                            resourceId: hwId,
                            actionUrl: '/homework',
                            idempotencyKey,
                        });
                        if (notif)
                            hwCount++;
                    }
                }
            }
        }
        await this.logAudit(sId, 'RUN_DAILY_OPERATIONS_CHECK', 'Operations', actorId, 'system', {
            attendanceRemindersSent: attCount,
            feeRemindersSent: feeCount,
            homeworkRemindersSent: hwCount,
        });
        return {
            attendanceRemindersSent: attCount,
            feeRemindersSent: feeCount,
            homeworkRemindersSent: hwCount,
            timestamp: new Date().toISOString(),
        };
    }
}
