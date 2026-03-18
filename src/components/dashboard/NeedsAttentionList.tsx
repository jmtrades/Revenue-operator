'use client';

import { AlertCircle, ChevronRight } from 'lucide-react';
import { useState, useEffect } from 'react';

interface AttentionItem {
  id: string;
  contactName: string;
  description: string;
  relativeTime: string;
  isOverdue: boolean;
  overdueMins?: number;
}

const NeedsAttentionList = () => {
  const [items, setItems] = useState<AttentionItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Placeholder: In production, this would query Supabase
    setLoading(false);
  }, []);

  const getUrgencyDot = (item: AttentionItem) => {
    if (item.isOverdue && item.overdueMins && item.overdueMins > 120) {
      return 'bg-red-600'; // >2h overdue
    }
    if (item.isOverdue || !item.overdueMins) {
      return 'bg-yellow-500'; // pending
    }
    return 'bg-gray-300';
  };

  const hasItems = items.length > 0;

  return (
    <div className="bg-white rounded-lg border border-[#E5E5E0] p-6">
      <h2 className="text-lg font-semibold text-[#1A1A1A] mb-4 flex items-center gap-2">
        <AlertCircle className="w-5 h-5 text-[#0D6E6E]" />
        Needs Attention
      </h2>

      {!hasItems ? (
        <p className="text-[#4A4A4A] text-sm py-8 text-center">
          Nothing needs your attention right now.
        </p>
      ) : (
        <>
          <div className="space-y-3">
            {items.slice(0, 5).map((item) => (
              <div
                key={item.id}
                className="flex items-start gap-3 p-3 rounded hover:bg-[#FAFAF8] transition-colors cursor-pointer"
              >
                <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-2 ${getUrgencyDot(item)}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#1A1A1A] truncate">
                    {item.contactName}
                  </p>
                  <p className="text-xs text-[#4A4A4A] truncate">{item.description}</p>
                </div>
                <p className="text-xs text-[#4A4A4A] whitespace-nowrap ml-2">
                  {item.relativeTime}
                </p>
              </div>
            ))}
          </div>

          {items.length > 5 && (
            <a
              href="#"
              className="mt-4 text-sm text-[#0D6E6E] hover:text-[#0a5555] font-medium flex items-center gap-1"
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
