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
import { SubjectRecord } from '../../types/academic';
import {
  BookOpen,
  Plus,
  RefreshCw,
  Edit2,
  Archive,
  Search,
  CheckCircle2,
  AlertCircle,
  Award,
  Layers,
} from 'lucide-react';

export const SubjectsManagementPage: React.FC = () => {
  const [subjects, setSubjects] = useState<SubjectRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [deptFilter, setDeptFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Modal states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<SubjectRecord | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<SubjectRecord | null>(null);

  // Form states
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formDepartment, setFormDepartment] = useState('');
  const [formType, setFormType] = useState<'core' | 'elective' | 'optional' | 'vocational'>('core');
  const [formCreditHours, setFormCreditHours] = useState<number>(3);
  const [formDescription, setFormDescription] = useState('');
  const [formStatus, setFormStatus] = useState<'active' | 'inactive'>('active');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadSubjects = useCallback(async () => {
    try {
      setIsLoading(true);
      setErrorMsg(null);
      const data = await academicService.getSubjects();
      setSubjects(data);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || err.message || 'Failed to load subjects');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSubjects();
  }, [loadSubjects]);

  const handleOpenCreate = () => {
    setFormName('');
    setFormCode('');
    setFormDepartment('');
    setFormType('core');
    setFormCreditHours(3);
    setFormDescription('');
    setFormStatus('active');
    setFormError(null);
    setIsCreateOpen(true);
  };

  const handleOpenEdit = (subj: SubjectRecord) => {
    setEditingSubject(subj);
    setFormName(subj.name);
    setFormCode(subj.code);
    setFormDepartment(subj.department);
    setFormType(subj.type || 'core');
    setFormCreditHours(subj.creditHours || 1);
    setFormDescription(subj.description || '');
    setFormStatus(subj.status === 'inactive' ? 'inactive' : 'active');
    setFormError(null);
    setIsEditOpen(true);
  };

  const handleSaveSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formName.trim() || !formCode.trim() || !formDepartment.trim()) {
      setFormError('Subject name, code, and department are required');
      return;
    }

    try {
      setIsSubmitting(true);
      const payload: Partial<SubjectRecord> = {
        name: formName.trim(),
        code: formCode.trim().toUpperCase(),
        department: formDepartment.trim(),
        type: formType,
        creditHours: Number(formCreditHours),
        description: formDescription.trim(),
        status: formStatus,
      };

      if (editingSubject) {
        await academicService.updateSubject(editingSubject._id, payload);
        setActionSuccess(`Subject "${payload.name}" updated successfully.`);
        setIsEditOpen(false);
      } else {
        await academicService.createSubject(payload);
        setActionSuccess(`Subject "${payload.name}" created successfully.`);
        setIsCreateOpen(false);
      }

      await loadSubjects();
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
      await academicService.archiveSubject(archiveTarget._id);
      setActionSuccess(`Subject "${archiveTarget.name}" has been safely archived.`);
      setArchiveTarget(null);
      await loadSubjects();
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || err.message || 'Failed to archive subject');
    }
  };

  const departments = Array.from(new Set(subjects.map((s) => s.department).filter(Boolean)));

  const filteredSubjects = subjects.filter((s) => {
    const typeMatches = typeFilter === 'all' || s.type === typeFilter;
    const deptMatches = deptFilter === 'all' || s.department === deptFilter;
    const textMatches =
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.department.toLowerCase().includes(searchQuery.toLowerCase());
    return typeMatches && deptMatches && textMatches;
  });

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'core':
        return <Badge variant="default" className="bg-blue-600 hover:bg-blue-700 text-xs">Core</Badge>;
      case 'elective':
        return <Badge variant="secondary" className="bg-purple-100 text-purple-800 border-purple-200 text-xs">Elective</Badge>;
      case 'optional':
        return <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200 text-xs">Optional</Badge>;
      case 'vocational':
        return <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 border-emerald-200 text-xs">Vocational</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">{type}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Subjects Directory"
        description="Catalog curriculum courses, department classifications, and academic credit weightings."
        actions={
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={loadSubjects} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button size="sm" onClick={handleOpenCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Add Subject
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

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border bg-card shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Courses</p>
            <p className="text-2xl font-bold text-foreground mt-1">{subjects.length}</p>
            <span className="text-xs text-muted-foreground">Registered in curriculum</span>
          </div>
          <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
            <BookOpen className="h-5 w-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl border bg-card shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Core Subjects</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">
              {subjects.filter((s) => s.type === 'core').length}
            </p>
            <span className="text-xs text-muted-foreground">Mandatory coursework</span>
          </div>
          <div className="h-10 w-10 rounded-full bg-blue-500/10 text-blue-600 flex items-center justify-center">
            <Award className="h-5 w-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl border bg-card shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Electives & Optionals</p>
            <p className="text-2xl font-bold text-purple-600 mt-1">
              {subjects.filter((s) => s.type !== 'core').length}
            </p>
            <span className="text-xs text-muted-foreground">Specialized tracks</span>
          </div>
          <div className="h-10 w-10 rounded-full bg-purple-500/10 text-purple-600 flex items-center justify-center">
            <Layers className="h-5 w-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl border bg-card shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Departments</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{departments.length}</p>
            <span className="text-xs text-muted-foreground">Faculty faculties</span>
          </div>
          <div className="h-10 w-10 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl border bg-card shadow-sm">
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by title, code, or department..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">Type:</span>
            <select
              className="h-9 px-3 rounded-md border border-input bg-background text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="all">All Types</option>
              <option value="core">Core</option>
              <option value="elective">Elective</option>
              <option value="optional">Optional</option>
              <option value="vocational">Vocational</option>
            </select>
          </div>

          {departments.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">Department:</span>
              <select
                className="h-9 px-3 rounded-md border border-input bg-background text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
              >
                <option value="all">All Departments</option>
                {departments.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <span className="text-xs text-muted-foreground self-end sm:self-center">
          {filteredSubjects.length} subjects found
        </span>
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : filteredSubjects.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="No Subjects Found"
            description={
              searchQuery
                ? `No courses matching "${searchQuery}".`
                : 'No curriculum subjects cataloged yet.'
            }
            actionLabel={!searchQuery ? 'Add First Subject' : undefined}
            onAction={!searchQuery ? handleOpenCreate : undefined}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Course Name</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Credits</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSubjects.map((subj) => (
                <TableRow key={subj._id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-primary" />
                      <span className="font-semibold text-foreground">{subj.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-muted text-primary">
                      {subj.code}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-foreground font-medium">{subj.department}</span>
                  </TableCell>
                  <TableCell>{getTypeBadge(subj.type)}</TableCell>
                  <TableCell>
                    <span className="text-xs font-medium text-foreground">
                      {subj.creditHours} {subj.creditHours === 1 ? 'Credit' : 'Credits'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-muted-foreground truncate max-w-xs block">
                      {subj.description || '—'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={subj.status === 'active' ? 'default' : 'secondary'}>
                      {subj.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => handleOpenEdit(subj)}
                        title="Edit Subject"
                      >
                        <Edit2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-rose-600 hover:bg-rose-50"
                        onClick={() => setArchiveTarget(subj)}
                        title="Archive Subject"
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
        title={editingSubject ? 'Edit Subject Details' : 'Add New Subject'}
        description="Configure course name, unique school-wide code, credit hours, and department."
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
            <Button type="submit" form="subject-form" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : editingSubject ? 'Update Subject' : 'Create Subject'}
            </Button>
          </div>
        }
      >
        <form id="subject-form" onSubmit={handleSaveSubject} className="space-y-4">
          {formError && (
            <div className="p-3 bg-rose-50 text-rose-800 rounded-lg text-xs flex items-center gap-2 border border-rose-200">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Course Name *</label>
              <Input
                required
                placeholder="e.g. Mathematics & Statistics"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Course Code *</label>
              <Input
                required
                placeholder="e.g. MATH-101"
                value={formCode}
                onChange={(e) => setFormCode(e.target.value.toUpperCase())}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Department *</label>
              <Input
                required
                placeholder="e.g. Science"
                value={formDepartment}
                onChange={(e) => setFormDepartment(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Type</label>
              <select
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                value={formType}
                onChange={(e) => setFormType(e.target.value as any)}
              >
                <option value="core">Core</option>
                <option value="elective">Elective</option>
                <option value="optional">Optional</option>
                <option value="vocational">Vocational</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Credits</label>
              <Input
                type="number"
                min="0"
                step="0.5"
                required
                value={formCreditHours}
                onChange={(e) => setFormCreditHours(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">Course Description</label>
            <Input
              placeholder="e.g. Algebra, Geometry, Pre-calculus"
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
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
        </form>
      </Dialog>

      {/* Confirmation Dialog for Archival */}
      <ConfirmationDialog
        isOpen={Boolean(archiveTarget)}
        onClose={() => setArchiveTarget(null)}
        onConfirm={handleArchiveConfirm}
        title="Archive Subject"
        message={`Archiving "${archiveTarget?.name}" will remove it from future course selections. Historical examination marks, attendance, and transcripts will remain permanently preserved.`}
        confirmLabel="Archive Subject"
        confirmVariant="destructive"
        isDestructive={true}
      />
    </div>
  );
};

export default SubjectsManagementPage;
