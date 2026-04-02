'use client';

import { TrendingUp, TrendingDown } from 'lucide-react';

interface RevenueImpactCardProps {
  callsAnswered?: number;
  appointmentsBooked?: number;
  estimatedValueCents?: number;
  trendPercent?: number;
}

export function RevenueImpactCard({
  callsAnswered = 0,
  appointmentsBooked = 0,
  estimatedValueCents = 0,
  trendPercent = 0,
}: RevenueImpactCardProps = {}) {
  const estimatedValue = Math.round(estimatedValueCents / 100);
  const isPositive = trendPercent >= 0;
  const TrendIcon = isPositive ? TrendingUp : TrendingDown;
  const trendColor = isPositive ? 'text-emerald-500' : 'text-red-500';

  const statItems = [
    { label: 'Calls answered', value: callsAnswered.toLocaleString() },
    { label: 'Appointments', value: appointmentsBooked.toLocaleString() },
    { label: 'Est. value', value: `$${estimatedValue.toLocaleString()}` },
  ];

  const hasData = callsAnswered > 0 || appointmentsBooked > 0;

  return (
    <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-[var(--text-primary)]">Revenue Impact</h2>
        {trendPercent !== 0 && hasData && (
          <span className={`inline-flex items-center gap-1 text-xs font-medium ${trendColor}`}>
            <TrendIcon className="w-3.5 h-3.5" />
            {isPositive ? '+' : ''}{trendPercent}%
          </span>
        )}
      </div>

      {!hasData ? (
        <div className="text-center py-6">
          <p className="text-sm text-[var(--text-secondary)]">Your AI is ready.</p>
          <p className="text-xs text-[var(--text-tertiary)] mt-1">
            Call your number to make your first test call.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {statItems.map((item, idx) => (
            <div key={idx}>
              <p className="text-xs text-[var(--text-tertiary)] mb-1">{item.label}</p>
              <p className="text-lg font-semibold text-[var(--text-primary)] tabular-nums">
                {item.value}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
