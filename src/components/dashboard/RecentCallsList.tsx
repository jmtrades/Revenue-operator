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

const OUTCOME_CONFIG: Record<CallOutcome, { bg: string; text: string; label: string }> = {
  appointment: { bg: 'bg-emerald-500/10', text: 'text-emerald-500', label: 'Booked' },
  lead: { bg: 'bg-blue-500/10', text: 'text-blue-500', label: 'Lead' },
  message: { bg: 'bg-[var(--bg-hover)]', text: 'text-[var(--text-secondary)]', label: 'Message' },
  transferred: { bg: 'bg-amber-500/10', text: 'text-amber-500', label: 'Transferred' },
  spam: { bg: 'bg-red-500/10', text: 'text-red-400', label: 'Spam' },
};

function SkeletonRows() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="h-3 w-12 bg-[var(--bg-hover)] rounded skeleton-shimmer" />
          <div className="h-3 w-24 bg-[var(--bg-hover)] rounded skeleton-shimmer flex-1" />
          <div className="h-5 w-16 bg-[var(--bg-hover)] rounded-full skeleton-shimmer" />
          <div className="h-3 w-10 bg-[var(--bg-hover)] rounded skeleton-shimmer" />
        </div>
      ))}
    </div>
  );
}

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
        const response = await fetch(
          `/api/calls/recent?workspace_id=${encodeURIComponent(workspaceId)}&limit=10`,
          { credentials: 'include' }
        );
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

  const filteredCalls = useMemo(() => {
    let result = calls;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((call) =>
        call.contact.toLowerCase().includes(query)
      );
    }

    if (statusFilter !== 'all') {
      result = result.filter((call) => call.outcome === statusFilter);
    }

    if (sortOrder === 'oldest') {
      return [...result].reverse();
    }

    return result;
  }, [calls, searchQuery, statusFilter, sortOrder]);

  const hasCalls = calls.length > 0;

  return (
    <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
          <Phone className="w-4 h-4 text-[var(--accent-primary)]" />
          {t("recentCalls.title", { defaultValue: "Recent Calls" })}
        </h2>
      </div>

      {/* Filters (only when there are calls) */}
      {!loading && hasCalls && (
        <div className="flex items-center gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-tertiary)]" />
            <input
              type="text"
              placeholder={t("recentCalls.searchPlaceholder", { defaultValue: "Search..." })}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-[var(--bg-inset)] border border-[var(--border-default)] rounded-lg text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)]"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | CallOutcome)}
            className="px-2.5 py-1.5 bg-[var(--bg-inset)] border border-[var(--border-default)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)]"
          >
            <option value="all">All</option>
            <option value="appointment">Booked</option>
            <option value="lead">Lead</option>
            <option value="message">Message</option>
            <option value="transferred">Transferred</option>
            <option value="spam">Spam</option>
          </select>
          <button
            onClick={() => setSortOrder(sortOrder === 'newest' ? 'oldest' : 'newest')}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-[var(--bg-inset)] border border-[var(--border-default)] rounded-lg text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            title="Toggle sort order"
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {loading ? (
        <SkeletonRows />
      ) : !hasCalls ? (
        <div className="text-center py-8">
          <p className="text-sm text-[var(--text-secondary)]">
            {t("recentCalls.empty", { defaultValue: "No calls yet." })}
          </p>
          <p className="text-xs text-[var(--text-tertiary)] mt-1">
            Calls will appear here once your AI starts handling them.
          </p>
        </div>
      ) : filteredCalls.length === 0 ? (
        <p className="text-sm text-[var(--text-secondary)] py-6 text-center">
          {t("recentCalls.noResults", { defaultValue: "No calls match your filters." })}
        </p>
      ) : (
        <div className="space-y-2">
          {filteredCalls.slice(0, 10).map((call) => {
            const config = OUTCOME_CONFIG[call.outcome] ?? OUTCOME_CONFIG.message;
            return (
              <div
                key={call.id}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-[var(--bg-hover)] transition-colors"
              >
                <span className="text-xs tabular-nums text-[var(--text-tertiary)] min-w-[52px]">
                  {call.time}
                </span>
                <span className="text-sm text-[var(--text-primary)] flex-1 truncate">
                  {call.contact}
                </span>
                <span
                  className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium ${config.bg} ${config.text}`}
                >
                  {config.label}
                </span>
                <span className="text-xs tabular-nums text-[var(--text-tertiary)] min-w-[40px] text-right">
                  {call.duration}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default RecentCallsList;
