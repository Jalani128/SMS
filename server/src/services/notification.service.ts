import { Types } from 'mongoose';
import {
  Notification,
  INotification,
  NotificationCategory,
  NotificationPriority,
  NotificationChannel,
} from '../models/Notification.model.js';
import {
  NotificationPreference,
  INotificationPreference,
  IChannelPreferences,
} from '../models/NotificationPreference.model.js';
import { User, IUser } from '../models/User.model.js';
import { Student } from '../models/Student.model.js';
import { Parent } from '../models/Parent.model.js';
import { Invoice } from '../models/Invoice.model.js';
import { Homework } from '../models/Homework.model.js';
import { AssignmentSubmission } from '../models/AssignmentSubmission.model.js';
import { Exam } from '../models/Exam.model.js';
import { Enrollment } from '../models/Enrollment.model.js';
import { School } from '../models/School.model.js';
import { Announcement } from '../models/Announcement.model.js';
import { sendEmail } from '../config/mailer.js';
import { getIO } from '../config/socket.js';
import { emailTemplates } from './emailTemplate.service.js';
import { logger } from '../utils/logger.js';

export interface CreateNotificationOptions {
  schoolId: Types.ObjectId | string;
  recipientId: Types.ObjectId | string;
  category: NotificationCategory;
  title: string;
  content: string;
  channels?: NotificationChannel[];
  priority?: NotificationPriority;
  resourceType?: string;
  resourceId?: Types.ObjectId | string;
  actionUrl?: string;
  idempotencyKey?: string;
  emailPayload?: {
    subject?: string;
    html?: string;
    text?: string;
  };
}

export interface NotificationQueryFilters {
  page?: number;
  limit?: number;
  category?: NotificationCategory;
  isRead?: boolean;
  priority?: NotificationPriority;
}

export class NotificationService {
  /**
   * Helper: Safely emit to a recipient's private user socket room
   */
  private static emitToRecipient(recipientId: string, event: string, payload: any): void {
    try {
      const io = getIO();
      if (io) {
        io.to(`user:${recipientId}`).emit(event, payload);
        logger.debug(`[NotificationService] Emitted ${event} to user:${recipientId}`);
      }
    } catch (err: any) {
      // Socket server may not be active during certain background CLI or standalone tests
      logger.debug(`[NotificationService] Socket emission skipped or unavailable: ${err.message}`);
    }
  }

  /**
   * Retrieves or initializes default notification preferences for a user
   */
  public static async getPreferences(
    schoolId: Types.ObjectId | string,
    userId: Types.ObjectId | string
  ): Promise<INotificationPreference> {
    const sId = new Types.ObjectId(schoolId);
    const uId = new Types.ObjectId(userId);

    let pref = await NotificationPreference.findOne({ schoolId: sId, userId: uId });
    if (!pref) {
      pref = await NotificationPreference.create({
        schoolId: sId,
        userId: uId,
        inApp: {
          academic: true,
          finance: true,
          attendance: true,
          homework: true,
          exams: true,
          announcements: true,
        },
        email: {
          academic: true,
          finance: true,
          attendance: true,
          homework: true,
          exams: true,
          announcements: true,
        },
      });
    }
    return pref;
  }

  /**
   * Updates notification preferences for a user
   */
  public static async updatePreferences(
    schoolId: Types.ObjectId | string,
    userId: Types.ObjectId | string,
    updates: {
      inApp?: Partial<IChannelPreferences>;
      email?: Partial<IChannelPreferences>;
    }
  ): Promise<INotificationPreference> {
    const sId = new Types.ObjectId(schoolId);
    const uId = new Types.ObjectId(userId);

    let pref = await NotificationPreference.findOne({ schoolId: sId, userId: uId });
    if (!pref) {
      pref = new NotificationPreference({
        schoolId: sId,
        userId: uId,
      });
    }

    if (updates.inApp) {
      pref.inApp = { ...pref.inApp, ...updates.inApp };
    }
    if (updates.email) {
      pref.email = { ...pref.email, ...updates.email };
    }

    await pref.save();
    return pref;
  }

  /**
   * Core notification creation: checks idempotency, applies user preferences,
   * stores to DB, emits real-time event, and dispatches email.
   */
  public static async createNotification(
    options: CreateNotificationOptions
  ): Promise<INotification | null> {
    const {
      schoolId,
      recipientId,
      category,
      title,
      content,
      channels = ['in_app'],
      priority = 'normal',
      resourceType,
      resourceId,
      actionUrl,
      idempotencyKey,
      emailPayload,
    } = options;

    const sId = new Types.ObjectId(schoolId);
    const rId = new Types.ObjectId(recipientId);

    // 1. Idempotency Check: Prevent duplicate notifications from repeated events/retries
    if (idempotencyKey) {
      const existing = await Notification.findOne({
        schoolId: sId,
        idempotencyKey,
      });
      if (existing) {
        logger.info(
          `[NotificationService] Idempotency match: skipped duplicate key "${idempotencyKey}"`
        );
        return existing;
      }
    }

    // 2. Recipient lookup & validation
    const recipient = await User.findById(rId);
    if (!recipient) {
      logger.warn(`[NotificationService] Recipient ${rId} not found. Skipping notification.`);
      return null;
    }

    // 3. Check User Preferences (System/Security notices cannot be opted out)
    const preferences = await this.getPreferences(sId, rId);
    let allowInApp = true;
    let allowEmail = true;

    if (category !== 'system') {
      const catKey =
        category === 'notice' || category === 'announcement'
          ? 'announcements'
          : (category as keyof IChannelPreferences);

      if (preferences.inApp && catKey in preferences.inApp) {
        allowInApp = preferences.inApp[catKey];
      }
      if (preferences.email && catKey in preferences.email) {
        allowEmail = preferences.email[catKey];
      }
    }

    const requestedChannels = [...channels];
    const effectiveChannels: NotificationChannel[] = [];
    if (requestedChannels.includes('in_app') && allowInApp) {
      effectiveChannels.push('in_app');
    }
    if (requestedChannels.includes('email') && allowEmail) {
      effectiveChannels.push('email');
    }

    // If both requested channels were explicitly disabled by user preference, skip
    if (requestedChannels.length > 0 && effectiveChannels.length === 0) {
      logger.info(
        `[NotificationService] Notification for user ${rId} suppressed by user preferences (${category})`
      );
      return null;
    }

    // 4. Persist In-App Notification Record to MongoDB FIRST
    const notification = new Notification({
      schoolId: sId,
      recipientId: rId,
      category,
      title,
      content,
      channels: effectiveChannels.length > 0 ? effectiveChannels : ['in_app'],
      priority,
      resourceType,
      resourceId: resourceId ? new Types.ObjectId(resourceId) : undefined,
      actionUrl,
      idempotencyKey,
      isRead: false,
      deliveryStatus: {
        emailStatus: effectiveChannels.includes('email') ? 'pending' : 'skipped',
        attempts: 0,
      },
    });

    try {
      await notification.save();
    } catch (saveError: any) {
      // Catch possible race condition duplicate on unique sparse index
      if (saveError.code === 11000 && idempotencyKey) {
        const existing = await Notification.findOne({ schoolId: sId, idempotencyKey });
        if (existing) return existing;
      }
      throw saveError;
    }

    // 5. Emit Real-time Socket.IO Event directly to private user room
    if (effectiveChannels.includes('in_app')) {
      this.emitToRecipient(rId.toString(), 'notification:new', {
        id: notification._id,
        _id: notification._id,
        category: notification.category,
        title: notification.title,
        content: notification.content,
        isRead: false,
        priority: notification.priority,
        actionUrl: notification.actionUrl,
        resourceType: notification.resourceType,
        resourceId: notification.resourceId,
        createdAt: notification.createdAt,
      });
    }

    // 6. Email Channel Dispatch (Failure does NOT delete the persisted notification)
    if (effectiveChannels.includes('email')) {
      const emailTarget = recipient.email;
      const isValidEmail = emailTarget && /^\S+@\S+\.\S+$/.test(emailTarget);

      if (!isValidEmail) {
        notification.deliveryStatus = {
          emailStatus: 'failed',
          emailError: 'Recipient has missing or invalid email address',
          attempts: 1,
          lastAttemptAt: new Date(),
        };
        await notification.save();
        logger.warn(
          `[NotificationService] Permanent delivery failure: invalid email "${emailTarget}" for user ${rId}`
        );
      } else {
        try {
          const subject = emailPayload?.subject || `[${category.toUpperCase()}] ${title}`;
          const html = emailPayload?.html || `<p>${content}</p>`;
          const text = emailPayload?.text || content;

          await sendEmail({
            to: emailTarget,
            subject,
            html,
            text,
          });

          notification.deliveryStatus = {
            emailStatus: 'sent',
            emailSentAt: new Date(),
            attempts: 1,
            lastAttemptAt: new Date(),
          };
          await notification.save();
          logger.info(`[NotificationService] Email sent successfully to ${emailTarget}`);
        } catch (emailError: any) {
          notification.deliveryStatus = {
            emailStatus: 'failed',
            emailError: emailError.message || 'Email delivery failed',
            attempts: 1,
            lastAttemptAt: new Date(),
          };
          await notification.save();
          logger.warn(
            `[NotificationService] Email delivery failure for user ${rId}: ${emailError.message}. Notification remains persisted.`
          );
        }
      }
    }

    return notification;
  }

  /**
   * Retrieves paginated notifications for the authenticated recipient in the active school
   */
  public static async getNotifications(
    schoolId: Types.ObjectId | string,
    recipientId: Types.ObjectId | string,
    filters: NotificationQueryFilters = {}
  ): Promise<{ notifications: INotification[]; pagination: any }> {
    const sId = new Types.ObjectId(schoolId);
    const rId = new Types.ObjectId(recipientId);

    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(100, Math.max(1, filters.limit || 20));
    const skip = (page - 1) * limit;

    const query: any = {
      schoolId: sId,
      recipientId: rId,
      isDeleted: false,
    };

    if (filters.category) {
      query.category = filters.category;
    }
    if (typeof filters.isRead === 'boolean') {
      query.isRead = filters.isRead;
    }
    if (filters.priority) {
      query.priority = filters.priority;
    }

    const [notifications, total] = await Promise.all([
      Notification.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Notification.countDocuments(query),
    ]);

    return {
      notifications,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Retrieves unread notification count for authenticated recipient
   */
  public static async getUnreadCount(
    schoolId: Types.ObjectId | string,
    recipientId: Types.ObjectId | string
  ): Promise<number> {
    const sId = new Types.ObjectId(schoolId);
    const rId = new Types.ObjectId(recipientId);

    return Notification.countDocuments({
      schoolId: sId,
      recipientId: rId,
      isRead: false,
      isDeleted: false,
    });
  }

  /**
   * Mark a single notification as read (strictly verifies recipient ownership)
   */
  public static async markAsRead(
    schoolId: Types.ObjectId | string,
    recipientId: Types.ObjectId | string,
    notificationId: Types.ObjectId | string
  ): Promise<INotification | null> {
    const sId = new Types.ObjectId(schoolId);
    const rId = new Types.ObjectId(recipientId);
    const nId = new Types.ObjectId(notificationId);

    const notification = await Notification.findOneAndUpdate(
      {
        _id: nId,
        schoolId: sId,
        recipientId: rId,
        isDeleted: false,
      },
      {
        $set: {
          isRead: true,
          readAt: new Date(),
        },
      },
      { new: true }
    );

    if (notification) {
      this.emitToRecipient(rId.toString(), 'notification:read', {
        notificationId: notification._id,
      });
    }

    return notification;
  }

  /**
   * Mark all unread notifications as read for authenticated recipient
   */
  public static async markAllAsRead(
    schoolId: Types.ObjectId | string,
    recipientId: Types.ObjectId | string
  ): Promise<number> {
    const sId = new Types.ObjectId(schoolId);
    const rId = new Types.ObjectId(recipientId);

    const result = await Notification.updateMany(
      {
        schoolId: sId,
        recipientId: rId,
        isRead: false,
        isDeleted: false,
      },
      {
        $set: {
          isRead: true,
          readAt: new Date(),
        },
      }
    );

    if (result.modifiedCount > 0) {
      this.emitToRecipient(rId.toString(), 'notification:read_all', {
        timestamp: new Date().toISOString(),
      });
    }

    return result.modifiedCount;
  }

  // =========================================================================
  // Business Event Triggers
  // =========================================================================

  /**
   * Trigger A: Attendance Alert
   * Dispatches attendance notification to student and primary parents
   */
  public static async triggerAttendanceAlert(params: {
    schoolId: Types.ObjectId | string;
    studentId: Types.ObjectId | string;
    attendanceDate: string | Date;
    status: 'present' | 'absent' | 'late' | 'leave';
    className: string;
    sectionName?: string;
    remarks?: string;
  }): Promise<INotification[]> {
    const { schoolId, studentId, attendanceDate, status, className, sectionName, remarks } = params;
    const dateStr =
      attendanceDate instanceof Date
        ? attendanceDate.toISOString().slice(0, 10)
        : String(attendanceDate).slice(0, 10);

    const student = await Student.findById(studentId).populate('userId');
    if (!student || !student.userId) return [];

    const school = await School.findById(schoolId);
    const schoolName = school?.name || 'Institution';
    const studentUser = student.userId as any;
    const studentName = studentUser.name || 'Student';

    const createdList: INotification[] = [];

    // Resolve target recipients: Student + Guardians
    const recipientUserIds: string[] = [student.userId.toString()];

    if (student.guardians && student.guardians.length > 0) {
      for (const guardian of student.guardians) {
        if (guardian.userId) {
          recipientUserIds.push(guardian.userId.toString());
        } else if (guardian.parentProfileId) {
          const parent = await Parent.findById(guardian.parentProfileId);
          if (parent?.userId) recipientUserIds.push(parent.userId.toString());
        }
      }
    }

    const uniqueRecipients = [...new Set(recipientUserIds)];

    for (const rId of uniqueRecipients) {
      const recipientUser = await User.findById(rId);
      const recipientName = recipientUser?.name || 'Guardian';

      const emailData = emailTemplates.attendanceAlert({
        schoolName,
        recipientName,
        studentName,
        className,
        sectionName,
        attendanceDate: dateStr,
        status,
        remarks,
        portalUrl: `${process.env.CLIENT_URL || ''}/attendance`,
      });

      const notif = await this.createNotification({
        schoolId,
        recipientId: rId,
        category: 'attendance',
        title: `Attendance: ${studentName} marked ${status.toUpperCase()}`,
        content: `Student ${studentName} (${className}) was recorded as ${status.toUpperCase()} on ${dateStr}.${
          remarks ? ' Remarks: ' + remarks : ''
        }`,
        channels: ['in_app', 'email'],
        priority: status === 'absent' ? 'high' : 'normal',
        resourceType: 'Attendance',
        actionUrl: '/attendance',
        idempotencyKey: `attendance:${studentId}:${dateStr}:${status}:${rId}`,
        emailPayload: emailData,
      });

      if (notif) createdList.push(notif);
    }

    return createdList;
  }

  /**
   * Trigger B: Fee Reminder
   * Re-checks invoice status and notifies only for eligible unpaid/partial invoices
   */
  public static async triggerFeeReminder(params: {
    schoolId: Types.ObjectId | string;
    invoiceId: Types.ObjectId | string;
    reminderType: 'due_soon' | 'overdue';
  }): Promise<INotification | null> {
    const { schoolId, invoiceId, reminderType } = params;

    const invoice = await Invoice.findById(invoiceId)
      .populate('studentId')
      .populate('feeStructureId');

    if (!invoice || invoice.isDeleted || invoice.status === 'cancelled') {
      logger.info(`[NotificationService] Invoice ${invoiceId} is deleted or cancelled. Skipping.`);
      return null;
    }

    const balanceNum =
      invoice.balanceAmount !== undefined
        ? Number(invoice.balanceAmount.toString())
        : Number(invoice.totalAmount?.toString() || 0) - Number(invoice.paidAmount?.toString() || 0);

    // Rule: Exclude paid or ineligible invoices
    if (invoice.status === 'paid' || balanceNum <= 0) {
      logger.info(
        `[NotificationService] Invoice ${invoiceId} is status "${invoice.status}" with balance ${balanceNum}. Skipping.`
      );
      return null;
    }

    const student = await Student.findById(invoice.studentId);
    if (!student || !student.userId) return null;

    const school = await School.findById(schoolId);
    const schoolName = school?.name || 'Institution';
    const currency = school?.currency || 'USD';

    // Recipient: Primary parent if available, otherwise student
    let targetUserId = student.userId.toString();
    if (student.guardians && student.guardians.length > 0) {
      const primaryGuardian = student.guardians.find((g) => g.isPrimary) || student.guardians[0];
      if (primaryGuardian?.userId) {
        targetUserId = primaryGuardian.userId.toString();
      } else if (primaryGuardian?.parentProfileId) {
        const parent = await Parent.findById(primaryGuardian.parentProfileId);
        if (parent?.userId) targetUserId = parent.userId.toString();
      }
    }

    const recipientUser = await User.findById(targetUserId);
    const recipientName = recipientUser?.name || 'Valued Family';
    const dueDateStr = invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : 'Due Soon';
    const feeStructureName = (invoice.feeStructureId as any)?.name || 'Tuition & Fees';

    const emailData = emailTemplates.feeReminder({
      schoolName,
      recipientName,
      invoiceNumber: invoice.invoiceNumber,
      dueDate: dueDateStr,
      balanceDue: balanceNum,
      currency,
      feeStructureName,
      portalUrl: `${process.env.CLIENT_URL || ''}/fees`,
    });

    const dateKey = new Date().toISOString().slice(0, 10);
    const idempotencyKey = `fee_reminder:${invoiceId}:${reminderType}:${dateKey}`;

    return this.createNotification({
      schoolId,
      recipientId: targetUserId,
      category: 'finance',
      title: `Fee Reminder: Invoice #${invoice.invoiceNumber}`,
      content: `Invoice #${invoice.invoiceNumber} has an outstanding balance of ${currency} ${balanceNum.toFixed(
        2
      )}. Due date: ${dueDateStr}.`,
      channels: ['in_app', 'email'],
      priority: reminderType === 'overdue' ? 'high' : 'normal',
      resourceType: 'Invoice',
      resourceId: invoice._id,
      actionUrl: '/fees',
      idempotencyKey,
      emailPayload: emailData,
    });
  }

  /**
   * Trigger C: Homework and Assignment Reminders
   * Respects homework publication status and missing-submission status
   */
  public static async triggerHomeworkReminder(params: {
    schoolId: Types.ObjectId | string;
    homeworkId: Types.ObjectId | string;
    reminderType: 'newly_published' | 'deadline_approaching';
  }): Promise<INotification[]> {
    const { schoolId, homeworkId, reminderType } = params;

    const homework = await Homework.findById(homeworkId).populate('subjectId');
    if (!homework || homework.isDeleted) return [];

    // Rule: Respect publication status. Never notify for draft homework
    if (homework.status !== 'published') {
      logger.info(
        `[NotificationService] Homework ${homeworkId} status is "${homework.status}". Draft/archived notifications skipped.`
      );
      return [];
    }

    // Find enrolled students in this class/section
    const enrollments = await Enrollment.find({
      schoolId,
      classId: homework.classId,
      sectionId: homework.sectionId,
      status: 'active',
      isDeleted: false,
    }).populate('studentId');

    const school = await School.findById(schoolId);
    const schoolName = school?.name || 'Institution';
    const subjectName = (homework.subjectId as any)?.name || 'Course Subject';
    const dueDateStr = new Date(homework.dueDate).toLocaleDateString();

    const createdList: INotification[] = [];

    for (const enrollment of enrollments) {
      const student = enrollment.studentId as any;
      if (!student || !student.userId) continue;

      // If reminder is for approaching deadline, check if student already submitted!
      if (reminderType === 'deadline_approaching') {
        const existingSubmission = await AssignmentSubmission.findOne({
          homeworkId: homework._id,
          studentId: student._id,
          status: { $in: ['submitted', 'graded'] },
          isDeleted: false,
        });
        if (existingSubmission) {
          // Already submitted; skip sending missing work reminder!
          continue;
        }
      }

      const recipientUser = await User.findById(student.userId);
      const recipientName = recipientUser?.name || 'Student';

      const emailData = emailTemplates.homeworkReminder({
        schoolName,
        recipientName,
        title: homework.title,
        subjectName,
        dueDate: dueDateStr,
        status: reminderType === 'deadline_approaching' ? 'Pending Submission' : 'Published',
        portalUrl: `${process.env.CLIENT_URL || ''}/homework`,
      });

      const idempotencyKey = `hw:${homeworkId}:${student._id}:${reminderType}`;

      const notif = await this.createNotification({
        schoolId,
        recipientId: student.userId,
        category: 'homework',
        title:
          reminderType === 'deadline_approaching'
            ? `Assignment Due Soon: ${homework.title}`
            : `New Homework: ${homework.title}`,
        content: `Subject: ${subjectName}. Due on ${dueDateStr}. Please review and submit on time.`,
        channels: ['in_app', 'email'],
        priority: reminderType === 'deadline_approaching' ? 'high' : 'normal',
        resourceType: 'Homework',
        resourceId: homework._id,
        actionUrl: '/homework',
        idempotencyKey,
        emailPayload: emailData,
      });

      if (notif) createdList.push(notif);
    }

    return createdList;
  }

  /**
   * Trigger D: Exam Schedule Announcement
   * Never sends student-facing notifications for draft exams
   */
  public static async triggerExamScheduleNotice(params: {
    schoolId: Types.ObjectId | string;
    examId: Types.ObjectId | string;
  }): Promise<INotification[]> {
    const { schoolId, examId } = params;

    const exam = await Exam.findById(examId);
    if (!exam || exam.isDeleted) return [];

    // Rule: Never notify for draft exams
    if (exam.status === 'draft') {
      logger.info(
        `[NotificationService] Exam ${examId} is in "draft" status. Notification skipped.`
      );
      return [];
    }

    // Find eligible students in target class
    const enrollments = await Enrollment.find({
      schoolId,
      classId: exam.classId,
      status: 'active',
      isDeleted: false,
    }).populate('studentId');

    const school = await School.findById(schoolId);
    const schoolName = school?.name || 'Institution';
    const startDateStr = new Date(exam.startDate).toLocaleDateString();
    const endDateStr = exam.endDate ? new Date(exam.endDate).toLocaleDateString() : undefined;

    const createdList: INotification[] = [];

    for (const enrollment of enrollments) {
      const student = enrollment.studentId as any;
      if (!student || !student.userId) continue;

      const recipientUser = await User.findById(student.userId);
      const recipientName = recipientUser?.name || 'Student';

      const emailData = emailTemplates.examSchedule({
        schoolName,
        recipientName,
        examName: exam.name,
        startDate: startDateStr,
        endDate: endDateStr,
        portalUrl: `${process.env.CLIENT_URL || ''}/exams`,
      });

      const idempotencyKey = `exam_sched:${examId}:${student._id}`;

      const notif = await this.createNotification({
        schoolId,
        recipientId: student.userId,
        category: 'exams',
        title: `Exam Schedule: ${exam.name}`,
        content: `Examination schedule for ${exam.name} has been published. Commencing on ${startDateStr}.`,
        channels: ['in_app', 'email'],
        priority: 'high',
        resourceType: 'Exam',
        resourceId: exam._id,
        actionUrl: '/exams',
        idempotencyKey,
        emailPayload: emailData,
      });

      if (notif) createdList.push(notif);
    }

    return createdList;
  }

  /**
   * Trigger E: Results Publication Notice
   * Sends notifications ONLY after official publication (without disclosing marks directly in email)
   */
  public static async triggerExamResultsNotice(params: {
    schoolId: Types.ObjectId | string;
    examId: Types.ObjectId | string;
  }): Promise<INotification[]> {
    const { schoolId, examId } = params;

    const exam = await Exam.findById(examId);
    if (!exam || exam.isDeleted) return [];

    // Rule: Must be officially published
    if (exam.status !== 'published' && !exam.publishedAt) {
      logger.info(
        `[NotificationService] Exam ${examId} results are not officially published. Skipped.`
      );
      return [];
    }

    const enrollments = await Enrollment.find({
      schoolId,
      classId: exam.classId,
      status: 'active',
      isDeleted: false,
    }).populate('studentId');

    const school = await School.findById(schoolId);
    const schoolName = school?.name || 'Institution';
    const publishedDateStr = new Date().toLocaleDateString();

    const createdList: INotification[] = [];

    for (const enrollment of enrollments) {
      const student = enrollment.studentId as any;
      if (!student || !student.userId) continue;

      const recipientUser = await User.findById(student.userId);
      const studentName = recipientUser?.name || 'Student';

      const emailData = emailTemplates.examResults({
        schoolName,
        recipientName: studentName,
        studentName,
        examName: exam.name,
        publishedDate: publishedDateStr,
        portalUrl: `${process.env.CLIENT_URL || ''}/exams`,
      });

      const idempotencyKey = `exam_res:${examId}:${student._id}`;

      const notif = await this.createNotification({
        schoolId,
        recipientId: student.userId,
        category: 'exams',
        title: `Results Published: ${exam.name}`,
        content: `Official examination results for ${exam.name} are now published. Check your student portal to review the grade sheet.`,
        channels: ['in_app', 'email'],
        priority: 'high',
        resourceType: 'Exam',
        resourceId: exam._id,
        actionUrl: '/exams',
        idempotencyKey,
        emailPayload: emailData,
      });

      if (notif) createdList.push(notif);
    }

    return createdList;
  }

  /**
   * Trigger F: General School Announcement
   */
  public static async triggerAnnouncementNotice(params: {
    schoolId: Types.ObjectId | string;
    announcementId: Types.ObjectId | string;
  }): Promise<number> {
    const { schoolId, announcementId } = params;

    const announcement = await Announcement.findById(announcementId);
    if (!announcement || announcement.isDeleted || announcement.status !== 'published') return 0;

    const school = await School.findById(schoolId);
    const schoolName = school?.name || 'Institution';

    // Target roles according to announcement audience
    let targetRoles: string[] = ['student', 'teacher', 'parent'];
    if (announcement.targetAudience === 'teachers') {
      targetRoles = ['teacher'];
    } else if (announcement.targetAudience === 'students') {
      targetRoles = ['student'];
    } else if (announcement.targetAudience === 'parents') {
      targetRoles = ['parent'];
    }

    const users = await User.find({
      schoolId: new Types.ObjectId(schoolId),
      role: { $in: targetRoles },
      isActive: true,
      isDeleted: false,
    });

    let count = 0;
    for (const user of users) {
      const emailData = emailTemplates.generalAnnouncement({
        schoolName,
        recipientName: user.name,
        title: announcement.title,
        message: announcement.content,
        portalUrl: `${process.env.CLIENT_URL || ''}/`,
      });

      const notif = await this.createNotification({
        schoolId,
        recipientId: user._id,
        category: 'announcement',
        title: announcement.title,
        content: announcement.content.slice(0, 300),
        channels: ['in_app', 'email'],
        priority: 'normal',
        resourceType: 'Announcement',
        resourceId: announcement._id,
        actionUrl: '/',
        idempotencyKey: `announcement:${announcementId}:${user._id}`,
        emailPayload: emailData,
      });

      if (notif) count++;
    }

    return count;
  }

  /**
   * Retry worker: Finds failed email deliveries (attempts < maxRetries) and retries them safely
   */
  public static async retryFailedDeliveries(
    schoolId?: Types.ObjectId | string,
    maxRetries: number = 3
  ): Promise<{ processed: number; retried: number; failed: number }> {
    const query: any = {
      'deliveryStatus.emailStatus': 'failed',
      'deliveryStatus.attempts': { $lt: maxRetries },
      isDeleted: false,
    };

    if (schoolId) {
      query.schoolId = new Types.ObjectId(schoolId);
    }

    const failedNotifs = await Notification.find(query).limit(50);
    let processed = 0;
    let retried = 0;
    let failed = 0;

    for (const notif of failedNotifs) {
      processed++;
      const user = await User.findById(notif.recipientId);
      if (!user || !user.email) {
        // Permanent failure: invalid recipient
        notif.deliveryStatus = {
          ...notif.deliveryStatus,
          emailStatus: 'failed',
          emailError: 'Permanent failure: recipient or email invalid',
          attempts: (notif.deliveryStatus?.attempts || 0) + 1,
          lastAttemptAt: new Date(),
        };
        await notif.save();
        failed++;
        continue;
      }

      try {
        await sendEmail({
          to: user.email,
          subject: notif.title,
          html: `<p>${notif.content}</p>`,
          text: notif.content,
        });

        notif.deliveryStatus = {
          emailStatus: 'sent',
          emailSentAt: new Date(),
          attempts: (notif.deliveryStatus?.attempts || 0) + 1,
          lastAttemptAt: new Date(),
        };
        await notif.save();
        retried++;
      } catch (err: any) {
        notif.deliveryStatus = {
          emailStatus: 'failed',
          emailError: err.message,
          attempts: (notif.deliveryStatus?.attempts || 0) + 1,
          lastAttemptAt: new Date(),
        };
        await notif.save();
        failed++;
      }
    }

    return { processed, retried, failed };
  }
}
