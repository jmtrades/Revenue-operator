# Recall Touch — Implementation Brief V5 (Concise)

## Goal
Ship the **Revenue Execution OS** experience end-to-end:
- Faster time-to-value (industry → configured agent → test call)
- ROI-led retention (revenue recovered everywhere)
- Trust + control (reviewability, guardrails, auditability)

## Immediate build order (V5)
1. **Homepage conversion pass (V5 wireframe)**
   - Hero copy + trust bar + “Revenue recovered” widget
   - Problem → solution → how-it-works
   - Mode selector, ROI calculator, industries grid
   - Case studies/testimonials, comparison, FAQ, final CTA
2. **Mode-first onboarding**
   - Persist `mode` + `industry` on workspace
   - Seed templates/agent defaults from `industry_templates`
3. **ROI surfaces**
   - Dashboard hero = revenue recovered
   - Analytics: trend + attribution
4. **Operational reliability**
   - Cron jobs (digest/rollups), bounded queries, no silent halts
5. **Voice margin roadmap**
   - Self-hosted TTS/STT path with safe fallback

## Non-negotiables
- **No blue/indigo/purple primary buttons**: primary CTA stays **white** (per Recall Touch doctrine).
- **Dark theme only**, premium surfaces, no placeholders.
- **Build/lint/tsc must pass** on every increment.

## Full original source
- See the full V5 brief in transcript: `[Recall Touch V5 transcript](72a13691-a7c3-46a3-bbe7-902ae497d25e)`

