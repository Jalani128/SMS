import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, Clock, Settings, ExternalLink } from 'lucide-react';
import { notificationService } from '../../services/notification.service';
import { socketService } from '../../services/socket.service';
import { NotificationItem } from '../../types/notification';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { useAuth } from '../../hooks/useAuth';

export const NotificationArea: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { activeRole } = useAuth();

  // Load latest notifications from backend API
  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const [listRes, count] = await Promise.all([
        notificationService.getNotifications({ limit: 15 }),
        notificationService.getUnreadCount(),
      ]);
      setNotifications(listRes.notifications);
      setUnreadCount(count);
    } catch (err) {
      console.warn('[NotificationArea] Failed to fetch notifications from API:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();

    // Setup real-time Socket.IO listeners
    const socket = socketService.connect();

    const handleNewNotification = (notif: NotificationItem) => {
      setNotifications((prev) => {
        // Prevent duplicate addition
        const exists = prev.some((n) => (n._id || n.id) === (notif._id || notif.id));
        if (exists) return prev;
        return [notif, ...prev];
      });
      setUnreadCount((c) => c + 1);
    };

    const handleNotificationRead = (data: { notificationId: string }) => {
      setNotifications((prev) =>
        prev.map((n) =>
          (n._id || n.id) === data.notificationId ? { ...n, isRead: true } : n
        )
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    };

    const handleNotificationReadAll = () => {
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    };

    socket.on('notification:new', handleNewNotification);
    socket.on('notification:read', handleNotificationRead);
    socket.on('notification:read_all', handleNotificationReadAll);

    return () => {
      socket.off('notification:new', handleNewNotification);
      socket.off('notification:read', handleNotificationRead);
      socket.off('notification:read_all', handleNotificationReadAll);
    };
  }, [fetchNotifications]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.warn('[NotificationArea] Failed to mark all as read:', err);
    }
  };

  const handleItemClick = async (item: NotificationItem) => {
    if (!item.isRead) {
      try {
        await notificationService.markAsRead(item._id || item.id || '');
        setNotifications((prev) =>
          prev.map((n) =>
            (n._id || n.id) === (item._id || item.id) ? { ...n, isRead: true } : n
          )
        );
        setUnreadCount((c) => Math.max(0, c - 1));
      } catch (err) {
        console.warn('[NotificationArea] Failed to mark notification read:', err);
      }
    }

    if (item.actionUrl) {
      setIsOpen(false);
      const rolePrefix = `/${activeRole}`;
      const targetUrl = item.actionUrl.startsWith('/')
        ? `${rolePrefix}${item.actionUrl}`
        : `${rolePrefix}/${item.actionUrl}`;
      navigate(targetUrl);
    }
  };

  const getCategoryBadgeVariant = (cat: string) => {
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

  const formatRelativeTime = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;
      return date.toLocaleDateString();
    } catch {
      return 'Recently';
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-border/70 bg-card text-muted-foreground hover:bg-muted/70 hover:text-foreground transition-all focus:outline-none cursor-pointer"
        aria-label="View notifications"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl border bg-card p-0 shadow-xl z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between border-b p-4">
            <div className="flex items-center gap-2">
              <h4 className="font-semibold text-sm">Notifications</h4>
              {unreadCount > 0 && (
                <Badge variant="default" className="text-[10px] h-5 px-1.5">
                  {unreadCount} New
                </Badge>
              )}
            </div>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarkAllAsRead}
                className="text-xs h-7 px-2 text-muted-foreground hover:text-foreground gap-1"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Mark all read
              </Button>
            )}
          </div>

          <div className="max-h-[360px] overflow-y-auto divide-y divide-border/50">
            {loading && notifications.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground animate-pulse">
                Loading notifications...
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                No notifications right now
              </div>
            ) : (
              notifications.map((item) => {
                const id = item._id || item.id || '';
                return (
                  <div
                    key={id}
                    onClick={() => handleItemClick(item)}
                    className={`p-3.5 hover:bg-muted/40 transition-colors flex flex-col gap-1 text-left cursor-pointer ${
                      !item.isRead ? 'bg-primary/5' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {!item.isRead && (
                          <span className="h-2 w-2 rounded-full bg-primary shrink-0" />
                        )}
                        <span className="font-medium text-xs text-foreground truncate">
                          {item.title}
                        </span>
                      </div>
                      <Badge
                        variant={getCategoryBadgeVariant(item.category)}
                        className="text-[9px] uppercase tracking-wider shrink-0"
                      >
                        {item.category}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                      {item.content}
                    </p>
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground/70 mt-1">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>{formatRelativeTime(item.createdAt)}</span>
                      </div>
                      {item.actionUrl && (
                        <span className="flex items-center gap-0.5 text-primary hover:underline">
                          Open <ExternalLink className="h-2.5 w-2.5" />
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="border-t p-2 flex items-center justify-between bg-muted/20 px-3">
            <span className="text-[11px] text-muted-foreground">
              Real-time alerts via Socket.IO
            </span>
            <button
              onClick={() => {
                setIsOpen(false);
                navigate(`/${activeRole}/settings`);
              }}
              className="text-[11px] text-primary hover:underline flex items-center gap-1 font-medium"
            >
              <Settings className="h-3 w-3" /> Preferences
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
