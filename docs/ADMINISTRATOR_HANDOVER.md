# EduManage Multi-Tenant SMS — School Administrator User Manual & Handover Guide

**Application:** EduManage Multi-Tenant School Management System  
**Document Version:** 1.0.0 (Phase 22 Operational Handover)  
**Target Audience:** School Principals, Vice Principals, Academic Directors, and School Office Administrators  
**Classification:** Operational / Administrative  

---

## 1. Introduction & Role Definitions

EduManage SMS is an enterprise multi-tenant school operating system. Each school's data is strictly partitioned and isolated: administrators and staff from one school can never view or modify records belonging to another school.

### Role Hierarchy & Permissions

| Role | Scope | Permitted Actions |
|---|---|---|
| **Super Admin** | Platform-Wide | Provisions new school tenants, manages global subscription plans, monitors platform health. Cannot modify individual school grading or student records. |
| **School Admin** | School-Level | Full administrative authority within their assigned school: manages staff, students, academic structures, fee invoicing, exams, settings, and school branding. |
| **Teacher** | Class / Section Scoped | Takes daily attendance, creates homework, grades student submissions, enters draft exam marks, and uploads study materials for assigned classes. |
| **Student** | Personal Ward Scoped | Views their class timetable, daily attendance records, homework assignments, report cards, fee invoices, and study materials. |
| **Parent** | Linked Children Scoped | Views academic progress, attendance percentages, fee balances, and report cards exclusively for their linked children (wards). |

---

## 2. Getting Started: Secure Login & Account Management

### 2.1 First-Time Registration & Email Verification
1. Open the school portal URL (e.g. `https://app.yourdomain.com`).
2. When registering a new school tenant, provide the school name, administrator email, password, and contact phone.
3. Check your administrator email for a **6-digit One-Time Password (OTP)**.
4. Enter the OTP code on the verification screen to activate your school partition.

### 2.2 Signing In & Session Security
- Log in using your registered email and password.
- The system issues a secure, encrypted authentication token.
- **Rate Limiting Protection:** If more than 5 incorrect login attempts occur within 15 minutes, access is temporarily locked for your IP address to protect against brute-force attacks.

### 2.3 Password Management & Session Revocation
- **Changing Password:** Navigate to **User Profile > Change Password**. Passwords must be at least 8 characters and include uppercase, lowercase, numbers, and special symbols.
- **Revoking Active Sessions:** If you suspect your account was accessed from an unrecognized computer, click **"Sign Out All Other Sessions"** in your profile. This instantly invalidates all active sessions across all devices.

---

## 3. Academic Structure Setup (Step-by-Step)

Before admitting students or assigning teachers, configure the school's academic hierarchy in the following order:

```
    ┌──────────────────────┐
    │ 1. Academic Session  │  e.g., "2026-2027" (Set as active session)
    └──────────┬───────────┘
               │
               ▼
    ┌──────────────────────┐
    │ 2. Classes           │  e.g., "Grade 9", "Grade 10"
    └──────────┬───────────┘
               │
               ▼
    ┌──────────────────────┐
    │ 3. Sections          │  e.g., "Section A", "Section B" (Set capacity limit)
    └──────────┬───────────┘
               │
               ▼
    ┌──────────────────────┐
    │ 4. Subjects          │  e.g., "Mathematics" (Core), "English Language"
    └──────────────────────┘
```

1. **Academic Session:** Navigate to **Academic > Academic Sessions**. Create the session name (e.g., `2026-2027`), set start/end dates, and toggle `isCurrent: true`.
2. **Classes:** Navigate to **Academic > Classes**. Add class names and numerical levels (e.g., `Grade 9`, Level `9`).
3. **Sections:** Navigate to **Academic > Sections**. Create sections for each class, assigning max capacity and optionally designating a Class Teacher.
4. **Subjects:** Navigate to **Academic > Subjects**. Define subjects, subject codes (e.g., `MATH-101`), and specify whether the subject is theory, practical, or elective.

---

## 4. Staff, Student & Parent Management

### 4.1 Onboarding Teachers & Staff
1. Navigate to **Staff Management > Add Teacher**.
2. Enter the teacher's full name, email, employee ID, phone, department, and hire date.
3. Once registered, navigate to **Academic > Subject Assignments** to assign the teacher to specific subjects, classes, and sections.

### 4.2 Admitting Students & Enrollments
1. Navigate to **Student Management > Admit Student**.
2. Provide personal details, unique admission number, date of birth, gender, and contact address.
3. **Enrollment:** Select the current Academic Session, target Class, and Section. The system automatically creates an active `Enrollment` record.

### 4.3 Linking Parents & Guardians
1. Navigate to **Parent Management > Add Parent / Guardian**.
2. Search and select the student ward(s) by admission number.
3. Specify the relationship (e.g., `Mother`, `Father`, `Legal Guardian`).
4. Once linked, the parent portal will automatically display academic progress, attendance, and fee invoices for their children.

---

## 5. Daily Attendance Management

- **Marking Attendance:** Teachers or administrators navigate to **Attendance > Mark Daily Attendance**.
- Select the Class, Section, and Date.
- Students default to **Present**. Toggle any student to **Absent**, **Late**, or **Excused**.
- Click **Save Attendance**. The system enforces a unique compound constraint `{ schoolId, studentId, date }` to prevent duplicate records.
- **Attendance Threshold Alerts:** If a student's attendance falls below the school threshold (default: 75%), a warning badge appears on their dashboard.

---

## 6. Fee Management, Invoicing & Receipts

### 6.1 Creating Fee Structures
1. Navigate to **Fee Management > Fee Structures**.
2. Define standard fee categories: `Tuition Fee`, `Laboratory Fee`, `Transport Fee`, `Annual Examination Fee`.
3. Set the due date and billing frequency (Monthly, Termly, Annual).

### 6.2 Generating Invoices & Concessions
1. Click **Generate Batch Invoices** to bill all students in a target class or session.
2. If a student receives a scholarship or sibling discount, apply a **Concession** amount before issuing.
3. The invoice balance updates automatically using exact decimal arithmetic:
   $$\text{Balance} = \text{Total Amount} - \text{Concession Amount} - \text{Paid Amount}$$

### 6.3 Recording Payments & Receipts
1. Open an outstanding invoice and click **Record Payment**.
2. Select payment method (`Cash`, `Bank Transfer`, `Cheque`, `Card`).
3. Enter the transaction reference and amount.
4. If the payment equals the remaining balance, the invoice status changes to **Paid**. If partial, it changes to **Partially Paid**.
5. Click **Download Receipt** to generate a printable payment voucher.

---

## 7. Homework & Study Materials Management

- **Assigning Homework:** Teachers navigate to **Homework > Create Assignment**. Set title, instructions, class/section, subject, submission deadline, and max marks.
- **Submissions:** Students upload PDF or image files before the deadline.
- **Grading:** Teachers review submitted assignments, assign marks, and leave feedback. Marks automatically reflect in the student's dashboard.
- **Study Materials Repository:** Teachers upload curriculum notes, slide decks, and reference guides. Documents can be shared school-wide or restricted to specific classes.

---

## 8. Timetable Scheduling & Clash Prevention

1. Navigate to **Timetable > Class Timetables**.
2. Select the target Class and Section.
3. Click an empty period slot to assign a Subject, Teacher, and Room.
4. **Automated Conflict Interception:** If the selected teacher or classroom is already scheduled in another section at the same time, the system displays a conflict warning and prevents the booking.

---

## 9. Examinations, Grading & Report Cards

```
  ┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
  │ 1. Create Exam  │ ----> │ 2. Enter Marks  │ ----> │ 3. Publish &    │
  │ Term 1 Finals   │       │ (Draft State)   │       │ Generate Cards  │
  └─────────────────┘       └─────────────────┘       └─────────────────┘
```

1. **Create Exam:** Navigate to **Examinations > Create Exam**. Define exam title, session, start date, and end date.
2. **Exam Subjects:** Assign subject papers, maximum marks (e.g., 100), and passing marks (e.g., 40).
3. **Marks Entry (Draft State):** Teachers enter raw marks for their assigned subject papers. While an exam is in `draft` state, marks are invisible to students and parents.
4. **Publishing Exam Results:** Once verified, the School Admin clicks **"Publish Exam Results"**. This locks the marks against unauthorized tampering and immediately makes report cards available on student and parent dashboards.

---

## 10. Communication & Broadcast Notifications

- **Direct Messaging:** Staff, teachers, students, and parents can participate in secure 1-on-1 or group conversations. Messages are updated in real-time.
- **School Announcements:** School Admins navigate to **Notifications > Create Announcement**. Announcements can be broadcast to `All Users`, `Teachers Only`, `Parents Only`, or `Students Only`.
- **Email Notifications:** The system sends automated transactional emails for password resets, student fee reminders, and attendance warning alerts.

---

## 11. Reports & Financial Exports

1. Navigate to **Reports & Analytics**.
2. Select the report type:
   - **Student Attendance Summary:** Monthly and annual attendance percentages.
   - **Fee Collection & Aging Report:** Total collections, outstanding balances, and overdue invoices.
   - **Exam Performance Distribution:** Class averages, top performers, and grade distributions.
3. Click **Export CSV** to download spreadsheet-compatible reports. All export queries are strictly clamped to protect system performance.

---

## 12. School Settings & Customization

School Admins can customize the portal via **School Settings**:
- **Branding:** Upload your official school logo and set school primary/accent theme colors.
- **Contact Details:** Official school address, phone numbers, and official email.
- **Grading Scale:** Configure percentage-to-letter grade conversions (e.g., 90–100% = A+, 80–89% = A).
- **Default Currency & Timezone:** Select the operational currency symbol (e.g., `$`, `€`, `£`, `Rs.`) and official time zone.

---

## 13. Security Best Practices & Incident Reporting

- **Never Share Admin Credentials:** Every staff member must use their own named account.
- **Lock Your Screen:** Always lock or log out of office workstations when unattended.
- **Reporting Issues:** If you suspect an unauthorized login or notice data inconsistencies, immediately notify your IT department or system maintainer with the approximate time and affected student or account ID.
