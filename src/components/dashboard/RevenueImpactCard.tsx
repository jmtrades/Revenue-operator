'use client';

import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

type TimePeriod = 'today' | 'week' | 'month';

interface RevenueStats {
  callsAnswered: number;
  leadsCaptured: number;
  appointmentsBooked: number;
  estimatedValue: number;
  changePercent: number;
}

const RevenueImpactCard = () => {
  const [period, setPeriod] = useState<TimePeriod>('today');
  const [stats, setStats] = useState<RevenueStats>({
    callsAnswered: 0,
    leadsCaptured: 0,
    appointmentsBooked: 0,
    estimatedValue: 0,
    changePercent: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Placeholder: In production, this would query Supabase based on period
    setLoading(false);
  }, [period]);

  const isPositive = stats.changePercent >= 0;
  const TrendIcon = isPositive ? TrendingUp : TrendingDown;
  const trendColor = isPositive ? 'text-green-600' : 'text-red-600';

  const statItems = [
    { label: 'Calls answered', value: stats.callsAnswered },
    { label: 'Leads captured', value: stats.leadsCaptured },
    { label: 'Appointments booked', value: stats.appointmentsBooked },
    { label: 'Est. value', value: `$${stats.estimatedValue.toLocaleString()}` },
  ];

  const hasData = stats.callsAnswered > 0 || stats.leadsCaptured > 0 || stats.appointmentsBooked > 0;

  return (
    <div className="bg-white rounded-lg border border-[#E5E5E0] p-6">
      {/* Header with period selector */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-[#1A1A1A]">Revenue Impact</h2>
        <div className="flex gap-2">
          {(['today', 'week', 'month'] as TimePeriod[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                period === p
                  ? 'bg-[#0D6E6E] text-white'
                  : 'bg-[#FAFAF8] text-[#4A4A4A] hover:bg-[#E5E5E0]'
              }`}
            >
              {p === 'today' ? 'Today' : p === 'week' ? 'This Week' : 'This Month'}
            </button>
          ))}
        </div>
      </div>

      {/* Main content */}
      {!hasData ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-[#4A4A4A] mb-2">Your AI is ready.</p>
          <p className="text-[#4A4A4A]">Call your number to make your first test call.</p>
        </div>
      ) : (
        <>
          {/* Trend line */}
          <div className="flex items-center gap-2 mb-6 pb-4 border-b border-[#E5E5E0]">
            <TrendIcon className={`w-5 h-5 ${trendColor}`} />
            <span className={`text-sm font-medium ${trendColor}`}>
              {isPositive ? '+' : ''}{stats.changePercent}% vs previous period
            </span>
          </div>

          {/* Left border accent and stats grid */}
          <div className="border-l-4 border-[#0D6E6E] pl-4">
            <div className="grid grid-cols-2 gap-6">
              {statItems.map((item, idx) => (
                <div key={idx}>
                  <p className="text-[#4A4A4A] text-sm mb-2">{item.label}</p>
                  <p className="text-3xl font-bold text-[#1A1A1A]">{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default RevenueImpactCard;
