import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Skeleton } from '../ui/Skeleton';
import {
  RecentAdmission,
  RecentFeePayment,
  RecentAnnouncement,
  RecentActivityItem,
} from '../../services/dashboard.service';
import {
  GraduationCap,
  CreditCard,
  Bell,
  Activity,
  ArrowUpRight,
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface RecentActivitySectionsProps {
  admissions?: RecentAdmission[];
  payments?: RecentFeePayment[];
  announcements?: RecentAnnouncement[];
  activities?: RecentActivityItem[];
  isLoading?: boolean;
}

export const RecentActivitySections: React.FC<RecentActivitySectionsProps> = ({
  admissions = [],
  payments = [],
  announcements = [],
  activities = [],
  isLoading = false,
}) => {
  const [activeTab, setActiveTab] = useState<'activities' | 'admissions' | 'payments' | 'announcements'>('activities');

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader className="space-y-2">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-3 w-64" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex justify-between items-center py-2">
              <div className="space-y-1">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-60" />
              </div>
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col justify-between">
      <CardHeader className="pb-3 border-b">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              <CardTitle className="text-base font-semibold">Institutional Activity & Audit Log</CardTitle>
            </div>
            <CardDescription className="text-xs mt-0.5">
              Live updates across admissions, fees, broadcast notices, and system events
            </CardDescription>
          </div>

          {/* Tab Selector Buttons */}
          <div className="flex items-center gap-1 p-1 rounded-lg bg-muted/60 border text-xs overflow-x-auto max-w-full">
            <button
              onClick={() => setActiveTab('activities')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === 'activities'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Activity className="h-3.5 w-3.5" />
              <span>Activities</span>
            </button>

            <button
              onClick={() => setActiveTab('admissions')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === 'admissions'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <GraduationCap className="h-3.5 w-3.5" />
              <span>Admissions</span>
            </button>

            <button
              onClick={() => setActiveTab('payments')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === 'payments'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <CreditCard className="h-3.5 w-3.5" />
              <span>Payments</span>
            </button>

            <button
              onClick={() => setActiveTab('announcements')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === 'announcements'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Bell className="h-3.5 w-3.5" />
              <span>Notices</span>
            </button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0 flex-1 overflow-y-auto max-h-[380px]">
        {/* Tab 1: Live Activity Stream */}
        {activeTab === 'activities' && (
          <div className="divide-y divide-border/60">
            {activities.length === 0 ? (
              <div className="py-12 text-center text-xs text-muted-foreground">
                No system activities recorded for today.
              </div>
            ) : (
              activities.map((item) => (
                <div key={item.id} className="p-4 hover:bg-muted/30 transition-colors flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-semibold text-foreground">{item.title}</p>
                      <Badge variant={item.badgeVariant} className="text-[10px] py-0 px-1.5 font-bold">
                        {item.badgeText}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                  <span className="text-[11px] text-muted-foreground shrink-0 whitespace-nowrap">
                    {item.timestamp}
                  </span>
                </div>
              ))
            )}
          </div>
        )}

        {/* Tab 2: Recent Student Admissions */}
        {activeTab === 'admissions' && (
          <div className="divide-y divide-border/60">
            {admissions.length === 0 ? (
              <div className="py-12 text-center text-xs text-muted-foreground">
                No recent student admissions recorded.
              </div>
            ) : (
              admissions.map((adm) => (
                <div key={adm.id} className="p-4 hover:bg-muted/30 transition-colors flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 flex items-center justify-center font-bold text-xs shrink-0">
                      {adm.studentName.charAt(0)}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-foreground">{adm.studentName}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {adm.admissionNumber} • <span className="font-medium text-foreground">{adm.grade}</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={adm.status === 'active' ? 'success' : 'warning'} className="text-[10px] capitalize">
                      {adm.status}
                    </Badge>
                    <span className="text-[11px] text-muted-foreground whitespace-nowrap">{adm.date}</span>
                    <Link
                      to="/admin/students"
                      className="text-muted-foreground hover:text-primary transition-colors"
                      title="View Student"
                    >
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Tab 3: Recent Fee Payments */}
        {activeTab === 'payments' && (
          <div className="divide-y divide-border/60">
            {payments.length === 0 ? (
              <div className="py-12 text-center text-xs text-muted-foreground">
                No recent tuition or fee transactions recorded.
              </div>
            ) : (
              payments.map((pay) => (
                <div key={pay.id} className="p-4 hover:bg-muted/30 transition-colors flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 flex items-center justify-center font-bold text-xs shrink-0">
                      <CreditCard className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-foreground">{pay.studentName}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {pay.receiptNumber} • {pay.grade} • <span className="text-primary font-medium">{pay.method}</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-foreground">{pay.formattedAmount}</span>
                    <Badge variant="success" className="text-[10px] capitalize">
                      {pay.status}
                    </Badge>
                    <span className="text-[11px] text-muted-foreground whitespace-nowrap">{pay.date}</span>
                    <Link
                      to="/admin/fees"
                      className="text-muted-foreground hover:text-primary transition-colors"
                      title="View Invoices"
                    >
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Tab 4: Recent Announcements */}
        {activeTab === 'announcements' && (
          <div className="divide-y divide-border/60">
            {announcements.length === 0 ? (
              <div className="py-12 text-center text-xs text-muted-foreground">
                No active announcements published.
              </div>
            ) : (
              announcements.map((anc) => (
                <div key={anc.id} className="p-4 hover:bg-muted/30 transition-colors flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-semibold text-foreground">{anc.title}</p>
                      <Badge
                        variant={anc.priority === 'urgent' ? 'destructive' : anc.priority === 'high' ? 'warning' : 'outline'}
                        className="text-[10px] uppercase font-bold"
                      >
                        {anc.priority}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Audience: <strong className="text-foreground">{anc.audience}</strong> • By {anc.author}
                    </p>
                  </div>
                  <span className="text-[11px] text-muted-foreground whitespace-nowrap">{anc.date}</span>
                </div>
              ))
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
