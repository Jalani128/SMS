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
import { teacherService } from '../../services/teacher.service';
import { SectionRecord, ClassRecord } from '../../types/academic';
import { TeacherItem } from '../../types/management';
import {
  Layers,
  Plus,
  RefreshCw,
  Edit2,
  Archive,
  Search,
  DoorClosed,
  UserCheck,
  AlertCircle,
  CheckCircle2,
  GraduationCap,
} from 'lucide-react';

export const SectionsManagementPage: React.FC = () => {
  const [sections, setSections] = useState<SectionRecord[]>([]);
  const [classes, setClasses] = useState<ClassRecord[]>([]);
  const [teachers, setTeachers] = useState<TeacherItem[]>([]);
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Modal states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<SectionRecord | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<SectionRecord | null>(null);

  // Form states
  const [formClassId, setFormClassId] = useState('');
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formCapacity, setFormCapacity] = useState<number>(35);
  const [formRoomNumber, setFormRoomNumber] = useState('');
  const [formClassTeacherId, setFormClassTeacherId] = useState('');
  const [formStatus, setFormStatus] = useState<'active' | 'inactive'>('active');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setErrorMsg(null);
      const [secData, clsData] = await Promise.all([
        academicService.getSections(),
        academicService.getClasses(),
      ]);
      setSections(secData);
      setClasses(clsData);

      // Attempt to load teachers for class teacher assignment
      try {
        const tchrRes = await teacherService.getTeachers({ limit: 100, status: 'active' });
        setTeachers(tchrRes.teachers || []);
      } catch (tErr) {
        console.warn('Teachers fetch warning in SectionsManagement:', tErr);
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || err.message || 'Failed to load sections');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenCreate = () => {
    setFormClassId(classes[0]?._id || '');
    setFormName('');
    setFormCode('');
    setFormCapacity(35);
    setFormRoomNumber('');
    setFormClassTeacherId('');
    setFormStatus('active');
    setFormError(null);
    setIsCreateOpen(true);
  };

  const handleOpenEdit = (sec: SectionRecord) => {
    setEditingSection(sec);
    const clsId = typeof sec.classId === 'object' && sec.classId !== null ? sec.classId._id : sec.classId;
    const tchId = typeof sec.classTeacherId === 'object' && sec.classTeacherId !== null ? sec.classTeacherId._id : (sec.classTeacherId || '');
    setFormClassId(clsId || '');
    setFormName(sec.name);
    setFormCode(sec.code);
    setFormCapacity(sec.capacity || 35);
    setFormRoomNumber(sec.roomNumber || '');
    setFormClassTeacherId(tchId);
    setFormStatus(sec.status || 'active');
    setFormError(null);
    setIsEditOpen(true);
  };

  const handleSaveSection = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formClassId) {
      setFormError('Please select a Class');
      return;
    }
    if (!formName.trim() || !formCode.trim()) {
      setFormError('Section name and code are required');
      return;
    }
    if (formCapacity < 1) {
      setFormError('Capacity must be at least 1 student');
      return;
    }

    // Guard capacity against enrolled students on edit
    if (editingSection && editingSection.currentEnrolled && formCapacity < editingSection.currentEnrolled) {
      setFormError(
        `Cannot reduce capacity to ${formCapacity}: this section already has ${editingSection.currentEnrolled} actively enrolled students.`
      );
      return;
    }

    try {
      setIsSubmitting(true);
      const payload: Partial<SectionRecord> = {
        classId: formClassId,
        name: formName.trim(),
        code: formCode.trim().toUpperCase(),
        capacity: Number(formCapacity),
        roomNumber: formRoomNumber.trim() || undefined,
        classTeacherId: (formClassTeacherId as any) || undefined,
        status: formStatus,
      };

      if (editingSection) {
        await academicService.updateSection(editingSection._id, payload);
        setActionSuccess(`Section "${payload.name}" updated successfully.`);
        setIsEditOpen(false);
      } else {
        await academicService.createSection(payload);
        setActionSuccess(`Section "${payload.name}" created successfully.`);
        setIsCreateOpen(false);
      }

      await loadData();
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
      await academicService.archiveSection(archiveTarget._id);
      setActionSuccess(`Section "${archiveTarget.name}" has been archived.`);
      setArchiveTarget(null);
      await loadData();
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || err.message || 'Failed to archive section');
    }
  };

  const filteredSections = sections.filter((sec) => {
    const classMatches =
      selectedClassFilter === 'all' ||
      (typeof sec.classId === 'object' && sec.classId !== null
        ? sec.classId._id === selectedClassFilter
        : sec.classId === selectedClassFilter);

    const textMatches =
      sec.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sec.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (sec.roomNumber && sec.roomNumber.toLowerCase().includes(searchQuery.toLowerCase()));

    return classMatches && textMatches;
  });

  const getCapacityPercent = (enrolled?: number, capacity?: number) => {
    const c = capacity || 35;
    const e = enrolled || 0;
    return Math.min(100, Math.round((e / c) * 100));
  };

  const getCapacityBadge = (enrolled?: number, capacity?: number) => {
    const pct = getCapacityPercent(enrolled, capacity);
    if (pct >= 100) {
      return <Badge variant="destructive" className="text-xs">Full ({pct}%)</Badge>;
    }
    if (pct >= 85) {
      return <Badge variant="secondary" className="bg-amber-100 text-amber-800 border-amber-200 text-xs">High ({pct}%)</Badge>;
    }
    return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">Available ({pct}%)</Badge>;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Section Management"
        description="Allocate rooms, configure student capacity limits, and assign section class teachers."
        actions={
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={loadData} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button size="sm" onClick={handleOpenCreate} disabled={classes.length === 0}>
              <Plus className="h-4 w-4 mr-2" />
              Add Section
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

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl border bg-card shadow-sm">
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search section or room..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">Filter Class:</span>
            <select
              className="h-9 px-3 rounded-md border border-input bg-background text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              value={selectedClassFilter}
              onChange={(e) => setSelectedClassFilter(e.target.value)}
            >
              <option value="all">All Classes</option>
              {classes.map((cls) => (
                <option key={cls._id} value={cls._id}>
                  {cls.name} ({cls.code})
                </option>
              ))}
            </select>
          </div>
        </div>

        <span className="text-xs text-muted-foreground self-end sm:self-center">
          {filteredSections.length} sections displayed
        </span>
      </div>

      {/* Directory Table */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : filteredSections.length === 0 ? (
          <EmptyState
            icon={Layers}
            title="No Sections Found"
            description={
              classes.length === 0
                ? 'Create a Class first before configuring sections.'
                : 'No sections match the current filter criteria.'
            }
            actionLabel={classes.length > 0 && !searchQuery ? 'Add Section' : undefined}
            onAction={classes.length > 0 && !searchQuery ? handleOpenCreate : undefined}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Section</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Room</TableHead>
                <TableHead>Capacity & Occupancy</TableHead>
                <TableHead>Class Teacher</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSections.map((sec) => {
                const className =
                  typeof sec.classId === 'object' && sec.classId !== null
                    ? sec.classId.name
                    : 'Unassigned Class';
                const enrolled = sec.currentEnrolled || 0;
                const capacity = sec.capacity || 35;
                const pct = getCapacityPercent(enrolled, capacity);
                const teacherName =
                  typeof sec.classTeacherId === 'object' && sec.classTeacherId !== null
                    ? sec.classTeacherId.userId?.name || sec.classTeacherId.employeeId
                    : 'Unassigned';

                return (
                  <TableRow key={sec._id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Layers className="h-4 w-4 text-primary" />
                        <div>
                          <span className="font-semibold text-foreground">{sec.name}</span>
                          <span className="font-mono text-xs text-muted-foreground block">{sec.code}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        <GraduationCap className="h-3 w-3 mr-1 text-primary" />
                        {className}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <DoorClosed className="h-3.5 w-3.5" />
                        <span>{sec.roomNumber || 'TBD'}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="w-44 space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium text-foreground">
                            {enrolled} / {capacity}
                          </span>
                          {getCapacityBadge(enrolled, capacity)}
                        </div>
                        <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              pct >= 100
                                ? 'bg-rose-500'
                                : pct >= 85
                                ? 'bg-amber-500'
                                : 'bg-emerald-500'
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <UserCheck className="h-3.5 w-3.5 text-primary" />
                        <span>{teacherName}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={sec.status === 'active' ? 'default' : 'secondary'}>
                        {sec.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => handleOpenEdit(sec)}
                          title="Edit Section"
                        >
                          <Edit2 className="h-4 w-4 text-muted-foreground" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-rose-600 hover:bg-rose-50"
                          onClick={() => setArchiveTarget(sec)}
                          title="Archive Section"
                        >
                          <Archive className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
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
        title={editingSection ? 'Edit Section Details' : 'Add New Section'}
        description="Configure class scoping, capacity bounds, room number, and class teacher."
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
            <Button type="submit" form="section-form" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : editingSection ? 'Update Section' : 'Create Section'}
            </Button>
          </div>
        }
      >
        <form id="section-form" onSubmit={handleSaveSection} className="space-y-4">
          {formError && (
            <div className="p-3 bg-rose-50 text-rose-800 rounded-lg text-xs flex items-center gap-2 border border-rose-200">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">Class *</label>
            <select
              required
              className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              value={formClassId}
              onChange={(e) => setFormClassId(e.target.value)}
              disabled={Boolean(editingSection)}
            >
              <option value="">Select a class...</option>
              {classes.map((cls) => (
                <option key={cls._id} value={cls._id}>
                  {cls.name} ({cls.code})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Section Name *</label>
              <Input
                required
                placeholder="e.g. Section A"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Section Code *</label>
              <Input
                required
                placeholder="e.g. 10A"
                value={formCode}
                onChange={(e) => setFormCode(e.target.value.toUpperCase())}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Maximum Capacity *</label>
              <Input
                type="number"
                min="1"
                max="200"
                required
                value={formCapacity}
                onChange={(e) => setFormCapacity(Number(e.target.value))}
              />
              {editingSection && editingSection.currentEnrolled && (
                <p className="text-[11px] text-muted-foreground">
                  Current enrolled: {editingSection.currentEnrolled} (Capacity cannot be lower)
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Room Number / Lab</label>
              <Input
                placeholder="e.g. Room 204"
                value={formRoomNumber}
                onChange={(e) => setFormRoomNumber(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Class Teacher</label>
              <select
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                value={formClassTeacherId}
                onChange={(e) => setFormClassTeacherId(e.target.value)}
              >
                <option value="">No teacher assigned</option>
                {teachers.map((t) => (
                  <option key={t._id} value={t._id}>
                    {t.userId?.name || t.employeeId} ({t.department || 'Faculty'})
                  </option>
                ))}
              </select>
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
        </form>
      </Dialog>

      {/* Confirmation Dialog for Archival */}
      <ConfirmationDialog
        isOpen={Boolean(archiveTarget)}
        onClose={() => setArchiveTarget(null)}
        onConfirm={handleArchiveConfirm}
        title="Archive Section"
        message={`Are you sure you want to archive "${archiveTarget?.name}"? Historical student enrollments and records linked to this section will remain permanently preserved.`}
        confirmLabel="Archive Section"
        confirmVariant="destructive"
        isDestructive={true}
      />
    </div>
  );
};

export default SectionsManagementPage;
