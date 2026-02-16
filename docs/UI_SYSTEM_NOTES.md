# UI System Notes

**Purpose:** Single reference for the Revenue Operator UI stack and design tokens. Aligns with SYSTEM_DOCTRINE.md and GUARANTEE_CONTRACT.md. No dashboards, no gamification, no monitoring surfaces.

---

## Stack

- **Framework:** Next.js (App Router)
- **Styling:** Tailwind v4 (`@import "tailwindcss"`) + CSS custom properties in `src/app/globals.css`
- **Components:** Custom in `src/components/` and `src/components/ui/` — no shadcn/Radix in this surface
- **Theme:** Defined in `:root` and `@theme inline` in `globals.css`; no separate theme file

---

## Current tokens (globals.css)

| Token group | Variables |
|-------------|-----------|
| Surfaces | `--background`, `--surface`, `--card`, `--border`, `--border-subtle` |
| Text | `--text-primary`, `--text-secondary`, `--text-muted` |
| Semantic | `--accent`, `--accent-hover`, `--meaning-green`, `--meaning-amber`, `--meaning-red`, `--meaning-blue` |
| Radius | `--radius-sm` (6px) … `--radius-xl` (18px) |
| Shadow | `--shadow-sm`, `--shadow-md`, `--shadow-lg` |
| Spacing | `--space-1` (4px) … `--space-12` (48px) |

---

## Component patterns

- **Shell:** `src/components/Shell.tsx` — page wrapper with max width (md: 2xl, lg: 3xl) and stable gutters (px-6/8, py-8).
- **Card:** `src/components/ui/Card.tsx` — premium container: `var(--card)`, soft border, `var(--radius-container)`, generous padding.
- **HandoffList:** `src/components/HandoffList.tsx` — handoff cards (who, when, decision_needed + Open). Used when handoffs exist; no previews, no counts.
- **StatusLine:** `src/components/StatusLine.tsx` — single muted operational line.
- **PrimaryAction / SecondaryAction:** `src/components/PrimaryAction.tsx`, `SecondaryAction.tsx` — one primary CTA style, one quiet secondary; both support `focus-ring` for a11y.
- **Empty/loading:** `EmptyState`, `LoadingState` in `src/components/ui/` — single sentence, no counters.
- **Buttons/links:** Use `focus-ring` class for keyboard focus (defined in globals.css).

---

## Where theme is defined

- **Only:** `src/app/globals.css` — `:root` for CSS variables, `@theme inline` for Tailwind mapping, `@layer utilities` for semantic color classes (e.g. `.text-meaning-green`).

---

## Doctrine constraints (UI)

- No charts, totals, “saved today” blocks, live feeds, or countdowns
- No “monitoring”, “tracking”, “next check” in user-facing copy
- Present tense, actorless: “Operating normally.” “Decision progressed.” “Handling resumes after your decision.”
- Handoffs interrupt clearly: “You are now the decision owner.” + “Open” to lead
