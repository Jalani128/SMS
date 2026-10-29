# EduManage SMS — Phase 2: Database Architecture & Mongoose Schema Specification

> **Document Version:** 2.0.0 (Phase 2 Architecture)  
> **Target Engine:** MongoDB 6.0+ & Mongoose 8.x (Node.js / TypeScript)  
> **Tenant Strategy:** Multi-Tenant Logical Partitioning (`schoolId` Sharded/Compound Key)

---

## 1. Overview & Architectural Principles

Phase 2 establishes the database foundation for a production-ready, multi-tenant school management system. Every school tenant operates within a shared database architecture using strict, server-enforced logical isolation via `schoolId` scoping.

### Core Tenets:
1. **Never Trust Client Tenant Context:** Client-supplied `schoolId` headers or query parameters are never treated as authorization. Tenant context is validated server-side by matching the authenticated JWT token context against the requested operation.
2. **Normalized Data Modeling with Strategic Denormalization:** Growing collections (such as `Message`, `Payment`, `Attendance`, and `AssignmentSubmission`) use explicit ObjectId references rather than unbounded arrays.
3. **Exact Currency Representation:** All financial records (`FeeStructure`, `Invoice`, `Payment`) store money using Mongoose `Schema.Types.Decimal128` to eliminate floating-point arithmetic errors.
4. **Idempotent Operations:** Payment processing enforces unique `idempotencyKey` compound indexes per school to prevent double-charging or race conditions.
5. **Soft Deletion & Archival:** Auditable entities incorporate the `softDeletePlugin`, retaining historical audit trails via `isDeleted`, `deletedAt`, and `deletedBy`.
6. **No Raw Secrets in Storage:** Passwords (`passwordHash`) and one-time codes (`hashedOTP`) are hashed via bcrypt with high salt rounds. Default schema serialization transforms (`toJSON`, `toObject`) strip sensitive hash values.

---

## 2. Text-Based Entity-Relationship Diagram (ERD)

```text
+---------------------------------------------------------------------------------------------------+
|                                        GLOBAL PLATFORM LAYER                                      |
+---------------------------------------------------------------------------------------------------+
  [School] (Tenant Root)
     |
     +---> [User] (Login Identity: super_admin, admin, teacher, student, parent)
     |       |
     |       +--- 1:1 ---> [Student Profile] <==== M:N (Guardians Link) ====> [Parent Profile]
     |       +--- 1:1 ---> [Teacher Profile]
     |
     +---> [AcademicSession]
     |       |
     |       +--- 1:N ---> [Class] --- 1:N ---> [Section]
     |       |               |                     |
     |       |               +-----------+---------+
     |       |                           |
     |       +--- 1:N ---> [Enrollment] (Student + Session + Class + Section)
     |       |
     |       +--- 1:N ---> [Subject]
     |       |
     |       +--- 1:N ---> [Timetable] (Session + Class + Section + Subject + Teacher + Room + Day)
     |       |
     |       +--- 1:N ---> [Attendance] (Student + Date [Normalized UTC Midnight])
     |       |
     |       +--- 1:N ---> [FeeStructure] --- 1:N ---> [Invoice] --- 1:N ---> [Payment]
     |       |                                            |
     |       |                                     (IdempotencyKey)
     |       |
     |       +--- 1:N ---> [Homework] --- 1:N ---> [AssignmentSubmission]
     |       |
     |       +--- 1:N ---> [StudyMaterial]
     |       |
     |       +--- 1:N ---> [Exam] --- 1:N ---> [ExamSubject] --- 1:N ---> [Mark]
     |
     +---> [Conversation] --- 1:N ---> [Message]
     +---> [Notification]
     +---> [Announcement]
     +---> [OTPVerification] (Hashed only)
     +---> [AuditLog] (Sanitized immutable audit trail)
```

---

## 3. Detailed Model Specifications

### 3.1 School & Identity Domain

#### `School` (`School.model.ts`)
- **Purpose:** Represents the tenant boundary for an educational institution.
- **Key Fields:**
  - `name`: String (2–150 chars, required, trimmed)
  - `slug`: String (unique, alphanumeric lowercase + hyphens, indexed)
  - `code`: String (unique uppercase institution code, e.g., `GIA-2026`)
  - `email`: String (school contact email, verified regex)
  - `phone`: String
  - `address`: Embedded object (street, city, state, postalCode, country)
  - `status`: Enum `['pending', 'active', 'suspended']` (default: `'pending'`). *Supports registration remaining pending until verified.*
  - `emailVerificationStatus`: Enum `['unverified', 'pending', 'verified']`
  - `timezone`: String (default: `'UTC'`)
  - `currency`: String (default: `'USD'`)
  - `settings`: Subdocument (academicYear, attendanceThreshold, feeDueGraceDays, dateFormat)
- **Indexes:**
  - `{ slug: 1 }` (unique)
  - `{ code: 1 }` (unique)
  - `{ status: 1 }`

#### `User` (`User.model.ts`)
- **Purpose:** Centralized authentication entity holding login credentials, roles, and session states.
- **Key Fields:**
  - `name`: String (full name)
  - `email`: String (lowercase, trimmed, validated)
  - `passwordHash`: String (bcrypt hash, `select: false`)
  - `role`: Enum `['super_admin', 'admin', 'teacher', 'student', 'parent']`
  - `schoolId`: ObjectId (ref: `School`, required for all roles except `super_admin`)
  - `isActive`: Boolean (default: `true`)
  - `emailVerified`: Boolean (default: `false`)
  - `lastLoginAt`: Date
- **Serialization Security:** `toJSON` transform automatically removes `passwordHash` and `__v`.
- **Indexes:**
  - `{ schoolId: 1, email: 1 }` (unique compound index ensuring per-tenant email uniqueness)

#### `Student` (`Student.model.ts`)
- **Purpose:** Student academic profile, personal records, and guardian linkage.
- **Key Fields:**
  - `userId`: ObjectId (ref: `User`, unique 1:1 relationship)
  - `schoolId`: ObjectId (ref: `School`, required)
  - `admissionNumber`: String (uppercase, e.g., `GIA-8812`)
  - `rollNumber`: String
  - `currentSessionId`: ObjectId (ref: `AcademicSession`)
  - `currentClassId`: ObjectId (ref: `Class`)
  - `currentSectionId`: ObjectId (ref: `Section`)
  - `dateOfBirth`: Date
  - `gender`: Enum `['male', 'female', 'other', 'prefer_not_to_say']`
  - `bloodGroup`: Enum `['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'unknown']`
  - `medicalNotes`: String
  - `emergencyContact`: Object (name, relationship, phone)
  - `guardians`: Array of `{ parentProfileId: ObjectId, userId: ObjectId, relationship: Enum, isPrimary: Boolean, canPickup: Boolean }`
  - `status`: Enum `['active', 'inactive', 'transferred', 'graduated', 'suspended']`
- **Indexes:**
  - `{ schoolId: 1, admissionNumber: 1 }` (unique)
  - `{ schoolId: 1, currentClassId: 1, currentSectionId: 1 }`
  - `{ schoolId: 1, 'guardians.parentProfileId': 1 }`

#### `Teacher` (`Teacher.model.ts`)
- **Purpose:** Faculty profile, employment details, and department allocation.
- **Key Fields:**
  - `userId`: ObjectId (ref: `User`, unique 1:1)
  - `schoolId`: ObjectId (ref: `School`, required)
  - `employeeId`: String (unique per school, uppercase, e.g., `FAC-102`)
  - `department`: String (e.g., `'Science'`, `'Mathematics'`)
  - `designation`: String (e.g., `'Senior Faculty'`, `'Head of Dept'`)
  - `qualification`: String
  - `specializations`: Array of Strings
  - `joiningDate`: Date
  - `status`: Enum `['active', 'on_leave', 'resigned', 'terminated', 'retired']`
- **Indexes:**
  - `{ schoolId: 1, employeeId: 1 }` (unique)
  - `{ schoolId: 1, department: 1, status: 1 }`

#### `Parent` (`Parent.model.ts`)
- **Purpose:** Guardian profile linking a parent account to one or more enrolled children.
- **Key Fields:**
  - `userId`: ObjectId (ref: `User`, unique 1:1)
  - `schoolId`: ObjectId (ref: `School`, required)
  - `children`: Array of `{ studentProfileId: ObjectId (ref: Student), relationship: Enum, isPrimary: Boolean }`
  - `occupation`: String
  - `alternatePhone`: String
  - `address`: String
  - `status`: Enum `['active', 'inactive']`
- **Parent-Student Multi-Child Linkage:**
  - A parent record can link to $N$ children via `children.studentProfileId`.
  - Conversely, each student profile maintains an array of `guardians`, enabling shared custody or dual-guardian tracking (mother, father, guardian) without duplicating student profiles.
- **Indexes:**
  - `{ schoolId: 1, userId: 1 }` (unique)
  - `{ schoolId: 1, 'children.studentProfileId': 1 }`

---

### 3.2 Academic Architecture Domain

#### `AcademicSession` (`AcademicSession.model.ts`)
- **Purpose:** Academic calendar year or term boundaries.
- **Key Fields:**
  - `schoolId`: ObjectId (ref: `School`)
  - `name`: String (e.g., `"2026-2027 Academic Year"`)
  - `code`: String (e.g., `"AY-2026-2027"`)
  - `startDate`: Date, `endDate`: Date (validated `endDate > startDate`)
  - `isCurrent`: Boolean (denotes active session)
  - `status`: Enum `['upcoming', 'active', 'completed', 'archived']`
  - `terms`: Array of sub-terms (name, startDate, endDate)
- **Indexes:**
  - `{ schoolId: 1, code: 1 }` (unique)
  - `{ schoolId: 1, isCurrent: 1 }`

#### `Class` & `Section` (`Class.model.ts`, `Section.model.ts`)
- **Purpose:** Grade levels and sub-cohorts.
- **Class Fields:** `name` (`"Grade 10"`), `code` (`"G10"`), `order` (10), `description`, `status`.
- **Section Fields:** `classId` (ref: `Class`), `name` (`"Section A"`), `code` (`"A"`), `capacity` (1–200, default 35), `classTeacherId` (ref: `Teacher`), `roomNumber`.
- **Indexes:**
  - Class: `{ schoolId: 1, code: 1 }` (unique)
  - Section: `{ schoolId: 1, classId: 1, code: 1 }` (unique per class)

#### `Subject` (`Subject.model.ts`)
- **Purpose:** Course and curriculum definitions.
- **Fields:** `name` (`"AP Physics Mechanics"`), `code` (`"PHY-101"`), `type` (`'core' | 'elective' | 'optional' | 'vocational'`), `department`, `creditHours`.
- **Indexes:**
  - `{ schoolId: 1, code: 1 }` (unique)
  - `{ schoolId: 1, department: 1 }`

#### `Enrollment` (`Enrollment.model.ts`)
- **Purpose:** Historical and active cohort enrollment ledger.
- **Rules:** The system does NOT rely solely on `Student.currentClassId`. Every student cohort registration is captured as an `Enrollment` document linking the student, session, class, and section.
- **Fields:**
  - `studentId`: ObjectId (ref: `Student`)
  - `academicSessionId`: ObjectId (ref: `AcademicSession`)
  - `classId`: ObjectId (ref: `Class`)
  - `sectionId`: ObjectId (ref: `Section`)
  - `rollNumber`: String
  - `status`: Enum `['enrolled', 'promoted', 'transferred', 'dropped', 'graduated']`
  - `promotedToEnrollmentId`: ObjectId (ref: `Enrollment`, for progression lineage)
- **Compound Unique Index:**
  - `{ schoolId: 1, studentId: 1, academicSessionId: 1 }` (unique: true)
  - *Prevents conflicting dual enrollments in the same academic session.*

#### `Timetable` (`Timetable.model.ts`)
- **Purpose:** Class schedule period matrix structured for conflict detection.
- **Fields:** `academicSessionId`, `classId`, `sectionId`, `subjectId`, `teacherId`, `dayOfWeek` (enum: monday–sunday), `startTime` (`"HH:mm"`), `endTime` (`"HH:mm"`), `room`, `status`.
- **Conflict Detection Compound Indexes:**
  1. **Teacher Conflict:** `{ schoolId: 1, academicSessionId: 1, teacherId: 1, dayOfWeek: 1, startTime: 1, endTime: 1 }`
  2. **Room Conflict:** `{ schoolId: 1, academicSessionId: 1, room: 1, dayOfWeek: 1, startTime: 1, endTime: 1 }`
  3. **Section Conflict:** `{ schoolId: 1, academicSessionId: 1, sectionId: 1, dayOfWeek: 1, startTime: 1, endTime: 1 }`

---

### 3.3 Daily Attendance Domain

#### `Attendance` (`Attendance.model.ts`)
- **Purpose:** Daily student attendance register.
- **Fields:**
  - `studentId`: ObjectId (ref: `Student`)
  - `academicSessionId`: ObjectId (ref: `AcademicSession`)
  - `classId`: ObjectId (ref: `Class`), `sectionId`: ObjectId (ref: `Section`)
  - `date`: Date (normalized to UTC midnight `00:00:00.000Z`)
  - `status`: Enum `['present', 'absent', 'late', 'leave']`
  - `remarks`: String
  - `markedBy`: ObjectId (ref: `User`)
- **Compound Unique Index:**
  - `{ schoolId: 1, studentId: 1, date: 1 }` (unique: true)
  - **Index Justification:** A student belongs to one school partition and can have at most one attendance status per calendar date. Normalizing `date` to UTC midnight prevents multiple marks caused by varying client timestamps. `classId`, `sectionId`, and `academicSessionId` are denormalized onto the record to accelerate classroom roll queries without performing lookups.

---

### 3.4 Finance & Invoicing Domain

#### Money Representation Policy
- **No Floating-Point Arithmetic:** JavaScript native IEEE 754 floating-point numbers (`Number`) are strictly forbidden for monetary calculation.
- **Decimal128 Storage:** All amounts in `FeeStructure`, `Invoice`, and `Payment` are stored as BSON `Decimal128`.
- **Virtual Derivation of Balances:** Invoices calculate `balanceAmount` dynamically via getter:
  $$\text{balanceAmount} = \max(0, \text{totalAmount} - \text{discountAmount} - \text{paidAmount})$$

#### `FeeStructure` (`FeeStructure.model.ts`)
- **Purpose:** Tuition and fee schedule templates per class and session.
- **Fields:** `lineItems` (name, amount: Decimal128, frequency: Enum, isOptional), `concessions` (name, type: percentage/fixed, value: Decimal128, criteria), `dueDateRule`.

#### `Invoice` (`Invoice.model.ts`)
- **Purpose:** Student billable statement.
- **Fields:** `invoiceNumber` (unique per school, e.g., `INV-2026-0001`), `lineItems`, `totalAmount` (Decimal128), `discountAmount` (Decimal128), `paidAmount` (Decimal128), `dueDate`, `status` (`'draft' | 'issued' | 'partially_paid' | 'paid' | 'overdue' | 'cancelled'`).
- **Indexes:** `{ schoolId: 1, invoiceNumber: 1 }` (unique).

#### `Payment` (`Payment.model.ts`)
- **Purpose:** Payment transaction log.
- **Idempotency & Duplicate Prevention:**
  - Every payment operation requires an `idempotencyKey` (UUIDv4 generated by client or payment orchestration service).
  - Enforces compound unique index: `{ schoolId: 1, idempotencyKey: 1 }` (unique: true).
  - If a network retry occurs with the same idempotency key, MongoDB rejects the duplicate write with error code 11000.
- **Fields:** `invoiceId`, `studentId`, `paymentNumber` (unique), `idempotencyKey` (unique), `amount` (Decimal128), `currency` (`'USD'`), `method` (cash, card, bank_transfer, cheque, online), `provider` (manual, stripe, etc.), `providerReference`, `status` (`'pending' | 'successful' | 'failed' | 'refunded'`), `paidAt`, `recordedBy`.

---

### 3.5 Homework & Learning Materials Domain

- **File Metadata Storage Policy:** Raw files (PDFs, images, documents) are **never** stored as binary buffers (`binData`) in MongoDB. Cloudinary or S3 handles file storage. MongoDB stores only the typed metadata subdocument:
  ```ts
  interface IAttachmentMeta {
    name: string;
    url: string;
    fileType: string;
    sizeBytes: number;
    storageKey?: string;
  }
  ```
- **`Homework` (`Homework.model.ts`):** `title`, `instructions`, `assignedDate`, `dueDate`, `maxMarks`, `attachments`, `status`.
- **`AssignmentSubmission` (`AssignmentSubmission.model.ts`):** `homeworkId`, `studentId`, `submittedAt`, `attachments`, `status` (`'submitted' | 'late' | 'graded' | 'resubmitted'`), `marksObtained`, `teacherFeedback`, `gradedBy`.
  - **Unique Index:** `{ schoolId: 1, homeworkId: 1, studentId: 1 }` (unique: true).
- **`StudyMaterial` (`StudyMaterial.model.ts`):** `title`, `description`, `category` (notes, presentation, past_paper, syllabus, reference), `attachments`, `isPublic`.

---

### 3.6 Examination & Grading Domain

- **Policy:** Examination results are **never** auto-calculated or auto-published. Marks remain in `'draft'` until verified by faculty or administration.
- **`Exam` (`Exam.model.ts`):** `name` (`"Term 1 Midterms"`), `term`, `startDate`, `endDate`, `status` (`'draft' | 'scheduled' | 'ongoing' | 'completed' | 'published' | 'cancelled'`).
- **`ExamSubject` (`ExamSubject.model.ts`):** `examId`, `classId`, `subjectId`, `examDate`, `startTime`, `endTime`, `maxMarks`, `passMarks`, `room`.
  - **Unique Index:** `{ schoolId: 1, examId: 1, classId: 1, subjectId: 1 }` (unique: true).
- **`Mark` (`Mark.model.ts`):** `examSubjectId`, `studentId`, `enrollmentId`, `marksObtained`, `grade`, `isAbsent`, `remarks`, `enteredBy`, `publicationStatus` (`'draft' | 'verified' | 'published'`).
  - **Unique Index:** `{ schoolId: 1, examSubjectId: 1, studentId: 1 }` (unique: true).

---

### 3.7 Communication, Security & Audit Domain

- **`Conversation` & `Message`:** Real-time messaging architecture prepared for Socket.IO.
  - `Conversation` groups authorized participants.
  - `Message` is an independent growing collection with `conversationId`, `senderId`, `content`, `attachments`, `readBy` receipts.
- **`Notification`:** Push notification drawer entity with category (`academic`, `finance`, `attendance`, `system`, `notice`), read receipts, priority, and resource link.
- **`Announcement`:** Broadcast notice board entity with target audience filtering (`all`, `teachers`, `students`, `parents`, `class`).
- **`OTPVerification` (`OTPVerification.model.ts`):**
  - **Security Rule:** Raw OTPs are NEVER stored. The schema stores only bcrypt `hashedOTP` (`select: false`).
  - **Fields:** `identifier` (email/phone), `hashedOTP`, `purpose` (`email_verification`, `password_reset`, `login_2fa`, `school_activation`), `expiresAt`, `isUsed`, `attempts`, `maxAttempts` (default: 5).
  - Built-in method `verifyCandidateOTP(candidateOTP)` validates attempt thresholds and expiration.
- **`AuditLog` (`AuditLog.model.ts`):**
  - Immutable append-only audit trail (`timestamps: { createdAt: true, updatedAt: false }`).
  - **Pre-save Sanitization Hook:** Automatically scans metadata and redacts passwords, tokens, hashes, and OTPs with `[REDACTED_SENSITIVE_DATA]`.
  - Excludes AI prompt/output dumps by default to preserve privacy.

---

## 4. School Isolation & Security Architecture

### The Multi-Tenant Security Mandate
> **Schema fields alone do NOT enforce tenant isolation.**

Declaring `{ schoolId: ObjectId }` in a schema merely provides a database column; it does not protect against data leaks. True multi-tenancy requires:

1. **Server-Side Validation:** The utility `validateSchoolContext(user, requestedSchoolId)` verifies that the user's cryptographically signed JWT token possesses access to the requested `schoolId`.
2. **Super-Admin Protection:** Super-admin cross-school access is permitted only when `user.role === 'super_admin'` and an explicit target school is requested.
3. **Mongoose Plugin Scoping:** The `tenantIsolationPlugin` automatically binds `{ schoolId: contextSchoolId }` to Mongoose queries unless `skipTenantFilter: true` is explicitly passed in trusted internal operations.
4. **Post-Query Tenant Assertion:** `assertDocumentTenantOwnership(document, expectedSchoolId)` verifies that any document loaded from disk belongs to the calling user's tenant before mutating or serializing.

---

## 5. Development Seed & Reset Strategy

- **CLI Command:** `npm run seed --prefix server`
- **Safety Guard:** Script immediately halts if `NODE_ENV === 'production'`.
- **Idempotency:** Seed uses `findOneAndUpdate(..., { upsert: true })`, making it safe to execute multiple times without generating duplicate records.
- **Configurable Credentials:** Password hashes are generated via `bcrypt` using `DEMO_USER_PASSWORD` (defaults to `SchoolDemo@2026`).
- **Reset Procedure:** To wipe and re-seed the test database, connect to MongoDB and drop the test database (`use edumanage_db; db.dropDatabase();`), then re-run `npm run seed --prefix server`.

---

## 6. Migration & Future Considerations

1. **Composite Database Sharding:** If a school outgrows single-node storage, collections can be sharded on `{ schoolId: 1, _id: 1 }` or `{ schoolId: "hashed" }` with zero application code changes.
2. **MongoDB Change Streams (Phase 3):** Real-time notifications and Socket.IO events can bind to MongoDB Change Streams filtered by `{ "fullDocument.schoolId": schoolId }`.
3. **Payment Webhook Orchestration (Phase 3):** Webhook handlers for Stripe/Razorpay will verify provider signatures and query by `providerReference` before updating `Invoice.paidAmount` and `Payment.status`.
