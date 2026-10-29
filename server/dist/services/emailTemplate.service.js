/**
 * Email Templates Service
 * Provides responsive, sanitized HTML & text templates for institutional notifications.
 */
// Helper: Escape HTML to prevent injection vulnerabilities
export const escapeHtml = (text) => {
    if (text === undefined || text === null)
        return '';
    const str = String(text);
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;',
    };
    return str.replace(/[&<>"']/g, (m) => map[m]);
};
const renderBaseLayout = (contentHtml, schoolName, year = new Date().getFullYear()) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(schoolName)} Notification</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 24px auto; background-color: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0; overflow: hidden; }
    .header { background-color: #0f172a; padding: 24px; text-align: center; }
    .header h1 { color: #f8fafc; font-size: 20px; font-weight: 600; margin: 0; }
    .body-content { padding: 32px 28px; line-height: 1.6; }
    .footer { background-color: #f1f5f9; padding: 18px 24px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }
    .btn { display: inline-block; padding: 10px 20px; background-color: #2563eb; color: #ffffff !important; text-decoration: none; border-radius: 6px; font-weight: 500; font-size: 14px; margin-top: 16px; }
    .badge { display: inline-block; padding: 4px 10px; border-radius: 9999px; font-size: 12px; font-weight: 600; text-transform: uppercase; }
    .badge-absent { background-color: #fee2e2; color: #991b1b; }
    .badge-present { background-color: #dcfce7; color: #166534; }
    .badge-late { background-color: #fef3c7; color: #92400e; }
    .badge-leave { background-color: #e0f2fe; color: #075985; }
    .card { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 16px; margin: 16px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${escapeHtml(schoolName)}</h1>
    </div>
    <div class="body-content">
      ${contentHtml}
    </div>
    <div class="footer">
      <p>This is an automated institutional message from ${escapeHtml(schoolName)}.</p>
      <p>&copy; ${year} ${escapeHtml(schoolName)}. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
`;
export const emailTemplates = {
    // 1. Attendance Alert
    attendanceAlert: (data) => {
        const statusLower = (data.status || '').toLowerCase();
        const badgeClass = statusLower === 'absent'
            ? 'badge-absent'
            : statusLower === 'late'
                ? 'badge-late'
                : statusLower === 'leave'
                    ? 'badge-leave'
                    : 'badge-present';
        const htmlContent = `
      <h2>Attendance Notification</h2>
      <p>Dear ${escapeHtml(data.recipientName)},</p>
      <p>This notification is to inform you about the attendance status recorded for <strong>${escapeHtml(data.studentName)}</strong> (${escapeHtml(data.className)}${data.sectionName ? ' - ' + escapeHtml(data.sectionName) : ''}).</p>
      
      <div class="card">
        <p style="margin: 4px 0;"><strong>Date:</strong> ${escapeHtml(data.attendanceDate)}</p>
        <p style="margin: 4px 0;"><strong>Recorded Status:</strong> <span class="badge ${badgeClass}">${escapeHtml(data.status)}</span></p>
        ${data.remarks
            ? `<p style="margin: 4px 0;"><strong>Remarks:</strong> ${escapeHtml(data.remarks)}</p>`
            : ''}
      </div>

      <p>Please log in to your portal to review monthly attendance summaries or submit an inquiry.</p>
      ${data.portalUrl
            ? `<p><a href="${escapeHtml(data.portalUrl)}" class="btn">View Attendance Records</a></p>`
            : ''}
    `;
        const textContent = `Attendance Notification - ${data.schoolName}\n\nDear ${data.recipientName},\n\nStudent: ${data.studentName}\nClass: ${data.className}${data.sectionName ? ' - ' + data.sectionName : ''}\nDate: ${data.attendanceDate}\nStatus: ${data.status.toUpperCase()}\n${data.remarks ? 'Remarks: ' + data.remarks + '\n' : ''}\nPlease log in to your portal for complete details.`;
        return {
            subject: `[Attendance Notice] ${data.studentName} - ${data.status.toUpperCase()} (${data.attendanceDate})`,
            html: renderBaseLayout(htmlContent, data.schoolName, data.year),
            text: textContent,
        };
    },
    // 2. Fee Reminder
    feeReminder: (data) => {
        const htmlContent = `
      <h2>Tuition & Fee Reminder</h2>
      <p>Dear ${escapeHtml(data.recipientName)},</p>
      <p>This is a polite reminder regarding an outstanding fee invoice for your student account at <strong>${escapeHtml(data.schoolName)}</strong>.</p>
      
      <div class="card">
        <p style="margin: 4px 0;"><strong>Invoice Ref:</strong> ${escapeHtml(data.invoiceNumber)}</p>
        ${data.feeStructureName
            ? `<p style="margin: 4px 0;"><strong>Structure:</strong> ${escapeHtml(data.feeStructureName)}</p>`
            : ''}
        <p style="margin: 4px 0;"><strong>Outstanding Balance:</strong> ${escapeHtml(data.currency)} ${escapeHtml(data.balanceDue.toFixed(2))}</p>
        <p style="margin: 4px 0;"><strong>Due Date:</strong> ${escapeHtml(data.dueDate)}</p>
      </div>

      <p>Please arrange payment before the due date to avoid late clearance delays.</p>
      ${data.portalUrl
            ? `<p><a href="${escapeHtml(data.portalUrl)}" class="btn">Review & Pay Invoice</a></p>`
            : ''}
    `;
        const textContent = `Tuition & Fee Reminder - ${data.schoolName}\n\nDear ${data.recipientName},\n\nInvoice: ${data.invoiceNumber}\nBalance Due: ${data.currency} ${data.balanceDue.toFixed(2)}\nDue Date: ${data.dueDate}\n\nPlease log in to your portal to review and clear your invoice.`;
        return {
            subject: `[Fee Reminder] Outstanding Invoice ${data.invoiceNumber} - Due ${data.dueDate}`,
            html: renderBaseLayout(htmlContent, data.schoolName, data.year),
            text: textContent,
        };
    },
    // 3. Homework Reminder
    homeworkReminder: (data) => {
        const htmlContent = `
      <h2>Homework & Assignment Notification</h2>
      <p>Dear ${escapeHtml(data.recipientName)},</p>
      <p>A new assignment or upcoming deadline requires your attention for <strong>${escapeHtml(data.subjectName)}</strong>.</p>
      
      <div class="card">
        <p style="margin: 4px 0;"><strong>Assignment:</strong> ${escapeHtml(data.title)}</p>
        <p style="margin: 4px 0;"><strong>Subject:</strong> ${escapeHtml(data.subjectName)}</p>
        <p style="margin: 4px 0;"><strong>Due Date:</strong> ${escapeHtml(data.dueDate)}</p>
        ${data.status
            ? `<p style="margin: 4px 0;"><strong>Status:</strong> ${escapeHtml(data.status)}</p>`
            : ''}
      </div>

      <p>Log in to access assignment instructions, download attachments, and upload your submission.</p>
      ${data.portalUrl
            ? `<p><a href="${escapeHtml(data.portalUrl)}" class="btn">View Assignment</a></p>`
            : ''}
    `;
        const textContent = `Homework Notification - ${data.schoolName}\n\nDear ${data.recipientName},\n\nAssignment: ${data.title}\nSubject: ${data.subjectName}\nDue Date: ${data.dueDate}\n\nPlease log in to access materials and submit.`;
        return {
            subject: `[Homework Notice] ${data.subjectName}: ${data.title} (Due: ${data.dueDate})`,
            html: renderBaseLayout(htmlContent, data.schoolName, data.year),
            text: textContent,
        };
    },
    // 4. Exam Schedule Notice
    examSchedule: (data) => {
        const htmlContent = `
      <h2>Examination Schedule Published</h2>
      <p>Dear ${escapeHtml(data.recipientName)},</p>
      <p>The official examination schedule for <strong>${escapeHtml(data.examName)}</strong> has been published by the administration.</p>
      
      <div class="card">
        <p style="margin: 4px 0;"><strong>Examination:</strong> ${escapeHtml(data.examName)}</p>
        <p style="margin: 4px 0;"><strong>Commencement Date:</strong> ${escapeHtml(data.startDate)}</p>
        ${data.endDate
            ? `<p style="margin: 4px 0;"><strong>Conclusion Date:</strong> ${escapeHtml(data.endDate)}</p>`
            : ''}
      </div>

      <p>Detailed timetable schedules, room allocations, and exam instructions are available in your portal.</p>
      ${data.portalUrl
            ? `<p><a href="${escapeHtml(data.portalUrl)}" class="btn">View Exam Timetable</a></p>`
            : ''}
    `;
        const textContent = `Exam Schedule Published - ${data.schoolName}\n\nDear ${data.recipientName},\n\nExam: ${data.examName}\nCommencement: ${data.startDate}\n\nPlease check your portal for full subject timetable schedules.`;
        return {
            subject: `[Exam Schedule] ${data.examName} Timetable Published`,
            html: renderBaseLayout(htmlContent, data.schoolName, data.year),
            text: textContent,
        };
    },
    // 5. Exam Results Notice
    examResults: (data) => {
        const htmlContent = `
      <h2>Examination Results Officially Published</h2>
      <p>Dear ${escapeHtml(data.recipientName)},</p>
      <p>Official examination results for <strong>${escapeHtml(data.studentName)}</strong> for the examination <strong>${escapeHtml(data.examName)}</strong> have been formally published.</p>
      
      <div class="card">
        <p style="margin: 4px 0;"><strong>Student:</strong> ${escapeHtml(data.studentName)}</p>
        <p style="margin: 4px 0;"><strong>Exam Term:</strong> ${escapeHtml(data.examName)}</p>
        <p style="margin: 4px 0;"><strong>Published Date:</strong> ${escapeHtml(data.publishedDate)}</p>
      </div>

      <p>For confidentiality and privacy reasons, please log in to your secure portal to download or view the official report card.</p>
      ${data.portalUrl
            ? `<p><a href="${escapeHtml(data.portalUrl)}" class="btn">View Official Report Card</a></p>`
            : ''}
    `;
        const textContent = `Official Results Published - ${data.schoolName}\n\nDear ${data.recipientName},\n\nResults for ${data.studentName} (${data.examName}) have been published on ${data.publishedDate}.\nPlease log in to your secure portal to view grades.`;
        return {
            subject: `[Results Published] ${data.examName} Results Available`,
            html: renderBaseLayout(htmlContent, data.schoolName, data.year),
            text: textContent,
        };
    },
    // 6. General Announcement
    generalAnnouncement: (data) => {
        const htmlContent = `
      <h2>${escapeHtml(data.title)}</h2>
      <p>Dear ${escapeHtml(data.recipientName)},</p>
      <div class="card">
        <p style="white-space: pre-line;">${escapeHtml(data.message)}</p>
        ${data.senderName
            ? `<p style="margin-top: 12px; font-size: 13px; color: #64748b;"><em>Issued by: ${escapeHtml(data.senderName)}</em></p>`
            : ''}
      </div>
      ${data.portalUrl
            ? `<p><a href="${escapeHtml(data.portalUrl)}" class="btn">Open Portal</a></p>`
            : ''}
    `;
        const textContent = `${data.title} - ${data.schoolName}\n\nDear ${data.recipientName},\n\n${data.message}\n\n${data.senderName ? 'Issued by: ' + data.senderName : ''}`;
        return {
            subject: `[Announcement] ${data.title}`,
            html: renderBaseLayout(htmlContent, data.schoolName, data.year),
            text: textContent,
        };
    },
    // 7. Security / Account Notice
    securityNotice: (data) => {
        const htmlContent = `
      <h2>${escapeHtml(data.title)}</h2>
      <p>Dear ${escapeHtml(data.recipientName)},</p>
      <p>${escapeHtml(data.message)}</p>
      ${data.actionCode
            ? `<div style="text-align: center; margin: 24px 0;"><span style="font-size: 28px; font-weight: bold; letter-spacing: 4px; padding: 12px 24px; background: #e2e8f0; border-radius: 8px; font-family: monospace;">${escapeHtml(data.actionCode)}</span></div>`
            : ''}
      ${data.actionUrl
            ? `<p style="text-align: center;"><a href="${escapeHtml(data.actionUrl)}" class="btn">Proceed to Verification</a></p>`
            : ''}
      <p style="font-size: 13px; color: #64748b;">If you did not request this action, please contact your school administrator immediately.</p>
    `;
        const textContent = `${data.title} - ${data.schoolName}\n\nDear ${data.recipientName},\n\n${data.message}\n${data.actionCode ? 'Verification Code: ' + data.actionCode + '\n' : ''}${data.actionUrl ? 'Link: ' + data.actionUrl + '\n' : ''}`;
        return {
            subject: `[Security Notice] ${data.title}`,
            html: renderBaseLayout(htmlContent, data.schoolName, data.year),
            text: textContent,
        };
    },
};
