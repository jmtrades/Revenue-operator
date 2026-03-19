'use client';

import { useState } from 'react';
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
  const stats: RevenueStats = {
    callsAnswered: 0,
    leadsCaptured: 0,
    appointmentsBooked: 0,
    estimatedValue: 0,
    changePercent: 0,
  };

  const isPositive = stats.changePercent >= 0;
  const TrendIcon = isPositive ? TrendingUp : TrendingDown;
  const trendColor = isPositive ? 'text-green-400' : 'text-red-400';

  const statItems = [
    { label: 'Calls answered', value: stats.callsAnswered },
    { label: 'Leads captured', value: stats.leadsCaptured },
    { label: 'Appointments booked', value: stats.appointmentsBooked },
    { label: 'Est. value', value: `$${stats.estimatedValue.toLocaleString()}` },
  ];

  const hasData = stats.callsAnswered > 0 || stats.leadsCaptured > 0 || stats.appointmentsBooked > 0;

  return (
    <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-default)] p-6">
      {/* Header with period selector */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-sm font-semibold text-[var(--text-primary)]">Revenue Impact</h2>
        <div className="flex gap-2">
          {(['today', 'week', 'month'] as TimePeriod[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                period === p
                  ? 'bg-white text-black'
                  : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
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
          <p className="text-[var(--text-secondary)] mb-2">Your AI is ready.</p>
          <p className="text-[var(--text-secondary)]">Call your number to make your first test call.</p>
        </div>
      ) : (
        <>
          {/* Trend line */}
          <div className="flex items-center gap-2 mb-6 pb-4 border-b border-[var(--border-default)]">
            <TrendIcon className={`w-5 h-5 ${trendColor}`} />
            <span className={`text-sm font-medium ${trendColor}`}>
              {isPositive ? '+' : ''}{stats.changePercent}% vs previous period
            </span>
          </div>

          {/* Left border accent and stats grid */}
          <div className="border-l-4 border-[var(--border-default)] pl-4">
            <div className="grid grid-cols-2 gap-6">
              {statItems.map((item, idx) => (
                <div key={idx}>
                  <p className="text-[var(--text-secondary)] text-sm mb-2">{item.label}</p>
                  <p className="text-2xl font-bold text-[var(--text-primary)]">{item.value}</p>
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
