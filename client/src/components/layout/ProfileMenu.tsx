import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Badge } from '../ui/Badge';
import { User, Settings, LogOut, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';

export const ProfileMenu: React.FC = () => {
  const { user, logout, activeRole } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!user) return null;

  const roleBadgeVariants = {
    super_admin: 'info',
    admin: 'info',
    teacher: 'success',
    student: 'warning',
    parent: 'secondary',
  } as const;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2.5 p-1 pl-2 pr-2 rounded-lg hover:bg-muted/60 transition-colors focus:outline-none cursor-pointer"
        aria-label="User profile menu"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-primary font-semibold text-xs border border-primary/20 overflow-hidden">
          {user.avatarUrl ? (
            <img src={user.avatarUrl} alt={user.name} className="h-full w-full object-cover" />
          ) : (
            <User className="h-4 w-4" />
          )}
        </div>
        <div className="hidden md:flex flex-col text-left">
          <span className="text-xs font-semibold text-foreground leading-tight truncate max-w-[120px]">
            {user.name}
          </span>
          <span className="text-[10px] text-muted-foreground capitalize">
            {user.role}
          </span>
        </div>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 rounded-xl border bg-card p-2 shadow-xl z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="p-3 border-b pb-3">
            <p className="text-sm font-semibold text-foreground truncate">{user.name}</p>
            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            <div className="mt-2 flex items-center gap-1.5">
              <Badge variant={roleBadgeVariants[user.role]} className="capitalize text-[10px]">
                {user.role}
              </Badge>
              <span className="text-[10px] text-muted-foreground truncate">
                {user.schoolName}
              </span>
            </div>
          </div>

          <div className="py-1">
            <Link
              to={`/${activeRole}/profile`}
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-foreground rounded-lg hover:bg-muted transition-colors"
            >
              <User className="h-4 w-4 text-muted-foreground" />
              <span>My Profile</span>
            </Link>
            <Link
              to={`/${activeRole}/settings`}
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-foreground rounded-lg hover:bg-muted transition-colors"
            >
              <Settings className="h-4 w-4 text-muted-foreground" />
              <span>Account Settings</span>
            </Link>
            <a
              href="http://localhost:5000/api/v1/health"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between px-3 py-2 text-xs font-medium text-muted-foreground rounded-lg hover:bg-muted hover:text-foreground transition-colors"
            >
              <span className="flex items-center gap-2.5">
                <ExternalLink className="h-4 w-4" />
                API Health Endpoint
              </span>
              <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded">v1</span>
            </a>
          </div>

          <div className="border-t pt-1">
            <button
              onClick={() => {
                logout();
                setIsOpen(false);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-destructive rounded-lg hover:bg-destructive/10 transition-colors cursor-pointer"
            >
              <LogOut className="h-4 w-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
