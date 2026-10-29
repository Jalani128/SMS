import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/shared/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import {
  Bell,
  CheckCheck,
  Clock,
  ExternalLink,
  Filter,
  RefreshCw,
  Mail,
  ShieldAlert,
  Settings,
} from 'lucide-react';
import { notificationService } from '../services/notification.service';
import { NotificationItem, NotificationCategory } from '../types/notification';
import { useAuth } from '../hooks/useAuth';

export const NotificationsPage: React.FC = () => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [readFilter, setReadFilter] = useState<string>('all');
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const navigate = useNavigate();
  const { activeRole } = useAuth();

  const loadNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const categoryParam =
        selectedCategory !== 'all' ? (selectedCategory as NotificationCategory) : undefined;
      const isReadParam =
        readFilter === 'unread' ? false : readFilter === 'read' ? true : undefined;

      const [listRes, count] = await Promise.all([
        notificationService.getNotifications({
          page,
          limit: 15,
          category: categoryParam,
          isRead: isReadParam,
        }),
        notificationService.getUnreadCount(),
      ]);

      setNotifications(listRes.notifications);
      setTotalPages(listRes.pagination.pages || 1);
      setUnreadCount(count);
    } catch (err) {
      console.warn('Failed to load notifications list:', err);
    } finally {
      setLoading(false);
    }
  }, [page, selectedCategory, readFilter]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const handleMarkAsRead = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      await notificationService.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => ((n._id || n.id) === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (err) {
      console.error('Failed to mark read:', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  const handleOpenAction = (actionUrl?: string) => {
    if (!actionUrl) return;
    const rolePrefix = `/${activeRole}`;
    const targetUrl = actionUrl.startsWith('/')
      ? `${rolePrefix}${actionUrl}`
      : `${rolePrefix}/${actionUrl}`;
    navigate(targetUrl);
  };

  const getCategoryVariant = (cat: string) => {
    switch (cat) {
      case 'academic':
        return 'info';
      case 'finance':
        return 'success';
      case 'attendance':
      case 'exams':
        return 'destructive';
      case 'homework':
        return 'warning';
      default:
        return 'neutral';
    }
  };

  const categories = [
    { label: 'All Categories', value: 'all' },
    { label: 'Attendance', value: 'attendance' },
    { label: 'Tuition & Fees', value: 'finance' },
    { label: 'Homework', value: 'homework' },
    { label: 'Examinations', value: 'exams' },
    { label: 'Announcements', value: 'announcement' },
    { label: 'System', value: 'system' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notification Center & History"
        description="Comprehensive log of institutional communications, academic alerts, and transactional messages"
        badge={
          <Badge variant="outline" className="gap-1">
            <Bell className="h-3 w-3" />
            {unreadCount} Unread
          </Badge>
        }
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/${activeRole}/settings`)}
              className="text-xs h-8 gap-1.5"
            >
              <Settings className="h-3.5 w-3.5" /> Preferences
            </Button>
            {unreadCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleMarkAllRead}
                className="text-xs h-8 gap-1.5"
              >
                <CheckCheck className="h-3.5 w-3.5" /> Mark All Read
              </Button>
            )}
            <Button
              variant="default"
              size="sm"
              onClick={loadNotifications}
              disabled={loading}
              className="text-xs h-8 gap-1.5"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </Button>
          </div>
        }
      />

      {/* Filter Toolbar */}
      <Card>
        <CardContent className="p-3.5">
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            {/* Category Filter Pills */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-semibold text-muted-foreground mr-1 flex items-center gap-1">
                <Filter className="h-3.5 w-3.5" /> Filter:
              </span>
              {categories.map((c) => (
                <button
                  key={c.value}
                  onClick={() => {
                    setSelectedCategory(c.value);
                    setPage(1);
                  }}
                  className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer text-xs font-medium ${
                    selectedCategory === c.value
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>

            {/* Read/Unread Filter */}
            <div className="flex items-center gap-1.5">
              {['all', 'unread', 'read'].map((rf) => (
                <button
                  key={rf}
                  onClick={() => {
                    setReadFilter(rf);
                    setPage(1);
                  }}
                  className={`px-2 py-0.5 rounded text-xs capitalize ${
                    readFilter === rf
                      ? 'bg-foreground text-background font-semibold'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {rf}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notifications History List */}
      <Card>
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-sm font-semibold flex items-center justify-between">
            <span>Institutional Activity Stream</span>
            <span className="text-xs font-normal text-muted-foreground">
              Page {page} of {totalPages}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-16 text-center text-xs text-muted-foreground animate-pulse">
              Retrieving notification history...
            </div>
          ) : notifications.length === 0 ? (
            <div className="py-16 text-center space-y-2">
              <Bell className="h-8 w-8 text-muted-foreground/40 mx-auto" />
              <p className="text-sm font-semibold text-foreground">No notifications found</p>
              <p className="text-xs text-muted-foreground">
                There are no activity logs matching your selected filter parameters.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {notifications.map((item) => {
                const id = item._id || item.id || '';
                return (
                  <div
                    key={id}
                    className={`p-4 hover:bg-muted/30 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                      !item.isRead ? 'bg-primary/[0.03]' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className="mt-1">
                        {!item.isRead ? (
                          <span className="flex h-2.5 w-2.5 rounded-full bg-primary" />
                        ) : (
                          <span className="flex h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
                        )}
                      </div>

                      <div className="space-y-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-sm text-foreground">
                            {item.title}
                          </span>
                          <Badge
                            variant={getCategoryVariant(item.category)}
                            className="text-[10px] uppercase font-semibold"
                          >
                            {item.category}
                          </Badge>
                          {item.priority === 'urgent' || item.priority === 'high' ? (
                            <Badge variant="destructive" className="text-[10px] gap-0.5">
                              <ShieldAlert className="h-3 w-3" /> High Priority
                            </Badge>
                          ) : null}
                          {item.channels && item.channels.includes('email') && (
                            <span className="flex items-center gap-1 text-[10px] text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded">
                              <Mail className="h-3 w-3" /> Email Dispatched
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {item.content}
                        </p>

                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground/80 pt-0.5">
                          <Clock className="h-3 w-3" />
                          <span>{new Date(item.createdAt).toLocaleString()}</span>
                          {item.readAt && (
                            <span className="text-muted-foreground/60">
                              (Read {new Date(item.readAt).toLocaleTimeString()})
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      {!item.isRead && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e: React.MouseEvent) => handleMarkAsRead(id, e)}
                          className="text-xs h-7 px-2 text-muted-foreground hover:text-foreground gap-1"
                        >
                          <CheckCheck className="h-3.5 w-3.5" /> Mark read
                        </Button>
                      )}
                      {item.actionUrl && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenAction(item.actionUrl)}
                          className="text-xs h-7 px-2.5 gap-1 text-primary"
                        >
                          Open <ExternalLink className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Showing Page {page} of {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="text-xs h-7"
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="text-xs h-7"
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
