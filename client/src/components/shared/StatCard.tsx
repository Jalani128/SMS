import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '../ui/Card';
import { Skeleton } from '../ui/Skeleton';
import { Badge } from '../ui/Badge';
import {
  Users,
  GraduationCap,
  DollarSign,
  CalendarCheck,
  BookOpen,
  HeartHandshake,
  CreditCard,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  LucideIcon,
  HelpCircle,
} from 'lucide-react';

export interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  isPositive?: boolean;
  description?: string;
  iconName?: 'users' | 'graduation-cap' | 'dollar-sign' | 'calendar-check' | 'book-open' | 'heart-handshake' | 'credit-card' | 'alert-circle';
  customIcon?: LucideIcon;
  isLoading?: boolean;
  isEmpty?: boolean;
  emptyMessage?: string;
  href?: string;
  isDevMock?: boolean;
  badge?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  change,
  isPositive = true,
  description,
  iconName = 'users',
  customIcon,
  isLoading = false,
  isEmpty = false,
  emptyMessage = 'No data available',
  href,
  isDevMock = false,
  badge,
}) => {
  const iconMap: Record<string, LucideIcon> = {
    users: Users,
    'graduation-cap': GraduationCap,
    'dollar-sign': DollarSign,
    'calendar-check': CalendarCheck,
    'book-open': BookOpen,
    'heart-handshake': HeartHandshake,
    'credit-card': CreditCard,
    'alert-circle': AlertCircle,
  };

  const IconComponent = customIcon || iconMap[iconName] || Users;

  if (isLoading) {
    return (
      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-9 w-9 rounded-lg" />
        </div>
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-3 w-40" />
      </Card>
    );
  }

  const content = (
    <Card className={`h-full transition-all duration-200 ${href ? 'hover:shadow-md hover:border-primary/50 group cursor-pointer' : ''}`}>
      <CardContent className="p-6 flex flex-col justify-between h-full">
        <div>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 overflow-hidden">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground truncate">
                {title}
              </p>
              {isDevMock && (
                <Badge variant="outline" className="text-[9px] py-0 px-1 font-mono text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-800 shrink-0">
                  Dev Mock
                </Badge>
              )}
              {badge && (
                <Badge variant="secondary" className="text-[9px] py-0 px-1 shrink-0">
                  {badge}
                </Badge>
              )}
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0 transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
              <IconComponent className="h-5 w-5" />
            </div>
          </div>

          <div className="mt-3">
            {isEmpty ? (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground py-1">
                <HelpCircle className="h-3.5 w-3.5" />
                <span>{emptyMessage}</span>
              </div>
            ) : (
              <h3 className="text-2xl font-bold tracking-tight text-foreground truncate">{value}</h3>
            )}
          </div>
        </div>

        <div className="mt-3 pt-2 border-t border-border/40 flex items-center justify-between text-xs">
          {(change || description) && (
            <div className="flex items-center gap-1.5 flex-wrap">
              {change && (
                <span
                  className={`inline-flex items-center font-semibold text-[11px] px-1.5 py-0.5 rounded ${
                    isPositive
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                      : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400'
                  }`}
                >
                  {isPositive ? (
                    <ArrowUpRight className="h-3 w-3 mr-0.5 shrink-0" />
                  ) : (
                    <ArrowDownRight className="h-3 w-3 mr-0.5 shrink-0" />
                  )}
                  {change}
                </span>
              )}
              {description && <span className="text-[11px] text-muted-foreground truncate">{description}</span>}
            </div>
          )}

          {href && (
            <span className="text-[11px] font-medium text-primary flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity ml-auto">
              View <ArrowUpRight className="h-3 w-3" />
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );

  if (href) {
    return (
      <Link to={href} className="block h-full text-inherit no-underline focus:outline-none focus:ring-2 focus:ring-primary rounded-xl">
        {content}
      </Link>
    );
  }

  return content;
};
