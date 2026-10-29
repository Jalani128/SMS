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
import { teacherService } from '../../services/teacher.service';
import { TeacherItem, PaginationMeta } from '../../types/management';
import {
  Users,
  Plus,
  Search,
  RefreshCw,
  Eye,
  Edit2,
  Archive,
  Mail,
  Phone,
  Award,
  ShieldCheck,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

export const TeachersManagementPage: React.FC = () => {
  const [teachers, setTeachers] = useState<TeacherItem[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isArchiveDialogOpen, setIsArchiveDialogOpen] = useState(false);
  const [activeTeacher, setActiveTeacher] = useState<TeacherItem | null>(null);

  // Form data
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    employeeId: '',
    department: '',
    designation: 'Faculty',
    qualification: '',
    specializations: '',
    experienceYears: 0,
    joiningDate: '',
    bio: '',
    adminNotes: '',
    status: 'active',
  });

  const fetchTeachers = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await teacherService.getTeachers({
        page: pagination.page,
        limit: pagination.limit,
        search: searchTerm || undefined,
        department: selectedDepartment || undefined,
        status: selectedStatus || undefined,
      });
      setTeachers(res.teachers);
      setPagination(res.pagination);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to load teachers' });
    } finally {
      setIsLoading(false);
    }
  }, [pagination.page, pagination.limit, searchTerm, selectedDepartment, selectedStatus]);

  useEffect(() => {
    fetchTeachers();
  }, [fetchTeachers]);

  const handleOpenAddModal = () => {
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      employeeId: '',
      department: 'General Science',
      designation: 'Faculty',
      qualification: '',
      specializations: '',
      experienceYears: 0,
      joiningDate: new Date().toISOString().slice(0, 10),
      bio: '',
      adminNotes: '',
      status: 'active',
    });
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (teacher: TeacherItem) => {
    setActiveTeacher(teacher);
    setFormData({
      firstName: teacher.userId.firstName || teacher.userId.name.split(' ')[0] || '',
      lastName: teacher.userId.lastName || teacher.userId.name.split(' ').slice(1).join(' ') || '',
      email: teacher.userId.email || '',
      phone: teacher.userId.phone || '',
      employeeId: teacher.employeeId || '',
      department: teacher.department || '',
      designation: teacher.designation || 'Faculty',
      qualification: teacher.qualification || '',
      specializations: Array.isArray(teacher.specializations) ? teacher.specializations.join(', ') : '',
      experienceYears: teacher.experienceYears || 0,
      joiningDate: teacher.joiningDate ? teacher.joiningDate.slice(0, 10) : '',
      bio: teacher.bio || '',
      adminNotes: teacher.adminNotes || '',
      status: teacher.status || 'active',
    });
    setIsEditModalOpen(true);
  };

  const handleOpenProfileModal = async (teacher: TeacherItem) => {
    setActiveTeacher(teacher);
    setIsProfileModalOpen(true);
    try {
      const full = await teacherService.getTeacherById(teacher._id);
      setActiveTeacher(full);
    } catch (err: any) {
      console.warn('Could not fetch teacher profile:', err.message);
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      const specs = formData.specializations
        ? formData.specializations.split(',').map((s) => s.trim()).filter(Boolean)
        : [];
      await teacherService.createTeacher({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone || undefined,
        employeeId: formData.employeeId || undefined,
        department: formData.department,
        designation: formData.designation,
        qualification: formData.qualification || undefined,
        specializations: specs,
        experienceYears: Number(formData.experienceYears) || 0,
        joiningDate: formData.joiningDate || undefined,
        bio: formData.bio || undefined,
        adminNotes: formData.adminNotes || undefined,
        status: formData.status,
      });
      setIsAddModalOpen(false);
      setFeedback({ type: 'success', message: `Teacher ${formData.firstName} ${formData.lastName} added successfully.` });
      fetchTeachers();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to add teacher' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTeacher) return;
    try {
      setIsLoading(true);
      const specs = formData.specializations
        ? formData.specializations.split(',').map((s) => s.trim()).filter(Boolean)
        : [];
      await teacherService.updateTeacher(activeTeacher._id, {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone || undefined,
        department: formData.department,
        designation: formData.designation,
        qualification: formData.qualification || undefined,
        specializations: specs,
        experienceYears: Number(formData.experienceYears) || 0,
        bio: formData.bio || undefined,
        adminNotes: formData.adminNotes || undefined,
        status: formData.status,
      });
      setIsEditModalOpen(false);
      setFeedback({ type: 'success', message: 'Teacher profile updated successfully.' });
      fetchTeachers();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to update teacher' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleArchiveConfirm = async (reason?: string) => {
    if (!activeTeacher) return;
    try {
      await teacherService.archiveTeacher(activeTeacher._id, reason, 'resigned');
      setFeedback({
        type: 'success',
        message: `Teacher ${activeTeacher.userId.name} archived. Historical course assignments preserved.`,
      });
      fetchTeachers();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to archive teacher' });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="success">Active</Badge>;
      case 'on_leave':
        return <Badge variant="warning">On Leave</Badge>;
      case 'resigned':
        return <Badge variant="neutral">Resigned</Badge>;
      case 'terminated':
        return <Badge variant="destructive">Terminated</Badge>;
      case 'retired':
        return <Badge variant="info">Retired</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Teachers Directory"
        description="Faculty staff management, subject specialization profiles, qualifications, and employment records."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchTeachers}
              disabled={isLoading}
              title="Refresh list"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
            <Button onClick={handleOpenAddModal} size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" />
              Add Teacher
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

      {/* Toolbar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 p-4 rounded-xl border bg-card shadow-sm">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPagination((prev) => ({ ...prev, page: 1 }));
            }}
            placeholder="Search by teacher name, employee ID, department, or email..."
            className="pl-9 text-xs"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Department Filter */}
          <select
            aria-label="Filter by department"
            value={selectedDepartment}
            onChange={(e) => {
              setSelectedDepartment(e.target.value);
              setPagination((prev) => ({ ...prev, page: 1 }));
            }}
            className="h-9 rounded-md border border-input bg-background px-2.5 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="">All Departments</option>
            <option value="Mathematics">Mathematics</option>
            <option value="Science">Science</option>
            <option value="English">English</option>
            <option value="History">History</option>
            <option value="Computer Science">Computer Science</option>
            <option value="Arts">Arts</option>
            <option value="Physical Education">Physical Education</option>
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
            <option value="on_leave">On Leave</option>
            <option value="resigned">Resigned</option>
            <option value="retired">Retired</option>
            <option value="terminated">Terminated</option>
          </select>

          {(searchTerm || selectedDepartment || selectedStatus) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchTerm('');
                setSelectedDepartment('');
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
        {isLoading && teachers.length === 0 ? (
          <div className="p-6 space-y-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : teachers.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No teachers found"
            description="No faculty records match your criteria. Add a new teacher to populate the directory."
            actionLabel="Add Teacher"
            onAction={handleOpenAddModal}
          />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[120px]">Employee ID</TableHead>
                  <TableHead>Teacher Name & Email</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Designation</TableHead>
                  <TableHead>Experience</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teachers.map((teacher) => (
                  <TableRow key={teacher._id}>
                    <TableCell className="font-mono text-xs font-semibold text-primary">
                      {teacher.employeeId}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-foreground text-sm">
                          {teacher.userId.name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {teacher.userId.email}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs font-medium">
                      {teacher.department}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {teacher.designation || 'Faculty'}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {teacher.experienceYears ? `${teacher.experienceYears} yrs` : '—'}
                    </TableCell>
                    <TableCell>{getStatusBadge(teacher.status)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          onClick={() => handleOpenProfileModal(teacher)}
                          title="View Profile"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          onClick={() => handleOpenEditModal(teacher)}
                          title="Edit Profile"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => {
                            setActiveTeacher(teacher);
                            setIsArchiveDialogOpen(true);
                          }}
                          title="Archive Teacher"
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

      {/* ADD TEACHER MODAL */}
      <Dialog
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add Faculty Member"
        description="Creates faculty user account, credentials, and institutional staff profile."
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
              {isLoading ? 'Creating...' : 'Create Teacher Profile'}
            </Button>
          </div>
        }
      >
        <form onSubmit={handleAddSubmit} className="space-y-4 py-2 max-h-[70vh] overflow-y-auto pr-1">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b pb-1">
            Personal & Contact Information
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
                placeholder="e.g. Robert"
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
                placeholder="e.g. Langdon"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground">
                Institutional Email <span className="text-destructive">*</span>
              </label>
              <Input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="robert.langdon@greenwood.edu"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground">Phone Number</label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+1 555-0141"
              />
            </div>
          </div>

          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b pb-1 pt-2">
            Department & Qualifications
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-foreground">Employee ID</label>
              <Input
                value={formData.employeeId}
                onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                placeholder="Auto-generated if empty"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground">
                Department <span className="text-destructive">*</span>
              </label>
              <Input
                required
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                placeholder="e.g. History"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground">Designation</label>
              <Input
                value={formData.designation}
                onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                placeholder="e.g. Senior Faculty"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground">Highest Qualification</label>
              <Input
                value={formData.qualification}
                onChange={(e) => setFormData({ ...formData, qualification: e.target.value })}
                placeholder="e.g. Ph.D. in History"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground">Experience (Years)</label>
              <Input
                type="number"
                min="0"
                value={formData.experienceYears}
                onChange={(e) => setFormData({ ...formData, experienceYears: Number(e.target.value) })}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground">Specializations (comma separated)</label>
              <Input
                value={formData.specializations}
                onChange={(e) => setFormData({ ...formData, specializations: e.target.value })}
                placeholder="Ancient History, Latin"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-foreground">Professional Bio / Summary</label>
            <textarea
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              rows={2}
              placeholder="Teaching achievements, certifications, or career milestones..."
              className="w-full rounded-md border border-input bg-background p-2 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-foreground">Administrative Notes (Staff Only)</label>
            <textarea
              value={formData.adminNotes}
              onChange={(e) => setFormData({ ...formData, adminNotes: e.target.value })}
              rows={2}
              placeholder="Internal administration remarks..."
              className="w-full rounded-md border border-input bg-background p-2 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>
        </form>
      </Dialog>

      {/* EDIT TEACHER MODAL */}
      <Dialog
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Faculty Profile"
        description="Update staff credentials, qualifications, and assignment status."
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
        <form onSubmit={handleEditSubmit} className="space-y-3 py-2 max-h-[70vh] overflow-y-auto pr-1 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-medium">First Name</label>
              <Input
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              />
            </div>
            <div>
              <label className="font-medium">Last Name</label>
              <Input
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              />
            </div>
            <div>
              <label className="font-medium">Email</label>
              <Input
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div>
              <label className="font-medium">Phone</label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            <div>
              <label className="font-medium">Department</label>
              <Input
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              />
            </div>
            <div>
              <label className="font-medium">Designation</label>
              <Input
                value={formData.designation}
                onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
              />
            </div>
            <div>
              <label className="font-medium">Experience (Years)</label>
              <Input
                type="number"
                value={formData.experienceYears}
                onChange={(e) => setFormData({ ...formData, experienceYears: Number(e.target.value) })}
              />
            </div>
            <div>
              <label className="font-medium">Status</label>
              <select
                aria-label="Status"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs"
              >
                <option value="active">Active</option>
                <option value="on_leave">On Leave</option>
                <option value="resigned">Resigned</option>
                <option value="retired">Retired</option>
                <option value="terminated">Terminated</option>
              </select>
            </div>
          </div>
          <div>
            <label className="font-medium">Specializations (comma separated)</label>
            <Input
              value={formData.specializations}
              onChange={(e) => setFormData({ ...formData, specializations: e.target.value })}
            />
          </div>
          <div>
            <label className="font-medium">Administrative Notes</label>
            <textarea
              value={formData.adminNotes}
              onChange={(e) => setFormData({ ...formData, adminNotes: e.target.value })}
              rows={2}
              className="w-full rounded-md border border-input bg-background p-2 text-xs"
            />
          </div>
        </form>
      </Dialog>

      {/* TEACHER PROFILE MODAL */}
      {activeTeacher && (
        <Dialog
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
          title={activeTeacher.userId.name}
          description={`Employee ID: ${activeTeacher.employeeId} • ${activeTeacher.department}`}
          className="max-w-xl"
          footer={
            <div className="flex justify-between items-center w-full">
              <span className="text-xs text-muted-foreground">
                Joined: {new Date(activeTeacher.joiningDate || activeTeacher.createdAt).toLocaleDateString()}
              </span>
              <Button variant="outline" size="sm" onClick={() => setIsProfileModalOpen(false)}>
                Close
              </Button>
            </div>
          }
        >
          <div className="space-y-4 py-2 text-xs">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 rounded-lg bg-muted/40 border">
              <div>
                <span className="text-muted-foreground block">Department</span>
                <span className="font-semibold text-foreground">{activeTeacher.department}</span>
              </div>
              <div>
                <span className="text-muted-foreground block">Designation</span>
                <span className="font-semibold text-foreground">{activeTeacher.designation}</span>
              </div>
              <div>
                <span className="text-muted-foreground block">Experience</span>
                <span className="font-semibold text-foreground">
                  {activeTeacher.experienceYears ? `${activeTeacher.experienceYears} Years` : 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block">Status</span>
                <span>{getStatusBadge(activeTeacher.status)}</span>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold text-muted-foreground uppercase tracking-wider">
                Contact & Credentials
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="flex items-center gap-2 text-foreground">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{activeTeacher.userId.email}</span>
                </div>
                <div className="flex items-center gap-2 text-foreground">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{activeTeacher.userId.phone || 'No phone recorded'}</span>
                </div>
                {activeTeacher.qualification && (
                  <div className="flex items-center gap-2 text-foreground sm:col-span-2">
                    <Award className="h-4 w-4 text-muted-foreground" />
                    <span>{activeTeacher.qualification}</span>
                  </div>
                )}
              </div>
            </div>

            {activeTeacher.specializations && activeTeacher.specializations.length > 0 && (
              <div className="space-y-1.5">
                <h4 className="font-semibold text-muted-foreground uppercase tracking-wider">
                  Specializations & Teaching Areas
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {activeTeacher.specializations.map((spec, i) => (
                    <Badge key={i} variant="secondary">
                      {spec}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {activeTeacher.bio && (
              <div className="space-y-1.5 p-3 rounded-lg border bg-card">
                <h4 className="font-semibold text-foreground">Professional Bio</h4>
                <p className="text-muted-foreground leading-relaxed">{activeTeacher.bio}</p>
              </div>
            )}

            {activeTeacher.adminNotes && (
              <div className="space-y-1.5 p-3 rounded-lg border border-amber-500/20 bg-amber-500/10 text-amber-900 dark:text-amber-200">
                <div className="flex items-center gap-1.5 font-semibold">
                  <ShieldCheck className="h-4 w-4" />
                  <span>Administrative Remarks</span>
                </div>
                <p className="whitespace-pre-wrap">{activeTeacher.adminNotes}</p>
              </div>
            )}
          </div>
        </Dialog>
      )}

      {/* ARCHIVE DIALOG */}
      <ConfirmationDialog
        isOpen={isArchiveDialogOpen}
        onClose={() => setIsArchiveDialogOpen(false)}
        onConfirm={handleArchiveConfirm}
        title={`Archive Teacher: ${activeTeacher?.userId.name}`}
        message="This will mark the teacher's profile as resigned/retired and disable their login credentials while permanently preserving historical teaching, grading, and timetable history."
        confirmLabel="Archive Teacher"
        requireReason={true}
        reasonPlaceholder="Specify reason (e.g. voluntary resignation, retirement, or contract completion)..."
      />
    </div>
  );
};
