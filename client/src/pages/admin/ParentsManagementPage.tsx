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
import { parentService } from '../../services/parent.service';
import { studentService } from '../../services/student.service';
import { ParentItem, StudentItem, PaginationMeta } from '../../types/management';
import {
  HeartHandshake,
  Plus,
  Search,
  RefreshCw,
  Eye,
  Edit2,
  Link as LinkIcon,
  Unlink,
  Mail,
  Phone,
  MapPin,
  GraduationCap,
  ShieldCheck,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

export const ParentsManagementPage: React.FC = () => {
  const [parents, setParents] = useState<ParentItem[]>([]);
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
  const [selectedStatus, setSelectedStatus] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Available students for linking
  const [availableStudents, setAvailableStudents] = useState<StudentItem[]>([]);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isChildrenModalOpen, setIsChildrenModalOpen] = useState(false);
  const [activeParent, setActiveParent] = useState<ParentItem | null>(null);

  // Add/Edit Form
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    occupation: '',
    alternatePhone: '',
    address: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    emergencyContactRel: '',
    adminNotes: '',
    status: 'active',
  });

  // Link Child Form
  const [newChildLinkId, setNewChildLinkId] = useState('');
  const [newChildRel, setNewChildRel] = useState<'father' | 'mother' | 'guardian' | 'other'>('guardian');
  const [newChildPrimary, setNewChildPrimary] = useState(false);
  const [isLinking, setIsLinking] = useState(false);

  const fetchParents = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await parentService.getParents({
        page: pagination.page,
        limit: pagination.limit,
        search: searchTerm || undefined,
        status: selectedStatus || undefined,
      });
      setParents(res.parents);
      setPagination(res.pagination);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to load parents' });
    } finally {
      setIsLoading(false);
    }
  }, [pagination.page, pagination.limit, searchTerm, selectedStatus]);

  useEffect(() => {
    fetchParents();
    // Load student roster for ward linking
    studentService.getStudents({ limit: 50 }).then((res) => setAvailableStudents(res.students)).catch(() => {});
  }, [fetchParents]);

  const handleOpenAddModal = () => {
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      occupation: '',
      alternatePhone: '',
      address: '',
      emergencyContactName: '',
      emergencyContactPhone: '',
      emergencyContactRel: '',
      adminNotes: '',
      status: 'active',
    });
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (parent: ParentItem) => {
    setActiveParent(parent);
    setFormData({
      firstName: parent.userId.firstName || parent.userId.name.split(' ')[0] || '',
      lastName: parent.userId.lastName || parent.userId.name.split(' ').slice(1).join(' ') || '',
      email: parent.userId.email || '',
      phone: parent.userId.phone || '',
      occupation: parent.occupation || '',
      alternatePhone: parent.alternatePhone || '',
      address: parent.address || '',
      emergencyContactName: parent.emergencyContact?.name || '',
      emergencyContactPhone: parent.emergencyContact?.phone || '',
      emergencyContactRel: parent.emergencyContact?.relationship || '',
      adminNotes: parent.adminNotes || '',
      status: parent.status || 'active',
    });
    setIsEditModalOpen(true);
  };

  const handleOpenProfileModal = async (parent: ParentItem) => {
    setActiveParent(parent);
    setIsProfileModalOpen(true);
    try {
      const full = await parentService.getParentById(parent._id);
      setActiveParent(full);
    } catch (err: any) {
      console.warn('Could not fetch parent profile:', err.message);
    }
  };

  const handleOpenChildrenModal = async (parent: ParentItem) => {
    setActiveParent(parent);
    setNewChildLinkId('');
    setNewChildRel('guardian');
    setNewChildPrimary(false);
    setIsChildrenModalOpen(true);
    try {
      const full = await parentService.getParentById(parent._id);
      setActiveParent(full);
    } catch (err: any) {
      console.warn('Could not fetch parent children:', err.message);
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      await parentService.createParent({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone || undefined,
        occupation: formData.occupation || undefined,
        alternatePhone: formData.alternatePhone || undefined,
        address: formData.address || undefined,
        adminNotes: formData.adminNotes || undefined,
        status: formData.status,
        emergencyContact: formData.emergencyContactName
          ? {
              name: formData.emergencyContactName,
              phone: formData.emergencyContactPhone,
              relationship: formData.emergencyContactRel,
            }
          : undefined,
      });
      setIsAddModalOpen(false);
      setFeedback({ type: 'success', message: `Parent account for ${formData.firstName} ${formData.lastName} created successfully.` });
      fetchParents();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to create parent' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeParent) return;
    try {
      setIsLoading(true);
      await parentService.updateParent(activeParent._id, {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone || undefined,
        occupation: formData.occupation || undefined,
        alternatePhone: formData.alternatePhone || undefined,
        address: formData.address || undefined,
        adminNotes: formData.adminNotes || undefined,
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
      setFeedback({ type: 'success', message: 'Parent profile updated successfully.' });
      fetchParents();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to update parent' });
    } finally {
      setIsLoading(false);
    }
  };

  // Add child link
  const handleAddChildLink = async () => {
    if (!activeParent || !newChildLinkId) return;
    try {
      setIsLinking(true);
      const updated = await parentService.updateChildren(activeParent._id, {
        action: 'add',
        studentProfileId: newChildLinkId,
        relationship: newChildRel,
        isPrimary: newChildPrimary,
      });
      setActiveParent(updated);
      setNewChildLinkId('');
      setFeedback({ type: 'success', message: 'Student ward successfully linked to parent profile.' });
      fetchParents();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to link child' });
    } finally {
      setIsLinking(false);
    }
  };

  // Unlink child without deleting student records
  const handleUnlinkChild = async (studentProfileId: string) => {
    if (!activeParent) return;
    try {
      setIsLinking(true);
      const updated = await parentService.updateChildren(activeParent._id, {
        action: 'remove',
        studentProfileId,
      });
      setActiveParent(updated);
      setFeedback({
        type: 'success',
        message: 'Child unlinked from parent without altering student academic records.',
      });
      fetchParents();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to unlink child' });
    } finally {
      setIsLinking(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Parents & Guardians Directory"
        description="Guardian profile administration, contact records, and multi-child family relationships."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchParents}
              disabled={isLoading}
              title="Refresh list"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
            <Button onClick={handleOpenAddModal} size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" />
              Add Parent
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
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 rounded-xl border bg-card shadow-sm">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPagination((prev) => ({ ...prev, page: 1 }));
            }}
            placeholder="Search by parent name, email, phone, or occupation..."
            className="pl-9 text-xs"
          />
        </div>

        <div className="flex items-center gap-2">
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
            <option value="inactive">Inactive</option>
          </select>

          {(searchTerm || selectedStatus) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchTerm('');
                setSelectedStatus('');
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Reset
            </Button>
          )}
        </div>
      </div>

      {/* Directory Table */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        {isLoading && parents.length === 0 ? (
          <div className="p-6 space-y-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : parents.length === 0 ? (
          <EmptyState
            icon={HeartHandshake}
            title="No parents found"
            description="No parent or guardian records found matching your filter criteria."
            actionLabel="Add Parent"
            onAction={handleOpenAddModal}
          />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Parent Name & Email</TableHead>
                  <TableHead>Phone Number</TableHead>
                  <TableHead>Occupation</TableHead>
                  <TableHead>Linked Student Wards</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {parents.map((parent) => (
                  <TableRow key={parent._id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-foreground text-sm">
                          {parent.userId.name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {parent.userId.email}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground font-mono">
                      {parent.userId.phone || '—'}
                    </TableCell>
                    <TableCell className="text-xs text-foreground">
                      {parent.occupation || '—'}
                    </TableCell>
                    <TableCell>
                      {parent.children && parent.children.length > 0 ? (
                        <div className="flex flex-wrap items-center gap-1.5">
                          {parent.children.map((child, i) => {
                            const name =
                              typeof child.studentProfileId === 'object' && child.studentProfileId?.userId?.name
                                ? child.studentProfileId.userId.name
                                : 'Student';
                            return (
                              <Badge key={i} variant="secondary" className="text-[11px] gap-1">
                                <GraduationCap className="h-3 w-3" />
                                {name} ({child.relationship})
                              </Badge>
                            );
                          })}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">No children linked</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {parent.status === 'active' ? (
                        <Badge variant="success">Active</Badge>
                      ) : (
                        <Badge variant="neutral">Inactive</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          onClick={() => handleOpenProfileModal(parent)}
                          title="View Profile"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          onClick={() => handleOpenEditModal(parent)}
                          title="Edit Profile"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-primary"
                          onClick={() => handleOpenChildrenModal(parent)}
                          title="Manage Linked Children"
                        >
                          <LinkIcon className="h-4 w-4" />
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

      {/* ADD PARENT MODAL */}
      <Dialog
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add Parent or Guardian"
        description="Creates guardian user credentials and links emergency contact records."
        className="max-w-xl"
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
              {isLoading ? 'Creating...' : 'Create Guardian'}
            </Button>
          </div>
        }
      >
        <form onSubmit={handleAddSubmit} className="space-y-3 py-2 max-h-[70vh] overflow-y-auto pr-1 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-medium text-foreground">
                First Name <span className="text-destructive">*</span>
              </label>
              <Input
                required
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                placeholder="e.g. Elena"
              />
            </div>
            <div>
              <label className="font-medium text-foreground">
                Last Name <span className="text-destructive">*</span>
              </label>
              <Input
                required
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                placeholder="e.g. Martinez"
              />
            </div>
            <div>
              <label className="font-medium text-foreground">
                Email Address <span className="text-destructive">*</span>
              </label>
              <Input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="elena.martinez@gmail.com"
              />
            </div>
            <div>
              <label className="font-medium text-foreground">Primary Phone</label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+1 555-0192"
              />
            </div>
            <div>
              <label className="font-medium text-foreground">Occupation</label>
              <Input
                value={formData.occupation}
                onChange={(e) => setFormData({ ...formData, occupation: e.target.value })}
                placeholder="e.g. Software Engineer"
              />
            </div>
            <div>
              <label className="font-medium text-foreground">Alternate Phone</label>
              <Input
                value={formData.alternatePhone}
                onChange={(e) => setFormData({ ...formData, alternatePhone: e.target.value })}
                placeholder="+1 555-0193"
              />
            </div>
          </div>
          <div>
            <label className="font-medium text-foreground">Residential Address</label>
            <Input
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Full home address"
            />
          </div>
          <div>
            <label className="font-medium text-foreground">Administrative Notes (Staff Only)</label>
            <textarea
              value={formData.adminNotes}
              onChange={(e) => setFormData({ ...formData, adminNotes: e.target.value })}
              rows={2}
              className="w-full rounded-md border border-input bg-background p-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>
        </form>
      </Dialog>

      {/* EDIT PARENT MODAL */}
      <Dialog
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Parent Profile"
        description="Update guardian contact credentials and emergency information."
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
        <form onSubmit={handleEditSubmit} className="space-y-3 py-2 text-xs">
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
              <label className="font-medium">Occupation</label>
              <Input
                value={formData.occupation}
                onChange={(e) => setFormData({ ...formData, occupation: e.target.value })}
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
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
          <div>
            <label className="font-medium">Address</label>
            <Input
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            />
          </div>
        </form>
      </Dialog>

      {/* MANAGE LINKED CHILDREN MODAL */}
      {activeParent && (
        <Dialog
          isOpen={isChildrenModalOpen}
          onClose={() => setIsChildrenModalOpen(false)}
          title={`Linked Children: ${activeParent.userId.name}`}
          description="Manage student ward linkages. Removing a link does not delete historical student records."
          className="max-w-xl"
          footer={
            <Button variant="outline" size="sm" onClick={() => setIsChildrenModalOpen(false)}>
              Done
            </Button>
          }
        >
          <div className="space-y-4 py-2 text-xs">
            {/* Existing Children List */}
            <div className="space-y-2">
              <h4 className="font-semibold text-foreground uppercase tracking-wider text-[11px]">
                Currently Linked Wards ({activeParent.children?.length || 0})
              </h4>
              {activeParent.children && activeParent.children.length > 0 ? (
                <div className="space-y-2">
                  {activeParent.children.map((child, i) => {
                    const studentData = typeof child.studentProfileId === 'object' ? child.studentProfileId : null;
                    const studentId = studentData?._id || (child.studentProfileId as string);
                    return (
                      <div
                        key={i}
                        className="flex items-center justify-between p-3 rounded-lg border bg-card"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                            <GraduationCap className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="font-medium text-foreground">
                              {studentData?.userId?.name || 'Student Ward'}
                            </div>
                            <div className="text-muted-foreground text-[11px] flex items-center gap-2">
                              <span>Adm: {studentData?.admissionNumber || 'N/A'}</span>
                              <span>•</span>
                              <span className="capitalize">Relationship: {child.relationship}</span>
                              {child.isPrimary && (
                                <Badge variant="default" className="text-[10px] px-1 py-0">
                                  Primary
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-destructive hover:bg-destructive/10 gap-1"
                          onClick={() => handleUnlinkChild(studentId)}
                          disabled={isLinking}
                        >
                          <Unlink className="h-3.5 w-3.5" />
                          Unlink
                        </Button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-muted-foreground italic p-3 rounded-lg border bg-muted/20">
                  No students currently linked to this parent profile.
                </div>
              )}
            </div>

            {/* Link New Student Form */}
            <div className="space-y-3 pt-3 border-t">
              <h4 className="font-semibold text-foreground uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <LinkIcon className="h-3.5 w-3.5 text-primary" />
                Link Additional Student Ward
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="sm:col-span-2">
                  <label className="font-medium text-foreground">Select Student</label>
                  <select
                    aria-label="Select Student"
                    value={newChildLinkId}
                    onChange={(e) => setNewChildLinkId(e.target.value)}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs mt-1"
                  >
                    <option value="">-- Choose student from directory --</option>
                    {availableStudents
                      .filter(
                        (s) =>
                          !activeParent.children?.some(
                            (c) =>
                              (typeof c.studentProfileId === 'object'
                                ? c.studentProfileId._id
                                : c.studentProfileId) === s._id
                          )
                      )
                      .map((s) => (
                        <option key={s._id} value={s._id}>
                          {s.userId.name} ({s.admissionNumber}) - {s.currentClassId?.name || 'Class N/A'}
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="font-medium text-foreground">Relationship</label>
                  <select
                    aria-label="Relationship"
                    value={newChildRel}
                    onChange={(e) => setNewChildRel(e.target.value as any)}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs mt-1"
                  >
                    <option value="father">Father</option>
                    <option value="mother">Mother</option>
                    <option value="guardian">Legal Guardian</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-2 cursor-pointer text-foreground">
                    <input
                      type="checkbox"
                      checked={newChildPrimary}
                      onChange={(e) => setNewChildPrimary(e.target.checked)}
                      className="rounded border-input text-primary focus:ring-primary"
                    />
                    <span>Primary Guardian</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  size="sm"
                  onClick={handleAddChildLink}
                  disabled={!newChildLinkId || isLinking}
                  className="gap-1.5"
                >
                  <LinkIcon className="h-3.5 w-3.5" />
                  {isLinking ? 'Linking...' : 'Confirm Ward Link'}
                </Button>
              </div>
            </div>
          </div>
        </Dialog>
      )}

      {/* PARENT PROFILE VIEW MODAL */}
      {activeParent && (
        <Dialog
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
          title={activeParent.userId.name}
          description="Parent & Guardian Profile"
          className="max-w-xl"
          footer={
            <Button variant="outline" size="sm" onClick={() => setIsProfileModalOpen(false)}>
              Close
            </Button>
          }
        >
          <div className="space-y-4 py-2 text-xs">
            <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-muted/40 border">
              <div>
                <span className="text-muted-foreground block">Occupation</span>
                <span className="font-semibold text-foreground">{activeParent.occupation || 'N/A'}</span>
              </div>
              <div>
                <span className="text-muted-foreground block">Account Status</span>
                <span className="font-semibold text-foreground capitalize">{activeParent.status}</span>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold text-muted-foreground uppercase tracking-wider">
                Contact Information
              </h4>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-foreground">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{activeParent.userId.email}</span>
                </div>
                <div className="flex items-center gap-2 text-foreground">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{activeParent.userId.phone || 'No primary phone'}</span>
                </div>
                {activeParent.alternatePhone && (
                  <div className="flex items-center gap-2 text-foreground">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>Alt: {activeParent.alternatePhone}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-foreground">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{activeParent.address || 'No residential address recorded'}</span>
                </div>
              </div>
            </div>

            {/* Linked children */}
            <div className="space-y-2">
              <h4 className="font-semibold text-muted-foreground uppercase tracking-wider">
                Linked Student Wards
              </h4>
              {activeParent.children && activeParent.children.length > 0 ? (
                <div className="grid grid-cols-1 gap-2">
                  {activeParent.children.map((child, i) => {
                    const studentData = typeof child.studentProfileId === 'object' ? child.studentProfileId : null;
                    return (
                      <div key={i} className="p-2.5 rounded-lg border bg-card flex justify-between items-center">
                        <div>
                          <div className="font-semibold text-foreground">
                            {studentData?.userId?.name || 'Student Ward'}
                          </div>
                          <div className="text-muted-foreground text-[11px]">
                            Adm: {studentData?.admissionNumber || 'N/A'} • {child.relationship}
                          </div>
                        </div>
                        <Badge variant="outline">{studentData?.status || 'active'}</Badge>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-muted-foreground italic">No children currently linked.</div>
              )}
            </div>

            {activeParent.adminNotes && (
              <div className="space-y-1 p-3 rounded-lg border border-amber-500/20 bg-amber-500/10 text-amber-900 dark:text-amber-200">
                <div className="flex items-center gap-1.5 font-semibold">
                  <ShieldCheck className="h-4 w-4" />
                  <span>Administrative Remarks</span>
                </div>
                <p className="whitespace-pre-wrap">{activeParent.adminNotes}</p>
              </div>
            )}
          </div>
        </Dialog>
      )}
    </div>
  );
};
