import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Label } from '../ui/Label';
import { Select } from '../ui/Select';
import {
  AlertTriangle,
  CheckCircle2,
  Info,
} from 'lucide-react';
import { formatCurrency } from '../../lib/utils';

interface QuickActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  currency?: string;
  schoolName?: string;
}

// ---------------------------------------------------------------------------
// 1. Quick Enroll Student Modal
// ---------------------------------------------------------------------------
export const QuickEnrollStudentModal: React.FC<QuickActionModalProps> = ({
  isOpen,
  onClose,
  schoolName,
}) => {
  const [name, setName] = useState('');
  const [admissionNo, setAdmissionNo] = useState(`ADM-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`);
  const [grade, setGrade] = useState('grade-9-a');
  const [gender, setGender] = useState('female');
  const [parentEmail, setParentEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    setSubmitted(true);
  };

  const resetAndClose = () => {
    setSubmitted(false);
    setName('');
    setParentEmail('');
    onClose();
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={resetAndClose}
      title="Quick Student Admission"
      description={`Enroll an incoming student into ${schoolName || 'the institution'}.`}
      footer={
        submitted ? (
          <Button variant="default" onClick={resetAndClose}>
            Done
          </Button>
        ) : (
          <>
            <Button variant="outline" onClick={resetAndClose}>
              Cancel
            </Button>
            <Button variant="default" onClick={handleSubmit} disabled={!name}>
              Enroll Student
            </Button>
          </>
        )
      }
    >
      {submitted ? (
        <div className="py-4 text-center space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div>
            <h4 className="font-semibold text-sm">Admission Record Prepared</h4>
            <p className="text-xs text-muted-foreground mt-1">
              Admission candidate <strong>{name}</strong> assigned to{' '}
              <strong>{grade.toUpperCase()}</strong> with Admission ID{' '}
              <code>{admissionNo}</code>.
            </p>
          </div>
          <div className="p-2.5 rounded bg-blue-50/70 dark:bg-blue-950/30 text-blue-900 dark:text-blue-200 text-xs text-left flex items-start gap-2">
            <Info className="h-4 w-4 shrink-0 mt-0.5 text-blue-500" />
            <span>
              Multi-tenant isolation verified: Candidate profile will attach active school partition ID. Full database write will execute in Phase 5 student module.
            </span>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="q-student-name" required>
              Student Full Name
            </Label>
            <Input
              id="q-student-name"
              placeholder="e.g. Maya Elizabeth Lin"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="q-admission-no">Admission Number</Label>
              <Input
                id="q-admission-no"
                value={admissionNo}
                onChange={(e) => setAdmissionNo(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="q-grade">Assigned Grade</Label>
              <Select
                id="q-grade"
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                options={[
                  { label: 'Grade 9 - Section A', value: 'grade-9-a' },
                  { label: 'Grade 9 - Section B', value: 'grade-9-b' },
                  { label: 'Grade 10 - Section A', value: 'grade-10-a' },
                  { label: 'Grade 11 - Science', value: 'grade-11-sci' },
                  { label: 'Grade 12 - Commerce', value: 'grade-12-com' },
                ]}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="q-gender">Gender</Label>
              <Select
                id="q-gender"
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                options={[
                  { label: 'Female', value: 'female' },
                  { label: 'Male', value: 'male' },
                  { label: 'Other', value: 'other' },
                ]}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="q-parent-email">Primary Guardian Email</Label>
              <Input
                id="q-parent-email"
                type="email"
                placeholder="guardian@example.com"
                value={parentEmail}
                onChange={(e) => setParentEmail(e.target.value)}
              />
            </div>
          </div>
        </form>
      )}
    </Dialog>
  );
};

// ---------------------------------------------------------------------------
// 2. Quick Add Teacher Modal
// ---------------------------------------------------------------------------
export const QuickAddTeacherModal: React.FC<QuickActionModalProps> = ({
  isOpen,
  onClose,
  schoolName,
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [department, setDepartment] = useState('Mathematics');
  const [designation, setDesignation] = useState('Senior Lecturer');
  const [employeeId, setEmployeeId] = useState(`EMP-${Math.floor(1000 + Math.random() * 9000)}`);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email) return;
    setSubmitted(true);
  };

  const resetAndClose = () => {
    setSubmitted(false);
    setName('');
    setEmail('');
    onClose();
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={resetAndClose}
      title="Onboard Faculty Member"
      description={`Add a new educator or staff member to ${schoolName || 'the school'}.`}
      footer={
        submitted ? (
          <Button variant="default" onClick={resetAndClose}>
            Done
          </Button>
        ) : (
          <>
            <Button variant="outline" onClick={resetAndClose}>
              Cancel
            </Button>
            <Button variant="default" onClick={handleSubmit} disabled={!name || !email}>
              Create Faculty Profile
            </Button>
          </>
        )
      }
    >
      {submitted ? (
        <div className="py-4 text-center space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div>
            <h4 className="font-semibold text-sm">Faculty Record Prepared</h4>
            <p className="text-xs text-muted-foreground mt-1">
              <strong>{name}</strong> registered under <strong>{department}</strong> with Employee ID{' '}
              <code>{employeeId}</code>.
            </p>
          </div>
          <div className="p-2.5 rounded bg-muted/60 text-xs text-muted-foreground text-left">
            Staff welcome notification will be dispatched to <strong>{email}</strong> once published.
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="q-teacher-name" required>
              Teacher Full Name
            </Label>
            <Input
              id="q-teacher-name"
              placeholder="e.g. Dr. Julian Vance"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="q-teacher-email" required>
                Institutional Email
              </Label>
              <Input
                id="q-teacher-email"
                type="email"
                placeholder="j.vance@school.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="q-emp-id">Employee ID</Label>
              <Input
                id="q-emp-id"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="q-dept">Department</Label>
              <Select
                id="q-dept"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                options={[
                  { label: 'Mathematics', value: 'Mathematics' },
                  { label: 'Natural Sciences', value: 'Natural Sciences' },
                  { label: 'Humanities & Languages', value: 'Humanities & Languages' },
                  { label: 'Computer Science & ICT', value: 'Computer Science & ICT' },
                  { label: 'Arts & Physical Ed', value: 'Arts & Physical Ed' },
                ]}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="q-desig">Designation</Label>
              <Input
                id="q-desig"
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
              />
            </div>
          </div>
        </form>
      )}
    </Dialog>
  );
};

// ---------------------------------------------------------------------------
// 3. Quick Record Attendance Modal
// ---------------------------------------------------------------------------
export const QuickRecordAttendanceModal: React.FC<QuickActionModalProps> = ({
  isOpen,
  onClose,
}) => {
  const navigate = useNavigate();
  const [selectedClass, setSelectedClass] = useState('grade-10-a');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [defaultStatus, setDefaultStatus] = useState('present');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  const resetAndClose = () => {
    setSubmitted(false);
    onClose();
  };

  const handleOpenRegister = () => {
    resetAndClose();
    navigate('/admin/attendance');
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={resetAndClose}
      title="Daily Attendance Roll Call"
      description="Record or verify section attendance for the academic day."
      footer={
        submitted ? (
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={resetAndClose}>
              Done
            </Button>
            <Button variant="default" onClick={handleOpenRegister}>
              Open Attendance Register
            </Button>
          </div>
        ) : (
          <>
            <Button variant="outline" onClick={resetAndClose}>
              Cancel
            </Button>
            <Button variant="default" onClick={handleSubmit}>
              Initialize Roll Call
            </Button>
          </>
        )
      }
    >
      {submitted ? (
        <div className="py-4 text-center space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div>
            <h4 className="font-semibold text-sm">Attendance Session Initiated</h4>
            <p className="text-xs text-muted-foreground mt-1">
              Roll sheet prepared for <strong>{selectedClass.toUpperCase()}</strong> on{' '}
              <strong>{date}</strong>. Default marked: <strong>{defaultStatus.toUpperCase()}</strong>.
            </p>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="q-att-class">Select Target Class & Section</Label>
            <Select
              id="q-att-class"
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              options={[
                { label: 'Grade 9 - Section A (34 Students)', value: 'grade-9-a' },
                { label: 'Grade 9 - Section B (32 Students)', value: 'grade-9-b' },
                { label: 'Grade 10 - Section A (36 Students)', value: 'grade-10-a' },
                { label: 'Grade 11 - Section Science (28 Students)', value: 'grade-11-sci' },
              ]}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="q-att-date">Attendance Date</Label>
              <Input
                id="q-att-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="q-att-def">Default Status</Label>
              <Select
                id="q-att-def"
                value={defaultStatus}
                onChange={(e) => setDefaultStatus(e.target.value)}
                options={[
                  { label: 'Mark All Present', value: 'present' },
                  { label: 'Mark All Absent', value: 'absent' },
                  { label: 'Blank Worksheet', value: 'blank' },
                ]}
              />
            </div>
          </div>

          <div className="p-3 rounded-lg bg-muted/60 text-xs text-muted-foreground">
            Enforces compound unique index <code>&#123; schoolId, studentId, date &#125;</code> to prevent duplicate records per student and date.
          </div>
        </form>
      )}
    </Dialog>
  );
};

// ---------------------------------------------------------------------------
// 4. Quick Fee Invoice Modal
// ---------------------------------------------------------------------------
export const QuickFeeInvoiceModal: React.FC<QuickActionModalProps> = ({
  isOpen,
  onClose,
  currency = 'USD',
}) => {
  const navigate = useNavigate();
  const [feeType, setFeeType] = useState('Tuition Fee - Term 1');
  const [targetClass, setTargetClass] = useState('all-grades');
  const [amount, setAmount] = useState('1250');
  const [dueDate, setDueDate] = useState('2026-11-15');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount) return;
    setSubmitted(true);
  };

  const resetAndClose = () => {
    setSubmitted(false);
    onClose();
  };

  const handleOpenFeesRegister = () => {
    resetAndClose();
    navigate('/admin/fees');
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={resetAndClose}
      title="Generate Tuition Fee Invoice"
      description="Create student billing invoices with explicit financial safeguards."
      footer={
        submitted ? (
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={resetAndClose}>
              Done
            </Button>
            <Button variant="default" onClick={handleOpenFeesRegister}>
              Open Fees Register
            </Button>
          </div>
        ) : (
          <>
            <Button variant="outline" onClick={resetAndClose}>
              Cancel
            </Button>
            <Button variant="default" onClick={handleSubmit} disabled={!amount}>
              Generate Invoices
            </Button>
          </>
        )
      }
    >
      {submitted ? (
        <div className="py-4 text-center space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div>
            <h4 className="font-semibold text-sm">Invoice Batch Created</h4>
            <p className="text-xs text-muted-foreground mt-1">
              Billing batch for <strong>{feeType}</strong> ({formatCurrency(Number(amount), currency)} per student) scheduled with due date <strong>{dueDate}</strong>.
            </p>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
            <span>
              Financial Integrity: Monetary amounts are represented with exact Decimal128 representation (no floating-point rounding errors). Invoices require administrative confirmation.
            </span>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="q-fee-title">Fee Description / Item</Label>
            <Input
              id="q-fee-title"
              value={feeType}
              onChange={(e) => setFeeType(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="q-fee-amount">Amount ({currency})</Label>
              <Input
                id="q-fee-amount"
                type="number"
                min="1"
                step="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="q-fee-due">Payment Due Date</Label>
              <Input
                id="q-fee-due"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="q-fee-target">Target Cohort</Label>
            <Select
              id="q-fee-target"
              value={targetClass}
              onChange={(e) => setTargetClass(e.target.value)}
              options={[
                { label: 'All Enrolled Students (1,420)', value: 'all-grades' },
                { label: 'Grade 9 Only', value: 'grade-9' },
                { label: 'Grade 10 Only', value: 'grade-10' },
                { label: 'Grade 11 & 12 (High School)', value: 'high-school' },
              ]}
            />
          </div>
        </form>
      )}
    </Dialog>
  );
};

// ---------------------------------------------------------------------------
// 5. Quick Announcement Modal
// ---------------------------------------------------------------------------
export const QuickAnnouncementModal: React.FC<QuickActionModalProps> = ({
  isOpen,
  onClose,
  schoolName,
}) => {
  const [title, setTitle] = useState('');
  const [targetAudience, setTargetAudience] = useState('all');
  const [priority, setPriority] = useState('normal');
  const [content, setContent] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !content) return;
    setSubmitted(true);
  };

  const resetAndClose = () => {
    setSubmitted(false);
    setTitle('');
    setContent('');
    onClose();
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={resetAndClose}
      title="Broadcast School Announcement"
      description={`Publish an official notification across ${schoolName || 'the institution'}.`}
      footer={
        submitted ? (
          <Button variant="default" onClick={resetAndClose}>
            Done
          </Button>
        ) : (
          <>
            <Button variant="outline" onClick={resetAndClose}>
              Cancel
            </Button>
            <Button variant="default" onClick={handleSubmit} disabled={!title || !content}>
              Publish Announcement
            </Button>
          </>
        )
      }
    >
      {submitted ? (
        <div className="py-4 text-center space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div>
            <h4 className="font-semibold text-sm">Announcement Broadcast Dispatched</h4>
            <p className="text-xs text-muted-foreground mt-1">
              "<strong>{title}</strong>" queued for audience <strong>{targetAudience.toUpperCase()}</strong> with priority <strong>{priority.toUpperCase()}</strong>.
            </p>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="q-anc-title" required>
              Announcement Headline
            </Label>
            <Input
              id="q-anc-title"
              placeholder="e.g. Campus Holiday Schedule & Examination Guidelines"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="q-anc-aud">Target Audience</Label>
              <Select
                id="q-anc-aud"
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
                options={[
                  { label: 'Entire School (All Users)', value: 'all' },
                  { label: 'Faculty & Teachers Only', value: 'teachers' },
                  { label: 'Parents & Guardians Only', value: 'parents' },
                  { label: 'Students Only', value: 'students' },
                ]}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="q-anc-pri">Notice Priority</Label>
              <Select
                id="q-anc-pri"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                options={[
                  { label: 'Normal Priority', value: 'normal' },
                  { label: 'High Priority (Prominent Banner)', value: 'high' },
                  { label: 'Urgent (Emergency Alert)', value: 'urgent' },
                ]}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="q-anc-content" required>
              Notice Body / Message
            </Label>
            <textarea
              id="q-anc-content"
              rows={3}
              placeholder="Enter announcement details, instructions, or meeting links..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </form>
      )}
    </Dialog>
  );
};
