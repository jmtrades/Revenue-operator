'use client';

import { AlertCircle, ChevronRight } from 'lucide-react';

interface AttentionItem {
  id: string;
  contactName: string;
  description: string;
  relativeTime: string;
  isOverdue: boolean;
  overdueMins?: number;
}

const NeedsAttentionList = () => {
  // Placeholder: currently no backend wiring for this widget.
  const items: AttentionItem[] = [];

  const getUrgencyDot = (item: AttentionItem) => {
    if (item.isOverdue && item.overdueMins && item.overdueMins > 120) return 'bg-red-500';
    if (item.isOverdue || !item.overdueMins) return 'bg-amber-500/80';
    return 'bg-zinc-500';
  };

  const hasItems = items.length > 0;

  return (
    <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-default)] p-6">
      <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
        <AlertCircle className="w-4 h-4 text-[var(--accent-primary)]" />
        Needs Attention
      </h2>

      {!hasItems ? (
        <p className="text-sm text-[var(--text-secondary)] py-8 text-center">Nothing needs your attention right now.</p>
      ) : (
        <>
          <div className="space-y-3">
            {items.slice(0, 5).map((item) => (
              <div
                key={item.id}
                className="flex items-start gap-3 p-3 rounded hover:bg-[var(--bg-hover)] transition-colors cursor-pointer"
              >
                <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-2 ${getUrgencyDot(item)}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--text-primary)] truncate">{item.contactName}</p>
                  <p className="text-xs text-[var(--text-secondary)] truncate">{item.description}</p>
                </div>
                <p className="text-xs text-[var(--text-secondary)] whitespace-nowrap ml-2">{item.relativeTime}</p>
              </div>
            ))}
          </div>

          {items.length > 5 && (
            <a
              href="#"
              className="mt-4 text-sm text-[var(--accent-primary)] hover:underline font-medium flex items-center gap-1"
            >
              View all <ChevronRight className="w-4 h-4" />
            </a>
          )}
        </>
      )}
    </div>
  );
};

export default NeedsAttentionList;
