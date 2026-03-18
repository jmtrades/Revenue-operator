'use client';

import { useState, useEffect } from 'react';
import { Calendar, PhoneForwarded, CheckCircle2, Clock } from 'lucide-react';

interface ActivityStats {
  callsToday: number;
  followUpsSent: number;
  appointmentsBooked: number;
  nextAppointment: string | null;
}

const TodaysActivity = () => {
  const [stats, setStats] = useState<ActivityStats>({
    callsToday: 0,
    followUpsSent: 0,
    appointmentsBooked: 0,
    nextAppointment: null,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Placeholder: In production, this would query Supabase
    setLoading(false);
  }, []);

  const hasData = stats.callsToday > 0 || stats.followUpsSent > 0 || stats.appointmentsBooked > 0;

  const activityItems = [
    {
      label: 'Calls today',
      value: stats.callsToday,
      icon: PhoneForwarded,
      color: 'text-blue-600',
    },
    {
      label: 'Follow-ups sent',
      value: stats.followUpsSent,
      icon: Calendar,
      color: 'text-purple-600',
    },
    {
      label: 'Appointments booked',
      value: stats.appointmentsBooked,
      icon: CheckCircle2,
      color: 'text-green-600',
    },
    {
      label: 'Next appointment',
      value: stats.nextAppointment || '—',
      icon: Clock,
      color: 'text-[#0D6E6E]',
    },
  ];

  return (
    <div className="bg-white rounded-lg border border-[#E5E5E0] p-6">
      <h2 className="text-lg font-semibold text-[#1A1A1A] mb-6">Today&apos;s Activity</h2>

      {!hasData && !stats.nextAppointment ? (
        <div className="text-center py-8">
          <p className="text-[#4A4A4A] text-sm mb-2">No activity yet today.</p>
          <p className="text-[#4A4A4A] text-sm">Start taking calls to see your activity here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-6">
          {activityItems.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div key={idx} className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <Icon className={`w-4 h-4 ${item.color}`} />
                  <p className="text-sm text-[#4A4A4A]">{item.label}</p>
                </div>
                <p className="text-2xl font-bold text-[#1A1A1A]">{item.value}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default TodaysActivity;
