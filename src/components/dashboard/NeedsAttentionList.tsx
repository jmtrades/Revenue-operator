'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
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
  const t = useTranslations("dashboard");
  const items: AttentionItem[] = [];

  const getUrgencyDot = (item: AttentionItem) => {
    if (item.isOverdue && item.overdueMins && item.overdueMins > 120) return 'bg-red-500';
    if (item.isOverdue || !item.overdueMins) return 'bg-amber-500';
    return 'bg-[var(--text-tertiary)]';
  };

  const hasItems = items.length > 0;

  return (
    <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-5">
      <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
        <AlertCircle className="w-4 h-4 text-amber-500" />
        {t("needsAttention.title", { defaultValue: "Needs Attention" })}
      </h2>

      {!hasItems ? (
        <div className="text-center py-6">
          <p className="text-sm text-[var(--text-secondary)]">
            {t("needsAttention.empty", { defaultValue: "Nothing needs your attention right now." })}
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {items.slice(0, 5).map((item) => (
              <div
                key={item.id}
                className="flex items-start gap-3 rounded-lg px-3 py-2.5 hover:bg-[var(--bg-hover)] transition-colors cursor-pointer"
              >
                <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${getUrgencyDot(item)}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                    {item.contactName}
                  </p>
                  <p className="text-xs text-[var(--text-tertiary)] truncate">{item.description}</p>
                </div>
                <span className="text-[11px] text-[var(--text-tertiary)] whitespace-nowrap">
                  {item.relativeTime}
                </span>
              </div>
            ))}
          </div>

          {items.length > 5 && (
            <Link
              href="/dashboard/activity"
              className="mt-3 text-xs text-[var(--accent-primary)] hover:underline font-medium flex items-center gap-1"
            >
              View all <ChevronRight className="w-3 h-3" />
            </Link>
          )}
        </>
      )}
    </div>
  );
};

export default NeedsAttentionList;
