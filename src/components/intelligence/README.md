# Intelligence Components

React components that surface the Autonomous Revenue Brain's intelligence in lead views.

## Components

### LeadBrainPanel

A comprehensive dashboard panel showing the brain's complete intelligence profile for a lead. Designed for lead detail pages.

**Props:**
```typescript
interface LeadBrainPanelProps {
  leadId: string;
}
```

**Features:**
- Lead temperature badge (Hot/Warm/Cool/Cold)
- Three score bars: urgency, intent, engagement
- Conversion probability and churn risk gauges
- Risk flags with color-coded variants
- Next best action with confidence and timing
- Recent autonomous activity timeline (up to 5 actions)

**Usage:**
```tsx
import { LeadBrainPanel } from "@/components/intelligence/LeadBrainPanel";

export function LeadDetailPage({ leadId }: { leadId: string }) {
  return (
    <div className="grid grid-cols-3 gap-6">
      <div className="col-span-2">{/* Lead details */}</div>
      <div className="col-span-1">
        <LeadBrainPanel leadId={leadId} />
      </div>
    </div>
  );
}
```

### LeadScoreBadge

A compact inline badge showing the brain's quick assessment of a lead. Designed for lead list rows or cards.

**Props:**
```typescript
interface LeadScoreBadgeProps {
  urgency: number;
  intent: number;
  engagement: number;
  nextAction: string;
  riskFlags: string[];
}
```

**Features:**
- Temperature label (Hot/Warm/Cool/Cold)
- Next action icon and label (emoji + text)
- Risk flag indicator (red dot for critical, yellow for warnings)
- Fits inline in table rows or card headers

**Usage:**
```tsx
import { LeadScoreBadge } from "@/components/intelligence/LeadScoreBadge";

export function LeadListRow({ lead, intelligence }: LeadListRowProps) {
  return (
    <tr>
      <td>{lead.name}</td>
      <td>{lead.email}</td>
      <td>
        <LeadScoreBadge
          urgency={intelligence.urgency_score}
          intent={intelligence.intent_score}
          engagement={intelligence.engagement_score}
          nextAction={intelligence.next_best_action}
          riskFlags={intelligence.risk_flags}
        />
      </td>
    </tr>
  );
}
```

### AutonomousActivityFeed

A timeline feed showing recent autonomous actions taken by the brain for a lead.

**Props:**
```typescript
interface AutonomousActivityFeedProps {
  leadId: string;
}
```

**Features:**
- Vertical timeline with action icons
- Relative timestamps (e.g., "2h ago")
- Outcome badges (success/failed/pending)
- "Computed" label for brain-computed entries
- Shows up to 10 most recent actions

**Usage:**
```tsx
import { AutonomousActivityFeed } from "@/components/intelligence/AutonomousActivityFeed";

export function LeadDetailSidebar({ leadId }: { leadId: string }) {
  return (
    <div className="space-y-6">
      <AutonomousActivityFeed leadId={leadId} />
    </div>
  );
}
```

## Data Source

All components fetch from `/api/leads/{leadId}/intelligence`, which returns:

```typescript
{
  intelligence: LeadIntelligence;
  recent_actions: AutonomousAction[];
  computed_fresh: boolean;
}
```

- **LeadBrainPanel** uses both `intelligence` and `recent_actions`
- **LeadScoreBadge** uses only `intelligence` fields (passed as props)
- **AutonomousActivityFeed** fetches independently using the same endpoint

## Design Notes

- All components use Tailwind CSS for styling
- Color scheme: red for urgency/critical risk, orange for warnings, blue for cool/info, green for positive signals
- Loading states use the `<Skeleton>` component for smooth UX
- Error states show clear messaging with appropriate icons
- Responsive design fits mobile and desktop layouts
- Premium, data-dense appearance — clean but information-rich

## Temperature Legend

| Temperature | Average Score | Color | Use Case |
|---|---|---|---|
| Hot | ≥70 | Red | High priority, likely to convert |
| Warm | 50-69 | Orange | Medium priority, nurturing needed |
| Cool | 30-49 | Blue | Lower priority, monitor |
| Cold | <30 | Gray | Inactive or at risk |

## Risk Flag Variants

| Category | Color | Examples |
|---|---|---|
| Critical (red) | error | `anger`, `opt_out` |
| Warning (orange) | warning | `going_cold`, `no_show_risk` |
| Info (blue) | info | Other flags |
