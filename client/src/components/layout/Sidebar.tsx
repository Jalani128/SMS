import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import {
  ADMIN_NAV_SECTIONS,
  TEACHER_NAV_SECTIONS,
  STUDENT_NAV_SECTIONS,
  PARENT_NAV_SECTIONS,
} from '../../config/navigation';
import { Badge } from '../ui/Badge';
import {
  ChevronLeft,
  ChevronRight,
  School,
  Sparkles,
} from 'lucide-react';

export interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isMobileOpen: boolean;
  onMobileClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isCollapsed,
  onToggleCollapse,
  isMobileOpen,
  onMobileClose,
}) => {
  const { activeRole, school, schoolName, permissions } = useAuth();
  const location = useLocation();

  // Pick navigation set based on current role
  const getNavSections = () => {
    switch (activeRole) {
      case 'teacher':
        return TEACHER_NAV_SECTIONS;
      case 'student':
        return STUDENT_NAV_SECTIONS;
      case 'parent':
        return PARENT_NAV_SECTIONS;
      case 'admin':
      default:
        return ADMIN_NAV_SECTIONS;
    }
  };

  const navSections = getNavSections();

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={onMobileClose}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 flex flex-col border-r bg-card text-card-foreground transition-all duration-300 ease-in-out ${
          isCollapsed ? 'w-20' : 'w-64'
        } ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* School Branding Header */}
        <div className="flex h-16 items-center justify-between border-b px-4 shrink-0">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold shadow-md shrink-0">
              {school?.logo && school.logo.startsWith('http') ? (
                <img src={school.logo} alt="Logo" className="h-6 w-6 object-contain" />
              ) : (
                <School className="h-5 w-5" />
              )}
            </div>
            {!isCollapsed && (
              <div className="flex flex-col overflow-hidden">
                <span className="font-bold text-sm text-foreground tracking-tight truncate leading-tight">
                  {school?.name || schoolName || 'EduManage Academy'}
                </span>
                <span className="text-[11px] text-muted-foreground truncate">
                  {school?.code || 'SMS-2026'} • Multi-Tenant
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Section Items */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {navSections.map((section, sIdx) => {
            // Filter items by user role permissions for usability (server strictly enforces access)
            const visibleItems = section.items.filter((item) => {
              if (!item.permission || !permissions || permissions.length === 0) return true;
              return permissions.includes('*') || permissions.includes(item.permission);
            });

            if (visibleItems.length === 0) return null;

            return (
              <div key={sIdx} className="space-y-1">
                {!isCollapsed && (
                  <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80 mb-2">
                    {section.title}
                  </div>
                )}
                <div className="space-y-1">
                  {visibleItems.map((item) => {
                    const Icon = item.icon;
                    const isActive =
                      location.pathname === item.href ||
                      (item.href !== `/${activeRole}` && location.pathname.startsWith(item.href));

                    return (
                      <NavLink
                        key={item.href}
                        to={item.href}
                        onClick={() => {
                          if (isMobileOpen) onMobileClose();
                        }}
                        title={isCollapsed ? item.title : undefined}
                        className={`group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150 relative ${
                          isActive
                            ? 'bg-primary text-primary-foreground shadow-sm'
                            : 'text-muted-foreground hover:bg-muted/80 hover:text-foreground'
                        } ${isCollapsed ? 'justify-center px-0' : ''}`}
                      >
                        <Icon
                          className={`h-4 w-4 shrink-0 transition-transform group-hover:scale-105 ${
                            isActive ? 'text-primary-foreground' : 'text-muted-foreground group-hover:text-foreground'
                          }`}
                        />

                        {!isCollapsed && (
                          <div className="flex flex-1 items-center justify-between overflow-hidden">
                            <span className="truncate text-xs font-semibold">{item.title}</span>
                            {item.badge !== undefined && (
                              <Badge
                                variant={item.badgeVariant || (isActive ? 'secondary' : 'default')}
                                className={`ml-auto text-[10px] py-0 px-1.5 h-4 font-bold ${
                                  isActive ? 'bg-primary-foreground/20 text-primary-foreground' : ''
                                }`}
                              >
                                {item.badge}
                              </Badge>
                            )}
                          </div>
                        )}
                      </NavLink>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Area with Phase 4 Badge & Collapse Trigger */}
        <div className="border-t p-3 shrink-0 flex flex-col gap-2 bg-muted/20">
          {!isCollapsed && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-primary/10 text-primary text-xs">
              <Sparkles className="h-4 w-4 shrink-0" />
              <div className="flex flex-col">
                <span className="font-semibold text-[11px] leading-tight">Phase 4 Command Center</span>
                <span className="text-[10px] text-muted-foreground">Admin Analytics & Oversight</span>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <button
              onClick={onToggleCollapse}
              className="hidden lg:flex w-full items-center justify-center p-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer text-xs gap-2"
              title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isCollapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <>
                  <ChevronLeft className="h-4 w-4" />
                  <span>Collapse Menu</span>
                </>
              )}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
