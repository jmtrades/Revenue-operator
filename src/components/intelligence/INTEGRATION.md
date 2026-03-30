# Integration Guide

Quick examples for integrating the intelligence components into existing lead views.

## In Lead Detail Page

```tsx
"use client";

import { LeadBrainPanel } from "@/components/intelligence/LeadBrainPanel";
import { AutonomousActivityFeed } from "@/components/intelligence/AutonomousActivityFeed";

export function LeadDetailView({ leadId }: { leadId: string }) {
  return (
    <div className="grid grid-cols-3 gap-6">
      {/* Main lead details — 2/3 width */}
      <div className="col-span-2">
        <LeadDetail leadId={leadId} />
      </div>

      {/* Brain intelligence — 1/3 width sidebar */}
      <div className="col-span-1 space-y-4">
        <LeadBrainPanel leadId={leadId} />
        <AutonomousActivityFeed leadId={leadId} />
      </div>
    </div>
  );
}
```

## In Lead List Row

```tsx
import { LeadScoreBadge } from "@/components/intelligence/LeadScoreBadge";
import type { LeadIntelligence } from "@/lib/intelligence/lead-brain";

interface LeadRowProps {
  lead: Lead;
  intelligence: LeadIntelligence;
}

export function LeadTableRow({ lead, intelligence }: LeadRowProps) {
  return (
    <tr className="border-b border-[var(--border-default)] hover:bg-[var(--bg-inset)]/30">
      <td className="px-4 py-3">{lead.name}</td>
      <td className="px-4 py-3">{lead.email}</td>
      <td className="px-4 py-3">
        <LeadScoreBadge
          urgency={intelligence.urgency_score}
          intent={intelligence.intent_score}
          engagement={intelligence.engagement_score}
          nextAction={intelligence.next_best_action}
          riskFlags={intelligence.risk_flags}
        />
      </td>
      <td className="px-4 py-3">{lead.status}</td>
    </tr>
  );
}
```

## With Batch Intelligence Data

If you're loading intelligence for multiple leads (e.g., from `/api/leads/intelligence/batch`):

```tsx
import { LeadScoreBadge } from "@/components/intelligence/LeadScoreBadge";

export function LeadsList({ leads, intelligenceMap }: LeadsListProps) {
  return (
    <div className="space-y-2">
      {leads.map((lead) => {
        const intel = intelligenceMap[lead.id];
        return (
          <div
            key={lead.id}
            className="flex items-center justify-between p-3 rounded-lg border border-[var(--border-default)]"
          >
            <div>
              <p className="font-medium">{lead.name}</p>
              <p className="text-xs text-[var(--text-secondary)]">{lead.email}</p>
            </div>
            {intel && (
              <LeadScoreBadge
                urgency={intel.urgency_score}
                intent={intel.intent_score}
                engagement={intel.engagement_score}
                nextAction={intel.next_best_action}
                riskFlags={intel.risk_flags}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
```

## Fetching Intelligence in Parent Component

If you need to load intelligence separately:

```tsx
"use client";

import { useEffect, useState } from "react";
import type { LeadIntelligence } from "@/lib/intelligence/lead-brain";

interface IntelligenceResponse {
  intelligence: LeadIntelligence;
  recent_actions: Array<any>;
  computed_fresh: boolean;
}

export function useLeadIntelligence(leadId: string) {
  const [data, setData] = useState<IntelligenceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetch() {
      try {
        setLoading(true);
        const res = await fetch(`/api/leads/${leadId}/intelligence`);
        if (!res.ok) throw new Error("Failed to fetch intelligence");
        setData(await res.json());
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }

    fetch();
  }, [leadId]);

  return { data, loading, error };
}

// Usage:
export function MyComponent({ leadId }: { leadId: string }) {
  const { data, loading } = useLeadIntelligence(leadId);

  if (!data?.intelligence) return null;

  const intel = data.intelligence;
  return (
    <LeadScoreBadge
      urgency={intel.urgency_score}
      intent={intel.intent_score}
      engagement={intel.engagement_score}
      nextAction={intel.next_best_action}
      riskFlags={intel.risk_flags}
    />
  );
}
```

## Styling Customization

All components use CSS custom properties (variables) for theming:

```tsx
/* Override in your global styles or theme provider */
:root {
  --text-primary: #1a1a1a;
  --text-secondary: #666;
  --bg-card: #f9f9f9;
  --bg-inset: #f0f0f0;
  --border-default: #e0e0e0;
  --accent-primary: #0066ff;
  --accent-warning: #f59e0b;
}
```

## Loading States

Components handle loading gracefully with Skeleton screens. No need to add custom loading logic:

```tsx
// Just pass the leadId, loading is handled internally
<LeadBrainPanel leadId={leadId} />
<AutonomousActivityFeed leadId={leadId} />
```

## Error Handling

Components show user-friendly error messages. For debugging:

```tsx
// Check browser console for detailed error logs
// Components log errors to help diagnose API issues
```

## Performance Notes

- **LeadBrainPanel**: ~5KB, 307 lines, single API call
- **LeadScoreBadge**: ~2KB, 92 lines, no API call (uses passed props)
- **AutonomousActivityFeed**: ~6KB, 213 lines, single API call
- All components use `useEffect` with proper cleanup
- Caching: API caches intelligence for 6 hours (configurable)

## TypeScript Support

All components are fully typed:

```tsx
import type { LeadIntelligence } from "@/lib/intelligence/lead-brain";

// Types available for use:
// - LeadIntelligence
// - AutonomousAction (in component file)
// - LeadScoreBadgeProps
// - LeadBrainPanelProps
// - AutonomousActivityFeedProps
```
