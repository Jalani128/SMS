import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  OperationsService,
  OperationsDashboardData,
  IOperationalTaskItem,
  IApprovalRequestItem,
} from '../../services/operations.service';
import { PageHeader } from '../../components/shared/PageHeader';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  CalendarCheck,
  CreditCard,
  BookOpen,
  ClipboardList,
  ShieldAlert,
  Send,
  RotateCw,
  Plus,
  ArrowRight,
  Filter,
  Check,
  X,
  FileText,
  UserCheck,
} from 'lucide-react';

export const SchoolOperationsDashboardPage: React.FC = () => {
  const [data, setData] = useState<OperationsDashboardData | null>(null);
  const [tasks, setTasks] = useState<IOperationalTaskItem[]>([]);
  const [approvals, setApprovals] = useState<IApprovalRequestItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAutomating, setIsAutomating] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'attendance' | 'tasks' | 'approvals' | 'audit'>('attendance');
  const [notificationMsg, setNotificationMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Task Filter states
  const [taskStatusFilter, setTaskStatusFilter] = useState<string>('');
  const [taskPriorityFilter, setTaskPriorityFilter] = useState<string>('');

  // Task Modal state
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    category: 'general',
    priority: 'medium',
    dueDate: '',
    assignedTo: '',
  });

  // Task Status Update Modal state
  const [selectedTask, setSelectedTask] = useState<IOperationalTaskItem | null>(null);
  const [updateStatusVal, setUpdateStatusVal] = useState<string>('completed');
  const [completionNotesVal, setCompletionNotesVal] = useState<string>('');

  // Approval Review Modal state
  const [selectedApproval, setSelectedApproval] = useState<IApprovalRequestItem | null>(null);
  const [reviewAction, setReviewAction] = useState<'approved' | 'rejected'>('approved');
  const [reviewNotesVal, setReviewNotesVal] = useState<string>('');

  // New Approval Request Modal state
  const [isCreateApprovalOpen, setIsCreateApprovalOpen] = useState(false);
  const [approvalForm, setApprovalForm] = useState({
    type: 'general_request',
    title: '',
    description: '',
    reason: '',
    priority: 'medium',
  });

  const loadAll = async () => {
    setIsLoading(true);
    try {
      const [dash, taskRes, appRes] = await Promise.all([
        OperationsService.getDashboard(),
        OperationsService.getTasks({
          status: taskStatusFilter || undefined,
          priority: taskPriorityFilter || undefined,
        }),
        OperationsService.getApprovals(),
      ]);
      setData(dash);
      setTasks(taskRes.tasks || []);
      setApprovals(appRes.approvals || []);
    } catch (err: any) {
      setNotificationMsg({ type: 'error', text: err.message || 'Failed to load operations dashboard' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, [taskStatusFilter, taskPriorityFilter]);

  const showToast = (type: 'success' | 'error', text: string) => {
    setNotificationMsg({ type, text });
    setTimeout(() => setNotificationMsg(null), 5000);
  };

  const handleRunDailyAutomation = async () => {
    setIsAutomating(true);
    try {
      const res = await OperationsService.runDailyAutomation();
      showToast(
        'success',
        `Automation complete! Sent ${res.attendanceRemindersSent} attendance reminders, ${res.feeRemindersSent} fee reminders, and ${res.homeworkRemindersSent} homework alerts.`
      );
      await loadAll();
    } catch (err: any) {
      showToast('error', err.message || 'Automation failed');
    } finally {
      setIsAutomating(false);
    }
  };

  const handleSendAttendanceReminders = async () => {
    try {
      const res = await OperationsService.triggerAttendanceReminders();
      showToast('success', `Sent ${res.sentRemindersCount} attendance reminders to faculty members.`);
      await loadAll();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to trigger attendance reminders');
    }
  };

  const handleSendFeeReminders = async () => {
    try {
      const res = await OperationsService.triggerFeeReminders();
      showToast(
        'success',
        `Dispatched ${res.overdueRemindersCount} overdue and ${res.dueSoonRemindersCount} upcoming fee reminders.`
      );
      await loadAll();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to trigger fee reminders');
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskForm.title || !taskForm.assignedTo) {
      showToast('error', 'Title and Assignee are required.');
      return;
    }
    try {
      await OperationsService.createTask(taskForm);
      showToast('success', 'Operational task created and assigned successfully.');
      setIsCreateTaskOpen(false);
      setTaskForm({ title: '', description: '', category: 'general', priority: 'medium', dueDate: '', assignedTo: '' });
      await loadAll();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to create task');
    }
  };

  const handleUpdateTaskStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask) return;
    try {
      await OperationsService.updateTaskStatus(selectedTask._id, {
        status: updateStatusVal,
        completionNotes: completionNotesVal,
      });
      showToast('success', 'Task status updated.');
      setSelectedTask(null);
      setCompletionNotesVal('');
      await loadAll();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to update task');
    }
  };

  const handleReviewApproval = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApproval) return;
    if (reviewAction === 'rejected' && (!reviewNotesVal || reviewNotesVal.trim().length < 3)) {
      showToast('error', 'Please provide review notes explaining the rejection reason.');
      return;
    }
    try {
      await OperationsService.reviewApproval(selectedApproval._id, {
        action: reviewAction,
        reviewNotes: reviewNotesVal,
      });
      showToast('success', `Approval request ${reviewAction} successfully.`);
      setSelectedApproval(null);
      setReviewNotesVal('');
      await loadAll();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to review approval request');
    }
  };

  const handleCreateApproval = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!approvalForm.title || !approvalForm.reason) {
      showToast('error', 'Title and justification reason are required.');
      return;
    }
    try {
      await OperationsService.createApproval(approvalForm);
      showToast('success', 'Administrative approval request submitted for review.');
      setIsCreateApprovalOpen(false);
      setApprovalForm({ type: 'general_request', title: '', description: '', reason: '', priority: 'medium' });
      await loadAll();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to submit approval request');
    }
  };

  if (isLoading && !data) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <RotateCw className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading School Operations Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {notificationMsg && (
        <div
          className={`flex items-center justify-between rounded-lg border px-4 py-3 shadow-sm transition-all ${
            notificationMsg.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {notificationMsg.type === 'success' ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-rose-600" />
            )}
            <span className="text-sm font-medium">{notificationMsg.text}</span>
          </div>
          <button onClick={() => setNotificationMsg(null)} className="text-sm font-bold opacity-70 hover:opacity-100">
            ×
          </button>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <PageHeader
            title="School Operations & Daily Workflows"
            description="Real-time institutional oversight, automated follow-ups, operational task delegation, and maker-checker approvals."
          />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="gap-1 font-mono text-xs">
              <Clock className="h-3 w-3 text-muted-foreground" />
              Timezone: {data?.timezone || 'UTC'}
            </Badge>
            <Badge variant="outline" className="text-xs">
              Date: {data?.currentDate || 'Today'}
            </Badge>
            <Badge
              variant={data?.isWorkingDay ? 'success' : 'secondary'}
              className="text-xs"
            >
              {data?.isWorkingDay ? 'Active Working Day' : 'Weekend / Holiday'}
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadAll}
            disabled={isLoading}
            className="gap-1"
          >
            <RotateCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Button
            variant="default"
            size="sm"
            onClick={handleRunDailyAutomation}
            disabled={isAutomating}
            className="gap-2 shadow-sm"
          >
            <Activity className={`h-4 w-4 ${isAutomating ? 'animate-spin' : ''}`} />
            {isAutomating ? 'Running Automation...' : 'Run Daily Automation'}
          </Button>
        </div>
      </div>

      {/* KPI Stat Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Attendance Card */}
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Daily Attendance
            </span>
            <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
              <CalendarCheck className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight">
              {data?.attendance.classesMarked} / {data?.attendance.classesTotal}
            </span>
            <span className="text-xs text-muted-foreground">classes marked</span>
          </div>
          {/* Progress bar */}
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full transition-all duration-500 ${
                (data?.attendance.completionPercentage || 0) === 100 ? 'bg-emerald-500' : 'bg-blue-600'
              }`}
              style={{ width: `${data?.attendance.completionPercentage || 0}%` }}
            />
          </div>
          <div className="mt-3 flex items-center justify-between text-xs">
            <span className="font-medium text-muted-foreground">
              {data?.attendance.completionPercentage}% complete
            </span>
            {data?.attendance.classesMissing ? (
              <span className="font-semibold text-rose-600">
                {data.attendance.classesMissing} missing
              </span>
            ) : (
              <span className="font-semibold text-emerald-600">All marked</span>
            )}
          </div>
        </div>

        {/* Fees Overdue Card */}
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Overdue Invoices
            </span>
            <div className="rounded-lg bg-amber-50 p-2 text-amber-600">
              <CreditCard className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-rose-600">
              {data?.finance.currency} {data?.finance.overdueAmount.toLocaleString()}
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {data?.finance.overdueInvoicesCount} invoices overdue • {data?.finance.dueSoonInvoicesCount} due soon
          </p>
          <div className="mt-3 pt-2 border-t">
            <button
              onClick={handleSendFeeReminders}
              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              <Send className="h-3 w-3" />
              Send Fee Reminders
            </button>
          </div>
        </div>

        {/* Academic Reviews Card */}
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Homework & Exams
            </span>
            <div className="rounded-lg bg-purple-50 p-2 text-purple-600">
              <BookOpen className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight">
              {data?.academic.pendingHomeworkReviews}
            </span>
            <span className="text-xs text-muted-foreground">submissions unreviewed</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {data?.academic.upcomingExamsCount} upcoming exams • {data?.academic.missingMarksExamsCount} missing marks
          </p>
          <div className="mt-3 pt-2 border-t">
            <Link
              to="/admin/homework"
              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              Open Homework Desk <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>

        {/* Operational Tasks & Approvals Card */}
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Action Queue
            </span>
            <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600">
              <ClipboardList className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight">
              {data?.tasks.openCount}
            </span>
            <span className="text-xs text-muted-foreground">open tasks</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {data?.approvals.pendingCount} approvals pending • {data?.tasks.urgentCount} urgent
          </p>
          <div className="mt-3 pt-2 border-t">
            <button
              onClick={() => setActiveTab('approvals')}
              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              View Approvals ({data?.approvals.pendingCount}) <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="border-b">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('attendance')}
            className={`pb-3 text-sm font-medium transition-colors border-b-2 ${
              activeTab === 'attendance'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Missing Attendance ({data?.attendance.missingClasses.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('tasks')}
            className={`pb-3 text-sm font-medium transition-colors border-b-2 ${
              activeTab === 'tasks'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Operational Tasks ({tasks.length})
          </button>
          <button
            onClick={() => setActiveTab('approvals')}
            className={`pb-3 text-sm font-medium transition-colors border-b-2 ${
              activeTab === 'approvals'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Approvals Queue ({approvals.filter((a) => a.status === 'pending').length})
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`pb-3 text-sm font-medium transition-colors border-b-2 ${
              activeTab === 'audit'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Recent Activity Log
          </button>
        </div>
      </div>

      {/* Tab 1: Missing Daily Attendance */}
      {activeTab === 'attendance' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold">Missing Attendance Records for Today</h3>
              <p className="text-xs text-muted-foreground">
                Classes that have zero attendance records submitted for {data?.currentDate}.
              </p>
            </div>
            {data?.attendance.missingClasses && data.attendance.missingClasses.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleSendAttendanceReminders}
                className="gap-1 text-xs"
              >
                <Send className="h-3 w-3" />
                Remind Assigned Teachers
              </Button>
            )}
          </div>

          {data?.attendance.missingClasses && data.attendance.missingClasses.length > 0 ? (
            <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="p-3">Class & Section</th>
                    <th className="p-3">Assigned Faculty</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.attendance.missingClasses.map((item, idx) => (
                    <tr key={idx} className="hover:bg-muted/30">
                      <td className="p-3 font-medium">
                        {item.className} {item.sectionName ? `(${item.sectionName})` : ''}
                      </td>
                      <td className="p-3 text-xs text-muted-foreground">
                        {item.assignedTeacher ? (
                          <div className="flex items-center gap-1 font-medium text-foreground">
                            <UserCheck className="h-3.5 w-3.5 text-primary" />
                            {item.assignedTeacher.name}
                          </div>
                        ) : (
                          <span className="italic text-amber-600">Unassigned faculty</span>
                        )}
                      </td>
                      <td className="p-3">
                        <Badge variant="warning" className="text-xs">
                          Not Recorded
                        </Badge>
                      </td>
                      <td className="p-3 text-right">
                        <Link
                          to="/admin/attendance"
                          className="inline-flex items-center gap-1 rounded bg-primary/10 px-2 py-1 text-xs font-medium text-primary hover:bg-primary/20"
                        >
                          Mark Now <ArrowRight className="h-3 w-3" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed p-8 text-center bg-card">
              <CheckCircle2 className="h-10 w-10 text-emerald-500 mb-2" />
              <h4 className="font-semibold text-foreground">All Classes Accounted For!</h4>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                Daily attendance has been recorded for every registered class and section for today.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Operational Tasks */}
      {activeTab === 'tasks' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <select
                value={taskStatusFilter}
                onChange={(e) => setTaskStatusFilter(e.target.value)}
                className="h-8 rounded-lg border bg-background px-2 text-xs"
              >
                <option value="">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>

              <select
                value={taskPriorityFilter}
                onChange={(e) => setTaskPriorityFilter(e.target.value)}
                className="h-8 rounded-lg border bg-background px-2 text-xs"
              >
                <option value="">All Priorities</option>
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>

            <Button
              variant="default"
              size="sm"
              onClick={() => setIsCreateTaskOpen(true)}
              className="gap-1 text-xs"
            >
              <Plus className="h-3.5 w-3.5" />
              Create Task
            </Button>
          </div>

          {tasks.length > 0 ? (
            <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="p-3">Title & Category</th>
                    <th className="p-3">Priority</th>
                    <th className="p-3">Assignee</th>
                    <th className="p-3">Due Date</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {tasks.map((task) => (
                    <tr key={task._id} className="hover:bg-muted/30">
                      <td className="p-3">
                        <div className="font-medium text-foreground">{task.title}</div>
                        {task.description && (
                          <div className="text-xs text-muted-foreground truncate max-w-xs">
                            {task.description}
                          </div>
                        )}
                        <Badge variant="outline" className="mt-1 text-[10px] uppercase">
                          {task.category}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <Badge
                          variant={
                            task.priority === 'urgent'
                              ? 'destructive'
                              : task.priority === 'high'
                              ? 'warning'
                              : 'secondary'
                          }
                          className="text-xs uppercase"
                        >
                          {task.priority}
                        </Badge>
                      </td>
                      <td className="p-3 text-xs">
                        {task.assignedTo?.name || 'Unassigned'}
                      </td>
                      <td className="p-3 text-xs text-muted-foreground">
                        {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'None'}
                      </td>
                      <td className="p-3">
                        <Badge
                          variant={
                            task.status === 'completed'
                              ? 'success'
                              : task.status === 'in_progress'
                              ? 'default'
                              : 'secondary'
                          }
                          className="text-xs capitalize"
                        >
                          {task.status.replace('_', ' ')}
                        </Badge>
                      </td>
                      <td className="p-3 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedTask(task);
                            setUpdateStatusVal(task.status === 'completed' ? 'in_progress' : 'completed');
                            setCompletionNotesVal(task.completionNotes || '');
                          }}
                          className="text-xs h-7 px-2"
                        >
                          Update Status
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed p-8 text-center bg-card">
              <ClipboardList className="h-10 w-10 text-muted-foreground/40 mb-2" />
              <h4 className="font-semibold text-foreground">No Tasks Found</h4>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                No operational tasks match your selected filters. Create a new task to delegate follow-ups.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Approvals Queue */}
      {activeTab === 'approvals' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold">Administrative Approval Queue</h3>
              <p className="text-xs text-muted-foreground">
                Maker-checker separation of duties: Staff requests requiring administrator approval before taking effect.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCreateApprovalOpen(true)}
              className="gap-1 text-xs"
            >
              <Plus className="h-3.5 w-3.5" />
              Request Approval
            </Button>
          </div>

          {approvals.length > 0 ? (
            <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="p-3">Request Details</th>
                    <th className="p-3">Type</th>
                    <th className="p-3">Requested By</th>
                    <th className="p-3">Justification Reason</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {approvals.map((req) => (
                    <tr key={req._id} className="hover:bg-muted/30">
                      <td className="p-3">
                        <div className="font-medium text-foreground">{req.title}</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(req.createdAt).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="p-3">
                        <Badge variant="outline" className="text-xs uppercase">
                          {req.type.replace(/_/g, ' ')}
                        </Badge>
                      </td>
                      <td className="p-3 text-xs">
                        {req.requestedBy?.name || 'Staff User'}
                      </td>
                      <td className="p-3 text-xs text-muted-foreground max-w-xs truncate">
                        "{req.reason}"
                      </td>
                      <td className="p-3">
                        <Badge
                          variant={
                            req.status === 'approved'
                              ? 'success'
                              : req.status === 'rejected'
                              ? 'destructive'
                              : 'warning'
                          }
                          className="text-xs capitalize"
                        >
                          {req.status}
                        </Badge>
                      </td>
                      <td className="p-3 text-right">
                        {req.status === 'pending' ? (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => {
                              setSelectedApproval(req);
                              setReviewAction('approved');
                              setReviewNotesVal('');
                            }}
                            className="text-xs h-7 px-2"
                          >
                            Review
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">
                            Reviewed by {req.reviewedBy?.name || 'Admin'}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed p-8 text-center bg-card">
              <ShieldAlert className="h-10 w-10 text-muted-foreground/40 mb-2" />
              <h4 className="font-semibold text-foreground">No Pending Approvals</h4>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                There are currently no administrative requests pending review.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Recent Activity Log */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          <div>
            <h3 className="text-base font-semibold">Recent Administrative Activities</h3>
            <p className="text-xs text-muted-foreground">
              Immutable audit log entries capturing configuration changes, approvals, and automated operations.
            </p>
          </div>

          <div className="rounded-xl border bg-card shadow-sm divide-y">
            {data?.recentActivities && data.recentActivities.length > 0 ? (
              data.recentActivities.map((act) => (
                <div key={act.id} className="flex items-center justify-between p-4 hover:bg-muted/30">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-primary/10 p-2 text-primary">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="font-medium text-sm text-foreground">
                        {act.action.replace(/_/g, ' ')}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Resource: <span className="font-mono">{act.targetResource}</span> • By{' '}
                        <span className="font-medium text-foreground">{act.actorName}</span> (
                        {act.actorRole || 'System'})
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-xs text-muted-foreground">
                No recent activity records available.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal: Create Task */}
      {isCreateTaskOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-card p-6 shadow-xl border">
            <h3 className="text-lg font-bold">Create Operational Task</h3>
            <form onSubmit={handleCreateTask} className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-medium">Task Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Follow up on Grade 5 Attendance"
                  value={taskForm.title}
                  onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                  className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-medium">Description</label>
                <textarea
                  placeholder="Operational details and instructions..."
                  value={taskForm.description}
                  onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                  className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium">Category</label>
                  <select
                    value={taskForm.category}
                    onChange={(e) => setTaskForm({ ...taskForm, category: e.target.value })}
                    className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm"
                  >
                    <option value="attendance">Attendance</option>
                    <option value="fees">Fees & Finance</option>
                    <option value="academic">Academic</option>
                    <option value="administrative">Administrative</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="general">General</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium">Priority</label>
                  <select
                    value={taskForm.priority}
                    onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}
                    className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium">Assignee User ID (24-hex) *</label>
                <input
                  type="text"
                  required
                  placeholder="Target User ObjectId"
                  value={taskForm.assignedTo}
                  onChange={(e) => setTaskForm({ ...taskForm, assignedTo: e.target.value })}
                  className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-medium">Due Date</label>
                <input
                  type="date"
                  value={taskForm.dueDate}
                  onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })}
                  className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm"
                />
              </div>

              <div className="mt-5 flex justify-end gap-2">
                <Button variant="outline" size="sm" type="button" onClick={() => setIsCreateTaskOpen(false)}>
                  Cancel
                </Button>
                <Button variant="default" size="sm" type="submit">
                  Save & Assign Task
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Update Task Status */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-card p-6 shadow-xl border">
            <h3 className="text-lg font-bold">Update Task Status</h3>
            <p className="text-xs text-muted-foreground mt-1">"{selectedTask.title}"</p>
            <form onSubmit={handleUpdateTaskStatus} className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-medium">New Status</label>
                <select
                  value={updateStatusVal}
                  onChange={(e) => setUpdateStatusVal(e.target.value)}
                  className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm"
                >
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium">Completion Notes / Action Summary</label>
                <textarea
                  placeholder="Describe resolution notes or follow-up summary..."
                  value={completionNotesVal}
                  onChange={(e) => setCompletionNotesVal(e.target.value)}
                  className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm"
                  rows={3}
                />
              </div>

              <div className="mt-5 flex justify-end gap-2">
                <Button variant="outline" size="sm" type="button" onClick={() => setSelectedTask(null)}>
                  Cancel
                </Button>
                <Button variant="default" size="sm" type="submit">
                  Save Changes
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Review Approval */}
      {selectedApproval && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-card p-6 shadow-xl border">
            <h3 className="text-lg font-bold">Review Administrative Request</h3>
            <div className="mt-2 rounded-lg bg-muted/40 p-3 text-xs space-y-1">
              <div>
                <span className="font-semibold">Title:</span> {selectedApproval.title}
              </div>
              <div>
                <span className="font-semibold">Type:</span> {selectedApproval.type.replace(/_/g, ' ')}
              </div>
              <div>
                <span className="font-semibold">Requested By:</span> {selectedApproval.requestedBy?.name || 'Staff User'}
              </div>
              <div>
                <span className="font-semibold">Reason:</span> "{selectedApproval.reason}"
              </div>
            </div>

            <form onSubmit={handleReviewApproval} className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-medium">Decision</label>
                <div className="mt-2 flex gap-3">
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
                    <input
                      type="radio"
                      name="decision"
                      checked={reviewAction === 'approved'}
                      onChange={() => setReviewAction('approved')}
                    />
                    <Check className="h-4 w-4" /> Approve
                  </label>
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-rose-600">
                    <input
                      type="radio"
                      name="decision"
                      checked={reviewAction === 'rejected'}
                      onChange={() => setReviewAction('rejected')}
                    />
                    <X className="h-4 w-4" /> Reject
                  </label>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium">
                  Review Notes {reviewAction === 'rejected' && <span className="text-rose-600">*</span>}
                </label>
                <textarea
                  placeholder={
                    reviewAction === 'rejected'
                      ? 'Mandatory: explain the reason for rejection...'
                      : 'Optional review comments...'
                  }
                  value={reviewNotesVal}
                  onChange={(e) => setReviewNotesVal(e.target.value)}
                  className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm"
                  rows={3}
                  required={reviewAction === 'rejected'}
                />
              </div>

              <div className="mt-5 flex justify-end gap-2">
                <Button variant="outline" size="sm" type="button" onClick={() => setSelectedApproval(null)}>
                  Cancel
                </Button>
                <Button
                  variant={reviewAction === 'approved' ? 'default' : 'destructive'}
                  size="sm"
                  type="submit"
                >
                  Submit Decision
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Create Approval Request */}
      {isCreateApprovalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-card p-6 shadow-xl border">
            <h3 className="text-lg font-bold">Request Administrative Approval</h3>
            <form onSubmit={handleCreateApproval} className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-medium">Approval Type *</label>
                <select
                  value={approvalForm.type}
                  onChange={(e) => setApprovalForm({ ...approvalForm, type: e.target.value })}
                  className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm"
                >
                  <option value="general_request">General Request</option>
                  <option value="staff_activation">Staff Account Activation</option>
                  <option value="student_record_correction">Student Record Correction</option>
                  <option value="fee_concession">Fee Concession Adjustment</option>
                  <option value="exam_mark_correction">Exam Mark Correction</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium">Request Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Concession adjustment for student #1029"
                  value={approvalForm.title}
                  onChange={(e) => setApprovalForm({ ...approvalForm, title: e.target.value })}
                  className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-medium">Justification / Reason *</label>
                <textarea
                  required
                  placeholder="Provide detailed justification for administrative review..."
                  value={approvalForm.reason}
                  onChange={(e) => setApprovalForm({ ...approvalForm, reason: e.target.value })}
                  className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm"
                  rows={3}
                />
              </div>

              <div>
                <label className="text-xs font-medium">Priority</label>
                <select
                  value={approvalForm.priority}
                  onChange={(e) => setApprovalForm({ ...approvalForm, priority: e.target.value })}
                  className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              <div className="mt-5 flex justify-end gap-2">
                <Button variant="outline" size="sm" type="button" onClick={() => setIsCreateApprovalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="default" size="sm" type="submit">
                  Submit for Approval
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
