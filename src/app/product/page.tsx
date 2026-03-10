import Link from "next/link";
import { Navbar } from "@/components/sections/Navbar";
import { Footer } from "@/components/sections/Footer";
import { Container } from "@/components/ui/Container";
import { ROUTES } from "@/lib/constants";

const PRODUCT_SECTIONS = [
  { id: "answers-every-call", title: "Answers every call", desc: "Your AI picks up on the first ring, 24/7/365. No voicemail. No hold music. Natural conversational voice handles everything from simple questions to complex scheduling. Whether it's 2 AM or your busiest hour, every caller gets the same professional experience.", bullets: ["First ring answer", "24/7/365", "Natural voice", "No voicemail"] },
  { id: "outbound", title: "Makes outbound calls", desc: "New web lead? Your AI calls back within 60 seconds. Appointment tomorrow? Confirmation call the evening before. No-show? Automatic reschedule. Customer hasn't returned in 6 months? Reactivation follow-up. Your AI follows up so your team handles work that requires a human.", bullets: ["60-second callback", "Appointment reminders", "No-show recovery", "Reactivation"] },
  { id: "agents", title: "Agent studio", desc: "Build your AI agent without code. Start from 20+ templates or from scratch. Choose voice, personality, greeting, knowledge base, business rules. Test with a real call before going live. Edit anytime — changes are instant.", bullets: ["No code", "20+ templates", "Voice & personality", "Test before live"] },
  { id: "leads", title: "Lead capture & scoring", desc: "Every call auto-extracts name, phone, address, what they need, urgency. Each lead scored 0-100 on intent signals. Instant text + email notification. No more sticky notes or forgotten follow-ups.", bullets: ["Auto-extract details", "Score 0-100", "Instant alerts", "Activity feed"] },
  { id: "appointments", title: "Appointment booking", desc: "Checks Google Calendar or Outlook in real-time, offers available slots, books, confirms via text. Sends reminders before. Reschedules no-shows automatically. Calendar stays full without you lifting a finger.", bullets: ["Calendar sync", "Real-time availability", "Confirmations & reminders", "No-show reschedule"] },
  { id: "messaging", title: "Smart messaging", desc: "Two-way SMS from your business number. Auto-confirmations after bookings. Follow-up sequences for leads who didn't convert. Review requests after appointments. One inbox for all conversations.", bullets: ["Two-way SMS", "Auto-confirmations", "Follow-up sequences", "One inbox"] },
  { id: "insights", title: "Analytics & ROI", desc: "Call volume, answer rate, lead conversion, appointment completion, revenue recovered. Usage meter shows minutes vs plan. Monthly ROI statement: your AI captured X leads, booked Y appointments worth $Z. Starter plan: $297. ROI: clear.", bullets: ["Call volume & answer rate", "Lead conversion", "Revenue recovered", "Usage meter"] },
  { id: "compliance", title: "Compliance", desc: "Every call recorded and transcribed. HIPAA mode available. Retention 30-365 days. Full audit trail. Data export. Industry-ready documentation.", bullets: ["Recording & transcription", "HIPAA option", "Retention 30-365 days", "Audit trail"] },
] as const;

export const metadata = {
  title: "Product",
  description:
    "One platform for every phone interaction — inbound calls, outbound campaigns, SMS, scheduling, lead capture, and analytics.",
};

export default function ProductPage() {
  return (
    <div
      className="min-h-screen"
      style={{ background: "var(--bg-primary)", color: "var(--text-primary)" }}
    >
      <Navbar />
      <main className="pt-28 pb-24">
        <Container>
          <section className="max-w-3xl mb-16">
            <p className="section-label mb-4">Product</p>
            <h1
              className="font-bold text-3xl md:text-4xl mb-6"
              style={{ letterSpacing: "-0.02em", lineHeight: 1.2 }}
            >
              One platform. Every phone interaction.
            </h1>
            <p
              className="text-lg"
              style={{ color: "var(--text-secondary)", lineHeight: 1.65 }}
            >
              Handle every call, text, and follow-up. Book appointments. Qualify
              leads. See everything in one dashboard.
            </p>
          </section>

          <section className="mb-20">
            <h2
              className="font-semibold text-xl mb-8"
              style={{ color: "var(--text-primary)" }}
            >
              Core capabilities
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {PRODUCT_SECTIONS.map((s) => (
                <div key={s.id} id={s.id} className="card-marketing p-5 flex flex-col">
                  <h3
                    className="font-semibold text-base mb-2"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {s.title}
                  </h3>
                  <p
                    className="text-sm flex-1"
                    style={{ color: "var(--text-secondary)", lineHeight: 1.55 }}
                  >
                    {s.desc}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="mt-16 pt-12 border-t" style={{ borderColor: "var(--border-default)" }}>
            <h2
              className="font-semibold text-xl mb-8 text-center"
              style={{ color: "var(--text-primary)" }}
            >
              Use cases
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="card-marketing p-6 flex flex-col">
                <h3
                  className="font-semibold text-lg mb-2"
                  style={{ color: "var(--text-primary)" }}
                >
                  For businesses
                </h3>
                <p
                  className="text-sm flex-1"
                  style={{ color: "var(--text-secondary)", lineHeight: 1.65 }}
                >
                  Solo operators to growing teams. Answer every call, book appointments,
                  capture leads, and follow up — without hiring a front desk.
                </p>
                <Link
                  href={ROUTES.START}
                  className="text-sm font-medium mt-4 inline-block"
                  style={{ color: "var(--accent-primary)" }}
                >
                  Get started →
                </Link>
              </div>
              <div className="card-marketing p-6 flex flex-col">
                <h3
                  className="font-semibold text-lg mb-2"
                  style={{ color: "var(--text-primary)" }}
                >
                  For teams
                </h3>
                <p
                  className="text-sm flex-1"
                  style={{ color: "var(--text-secondary)", lineHeight: 1.65 }}
                >
                  Multi-location, agencies, and distributed teams. One platform, one
                  standard. Consistent answers and full visibility.
                </p>
                <Link
                  href={ROUTES.START}
                  className="text-sm font-medium mt-4 inline-block"
                  style={{ color: "var(--accent-primary)" }}
                >
                  Get started →
                </Link>
              </div>
              <div className="card-marketing p-6 flex flex-col">
                <h3
                  className="font-semibold text-lg mb-2"
                  style={{ color: "var(--text-primary)" }}
                >
                  For developers
                </h3>
                <p
                  className="text-sm flex-1"
                  style={{ color: "var(--text-secondary)", lineHeight: 1.65 }}
                >
                  API, webhooks, and integrations. Build Recall Touch into your stack
                  and keep every conversation documented.
                </p>
                <Link
                  href={ROUTES.DOCS}
                  className="text-sm font-medium mt-4 inline-block"
                  style={{ color: "var(--accent-primary)" }}
                >
                  Documentation →
                </Link>
              </div>
            </div>
          </section>

          <section
            className="mt-20 mb-20 py-12 px-6 rounded-2xl border"
            style={{ borderColor: "var(--border-default)", background: "var(--bg-surface)" }}
          >
            <h2
              className="font-semibold text-xl mb-4"
              style={{ color: "var(--text-primary)" }}
            >
              Compliance & governance
            </h2>
            <p
              className="text-base mb-4"
              style={{ color: "var(--text-secondary)", lineHeight: 1.65 }}
            >
              Every call is recorded and transcribed. Governed records, audit trail, and
              chain of custody. HIPAA mode available. Retention 30–365 days. Data export
              and industry-ready documentation. When your industry requires it, Recall
              Touch is built for it.
            </p>
            <ul className="space-y-1.5 text-sm" style={{ color: "var(--text-secondary)" }}>
              <li>
                Recording & transcription · HIPAA option · Retention 30–365 days · Audit
                trail
              </li>
            </ul>
          </section>

          <section
            className="mt-24 py-16 text-center"
            style={{
              background: "var(--gradient-cta-section)",
              borderTop: "1px solid var(--border-default)",
              borderBottom: "1px solid var(--border-default)",
            }}
          >
            <p
              className="text-sm font-medium mb-4"
              style={{ color: "var(--accent-primary)" }}
            >
              Recall Touch starts at $297/month and takes 5 minutes to set up.
            </p>
            <h2
              className="font-semibold text-2xl mb-4"
              style={{ color: "var(--text-primary)" }}
            >
              Ready to handle every call, text, and follow-up automatically?
            </h2>
            <p
              className="text-base mb-8 max-w-xl mx-auto"
              style={{ color: "var(--text-secondary)" }}
            >
              Start in under 60 seconds. No credit card required.
            </p>
            <Link
              href={ROUTES.START}
              className="btn-marketing-primary btn-lg no-underline inline-block"
            >
              Start free → takes 5 minutes
            </Link>
            <p
              className="text-sm mt-6"
              style={{ color: "var(--text-tertiary)" }}
            >
              Or:{" "}
              <Link
                href={ROUTES.CONTACT}
                className="underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] rounded"
                style={{ color: "var(--text-tertiary)" }}
              >
                Book a demo
              </Link>
              {" · "}
              <Link
                href={ROUTES.DOCS}
                className="underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] rounded"
                style={{ color: "var(--text-tertiary)" }}
              >
                View documentation
              </Link>
            </p>
          </section>
        </Container>
      </main>
      <Footer />
    </div>
  );
}

