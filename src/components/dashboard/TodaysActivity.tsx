'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, Clock, Calendar, PhoneForwarded } from 'lucide-react';
import { apiFetch } from '@/lib/api';

interface ActivityStats {
  callsToday: number;
  followUpsSent: number;
  appointmentsBooked: number;
  nextAppointment: string | null;
}

interface DashboardSummary {
  calls_answered: number;
  follow_ups_sent: number;
  appointments_booked: number;
}

interface TodaysActivityProps {
  workspaceId: string;
}

export const TodaysActivity = ({ workspaceId }: TodaysActivityProps) => {
  const [stats, setStats] = useState<ActivityStats>({
    callsToday: 0,
    followUpsSent: 0,
    appointmentsBooked: 0,
    nextAppointment: null,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const data = await apiFetch<DashboardSummary>(
          `/api/dashboard/summary?workspace_id=${encodeURIComponent(workspaceId)}`,
          { credentials: 'include' }
        );

        setStats({
          callsToday: data.calls_answered || 0,
          followUpsSent: data.follow_ups_sent || 0,
          appointmentsBooked: data.appointments_booked || 0,
          nextAppointment: null, // No API for this yet
        });
      } catch (error) {
        console.error('Failed to fetch activity stats:', error);
        // Keep default empty state on error
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [workspaceId]);

  const hasData = stats.callsToday > 0 || stats.followUpsSent > 0 || stats.appointmentsBooked > 0;

  const activityItems = [
    {
      label: 'Calls today',
      value: stats.callsToday,
      icon: PhoneForwarded,
      color: 'text-[var(--accent-primary)]',
    },
    {
      label: 'Follow-ups sent',
      value: stats.followUpsSent,
      icon: Calendar,
      color: 'text-[var(--text-tertiary)]',
    },
    {
      label: 'Appointments booked',
      value: stats.appointmentsBooked,
      icon: CheckCircle2,
      color: 'text-emerald-400',
    },
    {
      label: 'Next appointment',
      value: stats.nextAppointment || '—',
      icon: Clock,
      color: 'text-[var(--text-secondary)]',
    },
  ];

  if (loading) {
    return (
      <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-default)] p-6">
        <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-6">Today&apos;s Activity</h2>
        <div className="grid grid-cols-2 gap-6">
          {[...Array(4)].map((_, idx) => (
            <div key={idx} className="flex flex-col gap-2">
              <div className="h-4 w-20 bg-[var(--bg-surface)] rounded skeleton-shimmer" />
              <div className="h-8 w-12 bg-[var(--bg-surface)] rounded skeleton-shimmer" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-default)] p-6">
      <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-6">Today&apos;s Activity</h2>

      {!hasData && !stats.nextAppointment ? (
        <div className="text-center py-8">
          <p className="text-[var(--text-secondary)] text-sm mb-2">No activity yet today.</p>
          <p className="text-[var(--text-secondary)] text-sm">Start taking calls to see your activity here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-6">
          {activityItems.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div key={idx} className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <Icon className={`w-4 h-4 ${item.color}`} />
                  <p className="text-sm text-[var(--text-secondary)]">{item.label}</p>
                </div>
                <p className="text-2xl font-bold text-[var(--text-primary)]">{item.value}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
