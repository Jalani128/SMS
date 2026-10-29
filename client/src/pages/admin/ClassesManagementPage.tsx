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
import { ConfirmationDialog } from '../../components/admin/management/ConfirmationDialog';
import { academicService } from '../../services/academic.service';
import { ClassRecord } from '../../types/academic';
import {
  GraduationCap,
  Plus,
  RefreshCw,
  Edit2,
  Archive,
  Layers,
  Users,
  AlertCircle,
  CheckCircle2,
  Search,
} from 'lucide-react';

export const ClassesManagementPage: React.FC = () => {
  const [classes, setClasses] = useState<ClassRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Modal states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassRecord | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<ClassRecord | null>(null);

  // Form states
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formOrder, setFormOrder] = useState<number>(1);
  const [formDescription, setFormDescription] = useState('');
  const [formStatus, setFormStatus] = useState<'active' | 'inactive'>('active');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadClasses = useCallback(async () => {
    try {
      setIsLoading(true);
      setErrorMsg(null);
      const data = await academicService.getClasses();
      setClasses(data);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || err.message || 'Failed to load classes');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadClasses();
  }, [loadClasses]);

  const handleOpenCreate = () => {
    setFormName('');
    setFormCode('');
    setFormOrder(classes.length + 1);
    setFormDescription('');
    setFormStatus('active');
    setFormError(null);
    setIsCreateOpen(true);
  };

  const handleOpenEdit = (cls: ClassRecord) => {
    setEditingClass(cls);
    setFormName(cls.name);
    setFormCode(cls.code);
    setFormOrder(cls.order || 0);
    setFormDescription(cls.description || '');
    setFormStatus(cls.status || 'active');
    setFormError(null);
    setIsEditOpen(true);
  };

  const handleSaveClass = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formName.trim() || !formCode.trim()) {
      setFormError('Class name and code are required');
      return;
    }

    try {
      setIsSubmitting(true);
      const payload: Partial<ClassRecord> = {
        name: formName.trim(),
        code: formCode.trim().toUpperCase(),
        order: Number(formOrder),
        description: formDescription.trim(),
        status: formStatus,
      };

      if (editingClass) {
        await academicService.updateClass(editingClass._id, payload);
        setActionSuccess(`Class "${payload.name}" updated successfully.`);
        setIsEditOpen(false);
      } else {
        await academicService.createClass(payload);
        setActionSuccess(`Class "${payload.name}" created successfully.`);
        setIsCreateOpen(false);
      }

      await loadClasses();
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      setFormError(err.response?.data?.message || err.message || 'Operation failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleArchiveConfirm = async () => {
    if (!archiveTarget) return;
    try {
      await academicService.archiveClass(archiveTarget._id);
      setActionSuccess(`Class "${archiveTarget.name}" has been archived.`);
      setArchiveTarget(null);
      await loadClasses();
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || err.message || 'Failed to archive class');
    }
  };

  const filteredClasses = classes.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalSections = classes.reduce((sum, c) => sum + (c.sectionsCount || 0), 0);
  const totalStudents = classes.reduce((sum, c) => sum + (c.studentsCount || 0), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Class Management"
        description="Configure school grades, standard levels, and sequential progression tracks."
        actions={
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={loadClasses} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button size="sm" onClick={handleOpenCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Add Class
            </Button>
          </div>
        }
      />

      {/* Notifications */}
      {actionSuccess && (
        <div className="flex items-center gap-3 p-4 bg-emerald-50 text-emerald-800 rounded-lg border border-emerald-200 text-sm">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}
      {errorMsg && (
        <div className="flex items-center gap-3 p-4 bg-rose-50 text-rose-800 rounded-lg border border-rose-200 text-sm">
          <AlertCircle className="h-5 w-5 text-rose-600 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border bg-card shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Grades</p>
            <p className="text-2xl font-bold text-foreground mt-1">{classes.length}</p>
            <span className="text-xs text-muted-foreground">Standard grade levels</span>
          </div>
          <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
            <GraduationCap className="h-5 w-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl border bg-card shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Active Status</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">
              {classes.filter((c) => c.status === 'active').length}
            </p>
            <span className="text-xs text-muted-foreground">Currently accepting students</span>
          </div>
          <div className="h-10 w-10 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="h-5 w-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl border bg-card shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Class Sections</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">{totalSections}</p>
            <span className="text-xs text-muted-foreground">Configured active sections</span>
          </div>
          <div className="h-10 w-10 rounded-full bg-blue-500/10 text-blue-600 flex items-center justify-center">
            <Layers className="h-5 w-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl border bg-card shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Enrolled</p>
            <p className="text-2xl font-bold text-purple-600 mt-1">{totalStudents}</p>
            <span className="text-xs text-muted-foreground">Students in active classes</span>
          </div>
          <div className="h-10 w-10 rounded-full bg-purple-500/10 text-purple-600 flex items-center justify-center">
            <Users className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Directory & Search */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="p-4 border-b bg-muted/30 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search classes by name or code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>
          <span className="text-xs text-muted-foreground">{filteredClasses.length} classes found</span>
        </div>

        {isLoading ? (
          <div className="p-6 space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : filteredClasses.length === 0 ? (
          <EmptyState
            icon={GraduationCap}
            title="No Classes Found"
            description={
              searchQuery
                ? `No class matches "${searchQuery}".`
                : 'No classes have been configured for this school yet.'
            }
            actionLabel={!searchQuery ? 'Add First Class' : undefined}
            onAction={!searchQuery ? handleOpenCreate : undefined}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Class Name</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Sections</TableHead>
                <TableHead>Enrolled Students</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredClasses.map((cls) => (
                <TableRow key={cls._id}>
                  <TableCell>
                    <span className="font-mono text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground">
                      #{cls.order}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <GraduationCap className="h-4 w-4 text-primary" />
                      <span className="font-semibold text-foreground">{cls.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-xs font-semibold text-primary">{cls.code}</span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {cls.sectionsCount || 0} Sections
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs font-medium text-foreground">
                      {cls.studentsCount || 0} students
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-muted-foreground truncate max-w-xs block">
                      {cls.description || '—'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={cls.status === 'active' ? 'default' : 'secondary'}>
                      {cls.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => handleOpenEdit(cls)}
                        title="Edit Class"
                      >
                        <Edit2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-rose-600 hover:bg-rose-50"
                        onClick={() => setArchiveTarget(cls)}
                        title="Archive Class"
                      >
                        <Archive className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Create / Edit Dialog */}
      <Dialog
        isOpen={isCreateOpen || isEditOpen}
        onClose={() => {
          setIsCreateOpen(false);
          setIsEditOpen(false);
        }}
        title={editingClass ? 'Edit Class Details' : 'Add New Class'}
        description="Define grade name, code, sequence ordering, and descriptive metadata."
        footer={
          <div className="flex justify-end gap-3 w-full">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsCreateOpen(false);
                setIsEditOpen(false);
              }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" form="class-form" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : editingClass ? 'Update Class' : 'Create Class'}
            </Button>
          </div>
        }
      >
        <form id="class-form" onSubmit={handleSaveClass} className="space-y-4">
          {formError && (
            <div className="p-3 bg-rose-50 text-rose-800 rounded-lg text-xs flex items-center gap-2 border border-rose-200">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Class Name *</label>
              <Input
                required
                placeholder="e.g. Grade 10"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Class Code *</label>
              <Input
                required
                placeholder="e.g. G10"
                value={formCode}
                onChange={(e) => setFormCode(e.target.value.toUpperCase())}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Progression Order *</label>
              <Input
                type="number"
                min="0"
                required
                placeholder="Sequence number, e.g. 10"
                value={formOrder}
                onChange={(e) => setFormOrder(Number(e.target.value))}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Status</label>
              <select
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                value={formStatus}
                onChange={(e) => setFormStatus(e.target.value as 'active' | 'inactive')}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">Description / Curriculum Track</label>
            <Input
              placeholder="e.g. Senior Secondary 1st Year (GCSE / High School)"
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
            />
          </div>
        </form>
      </Dialog>

      {/* Confirmation Dialog for Archival */}
      <ConfirmationDialog
        isOpen={Boolean(archiveTarget)}
        onClose={() => setArchiveTarget(null)}
        onConfirm={handleArchiveConfirm}
        title="Archive Class"
        message={`Are you sure you want to archive "${archiveTarget?.name}"? Historical student enrollments and grade transcripts associated with this class will remain completely intact.`}
        confirmLabel="Archive Class"
        confirmVariant="destructive"
        isDestructive={true}
      />
    </div>
  );
};

export default ClassesManagementPage;
