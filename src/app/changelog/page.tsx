import type { Metadata } from "next";
import Link from "next/link";
import { MarketingNavbar } from "@/components/sections/MarketingNavbar";
import { Footer } from "@/components/sections/Footer";
import { Container } from "@/components/ui/Container";

const BASE = "https://www.recall-touch.com";

export const metadata: Metadata = {
  title: "Changelog",
  description:
    "Release notes for Revenue Operator — new capabilities, improvements, fixes, and security changes, ordered by release date.",
  alternates: { canonical: `${BASE}/changelog` },
  robots: { index: true, follow: true },
  openGraph: {
    title: "Changelog — Revenue Operator",
    description:
      "Release notes for Revenue Operator. New capabilities, improvements, fixes, and security changes.",
    url: `${BASE}/changelog`,
    siteName: "Revenue Operator",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary",
    title: "Changelog — Revenue Operator",
    description: "Release notes for Revenue Operator.",
  },
};

// -----------------------------------------------------------------------------
// Release entries.
//
// Kept as a typed, in-file constant so:
//   1. The page renders without a DB or CMS round-trip.
//   2. Entries ship through the same CI/CD path as the code they describe —
//      if the release didn't ship, the changelog entry doesn't ship.
//   3. We can statically pre-render the page and serve it from the edge.
// -----------------------------------------------------------------------------

type EntryKind = "added" | "improved" | "fixed" | "security";

type ChangelogEntry = {
  kind: EntryKind;
  text: string;
};

type Release = {
  /** ISO date (YYYY-MM-DD) — used as the key and for the visible heading. */
  date: string;
  /** Optional semver or marketing version. */
  version?: string;
  /** Short summary above the bulleted list. */
  summary: string;
  entries: ChangelogEntry[];
};

const KIND_LABEL: Record<EntryKind, string> = {
  added: "Added",
  improved: "Improved",
  fixed: "Fixed",
  security: "Security",
};

const KIND_STYLE: Record<EntryKind, { bg: string; fg: string; border: string }> = {
  added: { bg: "rgba(52, 211, 153, 0.12)", fg: "#34d399", border: "rgba(52, 211, 153, 0.28)" },
  improved: { bg: "rgba(96, 165, 250, 0.12)", fg: "#60a5fa", border: "rgba(96, 165, 250, 0.28)" },
  fixed: { bg: "rgba(251, 191, 36, 0.12)", fg: "#fbbf24", border: "rgba(251, 191, 36, 0.28)" },
  security: { bg: "rgba(248, 113, 113, 0.12)", fg: "#f87171", border: "rgba(248, 113, 113, 0.28)" },
};

// Most recent first. Dates are ISO for stable sort + JSON-LD.
const RELEASES: Release[] = [
  {
    date: "2026-04-22",
    version: "v4.2",
    summary:
      "Observability + revenue-core integration. Every dashboard attention item now carries a stable action_id and dollar-denominated impact.",
    entries: [
      {
        kind: "added",
        text: "Daily attention list now routes through the revenue-core planner — monetized priority, deterministic action IDs, severity-aware capacity.",
      },
      {
        kind: "added",
        text: "Structured request-ID correlation across every App Router handler; request_id surfaces in every log line.",
      },
      {
        kind: "added",
        text: "PostHog event catalog with typed payloads; anonymous distinctId fallback so pre-signup funnels are measurable.",
      },
      {
        kind: "improved",
        text: "/status page now reads the real health probe shape and renders per-subsystem state instead of a single aggregate string.",
      },
      {
        kind: "security",
        text: "API route auth invariant ratchet — baseline of authenticated routes is now enforced in CI and only ever decreases.",
      },
    ],
  },
  {
    date: "2026-04-05",
    version: "v4.1",
    summary:
      "Landing-page and conversion rebuild — clearer value proof, faster LCP, schema-marked pricing page.",
    entries: [
      {
        kind: "added",
        text: "New marketing hero + proof grid; load-on-scroll secondary sections for sub-1.2s LCP on 4G.",
      },
      {
        kind: "improved",
        text: "Pricing page rewritten around outcome tiers; structured Product + Offer JSON-LD for rich results.",
      },
      {
        kind: "fixed",
        text: "Mobile nav contrast ratios raised to AAA on all brand backgrounds.",
      },
    ],
  },
  {
    date: "2026-03-18",
    version: "v4.0",
    summary:
      "Revenue-core library — Money/ISO/branded primitives + composer upgrades for dedup, capacity, and stable IDs.",
    entries: [
      {
        kind: "added",
        text: "Shared revenue primitives: integer-minor Money, branded IDs, validated ISO dates.",
      },
      {
        kind: "added",
        text: "Master composer upgrades: cross-category dedup, monetized impact, per-owner capacity, append-only audit trail.",
      },
      {
        kind: "added",
        text: "Property-based invariants across all composers — a random 500-run suite shrinks counterexamples to a minimum failure.",
      },
    ],
  },
  {
    date: "2026-02-24",
    version: "v3.8",
    summary:
      "Forecasting + cohort analytics — stage-weighted pipeline forecasts, confidence intervals, and cohort retention/churn.",
    entries: [
      {
        kind: "added",
        text: "Pipeline forecasting with velocity-adjusted stage probabilities and category rollup.",
      },
      {
        kind: "added",
        text: "Deal win simulator — what-if over discount, next-step, and champion strength.",
      },
      {
        kind: "added",
        text: "Cohort retention and churn forecast with MoM decay.",
      },
    ],
  },
  {
    date: "2026-01-14",
    version: "v3.6",
    summary:
      "Compliance and consent — TCPA v2 holidays, state-specific DNC, GDPR/CCPA data-subject handling.",
    entries: [
      {
        kind: "security",
        text: "Federal + state DNC scrub orchestrator; wrong-number and reassigned-number detection in the call path.",
      },
      {
        kind: "security",
        text: "GDPR / CCPA data-subject request handler with audit log + deletion proof.",
      },
      {
        kind: "improved",
        text: "Consent revocation mid-call — detects and hard-stops recording/transcription.",
      },
    ],
  },
  {
    date: "2025-12-02",
    version: "v3.4",
    summary:
      "Agent system — activation API, evaluation harness, safety guardrails, HITL approval timers.",
    entries: [
      {
        kind: "added",
        text: "Text guardrails: PII redaction, prompt-injection detection, leaked-secret filters.",
      },
      {
        kind: "added",
        text: "Evaluation harness with calibration and backtesting across historical call outcomes.",
      },
      {
        kind: "added",
        text: "Human-in-the-loop approval timers for high-stakes decisions; auto-escalation on TTL expiry.",
      },
    ],
  },
];

// JSON-LD emits a Blog-style schema so search engines can surface release
// entries as dated news items — cheaper than a bespoke NewsArticle per row.
function jsonLdFor(releases: Release[]): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: "Revenue Operator Changelog",
    url: `${BASE}/changelog`,
    blogPost: releases.map((r) => ({
      "@type": "BlogPosting",
      headline: r.version ? `${r.version} — ${r.date}` : r.date,
      datePublished: r.date,
      url: `${BASE}/changelog#${r.date}`,
      description: r.summary,
      author: { "@type": "Organization", name: "Revenue Operator" },
    })),
  };
}

function Badge({ kind }: { kind: EntryKind }) {
  const s = KIND_STYLE[kind];
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium mr-3 align-middle"
      style={{
        background: s.bg,
        color: s.fg,
        border: `1px solid ${s.border}`,
        minWidth: 66,
        justifyContent: "center",
      }}
    >
      {KIND_LABEL[kind]}
    </span>
  );
}

export default function ChangelogPage() {
  return (
    <div className="min-h-screen" style={{ background: "var(--bg-primary)", color: "var(--text-primary)" }}>
      <MarketingNavbar />
      <main className="pt-28 pb-24">
        <Container>
          <article className="max-w-[760px] mx-auto">
            <header className="mb-10">
              <h1 className="font-bold text-3xl mb-2" style={{ letterSpacing: "-0.02em" }}>
                Changelog
              </h1>
              <p className="text-sm mb-4" style={{ color: "var(--text-tertiary)" }}>
                Every meaningful shipped change, most recent first. For product tours see{" "}
                <Link href="/docs" className="underline" style={{ color: "var(--accent-primary)" }}>
                  /docs
                </Link>{" "}
                and for live system health see{" "}
                <Link href="/status" className="underline" style={{ color: "var(--accent-primary)" }}>
                  /status
                </Link>
                .
              </p>
            </header>

            <script
              type="application/ld+json"
              dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdFor(RELEASES)) }}
            />

            <ol className="list-none pl-0 space-y-12 m-0">
              {RELEASES.map((r) => (
                <li key={r.date} id={r.date} className="scroll-mt-28">
                  <div className="flex items-baseline justify-between mb-2">
                    <h2 className="font-semibold text-xl" style={{ color: "var(--text-primary)" }}>
                      {r.version ? `${r.version}` : r.date}
                    </h2>
                    <time
                      dateTime={r.date}
                      className="text-sm"
                      style={{ color: "var(--text-tertiary)", fontVariantNumeric: "tabular-nums" }}
                    >
                      {r.date}
                    </time>
                  </div>
                  <p
                    className="text-base mb-4"
                    style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}
                  >
                    {r.summary}
                  </p>
                  <ul
                    className="list-none pl-0 space-y-3 text-base"
                    style={{ color: "var(--text-secondary)", lineHeight: 1.55 }}
                  >
                    {r.entries.map((e, i) => (
                      <li key={i} className="flex items-start">
                        <Badge kind={e.kind} />
                        <span>{e.text}</span>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ol>

            <section
              className="mt-16 pt-8"
              style={{ borderTop: "1px solid var(--border-default)" }}
            >
              <h2 className="font-semibold text-lg mb-2" style={{ color: "var(--text-primary)" }}>
                Subscribe to changes
              </h2>
              <p className="text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}>
                Contact{" "}
                <a
                  href="mailto:support@recall-touch.com"
                  className="underline"
                  style={{ color: "var(--accent-primary)" }}
                >
                  support@recall-touch.com
                </a>{" "}
                to be added to release-note emails, or watch{" "}
                <Link href="/status" className="underline" style={{ color: "var(--accent-primary)" }}>
                  /status
                </Link>{" "}
                for live incident and maintenance notices.
              </p>
            </section>
          </article>
        </Container>
      </main>
      <Footer />
    </div>
  );
}
