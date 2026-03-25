# RECALL TOUCH — FOLLOW-UP PROMPT (Run after Tasks 1-25 are complete)

The previous prompt completed 25 tasks covering structural fixes, tracking, self-hosted voice stack, quality monitoring, UI polish, and agent controls. This prompt covers everything else needed to make the product fully complete, fully polished, and fully production-ready.

Work through every task in order. Do not stop after one task. Complete every single item before stopping. When you finish one task, immediately move to the next. Do not ask for permission between tasks.

Same rules apply: NO middleware.ts. NO react-hook-form. billing-plans.ts is source of truth. All /app/* uses light theme. All new strings use t("key"). Tests must stay green.

---

## TASK 26: Fix FAQ JSON-LD mismatch in page.tsx

File: `src/app/page.tsx`. Find the FAQPage JSON-LD schema (the `<script type="application/ld+json">` block with FAQ questions). Check if question 3 still says "What does 'Revenue Execution OS' mean?" If so: update it to match the HomepageFAQ.tsx component exactly — question should be "How is this different from an AI receptionist?" with the matching answer about follow-up sequences, no-show recovery, reactivation campaigns, and revenue attribution. Move to the next task.

## TASK 27: Webhook dedup hardening

File: `src/app/api/billing/webhook/route.ts`. Check if the idempotency logic uses a SELECT-before-INSERT approach or relies on catching Postgres error code 23505. If it catches error codes: add a SELECT check before the INSERT:

```typescript
const { data: existing } = await db
  .from("webhook_events")
  .select("id")
  .eq("stripe_event_id", event.id)
  .maybeSingle();
if (existing) {
  return NextResponse.json({ received: true, duplicate: true }, { status: 200 });
}
```

Keep the INSERT catch as a secondary safety net. Move to the next task.

## TASK 28: Create /outbound capabilities page

Create `src/app/outbound/page.tsx`. Content:
- Hero: "Outbound That Actually Works"
- Section 1: 10 Campaign Types (list all 10 with icons and one-line descriptions from the campaign create wizard)
- Section 2: "Compliance Built In" — suppression rules, business hours enforcement, DNC registry, per-contact limits
- Section 3: "Setter Workflows" — AI calls, qualifies, books with human closer
- Section 4: "Full Analytics" — conversion rates, contact rates, pipeline value
- CTA: "Start Free Trial"
- Include Navbar and Footer components.

Add metadata: title "AI Outbound Campaigns — Recall Touch", description about automated outbound calling with compliance. Move to the next task.

## TASK 29: Create /enterprise page

Create `src/app/enterprise/page.tsx`. Content:
- Hero: "AI Revenue Operations for Enterprise"
- Sections: White-Label, SSO/SAML, Custom SLA, Multi-Location Support, Dedicated Account Manager, Custom Compliance, API Access, Priority Support
- Each section: 2-3 sentences explaining the capability
- CTA: "Talk to Sales" linking to /contact
- Include Navbar and Footer.

Add metadata: title "Enterprise — Recall Touch", description. Move to the next task.

## TASK 30: Create 3 additional industry landing pages

Create these pages with 1,500+ words of unique content each. Not template-swapped — genuinely different pain points, workflows, and outcomes per industry:

1. `src/app/industries/roofing/page.tsx` — roofing-specific: storm damage calls, estimate follow-up, seasonal volume spikes, no-show for inspections
2. `src/app/industries/med-spa/page.tsx` — med spa-specific: consultation booking, treatment reminders, package upsell follow-up, cancellation recovery
3. `src/app/industries/recruiting/page.tsx` — recruiting-specific: candidate screening calls, interview scheduling, no-show for interviews, pipeline follow-up

Each page includes: industry headline, pain stats, how Recall Touch works for THIS industry, ROI math specific to the industry, included workflows, pricing context, CTA. Include Navbar and Footer. Add proper metadata with industry-specific title and description. Move to the next task.

## TASK 31: Create comparison pages

Create:
1. `src/app/compare/smith-ai/page.tsx` — "Recall Touch vs Smith.ai": feature-by-feature comparison table. Key points: Smith.ai charges $3.25-$9.50 per call, no follow-up engine, no outbound campaigns, no revenue attribution. Recall Touch: flat monthly pricing, full follow-up, outbound, attribution.
2. `src/app/compare/ruby/page.tsx` — "Recall Touch vs Ruby Receptionists": Ruby charges $1.50-$2.50 per minute with human receptionists, no AI, no automation, no campaigns. Recall Touch: AI-powered, 24/7, with automated follow-up.

Each page: 1,000+ words, comparison table, key differentiators, CTA. Navbar + Footer. Proper metadata. Move to the next task.

## TASK 32: Blog expansion — 10 SEO articles

Create 10 blog posts in `src/app/blog/` (or update the existing blog structure). Each post: 1,500+ words, 3-5 internal links to relevant pages, 1 CTA to /activate, unique metadata.

Topics:
1. "How Much Revenue Do Dental Offices Lose to Missed Calls?"
2. "AI vs Human Receptionist: The Real Cost Comparison"
3. "What Is AI Revenue Operations? The Complete Guide"
4. "Automated No-Show Recovery for Service Businesses"
5. "Speed to Lead: Why Response Time Determines Revenue"
6. "HVAC Companies: How to Answer Every Call Without Hiring"
7. "Legal Intake Automation: Capture Every Potential Client"
8. "How to Calculate Your Missed Call Revenue Leak"
9. "Recall Touch vs Smith.ai: Which Is Right for Your Business?"
10. "The Follow-Up Playbook: Why 80% of Revenue Is in the Second Touch"

Move to the next task.

## TASK 33: SEO completeness audit

For every public page (/, /pricing, /demo, /results, /security, /outbound, /enterprise, /industries/*, /compare/*, /blog/*):

1. Verify unique `<title>` tag exists (max 60 chars, format: "{Page Title} — Recall Touch")
2. Verify unique `<meta description>` exists (150-160 chars, includes primary keyword + CTA)
3. Verify single H1 per page matching keyword intent
4. Verify canonical URL is self-referencing
5. Verify page is included in `src/app/sitemap.ts`
6. Verify page is NOT blocked by robots.txt

For /app/*, /admin/*, /ops/*: verify `robots: { index: false, follow: false }` in metadata.

Add `BreadcrumbList` JSON-LD schema on all sub-pages (/industries/*, /compare/*, /blog/*).

Add `LocalBusiness` JSON-LD on each /industries/[slug] page.

Verify sitemap.ts includes all new pages (outbound, enterprise, new industries, new comparisons, new blog posts). Move to the next task.

## TASK 34: Internal linking strategy

Update these pages to include internal links:
- Every /industries/[slug] page: link to /pricing and /demo in the CTA section
- Every /compare/[competitor] page: link to /results and /pricing
- Every /blog/[slug] post: link to 1 relevant industry page + /activate CTA
- Homepage Industries section: each card links to its /industries/[slug] page
- Homepage FAQ: link relevant answers to /pricing, /security, /outbound
- Footer: ensure links to /pricing, /demo, /results, /security, /outbound, /enterprise, top 3 industries, top 2 comparisons

Move to the next task.

## TASK 35: Mobile responsiveness audit

Test every /app/* page at 375px width (iPhone SE). Fix any:
- Overflowing content
- Unreadable text (too small)
- Buttons too close together (touch target <44px)
- Horizontal scrolling
- Hidden or cut-off elements
- Sidebar not collapsing properly
- Bottom nav overlapping content

Test homepage at 375px. Fix any section that breaks. Move to the next task.

## TASK 36: Accessibility basics

For every interactive element across the app:
- All buttons have accessible labels (aria-label if icon-only)
- All form inputs have associated labels
- All images have alt text
- Focus states are visible (outline or ring)
- Color contrast meets WCAG AA (4.5:1 for text)
- Skip-to-content link exists on homepage (already in layout.tsx — verify it works)

Move to the next task.

## TASK 37: Error handling audit

Check every API route in `src/app/api/` for:
1. Missing try-catch on async operations
2. Silent error swallowing (catch blocks that do nothing)
3. Errors returning HTTP 200 instead of proper status codes
4. Missing Sentry error logging on catch blocks

For any route missing proper error handling: add try-catch, log to Sentry via `Sentry.captureException(error)`, return appropriate HTTP status. Move to the next task.

## TASK 38: Performance optimization

1. Verify all homepage section components use `dynamic(() => import(...))` for code splitting (they already do — verify none were removed).
2. Verify images use Next.js `<Image>` component with proper width/height/alt.
3. Add `loading="lazy"` to below-fold images.
4. Verify no unnecessary client-side JavaScript on server components (no "use client" where not needed).
5. Check for any `console.log` statements in production code — remove them or replace with proper logging via `src/lib/logger.ts`.

Move to the next task.

## TASK 39: Dark theme class cleanup on HeroRevenueWidget

File: `src/components/sections/HeroRevenueWidget.tsx`. Check for any remaining hardcoded dark-theme classes (border-zinc-700, bg-zinc-900/60, bg-white/[0.06], bg-white/[0.18], text-white/80). If found: replace with CSS variable equivalents:
- `border-zinc-700` → `border-[var(--border-default)]`
- `bg-zinc-900/60` → `bg-[var(--bg-inset)]`
- `bg-white/[0.06]` → `bg-[var(--bg-inset)]`
- `bg-white/[0.18]` → `bg-[var(--accent-primary)]/20`
- `text-white/80` → `text-[var(--text-primary)]`

Move to the next task.

## TASK 40: Pricing page improvements

File: `src/app/pricing/page.tsx`. Check and improve:
1. Outcome framing on each tier: Solo "Never miss a call again", Business "The complete revenue recovery system", Scale "For teams and agencies", Enterprise "For organizations with 10+ locations"
2. Annual discount: verify it shows 20% savings (not 17%). If $49 → $39, that is 20%. If $297 → $247, that is 17% — should be $237 for 20%.
3. FAQ section specific to pricing (different from homepage FAQ)
4. ROI comparison: "Business plan pays for itself if you recover just one $300 appointment per month"

Move to the next task.

## TASK 41: Demo page improvements

File: `src/app/demo/page.tsx` or equivalent. Check and improve:
1. Add product screenshots or mockups showing the dashboard, campaign builder, and contact timeline — not just voice demo
2. Add a "See the full product" section with 3-4 screenshots
3. Voice demo should explain it is hearing Recall Touch's actual AI, not a recording

Move to the next task.

## TASK 42: Notification preferences page

Check if `src/app/app/settings/notifications/page.tsx` allows users to configure:
- Email notifications on/off for: new calls, missed calls, bookings, campaign completions, weekly digest, billing alerts
- If the page is a stub or incomplete: build it with toggle switches for each notification type
- Store preferences in workspace settings JSONB field

Move to the next task.

## TASK 43: Webhook retry logic

Check if the system has retry logic for outbound webhook deliveries (CRM sync, custom webhooks). If missing:
- On webhook delivery failure: retry 3 times with exponential backoff (30s, 2min, 10min)
- Log each attempt to a `webhook_deliveries` table: id, webhook_id, attempt_number, status_code, response_body, sent_at
- After 3 failures: mark webhook as failed, create notification for workspace owner

Move to the next task.

## TASK 44: Campaign launch safeguards

In campaign launch flow (`src/app/api/campaigns/[id]/launch/route.ts` or equivalent):
1. Verify workspace has active subscription (not expired, not paused)
2. Verify workspace has at least 1 active phone number
3. Verify campaign audience count > 0
4. Verify all contacts in audience have not opted out
5. Verify sequence has at least 1 step with non-empty template
6. If any check fails: return specific error message, do not launch

Move to the next task.

## TASK 45: Data export

Create `src/app/api/contacts/export/route.ts`:
- Export all contacts for a workspace as CSV
- Columns: name, phone, email, state, tags, total_revenue_attributed, created_at, last_activity_at
- Require workspace access authentication
- Rate limit: 5 exports per hour per workspace
- Return CSV with Content-Disposition: attachment header

Add "Export Contacts" button on the contacts page and in the cancellation flow. Move to the next task.

## TASK 46: Help/support improvements

1. Verify the sidebar has a "Help & Support" link (already added in previous commits — confirm it exists)
2. Add a help link in the bottom of every settings page: "Need help? Email support@recall-touch.com"
3. Create a simple `/app/help/page.tsx` with common questions and answers specific to using the app (different from marketing FAQ). Topics: How to connect a number, How to create a campaign, How to read the dashboard, How to configure an agent, How to invite team members.

Move to the next task.

## TASK 47: Audit log page

Check if `src/app/app/settings/activity/page.tsx` shows a meaningful audit log. If not:
- Display recent actions: agent created/updated, campaign launched, phone number added, team member invited, settings changed, plan upgraded
- Source: query from `audit_logs` table if it exists, or create it
- Show: timestamp, user who performed action, action description, affected resource
- Paginated, most recent first

Move to the next task.

## TASK 48: Final build and deployment verification

1. Run `npx tsc --noEmit 2>&1 | grep -v node_modules` — verify 0 errors in project code
2. Run `npm test` — verify all tests pass
3. Run `npx next build` — verify compilation succeeds with no errors
4. Verify `vercel.json` has `"buildCommand": "next build"` and nothing else for buildCommand
5. Verify `middleware.ts` does NOT exist anywhere in the project root
6. Verify `src/app/app/layout.tsx` has the auth guard (session check + email verification redirect) intact
7. Verify `package.json` does NOT have esbuild in devDependencies
8. Verify `package.json` has `"engines": { "node": ">=22.0.0 <24.0.0" }`

If any check fails: fix it. Report all results. Move to the next task.

## TASK 49: Git commit everything

Stage all changes. Create a single commit with message:

```
feat: complete product hardening, self-hosted voice stack, SEO, and full polish

- Dunning emails, trial grace period, cancellation flow
- Empty states on all /app pages, loading skeletons, product tour
- Self-hosted voice: Pipecat, Telnyx, Kokoro TTS, Canary STT, Llama 3 8B
- Voice quality monitoring, fallback chain, Fish Speech cloning
- Agent sandbox mode, go-live gate, settings progressive disclosure
- /outbound, /enterprise, 3 industry pages, 2 comparison pages, 10 blog posts
- SEO: metadata, schema, internal linking, sitemap
- Mobile audit, accessibility, error handling, performance
- Data export, help page, audit log, webhook retry
- Campaign launch safeguards, notification preferences
- PostHog tracking, call quality columns
- Dark theme cleanup, pricing page improvements, demo page improvements

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
```

Move to the next task.

## TASK 50: Push to GitHub and verify Vercel deployment

Run `git push origin main`. Wait for Vercel to pick up the push and start building. The deployment should succeed because:
- middleware.ts does not exist (was the cause of all previous failures)
- buildCommand is "next build" (standard)
- esbuild is not in devDependencies
- Node 22 is pinned

If the deployment fails: read the Vercel build logs, identify the exact error, fix it, commit, and push again. Do not stop until the deployment state is READY.

---

*Complete every task 26 through 50. Do not stop between tasks. When one is done, start the next immediately. When you are finished, the product must be fully complete, fully polished, fully deployed, and fully operational.*
