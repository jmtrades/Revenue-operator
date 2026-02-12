# UX Polish Checklist — Full Ship

## Phase 0 — Snapshot & verify
- [x] `npm run test` — 136 tests pass
- [x] `npm run build` — succeeds
- [x] `npm run lint` — 0 errors (warnings only)
- [x] Audit key routes (design tokens + shared components applied)

## Phase 1 — Design system
- [x] Tokens: bg, surface, card, border, text, accent, semantic, radius, shadow (globals.css)
- [x] PageHeader component
- [x] Card, CardHeader, CardBody
- [x] Badge (semantic variants)
- [x] EmptyState
- [x] LoadingState (skeleton), LoadingScreen
- [x] Stat tile
- [x] Preferences + layout use shared components

## Phase 2 — Contrast & spacing
- [ ] Base font 14–16px, line-height generous
- [ ] Card padding generous
- [ ] Sidebar width balanced, content not crushed
- [ ] Tables readable (row height, subtle zebra)
- [ ] Mobile: sidebar → drawer

## Phase 3 — Session + workspace
- [x] Session cookie set on trial start, refreshed in middleware
- [x] Preferences: “Signed in as email” + Log out
- [x] Dashboard never shows email prompt when session exists (when SESSION_SECRET set)
- [x] Workspace switcher only if multiple workspaces; 0 workspaces → redirect to /activate

## Phase 4 — Live gate
- [x] Full-screen centered feed card, premium look, “Active” pulse
- [x] Feed: Conversation detected → Response prepared → Follow-up scheduled → Attendance confirmed → Stabilized
- [x] Single CTA “Go to overview”
- [x] liveSeen_${workspaceId} never repeats

## Phase 5 — Page-by-page
- [ ] Overview: assurance bar, today panels, no internal jargon
- [ ] Conversations: three columns, clear empty states, cards with responsibility + next touch
- [ ] Lead detail: brief + suggested approach above fold, thread under Take control
- [ ] Calendar: attendance confidence, preparation state, minimal
- [ ] Performance & Reports: proof-driven, cards not dense tables
- [ ] Preferences: sound, hours, coverage toggles, sources, billing

## Phase 6 — Landing
- [x] Hero: “More real conversations on your calendar”
- [x] Subhead: continuity—reply, follow up, recover—you take the calls
- [x] Trust block, outcomes panel, CTA “Start 14-day trial” (£0 today / cancel before renewal)

## Phase 7 — Stripe trial
- [ ] Checkout trial_period_days=14, payment method required
- [ ] Success: workspace + session cookie
- [ ] Webhook: coverage_active, protection_renewal_at
- [ ] UI: Trial ends DATE, £X/mo after, Cancel before renewal

## Phase 8 — QA & ship
- [ ] Playwright smoke: /, /activate, /dashboard/live, /dashboard, /dashboard/conversations, /dashboard/calls, /dashboard/settings
- [ ] Unit: session cookie parsing, middleware allowlist
- [ ] Lint 0 errors, test pass, build pass
- [ ] RELEASE_NOTES_LAUNCH.md, LAUNCH_CHECKLIST.md updated
