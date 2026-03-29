'use client';

import { Phone, Search, ArrowUpDown } from 'lucide-react';
import { useEffect, useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useWorkspace } from '@/components/WorkspaceContext';

type CallOutcome = 'appointment' | 'lead' | 'message' | 'transferred' | 'spam';

interface Call {
  id: string;
  time: string;
  contact: string;
  outcome: CallOutcome;
  duration: string;
}

const SkeletonRow = () => (
  <tr className="border-b border-[var(--border-default)]">
    {[1, 2, 3, 4].map((i) => (
      <td key={i} className="py-3 px-2">
        <div className="h-4 bg-[var(--bg-hover)] rounded skeleton-shimmer" style={{ width: i === 3 ? '80px' : '60px' }} />
      </td>
    ))}
  </tr>
);

const RecentCallsList = () => {
  const t = useTranslations("dashboard");
  const { workspaceId } = useWorkspace();
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | CallOutcome>('all');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');

  useEffect(() => {
    if (!workspaceId) {
      setLoading(false);
      return;
    }

    const fetchCalls = async () => {
      try {
        const response = await fetch(`/api/calls/recent?workspace_id=${encodeURIComponent(workspaceId)}&limit=10`, {
          credentials: 'include',
        });
        if (response.ok) {
          const data = await response.json();
          setCalls(data.calls || []);
        }
      } catch {
        setCalls([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCalls();
  }, [workspaceId]);

  const getOutcomeBadge = (outcome: CallOutcome) => {
    const badgeConfig = {
      appointment: { bg: 'bg-green-500/10', text: 'text-green-400', label: t("recentCalls.outcomes.appointment", { defaultValue: 'Appointment booked' }) },
      lead: { bg: 'bg-[var(--bg-inset)]/10', text: 'text-[var(--text-secondary)]', label: t("recentCalls.outcomes.lead", { defaultValue: 'Lead captured' }) },
      message: { bg: 'bg-[var(--bg-inset)]/10', text: 'text-[var(--text-secondary)]', label: t("recentCalls.outcomes.message", { defaultValue: 'Message taken' }) },
      transferred: { bg: 'bg-amber-500/10', text: 'text-amber-300', label: t("recentCalls.outcomes.transferred", { defaultValue: 'Transferred' }) },
      spam: { bg: 'bg-red-500/10', text: 'text-red-300', label: t("recentCalls.outcomes.spam", { defaultValue: 'Spam' }) },
    };

    const config = badgeConfig[outcome];
    return (
      <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium border border-[var(--border-default)] ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  // Filter and sort calls
  const filteredCalls = useMemo(() => {
    let result = calls;

    // Filter by search query (contact name or number)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(call =>
        call.contact.toLowerCase().includes(query)
      );
    }

    // Filter by outcome/status
    if (statusFilter !== 'all') {
      result = result.filter(call => call.outcome === statusFilter);
    }

    // Sort by date
    if (sortOrder === 'oldest') {
      return [...result].reverse();
    }

    return result;
  }, [calls, searchQuery, statusFilter, sortOrder]);

  const hasCalls = calls.length > 0;

  return (
    <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-default)] p-6">
      <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
        <Phone className="w-4 h-4 text-[var(--accent-primary)]" />
        {t("recentCalls.title", { defaultValue: "Recent Calls" })}
      </h2>

      {!loading && hasCalls && (
        <div className="mb-4 space-y-3">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]" />
            <input
              type="text"
              placeholder={t("recentCalls.searchPlaceholder", { defaultValue: "Search by name or phone..." })}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-[var(--bg-inset)] border border-[var(--border-default)] rounded-lg text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)]"
            />
          </div>

          {/* Filters Row */}
          <div className="flex gap-2 flex-wrap">
            {/* Status Filter Dropdown */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | CallOutcome)}
              className="px-3 py-1.5 bg-[var(--bg-inset)] border border-[var(--border-default)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)]"
            >
              <option value="all">{t("recentCalls.filterAll", { defaultValue: "All outcomes" })}</option>
              <option value="appointment">{t("recentCalls.outcomes.appointment", { defaultValue: "Appointment booked" })}</option>
              <option value="lead">{t("recentCalls.outcomes.lead", { defaultValue: "Lead captured" })}</option>
              <option value="message">{t("recentCalls.outcomes.message", { defaultValue: "Message taken" })}</option>
              <option value="transferred">{t("recentCalls.outcomes.transferred", { defaultValue: "Transferred" })}</option>
              <option value="spam">{t("recentCalls.outcomes.spam", { defaultValue: "Spam" })}</option>
            </select>

            {/* Sort Toggle */}
            <button
              onClick={() => setSortOrder(sortOrder === 'newest' ? 'oldest' : 'newest')}
              className="flex items-center gap-2 px-3 py-1.5 bg-[var(--bg-inset)] border border-[var(--border-default)] rounded-lg text-sm text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)]"
              title={t("recentCalls.sortTooltip", { defaultValue: "Toggle sort order" })}
            >
              <ArrowUpDown className="w-4 h-4" />
              <span>{sortOrder === 'newest' ? t("recentCalls.newest", { defaultValue: "Newest" }) : t("recentCalls.oldest", { defaultValue: "Oldest" })}</span>
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border-default)]">
                <th className="text-left py-3 px-2 font-semibold text-[var(--text-secondary)]">Time</th>
                <th className="text-left py-3 px-2 font-semibold text-[var(--text-secondary)]">Contact</th>
                <th className="text-left py-3 px-2 font-semibold text-[var(--text-secondary)]">Outcome</th>
                <th className="text-left py-3 px-2 font-semibold text-[var(--text-secondary)]">Duration</th>
              </tr>
            </thead>
            <tbody>
              <SkeletonRow />
              <SkeletonRow />
              <SkeletonRow />
            </tbody>
          </table>
        </div>
      ) : !hasCalls ? (
        <p className="text-[var(--text-secondary)] text-sm py-8 text-center">
          {t("recentCalls.empty", { defaultValue: "No calls yet. Once your AI starts handling calls, they will appear here." })}
        </p>
      ) : filteredCalls.length === 0 ? (
        <p className="text-[var(--text-secondary)] text-sm py-8 text-center">
          {t("recentCalls.noResults", { defaultValue: "No calls match your filters." })}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border-default)]">
                <th className="text-left py-3 px-2 font-semibold text-[var(--text-secondary)]">Time</th>
                <th className="text-left py-3 px-2 font-semibold text-[var(--text-secondary)]">Contact</th>
                <th className="text-left py-3 px-2 font-semibold text-[var(--text-secondary)]">Outcome</th>
                <th className="text-left py-3 px-2 font-semibold text-[var(--text-secondary)]">Duration</th>
              </tr>
            </thead>
            <tbody>
              {filteredCalls.slice(0, 10).map((call) => (
                <tr
                  key={call.id}
                  className="border-b border-[var(--border-default)] hover:bg-[var(--bg-hover)] transition-colors"
                >
                  <td className="py-3 px-2 text-[var(--text-primary)]">{call.time}</td>
                  <td className="py-3 px-2 text-[var(--text-primary)]">{call.contact}</td>
                  <td className="py-3 px-2">{getOutcomeBadge(call.outcome)}</td>
                  <td className="py-3 px-2 text-[var(--text-secondary)]">{call.duration}</td>
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
