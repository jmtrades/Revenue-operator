'use client';

import { Phone } from 'lucide-react';

type CallOutcome = 'appointment' | 'lead' | 'message' | 'transferred' | 'spam';

interface Call {
  id: string;
  time: string;
  contact: string;
  outcome: CallOutcome;
  duration: string;
}

const RecentCallsList = () => {
  // Placeholder: currently no backend wiring for this widget.
  const calls: Call[] = [];

  const getOutcomeBadge = (outcome: CallOutcome) => {
    const badgeConfig = {
      appointment: { bg: 'bg-green-500/10', text: 'text-green-400', label: 'Appointment booked' },
      lead: { bg: 'bg-[var(--bg-inset)]/10', text: 'text-[var(--text-secondary)]', label: 'Lead captured' },
      message: { bg: 'bg-[var(--bg-inset)]/10', text: 'text-[var(--text-secondary)]', label: 'Message taken' },
      transferred: { bg: 'bg-amber-500/10', text: 'text-amber-300', label: 'Transferred' },
      spam: { bg: 'bg-red-500/10', text: 'text-red-300', label: 'Spam' },
    };

    const config = badgeConfig[outcome];
    return (
      <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium border border-[var(--border-default)] ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  const hasCalls = calls.length > 0;

  return (
    <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-default)] p-6">
      <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
        <Phone className="w-4 h-4 text-[var(--accent-primary)]" />
        Recent Calls
      </h2>

      {!hasCalls ? (
        <p className="text-[var(--text-secondary)] text-sm py-8 text-center">
          No calls yet. Once your AI starts handling calls, they will appear here.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E5E5E0]">
                <th className="text-left py-3 px-2 font-semibold text-[#4A4A4A]">Time</th>
                <th className="text-left py-3 px-2 font-semibold text-[#4A4A4A]">Contact</th>
                <th className="text-left py-3 px-2 font-semibold text-[#4A4A4A]">Outcome</th>
                <th className="text-left py-3 px-2 font-semibold text-[#4A4A4A]">Duration</th>
              </tr>
            </thead>
            <tbody>
              {calls.slice(0, 10).map((call) => (
                <tr
                  key={call.id}
                  onClick={() => {
                    // No-op (row click affordance only)
                  }}
                  className="border-b border-[#E5E5E0] hover:bg-[#FAFAF8] cursor-pointer transition-colors"
                >
                  <td className="py-3 px-2 text-[#1A1A1A]">{call.time}</td>
                  <td className="py-3 px-2 text-[#1A1A1A]">{call.contact}</td>
                  <td className="py-3 px-2">{getOutcomeBadge(call.outcome)}</td>
                  <td className="py-3 px-2 text-[#4A4A4A]">{call.duration}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default RecentCallsList;
