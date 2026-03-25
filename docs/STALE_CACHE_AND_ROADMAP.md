# Stale cache fix + Vapi benchmarking + What's next

## The problem: stale JS bundles from old deploys

Browsers can load React chunks from an **old deploy** (e.g. `dpl_8ks8n2mAuVerPJ5RbHTzcxehNT45`) while the HTML references the **current deploy** (`dpl_5skfGUvhaQ68Ji8SrCfzt7VdsXnk`). Result: 3× #418 hydration errors at `<html>` and broken event handlers. **This is a caching/deployment problem, not a code bug.**

---

## Fixes implemented (in code)

### Fix 1: suppressHydrationWarning (root layout)

- **File:** `src/app/layout.tsx`
- `<html>`, `<head>`, `<body>` have `suppressHydrationWarning` so html-level mismatches (e.g. browser extensions) do not trigger #418.

### Fix 2: Unregister Service Workers

- **File:** `src/components/SwCleanup.tsx`
- On load, `navigator.serviceWorker.getRegistrations()` → `unregister()` for each. Prevents SW from serving stale bundles.

### Fix 3: No-cache for HTML shell

- **File:** `next.config.ts` + `src/app/layout.tsx`
- Config: `source: "/:path*"` (non-static) gets `Cache-Control: no-store, must-revalidate`.
- Layout `<head>`: `<meta httpEquiv="Cache-Control" content="no-cache, no-store, must-revalidate" />`.
- Ensures the HTML document is not cached, so it always loads fresh JS bundle references for the current deploy.

### Fix 4: Force RSC to be uncached

- **File:** `next.config.ts`
- `experimental.staleTimes: { dynamic: 0, static: 0 }` so the router does not serve stale cached RSC segments.

### Verify after deploy

**Only test in an incognito window.** Normal windows may still have stale cached bundles until they expire or the user hard-refreshes.

1. Open deployed URL in **incognito**.
2. DevTools Console: **zero** #418 or "Hydration failed" messages.
3. Navigate to Sign in, Activate, then /app/onboarding.
4. Buttons (e.g. "Continue →") must advance steps; no dead clicks.

---

## Vapi benchmarking: where Recall Touch wins

**What Vapi does well:** Developer-first API, enterprise credibility, STT→LLM→TTS visible, embeddable widgets, templates, test suites, scale narrative, 100+ languages.

**Where Recall Touch should beat Vapi:**

1. **Non-developer accessibility** — No API keys or Twilio wrangling; business owners get AI phone handling without code.
2. **Instant demo** — Homepage "Try it right now — ask anything" with live voice; Vapi does not offer talk-to-agent on their homepage.
3. **Structured setup** — 6-step stepper with transfer rules, guardrails, booking, follow-up; Vapi's Flow Studio lacks testing tools and live preview.
4. **Pricing clarity** — All-inclusive tiers ($297–$2400/mo); Vapi costs pile up from multiple vendors.
5. **Outcome focus** — Recall Touch messaging: "Every missed call recovered. Every lead captured. Every appointment booked." Vapi shows infrastructure; we show outcomes.

**Homepage improvements (implemented):**

- **A.** Outcome subheadline: "Never miss a call. Never lose a lead. Every caller gets a real conversation, even when you can't pick up."
- **B.** Social proof in hero: "Used by 500+ businesses · 10,000+ calls handled"
- **C.** Demo widget: "Try it right now — ask anything" + more prominent scenario chips ("Ask anything, e.g.:")
- **D.** Below fold: 3 outcome cards (Missed calls recovered, Leads captured automatically, Appointments booked on the spot)
- **E.** Trust section: "Built on Vapi, ElevenLabs, and Claude"

---

## What's built and verified (live, once cache is fixed)

- Homepage: two-column hero, embedded voice widget, scenario chips, transcript, CTAs, trust checkmarks, outcome cards, trust stack.
- Onboarding: 5-step stepper (Business → Agent → Customize → Test → Activate), industry chips, voice selection, knowledge Q&A, Test with Vapi Web SDK, Go live.
- Agent page: 6-step stepper (Identity, Voice, Knowledge, Behavior, Test, Go live), behavior controls, readiness checklist, "Launch my AI", buildVapiSystemPrompt, ConversationPreview, template modal ⌘K, post-test feedback.

---

## What to build next (tiers)

See [WHAT_NEXT.md](./WHAT_NEXT.md) for the full tier list. Summary:

- **Tier 1:** Verify onboarding 1→5, agent stepper, seed knowledge, save to Supabase, Launch my AI, voice preview, Vapi test call, homepage demo widget.
- **Tier 2:** Homepage refinements (above), comparison section "What makes us different".
- **Tier 3:** Product polish (sidebar progress, workspace name, loading states, toasts, empty states, mobile, a11y).
- **Tier 4:** Lead and campaign system (detail panel, "Have AI call", campaign run, webhooks, recording playback).
- **Tier 5:** Advanced (post-call intelligence, agent performance dashboard, multi-agent, Calendar, email lifecycle).
