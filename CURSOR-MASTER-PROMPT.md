# TASK 6 — Call Intelligence: Tabbed Layout with Analyzed Calls List

**File:** `src/app/app/call-intelligence/page.tsx`

Currently just a transcript paste form with insights display. No tabs. No list of previously analyzed calls.

## 6A — Add tab state and tab bar

Add state:
```tsx
const [activeTab, setActiveTab] = useState<'analyzed'|'manual'>('analyzed');
```

Add tab bar at the top of the content area (below the page title, above the current form):
```tsx
<div className="flex gap-1 bg-[#0A0A0B] border border-white/[0.06] rounded-xl p-1 mb-6">
  <button onClick={()=>setActiveTab('analyzed')}
    className={cn('px-4 py-2 rounded-lg text-sm font-medium transition-all',
      activeTab==='analyzed'?'bg-[#1A1A1D] text-[#EDEDEF]':'text-[#5A5A5C] hover:text-[#8B8B8D]')}>
    Analyzed Calls
  </button>
  <button onClick={()=>setActiveTab('manual')}
    className={cn('px-4 py-2 rounded-lg text-sm font-medium transition-all',
      activeTab==='manual'?'bg-[#1A1A1D] text-[#EDEDEF]':'text-[#5A5A5C] hover:text-[#8B8B8D]')}>
    Manual Analysis
  </button>
</div>
```

## 6B — "Analyzed Calls" tab content

When `activeTab === 'analyzed'`, show:
- Fetch previously analyzed calls from the same data source the insights display already uses, or from `/api/call-intelligence`
- Render as a card list where each card shows: call title, date, call type badge, and a brief insight summary
- Clicking a card expands it to show the full insights view (reuse the existing insight category display)
- Empty state: "No analyzed calls yet. Calls are automatically analyzed after they end, or switch to Manual Analysis to paste a transcript."

## 6C — "Manual Analysis" tab content

When `activeTab === 'manual'`, show:
- Move the existing "Analyze a new call" transcript paste form here
- Make it always visible (not collapsible) since the user explicitly chose this tab

## Design tokens reminder
- Surface: `#111113`, Border: `white/[0.06]`, Accent: `#4F8CFF`
- Bright text: `#EDEDEF`, Muted: `#8B8B8D`, Dim: `#5A5A5C`
- Use `cn()` for conditional classes

Show me the diff.
