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
          nextAppointment: null,
        });
      } catch (error) {
        console.error('Failed to fetch activity stats:', error);
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
      color: 'text-[var(--text-secondary)]',
    },
    {
      label: 'Appointments',
      value: stats.appointmentsBooked,
      icon: CheckCircle2,
      color: 'text-emerald-500',
    },
    {
      label: 'Next appointment',
      value: stats.nextAppointment || '\u2014',
      icon: Clock,
      color: 'text-[var(--text-secondary)]',
    },
  ];

  if (loading) {
    return (
      <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-5">
        <div className="h-4 w-28 bg-[var(--bg-hover)] rounded skeleton-shimmer mb-4" />
        <div className="grid grid-cols-2 gap-4">
          {[...Array(4)].map((_, idx) => (
            <div key={idx} className="space-y-2">
              <div className="h-3 w-20 bg-[var(--bg-hover)] rounded skeleton-shimmer" />
              <div className="h-7 w-12 bg-[var(--bg-hover)] rounded skeleton-shimmer" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-5">
      <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Today&apos;s Activity</h2>

      {!hasData && !stats.nextAppointment ? (
        <div className="text-center py-6">
          <p className="text-sm text-[var(--text-secondary)]">No activity yet today.</p>
          <p className="text-xs text-[var(--text-tertiary)] mt-1">
            Start taking calls to see your activity here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {activityItems.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div key={idx}>
                <div className="flex items-center gap-1.5 mb-1">
                  <Icon className={`w-3.5 h-3.5 ${item.color}`} />
                  <p className="text-xs text-[var(--text-tertiary)]">{item.label}</p>
                </div>
                <p className="text-xl font-semibold text-[var(--text-primary)] tabular-nums">
                  {item.value}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default TodaysActivity;
