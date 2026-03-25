import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { Navbar } from "@/components/sections/Navbar";
import dynamic from "next/dynamic";
import { Shield, Zap, Lock, Server, Phone, CheckCircle } from "lucide-react";

const Footer = dynamic(
  () => import("@/components/sections/Footer").then((m) => m.Footer),
);

export const metadata: Metadata = {
  title: "About Recall Touch — AI Revenue Operations Platform",
  description:
    "Recall Touch is the AI revenue operations platform that handles inbound calls, outbound campaigns, follow-ups, bookings, no-show recovery, and lead qualification for every industry.",
  openGraph: {
    title: "About Recall Touch",
    description:
      "AI revenue operations platform — inbound calls, outbound campaigns, follow-ups, bookings, and revenue recovery for every business.",
    url: "https://www.recall-touch.com/about",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "About Recall Touch",
    description: "AI revenue operations platform — calls, campaigns, follow-ups, bookings, and recovery for every industry.",
  },
};

const TRUST_ITEMS = [
  { icon: Shield, title: "TCPA Compliant", desc: "Consent tracking, per-contact suppression, and DNC registry support built into every call." },
  { icon: Lock, title: "256-bit Encryption", desc: "All data encrypted in transit and at rest. HMAC-SHA256 authentication on every request." },
  { icon: Server, title: "Workspace Isolation", desc: "Row-level security ensures your data is never accessible to other accounts." },
  { icon: CheckCircle, title: "SOC 2 Type II", desc: "Security audit in progress. Enterprise-grade access controls and monitoring." },
  { icon: Phone, title: "HIPAA Ready", desc: "Business Associate Agreements available for healthcare customers." },
  { icon: Zap, title: "99.9% Uptime Target", desc: "Redundant infrastructure with real-time monitoring and alerting." },
];

export default function AboutPage() {
  return (
    <div
      className="min-h-screen"
      style={{ background: "var(--bg-primary)", color: "var(--text-primary)" }}
    >
      <Navbar initialAuthenticated={false} />
      <main>
        {/* Hero */}
        <section className="pt-28 pb-16 md:pt-36 md:pb-24">
          <Container>
            <div className="max-w-3xl mx-auto text-center">
              <div
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium mb-6"
                style={{
                  background: "var(--accent-primary-subtle)",
                  color: "var(--accent-primary)",
                  border: "1px solid rgba(37, 99, 235, 0.1)",
                }}
              >
                About Recall Touch
              </div>
              <h1
                className="font-semibold mb-5"
                style={{
                  fontSize: "clamp(2rem, 4vw, 3rem)",
                  letterSpacing: "-0.035em",
                  lineHeight: 1.12,
                }}
              >
                No service business should lose revenue to an unanswered phone.
              </h1>
              <p
                className="text-base md:text-lg max-w-2xl mx-auto leading-relaxed"
                style={{ color: "var(--text-secondary)" }}
              >
                Recall Touch was built to solve a simple problem: service businesses lose
                thousands of dollars every month from calls they can&apos;t answer, appointments
                that don&apos;t show, and leads that never get followed up. We built the AI
                to fix that.
              </p>
            </div>
          </Container>
        </section>

        {/* Mission */}
        <section className="pb-16 md:pb-24">
          <Container>
            <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-12 items-start">
              <div>
                <h2
                  className="text-xl md:text-2xl font-semibold mb-4"
                  style={{ letterSpacing: "-0.02em" }}
                >
                  Built different. On purpose.
                </h2>
                <p
                  className="text-sm leading-relaxed mb-4"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Most &ldquo;AI phone&rdquo; products are thin wrappers over third-party APIs.
                  They rent their voice, rent their intelligence, and pass the cost to you.
                </p>
                <p
                  className="text-sm leading-relaxed"
                  style={{ color: "var(--text-secondary)" }}
                >
                  We built our own voice infrastructure from the ground up — proprietary
                  text-to-speech, real-time speech recognition, professional audio processing,
                  and an intelligence layer that learns from every conversation. This gives us
                  better quality, faster response times, and dramatically lower costs than
                  anyone relying on off-the-shelf AI.
                </p>
              </div>
              <div>
                <h2
                  className="text-xl md:text-2xl font-semibold mb-4"
                  style={{ letterSpacing: "-0.02em" }}
                >
                  Revenue recovery, not phone answering.
                </h2>
                <p
                  className="text-sm leading-relaxed mb-4"
                  style={{ color: "var(--text-secondary)" }}
                >
                  We don&apos;t think of ourselves as a phone system. We&apos;re a revenue
                  recovery platform. Every feature we build is measured by one question:
                  does this recover more money for our customers?
                </p>
                <p
                  className="text-sm leading-relaxed"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Call handling, no-show rebooking, lead reactivation, intelligent
                  follow-up — these aren&apos;t features. They&apos;re the revenue your
                  business is already losing. We just get it back.
                </p>
              </div>
            </div>
          </Container>
        </section>

        {/* Technology */}
        <section
          className="py-16 md:py-24"
          style={{ background: "var(--bg-surface)", borderTop: "1px solid var(--border-default)", borderBottom: "1px solid var(--border-default)" }}
        >
          <Container>
            <div className="max-w-3xl mx-auto text-center mb-12">
              <h2
                className="text-xl md:text-2xl font-semibold mb-3"
                style={{ letterSpacing: "-0.02em" }}
              >
                Proprietary technology. Real advantage.
              </h2>
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                Our self-hosted AI infrastructure delivers better quality at lower cost.
              </p>
            </div>
            <div className="max-w-4xl mx-auto grid sm:grid-cols-3 gap-6">
              {[
                { stat: "<200ms", label: "Voice response time", desc: "Sub-200ms time to first byte. Faster than human reaction time." },
                { stat: "38+", label: "AI voices", desc: "Curated voices across 9 accents. Each optimized for professional communication." },
                { stat: "10-20x", label: "Cost advantage", desc: "Self-hosted infrastructure vs. third-party API pricing. Savings passed to you." },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl p-6"
                  style={{ background: "var(--bg-primary)", border: "1px solid var(--border-default)" }}
                >
                  <p
                    className="text-3xl font-bold mb-1"
                    style={{ color: "var(--accent-primary)" }}
                  >
                    {item.stat}
                  </p>
                  <p className="text-sm font-semibold mb-2">{item.label}</p>
                  <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </Container>
        </section>

        {/* Trust */}
        <section className="py-16 md:py-24">
          <Container>
            <div className="max-w-3xl mx-auto text-center mb-12">
              <h2
                className="text-xl md:text-2xl font-semibold mb-3"
                style={{ letterSpacing: "-0.02em" }}
              >
                Trust is not optional.
              </h2>
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                Your customers trust you with their calls. You need to trust us with yours.
              </p>
            </div>
            <div className="max-w-4xl mx-auto grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {TRUST_ITEMS.map((item) => (
                <div
                  key={item.title}
                  className="rounded-xl p-5"
                  style={{ background: "var(--bg-surface)", border: "1px solid var(--border-default)" }}
                >
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center mb-3"
                    style={{ background: "var(--accent-primary-subtle)" }}
                  >
                    <item.icon className="w-5 h-5" style={{ color: "var(--accent-primary)" }} />
                  </div>
                  <p className="text-sm font-semibold mb-1">{item.title}</p>
                  <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
            <div className="max-w-3xl mx-auto text-center mt-8">
              <Link
                href="/security"
                className="text-sm font-medium hover:underline"
                style={{ color: "var(--accent-primary)" }}
              >
                View full security documentation &rarr;
              </Link>
            </div>
          </Container>
        </section>

        {/* CTA */}
        <section
          className="py-16 md:py-24"
          style={{ background: "var(--bg-surface)", borderTop: "1px solid var(--border-default)" }}
        >
          <Container>
            <div className="max-w-2xl mx-auto text-center">
              <h2
                className="text-xl md:text-2xl font-semibold mb-4"
                style={{ letterSpacing: "-0.02em" }}
              >
                Ready to automate your revenue operations?
              </h2>
              <p
                className="text-sm mb-6"
                style={{ color: "var(--text-secondary)" }}
              >
                14-day free trial. No credit card required. See results in 24 hours.
              </p>
              <Link
                href="/activate"
                className="btn-marketing-blue btn-lg no-underline inline-flex items-center gap-2"
              >
                Start recovering revenue
              </Link>
            </div>
          </Container>
        </section>
      </main>
      <Footer />
    </div>
  );
}
