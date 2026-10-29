import { LucideIcon } from 'lucide-react';
import { UserRole } from './auth';

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  badge?: string | number;
  badgeVariant?: 'default' | 'secondary' | 'info' | 'success' | 'warning' | 'destructive' | 'outline';
  roles: UserRole[];
  permission?: string;
  description?: string;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}
