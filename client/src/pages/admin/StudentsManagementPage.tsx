import React, { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '../../components/shared/PageHeader';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Dialog } from '../../components/ui/Dialog';
import { Skeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/Table';
import { PaginationControls } from '../../components/admin/management/PaginationControls';
import { ConfirmationDialog } from '../../components/admin/management/ConfirmationDialog';
import { studentService } from '../../services/student.service';
import { academicContextService } from '../../services/academicContext.service';
import {
  StudentItem,
  PaginationMeta,
  AcademicContextData,
} from '../../types/management';
import {
  GraduationCap,
  Plus,
  Search,
  RefreshCw,
  Eye,
  Edit2,
  Archive,
  BookOpen,
  Phone,
  Mail,
  MapPin,
  ShieldCheck,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

export const StudentsManagementPage: React.FC = () => {
  // State
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false,
  });
  const [academicContext, setAcademicContext] = useState<AcademicContextData>({
    classes: [],
    sections: [],
    sessions: [],
    currentSession: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Active Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
  const [isArchiveDialogOpen, setIsArchiveDialogOpen] = useState(false);
  const [activeStudent, setActiveStudent] = useState<StudentItem | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    admissionNumber: '',
    rollNumber: '',
    classId: '',
    sectionId: '',
    academicSessionId: '',
    dateOfBirth: '',
    gender: 'prefer_not_to_say',
    bloodGroup: 'unknown',
    medicalNotes: '',
    adminNotes: '',
    address: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    emergencyContactRel: '',
    status: 'active',
  });

  const [enrollForm, setEnrollForm] = useState({
    academicSessionId: '',
    classId: '',
    sectionId: '',
    rollNumber: '',
    remarks: '',
  });

  // Fetch academic dropdown options
  useEffect(() => {
    academicContextService.getContext().then(setAcademicContext).catch(console.error);
  }, []);

  // Fetch students
  const fetchStudents = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await studentService.getStudents({
        page: pagination.page,
        limit: pagination.limit,
        search: searchTerm || undefined,
        classId: selectedClass || undefined,
        sectionId: selectedSection || undefined,
        status: selectedStatus || undefined,
      });
      setStudents(res.students);
      setPagination(res.pagination);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to load students' });
    } finally {
      setIsLoading(false);
    }
  }, [pagination.page, pagination.limit, searchTerm, selectedClass, selectedSection, selectedStatus]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  // Open Add Modal with next admission number prefilled
  const handleOpenAddModal = async () => {
    try {
      const nextAdm = await studentService.getNextAdmissionNumber();
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        admissionNumber: nextAdm,
        rollNumber: '',
        classId: academicContext.classes[0]?._id || '',
        sectionId: academicContext.sections[0]?._id || '',
        academicSessionId: academicContext.currentSession?._id || '',
        dateOfBirth: '',
        gender: 'prefer_not_to_say',
        bloodGroup: 'unknown',
        medicalNotes: '',
        adminNotes: '',
        address: '',
        emergencyContactName: '',
        emergencyContactPhone: '',
        emergencyContactRel: '',
        status: 'active',
      });
      setIsAddModalOpen(true);
    } catch {
      setIsAddModalOpen(true);
    }
  };

  // Open Edit Modal
  const handleOpenEditModal = (student: StudentItem) => {
    setActiveStudent(student);
    setFormData({
      firstName: student.userId.firstName || student.userId.name.split(' ')[0] || '',
      lastName: student.userId.lastName || student.userId.name.split(' ').slice(1).join(' ') || '',
      email: student.userId.email || '',
      phone: student.userId.phone || '',
      admissionNumber: student.admissionNumber || '',
      rollNumber: student.rollNumber || '',
      classId: student.currentClassId?._id || '',
      sectionId: student.currentSectionId?._id || '',
      academicSessionId: student.currentSessionId?._id || '',
      dateOfBirth: student.dateOfBirth ? student.dateOfBirth.slice(0, 10) : '',
      gender: student.gender || 'prefer_not_to_say',
      bloodGroup: student.bloodGroup || 'unknown',
      medicalNotes: student.medicalNotes || '',
      adminNotes: student.adminNotes || '',
      address: student.address || '',
      emergencyContactName: student.emergencyContact?.name || '',
      emergencyContactPhone: student.emergencyContact?.phone || '',
      emergencyContactRel: student.emergencyContact?.relationship || '',
      status: student.status || 'active',
    });
    setIsEditModalOpen(true);
  };

  // Open View Profile
  const handleOpenProfileModal = async (student: StudentItem) => {
    setActiveStudent(student);
    setIsProfileModalOpen(true);
    try {
      const fullProfile = await studentService.getStudentById(student._id);
      setActiveStudent(fullProfile);
    } catch (err: any) {
      console.warn('Could not fetch detailed profile:', err.message);
    }
  };

  // Open Enrollment Modal
  const handleOpenEnrollModal = (student: StudentItem) => {
    setActiveStudent(student);
    setEnrollForm({
      academicSessionId: academicContext.currentSession?._id || '',
      classId: student.currentClassId?._id || academicContext.classes[0]?._id || '',
      sectionId: student.currentSectionId?._id || academicContext.sections[0]?._id || '',
      rollNumber: student.rollNumber || '',
      remarks: '',
    });
    setIsEnrollModalOpen(true);
  };

  // Submit Add Student
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      await studentService.createStudent({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone || undefined,
        admissionNumber: formData.admissionNumber || undefined,
        rollNumber: formData.rollNumber || undefined,
        classId: formData.classId || undefined,
        sectionId: formData.sectionId || undefined,
        academicSessionId: formData.academicSessionId || undefined,
        dateOfBirth: formData.dateOfBirth || undefined,
        gender: formData.gender,
        bloodGroup: formData.bloodGroup,
        medicalNotes: formData.medicalNotes || undefined,
        adminNotes: formData.adminNotes || undefined,
        address: formData.address || undefined,
        emergencyContact: formData.emergencyContactName
          ? {
              name: formData.emergencyContactName,
              phone: formData.emergencyContactPhone,
              relationship: formData.emergencyContactRel,
            }
          : undefined,
      });
      setIsAddModalOpen(false);
      setFeedback({ type: 'success', message: `Student ${formData.firstName} ${formData.lastName} enrolled successfully.` });
      fetchStudents();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to enroll student' });
    } finally {
      setIsLoading(false);
    }
  };

  // Submit Edit Student
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeStudent) return;
    try {
      setIsLoading(true);
      await studentService.updateStudent(activeStudent._id, {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone || undefined,
        rollNumber: formData.rollNumber || undefined,
        dateOfBirth: formData.dateOfBirth || undefined,
        gender: formData.gender,
        bloodGroup: formData.bloodGroup,
        medicalNotes: formData.medicalNotes || undefined,
        adminNotes: formData.adminNotes || undefined,
        address: formData.address || undefined,
        status: formData.status,
        emergencyContact: formData.emergencyContactName
          ? {
              name: formData.emergencyContactName,
              phone: formData.emergencyContactPhone,
              relationship: formData.emergencyContactRel,
            }
          : undefined,
      });
      setIsEditModalOpen(false);
      setFeedback({ type: 'success', message: 'Student profile updated successfully.' });
      fetchStudents();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to update student' });
    } finally {
      setIsLoading(false);
    }
  };

  // Submit Enrollment
  const handleEnrollSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeStudent) return;
    try {
      setIsLoading(true);
      await studentService.createEnrollment(activeStudent._id, enrollForm);
      setIsEnrollModalOpen(false);
      setFeedback({ type: 'success', message: 'Academic session enrollment recorded.' });
      fetchStudents();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to record enrollment' });
    } finally {
      setIsLoading(false);
    }
  };

  // Confirm Archive
  const handleArchiveConfirm = async (reason?: string) => {
    if (!activeStudent) return;
    try {
      await studentService.archiveStudent(activeStudent._id, reason, 'inactive');
      setFeedback({
        type: 'success',
        message: `Student ${activeStudent.userId.name} archived. Historical attendance and records preserved.`,
      });
      fetchStudents();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to archive student' });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="success">Active</Badge>;
      case 'graduated':
        return <Badge variant="info">Graduated</Badge>;
      case 'transferred':
        return <Badge variant="warning">Transferred</Badge>;
      case 'suspended':
        return <Badge variant="destructive">Suspended</Badge>;
      case 'inactive':
      default:
        return <Badge variant="neutral">Archived</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Students Directory"
        description="Comprehensive roster records, admissions, class division assignments, and enrollment histories."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchStudents}
              disabled={isLoading}
              title="Refresh list"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
            <Button onClick={handleOpenAddModal} size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" />
              Enroll Student
            </Button>
          </div>
        }
      />

      {/* Feedback banner */}
      {feedback && (
        <div
          className={`flex items-center justify-between p-3.5 rounded-lg border text-sm ${
            feedback.type === 'success'
              ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300'
              : 'border-destructive/20 bg-destructive/10 text-destructive'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <XCircle className="h-4 w-4 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-xs opacity-70 hover:opacity-100 font-semibold ml-4"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Search and Filters Toolbar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 p-4 rounded-xl border bg-card shadow-sm">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPagination((prev) => ({ ...prev, page: 1 }));
            }}
            placeholder="Search by student name, admission #, or email..."
            className="pl-9 text-xs"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Class Filter */}
          <select
            aria-label="Filter by class"
            value={selectedClass}
            onChange={(e) => {
              setSelectedClass(e.target.value);
              setPagination((prev) => ({ ...prev, page: 1 }));
            }}
            className="h-9 rounded-md border border-input bg-background px-2.5 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="">All Classes</option>
            {academicContext.classes.map((cls) => (
              <option key={cls._id} value={cls._id}>
                {cls.name}
              </option>
            ))}
          </select>

          {/* Section Filter */}
          <select
            aria-label="Filter by section"
            value={selectedSection}
            onChange={(e) => {
              setSelectedSection(e.target.value);
              setPagination((prev) => ({ ...prev, page: 1 }));
            }}
            className="h-9 rounded-md border border-input bg-background px-2.5 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="">All Sections</option>
            {academicContext.sections.map((sec) => (
              <option key={sec._id} value={sec._id}>
                {sec.name}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            aria-label="Filter by status"
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value);
              setPagination((prev) => ({ ...prev, page: 1 }));
            }}
            className="h-9 rounded-md border border-input bg-background px-2.5 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Archived</option>
            <option value="transferred">Transferred</option>
            <option value="graduated">Graduated</option>
            <option value="suspended">Suspended</option>
          </select>

          {(searchTerm || selectedClass || selectedSection || selectedStatus) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchTerm('');
                setSelectedClass('');
                setSelectedSection('');
                setSelectedStatus('');
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Reset Filters
            </Button>
          )}
        </div>
      </div>

      {/* Directory Table */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        {isLoading && students.length === 0 ? (
          <div className="p-6 space-y-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : students.length === 0 ? (
          <EmptyState
            icon={GraduationCap}
            title="No students found"
            description={
              searchTerm || selectedClass || selectedStatus
                ? 'Try adjusting your search criteria or resetting filters.'
                : 'Get started by enrolling the first student into your school.'
            }
            actionLabel="Enroll Student"
            onAction={handleOpenAddModal}
          />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[120px]">Adm #</TableHead>
                  <TableHead>Student Name & Email</TableHead>
                  <TableHead>Roll #</TableHead>
                  <TableHead>Class & Section</TableHead>
                  <TableHead>Gender</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((student) => (
                  <TableRow key={student._id}>
                    <TableCell className="font-mono text-xs font-semibold text-primary">
                      {student.admissionNumber}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-foreground text-sm">
                          {student.userId.name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {student.userId.email}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground font-mono">
                      {student.rollNumber || '—'}
                    </TableCell>
                    <TableCell className="text-xs">
                      {student.currentClassId?.name ? (
                        <span className="inline-flex items-center gap-1 font-medium">
                          {student.currentClassId.name}
                          {student.currentSectionId?.name && (
                            <span className="text-muted-foreground font-normal">
                              ({student.currentSectionId.name})
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="text-muted-foreground italic">Unassigned</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs capitalize text-muted-foreground">
                      {student.gender?.replace('_', ' ') || '—'}
                    </TableCell>
                    <TableCell>{getStatusBadge(student.status)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          onClick={() => handleOpenProfileModal(student)}
                          title="View Profile"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          onClick={() => handleOpenEditModal(student)}
                          title="Edit Profile"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-primary"
                          onClick={() => handleOpenEnrollModal(student)}
                          title="Record Enrollment"
                        >
                          <BookOpen className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => {
                            setActiveStudent(student);
                            setIsArchiveDialogOpen(true);
                          }}
                          title="Archive Student"
                        >
                          <Archive className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <PaginationControls
              pagination={pagination}
              onPageChange={(newPage) => setPagination((prev) => ({ ...prev, page: newPage }))}
              onLimitChange={(newLimit) =>
                setPagination((prev) => ({ ...prev, limit: newLimit, page: 1 }))
              }
            />
          </>
        )}
      </div>

      {/* ADD STUDENT MODAL */}
      <Dialog
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Enroll New Student"
        description="Creates student profile, school user credentials, and optional initial enrollment record."
        className="max-w-2xl"
        footer={
          <div className="flex justify-end gap-2 w-full">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAddModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="button" onClick={handleAddSubmit} disabled={isLoading}>
              {isLoading ? 'Enrolling...' : 'Confirm Enrollment'}
            </Button>
          </div>
        }
      >
        <form onSubmit={handleAddSubmit} className="space-y-4 py-2 max-h-[70vh] overflow-y-auto pr-1">
          {/* Identity & Contact */}
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b pb-1">
            Student Identity & Contact
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-foreground">
                First Name <span className="text-destructive">*</span>
              </label>
              <Input
                required
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                placeholder="e.g. Lucas"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground">
                Last Name <span className="text-destructive">*</span>
              </label>
              <Input
                required
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                placeholder="e.g. Vance"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground">
                Email Address <span className="text-destructive">*</span>
              </label>
              <Input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="lucas.vance@greenwood.edu"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground">Phone Number</label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+1 555-0199"
              />
            </div>
          </div>

          {/* Academic Info */}
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b pb-1 pt-2">
            Academic Placement
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-foreground">Admission #</label>
              <Input
                value={formData.admissionNumber}
                onChange={(e) => setFormData({ ...formData, admissionNumber: e.target.value })}
                placeholder="ADM-2026-0042"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground">Roll #</label>
              <Input
                value={formData.rollNumber}
                onChange={(e) => setFormData({ ...formData, rollNumber: e.target.value })}
                placeholder="e.g. 101"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground">Academic Session</label>
              <select
                aria-label="Academic Session"
                value={formData.academicSessionId}
                onChange={(e) => setFormData({ ...formData, academicSessionId: e.target.value })}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">Select Session</option>
                {academicContext.sessions.map((sess) => (
                  <option key={sess._id} value={sess._id}>
                    {sess.name} {sess.isCurrent ? '(Current)' : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-foreground">Class</label>
              <select
                aria-label="Class"
                value={formData.classId}
                onChange={(e) => setFormData({ ...formData, classId: e.target.value })}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">Select Class</option>
                {academicContext.classes.map((cls) => (
                  <option key={cls._id} value={cls._id}>
                    {cls.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-foreground">Section</label>
              <select
                aria-label="Section"
                value={formData.sectionId}
                onChange={(e) => setFormData({ ...formData, sectionId: e.target.value })}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">Select Section</option>
                {academicContext.sections.map((sec) => (
                  <option key={sec._id} value={sec._id}>
                    {sec.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-foreground">Gender</label>
              <select
                aria-label="Gender"
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
                <option value="prefer_not_to_say">Prefer not to say</option>
              </select>
            </div>
          </div>

          {/* Emergency & Address */}
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b pb-1 pt-2">
            Emergency & Medical Details
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-foreground">Emergency Contact Name</label>
              <Input
                value={formData.emergencyContactName}
                onChange={(e) => setFormData({ ...formData, emergencyContactName: e.target.value })}
                placeholder="Parent or Guardian"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground">Contact Phone</label>
              <Input
                value={formData.emergencyContactPhone}
                onChange={(e) => setFormData({ ...formData, emergencyContactPhone: e.target.value })}
                placeholder="+1 555-0198"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground">Relationship</label>
              <Input
                value={formData.emergencyContactRel}
                onChange={(e) => setFormData({ ...formData, emergencyContactRel: e.target.value })}
                placeholder="e.g. Mother"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-foreground">Address</label>
            <Input
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Residential street address"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-foreground">Administrative Notes (Staff Only)</label>
            <textarea
              value={formData.adminNotes}
              onChange={(e) => setFormData({ ...formData, adminNotes: e.target.value })}
              rows={2}
              placeholder="Confidential administrative remarks..."
              className="w-full rounded-md border border-input bg-background p-2 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>
        </form>
      </Dialog>

      {/* EDIT STUDENT MODAL */}
      <Dialog
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Student Profile"
        description="Update personal details, emergency contact, and administrative notes."
        className="max-w-xl"
        footer={
          <div className="flex justify-end gap-2 w-full">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsEditModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="button" onClick={handleEditSubmit} disabled={isLoading}>
              {isLoading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        }
      >
        <form onSubmit={handleEditSubmit} className="space-y-3 py-2 max-h-[70vh] overflow-y-auto pr-1">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium">First Name</label>
              <Input
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs font-medium">Last Name</label>
              <Input
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs font-medium">Email</label>
              <Input
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs font-medium">Phone</label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs font-medium">Status</label>
              <select
                aria-label="Status"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs"
              >
                <option value="active">Active</option>
                <option value="inactive">Archived / Inactive</option>
                <option value="transferred">Transferred</option>
                <option value="graduated">Graduated</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium">Roll Number</label>
              <Input
                value={formData.rollNumber}
                onChange={(e) => setFormData({ ...formData, rollNumber: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium">Administrative Notes</label>
            <textarea
              value={formData.adminNotes}
              onChange={(e) => setFormData({ ...formData, adminNotes: e.target.value })}
              rows={3}
              className="w-full rounded-md border border-input bg-background p-2 text-xs"
            />
          </div>
        </form>
      </Dialog>

      {/* STUDENT PROFILE VIEW MODAL */}
      {activeStudent && (
        <Dialog
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
          title={activeStudent.userId.name}
          description={`Admission Number: ${activeStudent.admissionNumber}`}
          className="max-w-2xl"
          footer={
            <div className="flex justify-between items-center w-full">
              <span className="text-xs text-muted-foreground">
                Registered on: {new Date(activeStudent.createdAt).toLocaleDateString()}
              </span>
              <Button variant="outline" size="sm" onClick={() => setIsProfileModalOpen(false)}>
                Close
              </Button>
            </div>
          }
        >
          <div className="space-y-4 py-2 max-h-[70vh] overflow-y-auto pr-1 text-sm">
            {/* Quick stats row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 rounded-lg bg-muted/40 border">
              <div>
                <span className="text-xs text-muted-foreground block">Class & Section</span>
                <span className="font-semibold text-foreground text-xs">
                  {activeStudent.currentClassId?.name || 'Unassigned'}{' '}
                  {activeStudent.currentSectionId?.name ? `(${activeStudent.currentSectionId.name})` : ''}
                </span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">Roll #</span>
                <span className="font-semibold text-foreground text-xs font-mono">
                  {activeStudent.rollNumber || 'None'}
                </span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">Gender</span>
                <span className="font-semibold text-foreground text-xs capitalize">
                  {activeStudent.gender?.replace('_', ' ') || 'Unknown'}
                </span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">Status</span>
                <span className="text-xs">{getStatusBadge(activeStudent.status)}</span>
              </div>
            </div>

            {/* Contact details */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Contact & Address
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-2 text-foreground">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{activeStudent.userId.email}</span>
                </div>
                <div className="flex items-center gap-2 text-foreground">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{activeStudent.userId.phone || 'No phone recorded'}</span>
                </div>
                <div className="flex items-center gap-2 text-foreground sm:col-span-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{activeStudent.address || 'No residential address on file'}</span>
                </div>
              </div>
            </div>

            {/* Emergency Contact */}
            {activeStudent.emergencyContact?.name && (
              <div className="space-y-1.5 p-3 rounded-lg border bg-card">
                <h4 className="text-xs font-semibold text-foreground">Emergency Contact</h4>
                <div className="text-xs text-muted-foreground flex items-center gap-4">
                  <span>
                    <strong>Name:</strong> {activeStudent.emergencyContact.name}
                  </span>
                  <span>
                    <strong>Rel:</strong> {activeStudent.emergencyContact.relationship || 'Guardian'}
                  </span>
                  <span>
                    <strong>Phone:</strong> {activeStudent.emergencyContact.phone}
                  </span>
                </div>
              </div>
            )}

            {/* Administrative Notes */}
            {activeStudent.adminNotes && (
              <div className="space-y-1.5 p-3 rounded-lg border border-amber-500/20 bg-amber-500/10 text-amber-900 dark:text-amber-200">
                <div className="flex items-center gap-1.5 font-semibold text-xs">
                  <ShieldCheck className="h-4 w-4" />
                  <span>Administrative Remarks (Restricted to Staff)</span>
                </div>
                <p className="text-xs whitespace-pre-wrap">{activeStudent.adminNotes}</p>
              </div>
            )}

            {/* Historical Enrollment Records */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <BookOpen className="h-4 w-4" />
                Historical Academic Enrollments
              </h4>
              {activeStudent.enrollments && activeStudent.enrollments.length > 0 ? (
                <div className="rounded-lg border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Session</TableHead>
                        <TableHead className="text-xs">Class & Section</TableHead>
                        <TableHead className="text-xs">Roll #</TableHead>
                        <TableHead className="text-xs">Enrolled Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {activeStudent.enrollments.map((enr) => (
                        <TableRow key={enr._id}>
                          <TableCell className="text-xs font-medium">
                            {enr.academicSessionId?.name || 'Session'}
                          </TableCell>
                          <TableCell className="text-xs">
                            {enr.classId?.name} - {enr.sectionId?.name}
                          </TableCell>
                          <TableCell className="text-xs font-mono">{enr.rollNumber || '—'}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {new Date(enr.enrollmentDate).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-xs text-muted-foreground italic p-2 rounded border">
                  Current active enrollment is registered in {activeStudent.currentClassId?.name || 'N/A'}. Historical multi-session records appear here.
                </div>
              )}
            </div>
          </div>
        </Dialog>
      )}

      {/* RECORD ENROLLMENT MODAL */}
      {activeStudent && (
        <Dialog
          isOpen={isEnrollModalOpen}
          onClose={() => setIsEnrollModalOpen(false)}
          title={`Enroll ${activeStudent.userId.name}`}
          description="Assign class division and roll number for an academic session."
          className="max-w-md"
          footer={
            <div className="flex justify-end gap-2 w-full">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEnrollModalOpen(false)}
              >
                Cancel
              </Button>
              <Button type="button" onClick={handleEnrollSubmit} disabled={isLoading}>
                {isLoading ? 'Saving...' : 'Record Enrollment'}
              </Button>
            </div>
          }
        >
          <form onSubmit={handleEnrollSubmit} className="space-y-3 py-2 text-xs">
            <div>
              <label className="font-medium text-foreground">Academic Session</label>
              <select
                aria-label="Academic Session"
                value={enrollForm.academicSessionId}
                onChange={(e) => setEnrollForm({ ...enrollForm, academicSessionId: e.target.value })}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs mt-1"
              >
                {academicContext.sessions.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.name} {s.isCurrent ? '(Current)' : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="font-medium text-foreground">Class</label>
              <select
                aria-label="Class"
                value={enrollForm.classId}
                onChange={(e) => setEnrollForm({ ...enrollForm, classId: e.target.value })}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs mt-1"
              >
                {academicContext.classes.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="font-medium text-foreground">Section</label>
              <select
                aria-label="Section"
                value={enrollForm.sectionId}
                onChange={(e) => setEnrollForm({ ...enrollForm, sectionId: e.target.value })}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs mt-1"
              >
                {academicContext.sections.map((sec) => (
                  <option key={sec._id} value={sec._id}>
                    {sec.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="font-medium text-foreground">Roll Number</label>
              <Input
                value={enrollForm.rollNumber}
                onChange={(e) => setEnrollForm({ ...enrollForm, rollNumber: e.target.value })}
                placeholder="e.g. 104"
                className="mt-1"
              />
            </div>
            <div>
              <label className="font-medium text-foreground">Remarks</label>
              <Input
                value={enrollForm.remarks}
                onChange={(e) => setEnrollForm({ ...enrollForm, remarks: e.target.value })}
                placeholder="e.g. Mid-term admission or section transfer"
                className="mt-1"
              />
            </div>
          </form>
        </Dialog>
      )}

      {/* ARCHIVE CONFIRMATION DIALOG */}
      <ConfirmationDialog
        isOpen={isArchiveDialogOpen}
        onClose={() => setIsArchiveDialogOpen(false)}
        onConfirm={handleArchiveConfirm}
        title={`Archive Student: ${activeStudent?.userId.name}`}
        message="This will deactivate student account access while preserving all historical attendance, invoices, exam marks, and past enrollment records."
        confirmLabel="Archive Student"
        requireReason={true}
        reasonPlaceholder="Specify reason for archival (e.g. transferred to another district, graduated, or withdrew)..."
      />
    </div>
  );
};
