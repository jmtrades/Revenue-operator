import type { Metadata } from "next";
import { MarketingNavbar } from "@/components/sections/MarketingNavbar";
import { Footer } from "@/components/sections/Footer";
import { Container } from "@/components/ui/Container";
import { SectionLabel } from "@/components/ui/SectionLabel";

const BASE = "https://www.recall-touch.com";

export const metadata: Metadata = {
  title: "Status — Revenue Operator",
  description: "System status and health checks for Revenue Operator.",
  alternates: { canonical: `${BASE}/status` },
  robots: { index: true, follow: true },
  openGraph: {
    title: "Status — Revenue Operator",
    description: "System status and health checks for Revenue Operator.",
    url: `${BASE}/status`,
    siteName: "Revenue Operator",
    type: "website",
  },
};

export const dynamic = "force-dynamic";

/**
 * Shape returned by GET /api/health. Kept in lockstep with that route — if you
 * change the handler's response, update this type AND the status-page tests.
 */
type CheckResult = { ok: boolean; latencyMs: number; note?: string };
type HealthProbe = {
  status: "healthy" | "degraded" | "down";
  checks: Record<string, CheckResult>;
  latencyMs?: number;
  timestamp?: string;
  version?: string;
  region?: string | null;
};

const SUBSYSTEM_LABELS: Record<string, string> = {
  database: "Database",
  voice_server: "Voice server",
  redis: "Rate-limit store",
  telnyx: "Telephony (Telnyx)",
  stripe: "Billing (Stripe)",
};

function formatCheck(result: CheckResult | undefined): string {
  if (!result) return "Unavailable";
  if (result.ok) return `Operational (${result.latencyMs}ms)`;
  if (result.note === "not_configured") return "Not configured";
  return result.note ? `Degraded — ${result.note}` : "Degraded";
}

export default async function StatusPage() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? BASE;
  let health: HealthProbe | null = null;

  try {
    const r = await fetch(`${baseUrl}/api/health`, { cache: "no-store" });
    // /api/health returns 503 on "down" but still has a JSON body, so we read
    // the body regardless of status.
    const json = (await r.json()) as HealthProbe;
    if (json && typeof json.status === "string") health = json;
  } catch {
    // If /api/health is unreachable, we still render the page in a degraded
    // visual state rather than 500-ing.
    health = null;
  }

  const status = health?.status ?? "degraded";
  const isOperational = status === "healthy";
  const badgeStyle = isOperational
    ? { borderColor: "rgb(34 197 94 / 0.35)", background: "rgb(34 197 94 / 0.10)" }
    : { borderColor: "rgb(239 68 68 / 0.35)", background: "rgb(239 68 68 / 0.10)" };
  const headline = isOperational
    ? "Revenue Operator is operational"
    : status === "down"
      ? "Revenue Operator is down"
      : "Revenue Operator is degraded";
  const badgeText = isOperational ? "All systems normal" : "Attention required";
  const checks = health?.checks ?? {};
  const subsystemEntries = Object.keys(SUBSYSTEM_LABELS).map((key) => ({
    key,
    label: SUBSYSTEM_LABELS[key] ?? key,
    result: checks[key],
  }));

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-primary)", color: "var(--text-primary)" }}>
      <MarketingNavbar />
      <main id="main">
        <section className="marketing-section py-20 md:py-28" style={{ background: "var(--bg-primary, #FAFAF8)" }}>
          <Container>
            <div className="max-w-3xl mx-auto text-center">
              <SectionLabel>System Status</SectionLabel>
              <h1 className="font-bold text-4xl md:text-6xl leading-tight">{headline}</h1>
              <p className="mt-4 text-base md:text-lg" style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>
                Live subsystem probes for database, telephony, billing, rate-limit store, and the voice server.
              </p>

              <div className="mt-8 inline-flex items-center gap-3 rounded-2xl border px-5 py-3 text-sm font-semibold" style={{ ...badgeStyle, borderWidth: 1, borderStyle: "solid" }}>
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{
                    background: isOperational ? "rgb(34 197 94)" : "rgb(239 68 68)",
                  }}
                  aria-hidden
                />
                <span>{badgeText}</span>
              </div>
            </div>
          </Container>
        </section>

        <section className="py-10 md:py-16">
          <Container>
            <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4">
              {subsystemEntries.map(({ key, label, result }) => {
                const ok = result?.ok === true;
                const notConfigured = result?.note === "not_configured";
                return (
                  <div
                    key={key}
                    className="rounded-2xl border"
                    style={{ borderColor: "var(--border-default)", background: "var(--bg-inset)", padding: 20 }}
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{label}</p>
                      <span
                        className="inline-block w-2 h-2 rounded-full"
                        aria-hidden
                        style={{
                          background: ok
                            ? "rgb(34 197 94)"
                            : notConfigured
                              ? "rgb(148 163 184)"
                              : "rgb(239 68 68)",
                        }}
                      />
                    </div>
                    <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>
                      {formatCheck(result)}
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="mt-10 pt-8 border-t" style={{ borderColor: "var(--border-default)" }}>
              <p className="text-sm" style={{ color: "var(--text-tertiary)", lineHeight: 1.7 }}>
                Last probed: {health?.timestamp ?? "—"}
                {health?.version ? <> · Build {health.version}</> : null}
                {health?.region ? <> · Region {health.region}</> : null}
              </p>
              <p className="mt-3 text-sm" style={{ color: "var(--text-tertiary)", lineHeight: 1.7 }}>
                This page is informational. For billing questions or outages, reach us via{" "}
                <a href="/contact" style={{ color: "var(--accent-primary)", textDecoration: "underline" }}>
                  contact
                </a>
                .
              </p>
            </div>
          </Container>
        </section>
      </main>
      <Footer />
    </div>
  );
}

