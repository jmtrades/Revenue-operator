import type { Metadata } from "next";
import { Navbar } from "@/components/sections/Navbar";
import { Footer } from "@/components/sections/Footer";
import { Container } from "@/components/ui/Container";
import { SectionLabel } from "@/components/ui/SectionLabel";

const BASE = "https://www.recall-touch.com";

export const metadata: Metadata = {
  title: "Status — Recall Touch",
  description: "System status and health checks for Recall Touch.",
  alternates: { canonical: `${BASE}/status` },
  robots: { index: true, follow: true },
  openGraph: {
    title: "Status — Recall Touch",
    description: "System status and health checks for Recall Touch.",
    url: `${BASE}/status`,
    siteName: "Recall Touch",
    type: "website",
  },
};

export const dynamic = "force-dynamic";

export default async function StatusPage() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? BASE;
  type HealthProbe = {
    ok?: boolean;
    status?: string;
    database?: string;
    stripe?: string;
    stripe_prices?: Record<string, boolean>;
    has_stripe_secret?: boolean;
    has_stripe_webhook_secret?: boolean;
    last_cron_execution?: { commitment_recovery?: string | null; settlement_export?: string | null };
  };

  let health: HealthProbe | null = null;

  try {
    const r = await fetch(`${baseUrl}/api/health`, { cache: "no-store" });
    if (r.ok) health = (await r.json()) as HealthProbe;
  } catch {
    // If /api/health is unreachable, we still render the page.
    health = null;
  }

  const status = health?.status ?? "degraded";
  const badgeStyle =
    status === "ok"
      ? { borderColor: "rgb(34 197 94 / 0.35)", background: "rgb(34 197 94 / 0.10)" }
      : { borderColor: "rgb(239 68 68 / 0.35)", background: "rgb(239 68 68 / 0.10)" };

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-primary)", color: "var(--text-primary)" }}>
      <Navbar />
      <main id="main">
        <section className="marketing-section py-20 md:py-28" style={{ background: "var(--bg-primary, #FAFAF8)" }}>
          <Container>
            <div className="max-w-3xl mx-auto text-center">
              <SectionLabel>System Status</SectionLabel>
              <h1 className="font-bold text-4xl md:text-6xl leading-tight">Recall Touch is {status === "ok" ? "operational" : "degraded"}</h1>
              <p className="mt-4 text-base md:text-lg" style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>
                Live health checks for hosting, database, and billing webhooks.
              </p>

              <div className="mt-8 inline-flex items-center gap-3 rounded-2xl border px-5 py-3 text-sm font-semibold" style={{ ...badgeStyle, borderWidth: 1, borderStyle: "solid" }}>
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{
                    background: status === "ok" ? "rgb(34 197 94)" : "rgb(239 68 68)",
                  }}
                  aria-hidden
                />
                <span>{status === "ok" ? "All systems normal" : "Attention required"}</span>
              </div>
            </div>
          </Container>
        </section>

        <section className="py-10 md:py-16">
          <Container>
            <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-2xl border bg-white/0" style={{ borderColor: "var(--border-default)", background: "var(--bg-inset)", padding: 20 }}>
                <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Database</p>
                <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>
                  {health?.database ? `Probe result: ${health.database}` : "Unavailable"}
                </p>
              </div>

              <div className="rounded-2xl border" style={{ borderColor: "var(--border-default)", background: "var(--bg-inset)", padding: 20 }}>
                <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Billing (Stripe)</p>
                <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>
                  {health?.stripe ? `Probe result: ${health.stripe}` : "Unavailable"}
                </p>
              </div>

              <div className="rounded-2xl border" style={{ borderColor: "var(--border-default)", background: "var(--bg-inset)", padding: 20 }}>
                <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Cron heartbeats</p>
                <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>
                  Commitment recovery: {health?.last_cron_execution?.commitment_recovery ?? "—"}
                  <br />
                  Settlement export: {health?.last_cron_execution?.settlement_export ?? "—"}
                </p>
              </div>

              <div className="rounded-2xl border" style={{ borderColor: "var(--border-default)", background: "var(--bg-inset)", padding: 20 }}>
                <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Stripe configuration</p>
                <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>
                  Secret key: {health?.has_stripe_secret ? "set" : "missing"}
                  <br />
                  Webhook secret: {health?.has_stripe_webhook_secret ? "set" : "missing"}
                </p>
              </div>
            </div>

            <div className="mt-10 pt-8 border-t" style={{ borderColor: "var(--border-default)" }}>
              <p className="text-sm" style={{ color: "var(--text-tertiary)", lineHeight: 1.7 }}>
                This page is informational. For billing questions or outages, contact support via{" "}
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

