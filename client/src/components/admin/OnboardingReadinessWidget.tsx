import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { onboardingService, OnboardingStatusResponse } from '../../services/onboarding.service';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import {
  Compass,
  CheckCircle2,
  Clock,
  ArrowRight,
  UploadCloud,
  School,
  Calendar,
  Layers,
  Users,
  GraduationCap,
  Sparkles,
} from 'lucide-react';

export const OnboardingReadinessWidget: React.FC = () => {
  const [statusData, setStatusData] = useState<OnboardingStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    onboardingService
      .getStatus()
      .then((data) => {
        if (isMounted) setStatusData(data);
      })
      .catch(() => {
        // Fallback for offline / dev mock
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="bg-card border border-border/80 rounded-xl p-5 shadow-sm animate-pulse">
        <div className="h-5 bg-muted rounded w-1/3 mb-3"></div>
        <div className="h-2 bg-muted rounded w-full mb-4"></div>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-10 bg-muted rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  const onboarding = statusData?.onboarding;
  const checklist = statusData?.checklist || {
    profile: false,
    academicSession: false,
    academicStructure: false,
    staffSetup: false,
    studentSetup: false,
    enrollmentSetup: false,
  };
  const percentage = statusData?.readinessPercentage ?? 0;
  const isCompleted = onboarding?.status === 'completed';

  const milestones = [
    { label: 'Profile', done: checklist.profile, icon: School },
    { label: 'Session', done: checklist.academicSession, icon: Calendar },
    { label: 'Structure', done: checklist.academicStructure, icon: Layers },
    { label: 'Staff', done: checklist.staffSetup, icon: Users },
    { label: 'Students', done: checklist.studentSetup, icon: GraduationCap },
    { label: 'Enrollments', done: checklist.enrollmentSetup, icon: CheckCircle2 },
  ];

  return (
    <div
      className={`border rounded-xl p-5 mb-6 shadow-sm transition-all ${
        isCompleted
          ? 'bg-gradient-to-r from-emerald-500/10 via-card to-card border-emerald-500/30'
          : 'bg-gradient-to-r from-primary/10 via-card to-card border-primary/30'
      }`}
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <div
            className={`p-2.5 rounded-lg ${
              isCompleted
                ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                : 'bg-primary/20 text-primary'
            }`}
          >
            {isCompleted ? <Sparkles className="w-5 h-5" /> : <Compass className="w-5 h-5" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-base text-foreground">
                School Setup & Onboarding Readiness
              </h3>
              <Badge
                variant={
                  isCompleted ? 'default' : onboarding?.status === 'in_progress' ? 'secondary' : 'outline'
                }
                className={
                  isCompleted
                    ? 'bg-emerald-600 text-white'
                    : onboarding?.status === 'in_progress'
                    ? 'bg-amber-500/20 text-amber-700 dark:text-amber-400'
                    : ''
                }
              >
                {isCompleted ? 'Setup Complete' : onboarding?.status === 'in_progress' ? 'In Progress' : 'Not Started'}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isCompleted
                ? 'All mandatory institutional milestones verified against live records.'
                : 'Complete the 6 foundational milestones to launch your school operations.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Link to="/admin/data-import">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              <UploadCloud className="w-3.5 h-3.5" />
              Bulk Data Import
            </Button>
          </Link>
          <Link to="/admin/onboarding">
            <Button
              size="sm"
              className={`gap-1.5 text-xs ${
                isCompleted ? 'bg-secondary text-secondary-foreground hover:bg-secondary/80' : ''
              }`}
            >
              {isCompleted ? 'Review Setup' : 'Resume Onboarding'}
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full mb-3">
        <div className="flex justify-between items-center text-xs mb-1.5">
          <span className="font-medium text-muted-foreground">Setup Readiness</span>
          <span className="font-bold text-foreground">{percentage}% Complete</span>
        </div>
        <div className="w-full bg-muted/80 rounded-full h-2.5 overflow-hidden">
          <div
            className={`h-2.5 rounded-full transition-all duration-500 ${
              isCompleted ? 'bg-emerald-500' : 'bg-primary'
            }`}
            style={{ width: `${Math.max(percentage, 5)}%` }}
          />
        </div>
      </div>

      {/* Milestone Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 pt-2">
        {milestones.map((m, idx) => {
          const Icon = m.icon;
          return (
            <div
              key={idx}
              className={`flex items-center gap-2 p-2 rounded-lg border text-xs transition-colors ${
                m.done
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400 font-medium'
                  : 'bg-muted/40 border-border text-muted-foreground'
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{m.label}</span>
              {m.done ? (
                <CheckCircle2 className="w-3.5 h-3.5 ml-auto text-emerald-600 shrink-0" />
              ) : (
                <Clock className="w-3 h-3 ml-auto text-muted-foreground/60 shrink-0" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
