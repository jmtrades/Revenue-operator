'use client';

import { Phone } from 'lucide-react';
import { useState, useEffect } from 'react';

type CallOutcome = 'appointment' | 'lead' | 'message' | 'transferred' | 'spam';

interface Call {
  id: string;
  time: string;
  contact: string;
  outcome: CallOutcome;
  duration: string;
}

const RecentCallsList = () => {
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(false);
  }, []);

  const getOutcomeBadge = (outcome: CallOutcome) => {
    const badgeConfig = {
      appointment: { bg: 'bg-green-100', text: 'text-green-700', label: 'Appointment booked' },
      lead: { bg: 'bg-zinc-100', text: 'text-zinc-700', label: 'Lead captured' },
      message: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Message taken' },
      transferred: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Transferred' },
      spam: { bg: 'bg-red-100', text: 'text-red-700', label: 'Spam' },
    };

    const config = badgeConfig[outcome];
    return (
      <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  const hasCalls = calls.length > 0;

  return (
    <div className="bg-white rounded-lg border border-[#E5E5E0] p-6">
      <h2 className="text-lg font-semibold text-[#1A1A1A] mb-4 flex items-center gap-2">
        <Phone className="w-5 h-5 text-[#0D6E6E]" />
        Recent Calls
      </h2>

      {!hasCalls ? (
        <p className="text-[#4A4A4A] text-sm py-8 text-center">
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
