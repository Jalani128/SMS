import React from 'react';
import { Menu, Search } from 'lucide-react';
import { Breadcrumbs } from './Breadcrumbs';
import { NotificationArea } from './NotificationArea';
import { RoleSwitcher } from './RoleSwitcher';
import { ProfileMenu } from './ProfileMenu';
import { useAuth } from '../../hooks/useAuth';

export interface HeaderProps {
  onMobileMenuToggle: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onMobileMenuToggle }) => {
  const { school } = useAuth();

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b bg-card/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-card/75 sm:px-6">
      {/* Left: Mobile toggle & Breadcrumbs */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMobileMenuToggle}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-border/80 lg:hidden text-muted-foreground hover:bg-muted/70 hover:text-foreground transition-colors cursor-pointer"
          aria-label="Toggle navigation menu"
        >
          <Menu className="h-4 w-4" />
        </button>

        <div className="hidden sm:flex flex-col">
          <Breadcrumbs />
        </div>
      </div>

      {/* Middle: Quick search bar */}
      <div className="hidden md:flex items-center flex-1 max-w-md mx-6">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="Search students, faculty, records, fees..."
            className="w-full rounded-lg border border-input bg-background/60 pl-9 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:bg-background transition-all"
          />
        </div>
      </div>

      {/* Right: School Indicator, Role Switcher, Notifications, Profile */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted/60 text-[11px] text-muted-foreground border">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-medium text-foreground">
            {school?.academicYear || '2026 - 2027'} ({school?.currency || 'USD'})
          </span>
        </div>

        {/* Quick Role Switcher for previewing all 4 dashboards */}
        <RoleSwitcher />

        {/* Real-time notification area */}
        <NotificationArea />

        {/* User profile dropdown */}
        <ProfileMenu />
      </div>
    </header>
  );
};
