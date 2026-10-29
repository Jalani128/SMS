import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { UserRole } from '../../types/auth';
import { ChevronDown, Shield, GraduationCap, Users, HeartHandshake, Check } from 'lucide-react';

export const RoleSwitcher: React.FC = () => {
  const { activeRole, switchRole } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const rolesConfig: { role: UserRole; label: string; icon: any; color: string; route: string }[] = [
    {
      role: 'admin',
      label: 'Admin View',
      icon: Shield,
      color: 'text-blue-500 bg-blue-50 dark:bg-blue-950/40 border-blue-200',
      route: '/admin',
    },
    {
      role: 'teacher',
      label: 'Teacher View',
      icon: Users,
      color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200',
      route: '/teacher',
    },
    {
      role: 'student',
      label: 'Student View',
      icon: GraduationCap,
      color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/40 border-amber-200',
      route: '/student',
    },
    {
      role: 'parent',
      label: 'Parent View',
      icon: HeartHandshake,
      color: 'text-purple-500 bg-purple-50 dark:bg-purple-950/40 border-purple-200',
      route: '/parent',
    },
  ];

  const currentConfig = rolesConfig.find((r) => r.role === activeRole) || rolesConfig[0];
  const CurrentIcon = currentConfig.icon;

  const handleSelectRole = (role: UserRole, route: string) => {
    switchRole(role);
    navigate(route);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border/80 bg-card hover:bg-muted/50 transition-colors text-xs font-medium text-foreground cursor-pointer"
        title="Switch active role preview"
      >
        <span className="flex items-center gap-1.5">
          <CurrentIcon className="h-3.5 w-3.5 text-primary" />
          <span className="hidden sm:inline font-semibold">{currentConfig.label}</span>
          <span className="sm:hidden font-semibold uppercase">{activeRole}</span>
        </span>
        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 rounded-xl border bg-card p-1.5 shadow-xl z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="px-2 py-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Switch Dashboard Role
          </div>
          <div className="space-y-0.5">
            {rolesConfig.map((item) => {
              const Icon = item.icon;
              const isSelected = activeRole === item.role;
              return (
                <button
                  key={item.role}
                  onClick={() => handleSelectRole(item.role, item.route)}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-primary/10 text-primary font-semibold'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </div>
                  {isSelected && <Check className="h-3.5 w-3.5" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
