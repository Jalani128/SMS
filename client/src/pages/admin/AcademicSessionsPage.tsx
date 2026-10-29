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
import { AcademicSessionRecord, AcademicTerm } from '../../types/academic';
import {
  Calendar,
  Plus,
  RefreshCw,
  CheckCircle2,
  Clock,
  Archive,
  Edit2,
  Trash2,
  AlertCircle,
  Sparkles,
} from 'lucide-react';

export const AcademicSessionsPage: React.FC = () => {
  const [sessions, setSessions] = useState<AcademicSessionRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Modal states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<AcademicSessionRecord | null>(null);
  const [activateTarget, setActivateTarget] = useState<AcademicSessionRecord | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<AcademicSessionRecord | null>(null);

  // Form states
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formStartDate, setFormStartDate] = useState('');
  const [formEndDate, setFormEndDate] = useState('');
  const [formIsCurrent, setFormIsCurrent] = useState(false);
  const [formTerms, setFormTerms] = useState<AcademicTerm[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadSessions = useCallback(async () => {
    try {
      setIsLoading(true);
      setErrorMsg(null);
      const data = await academicService.getSessions();
      setSessions(data);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || err.message || 'Failed to load sessions');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const handleOpenCreate = () => {
    setFormName('');
    setFormCode('');
    setFormStartDate('');
    setFormEndDate('');
    setFormIsCurrent(false);
    setFormTerms([]);
    setFormError(null);
    setIsCreateOpen(true);
  };

  const handleOpenEdit = (session: AcademicSessionRecord) => {
    setEditingSession(session);
    setFormName(session.name);
    setFormCode(session.code);
    setFormStartDate(session.startDate ? session.startDate.substring(0, 10) : '');
    setFormEndDate(session.endDate ? session.endDate.substring(0, 10) : '');
    setFormIsCurrent(session.isCurrent);
    setFormTerms(session.terms || []);
    setFormError(null);
    setIsEditOpen(true);
  };

  const handleAddTerm = () => {
    setFormTerms([
      ...formTerms,
      { name: `Term ${formTerms.length + 1}`, startDate: '', endDate: '' },
    ]);
  };

  const handleRemoveTerm = (index: number) => {
    setFormTerms(formTerms.filter((_, i) => i !== index));
  };

  const handleTermChange = (index: number, field: keyof AcademicTerm, value: string) => {
    const updated = [...formTerms];
    updated[index] = { ...updated[index], [field]: value };
    setFormTerms(updated);
  };

  const validateDates = (start: string, end: string): string | null => {
    if (!start || !end) return 'Start date and End date are required';
    if (new Date(end) <= new Date(start)) {
      return 'Session End date must be strictly after the Start date';
    }
    return null;
  };

  const handleSaveSession = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const dateErr = validateDates(formStartDate, formEndDate);
    if (dateErr) {
      setFormError(dateErr);
      return;
    }

    try {
      setIsSubmitting(true);
      const payload: Partial<AcademicSessionRecord> = {
        name: formName.trim(),
        code: formCode.trim().toUpperCase(),
        startDate: formStartDate,
        endDate: formEndDate,
        isCurrent: formIsCurrent,
        terms: formTerms.filter((t) => t.name && t.startDate && t.endDate),
      };

      if (editingSession) {
        await academicService.updateSession(editingSession._id, payload);
        setActionSuccess(`Session "${payload.name}" updated successfully`);
        setIsEditOpen(false);
      } else {
        await academicService.createSession(payload);
        setActionSuccess(`Academic session "${payload.name}" created successfully`);
        setIsCreateOpen(false);
      }

      await loadSessions();
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      setFormError(err.response?.data?.message || err.message || 'Operation failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleActivateConfirm = async () => {
    if (!activateTarget) return;
    try {
      await academicService.activateSession(activateTarget._id);
      setActionSuccess(`Session "${activateTarget.name}" is now the active operational session.`);
      setActivateTarget(null);
      await loadSessions();
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || err.message || 'Failed to activate session');
    }
  };

  const handleArchiveConfirm = async () => {
    if (!archiveTarget) return;
    try {
      await academicService.archiveSession(archiveTarget._id);
      setActionSuccess(`Session "${archiveTarget.name}" has been archived.`);
      setArchiveTarget(null);
      await loadSessions();
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || err.message || 'Failed to archive session');
    }
  };

  const currentSession = sessions.find((s) => s.isCurrent);
  const activeCount = sessions.filter((s) => s.status === 'active').length;
  const upcomingCount = sessions.filter((s) => s.status === 'upcoming').length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Academic Sessions"
        description="Configure academic years, define term periods, and switch the school's active operational session."
        actions={
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={loadSessions} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button size="sm" onClick={handleOpenCreate}>
              <Plus className="h-4 w-4 mr-2" />
              New Academic Session
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
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Current Active</p>
            <p className="text-lg font-bold text-foreground mt-1 truncate">
              {currentSession ? currentSession.name : 'None Activated'}
            </p>
            <span className="text-xs text-primary font-medium">{currentSession?.code || '—'}</span>
          </div>
          <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
            <Sparkles className="h-5 w-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl border bg-card shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Sessions</p>
            <p className="text-2xl font-bold text-foreground mt-1">{sessions.length}</p>
            <span className="text-xs text-muted-foreground">Historical & upcoming</span>
          </div>
          <div className="h-10 w-10 rounded-full bg-blue-500/10 text-blue-600 flex items-center justify-center">
            <Calendar className="h-5 w-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl border bg-card shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Upcoming Sessions</p>
            <p className="text-2xl font-bold text-foreground mt-1">{upcomingCount}</p>
            <span className="text-xs text-muted-foreground">Ready for enrollment</span>
          </div>
          <div className="h-10 w-10 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center">
            <Clock className="h-5 w-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl border bg-card shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Active Status</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{activeCount}</p>
            <span className="text-xs text-muted-foreground">Enforced single active invariant</span>
          </div>
          <div className="h-10 w-10 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="p-4 border-b bg-muted/30 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-foreground">Session Directory</h3>
            <p className="text-xs text-muted-foreground">
              Only one session can be active at any given moment. Switching active session updates tenant context.
            </p>
          </div>
          <span className="text-xs text-muted-foreground">{sessions.length} sessions listed</span>
        </div>

        {isLoading ? (
          <div className="p-6 space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : sessions.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title="No Academic Sessions Configured"
            description="Create your first academic year session to enable classes, sections, and student enrollment."
            actionLabel="Add Academic Session"
            onAction={handleOpenCreate}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Session Name</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Timeline</TableHead>
                <TableHead>Terms</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessions.map((session) => (
                <TableRow key={session._id} className={session.isCurrent ? 'bg-primary/5 font-medium' : ''}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-primary" />
                      <span className="font-semibold text-foreground">{session.name}</span>
                      {session.isCurrent && (
                        <Badge variant="default" className="bg-emerald-600 hover:bg-emerald-700 text-xs">
                          Active Session
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground">
                      {session.code}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="text-xs text-muted-foreground">
                      {new Date(session.startDate).toLocaleDateString()} —{' '}
                      {new Date(session.endDate).toLocaleDateString()}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-muted-foreground">
                      {session.terms && session.terms.length > 0
                        ? `${session.terms.length} terms configured`
                        : 'No terms'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        session.status === 'active'
                          ? 'default'
                          : session.status === 'upcoming'
                          ? 'outline'
                          : session.status === 'completed'
                          ? 'secondary'
                          : 'destructive'
                      }
                    >
                      {session.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {!session.isCurrent && session.status !== 'archived' && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                          onClick={() => setActivateTarget(session)}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                          Set Active
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => handleOpenEdit(session)}
                        title="Edit Session"
                      >
                        <Edit2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                      {session.status !== 'archived' && !session.isCurrent && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-rose-600 hover:bg-rose-50"
                          onClick={() => setArchiveTarget(session)}
                          title="Archive Session"
                        >
                          <Archive className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Create / Edit Modal */}
      <Dialog
        isOpen={isCreateOpen || isEditOpen}
        onClose={() => {
          setIsCreateOpen(false);
          setIsEditOpen(false);
        }}
        title={editingSession ? 'Edit Academic Session' : 'Create Academic Session'}
        description="Specify the academic year timeline and define term periods."
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
            <Button type="submit" form="session-form" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : editingSession ? 'Update Session' : 'Create Session'}
            </Button>
          </div>
        }
      >
        <form id="session-form" onSubmit={handleSaveSession} className="space-y-4">
          {formError && (
            <div className="p-3 bg-rose-50 text-rose-800 rounded-lg text-xs flex items-center gap-2 border border-rose-200">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Session Name *</label>
              <Input
                required
                placeholder="e.g. Academic Year 2026-2027"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Session Code *</label>
              <Input
                required
                placeholder="e.g. AY-2026-2027"
                value={formCode}
                onChange={(e) => setFormCode(e.target.value.toUpperCase())}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Start Date *</label>
              <Input
                type="date"
                required
                value={formStartDate}
                onChange={(e) => setFormStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">End Date *</label>
              <Input
                type="date"
                required
                value={formEndDate}
                onChange={(e) => setFormEndDate(e.target.value)}
              />
            </div>
          </div>

          {!editingSession && (
            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="isCurrentCheck"
                checked={formIsCurrent}
                onChange={(e) => setFormIsCurrent(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <label htmlFor="isCurrentCheck" className="text-xs font-medium text-foreground cursor-pointer">
                Set as immediate active session for this school
              </label>
            </div>
          )}

          {/* Terms Sub-form */}
          <div className="pt-2 border-t">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-foreground">Academic Terms / Semesters</label>
              <Button type="button" variant="outline" size="sm" onClick={handleAddTerm} className="h-7 text-xs">
                <Plus className="h-3 w-3 mr-1" />
                Add Term
              </Button>
            </div>

            {formTerms.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">
                No terms added. Click "Add Term" if your school tracks separate semesters/terms.
              </p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {formTerms.map((term, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-2 bg-muted/40 rounded-lg border text-xs">
                    <Input
                      placeholder="Term Name"
                      value={term.name}
                      onChange={(e) => handleTermChange(idx, 'name', e.target.value)}
                      className="h-7 text-xs flex-1"
                    />
                    <Input
                      type="date"
                      value={term.startDate ? term.startDate.substring(0, 10) : ''}
                      onChange={(e) => handleTermChange(idx, 'startDate', e.target.value)}
                      className="h-7 text-xs w-32"
                    />
                    <Input
                      type="date"
                      value={term.endDate ? term.endDate.substring(0, 10) : ''}
                      onChange={(e) => handleTermChange(idx, 'endDate', e.target.value)}
                      className="h-7 text-xs w-32"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveTerm(idx)}
                      className="h-7 w-7 p-0 text-rose-500 hover:bg-rose-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </form>
      </Dialog>

      {/* Confirmation Dialog for Session Activation */}
      <ConfirmationDialog
        isOpen={Boolean(activateTarget)}
        onClose={() => setActivateTarget(null)}
        onConfirm={handleActivateConfirm}
        title="Activate Academic Session"
        message={`Are you sure you want to activate "${activateTarget?.name}"? Exactly one academic session can be active per school. The current active session will automatically be deactivated.`}
        confirmLabel="Activate Session"
        confirmVariant="default"
        isDestructive={false}
      />

      {/* Confirmation Dialog for Archival */}
      <ConfirmationDialog
        isOpen={Boolean(archiveTarget)}
        onClose={() => setArchiveTarget(null)}
        onConfirm={handleArchiveConfirm}
        title="Archive Academic Session"
        message={`Archiving "${archiveTarget?.name}" will mark it as archived. All historical classes, sections, and student grades will remain permanently preserved.`}
        confirmLabel="Archive Session"
        confirmVariant="destructive"
        isDestructive={true}
      />
    </div>
  );
};

export default AcademicSessionsPage;
