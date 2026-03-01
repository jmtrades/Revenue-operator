"use client";

import Link from "next/link";
import { BookOpen, Code, Shield, Plug, HelpCircle, MessageCircle } from "lucide-react";
import { Navbar } from "@/components/sections/Navbar";
import { Footer } from "@/components/sections/Footer";
import { Container } from "@/components/ui/Container";
import { ROUTES } from "@/lib/constants";
import { motion } from "framer-motion";

const DOC_SIDEBAR = [
  { id: "getting-started", label: "Getting Started" },
  { id: "call-forwarding", label: "Call Forwarding" },
  { id: "ai-agents", label: "Agents" },
  { id: "campaigns", label: "Campaigns" },
  { id: "integrations", label: "Integrations" },
  { id: "api", label: "API Reference" },
  { id: "changelog", label: "Changelog" },
] as const;

const DOC_CARDS = [
  { icon: BookOpen, title: "Getting Started", desc: "Set up your first governed environment in minutes.", href: null },
  { icon: Code, title: "API Reference", desc: "Integrate Recall Touch into your existing systems.", href: null },
  { icon: Shield, title: "Compliance Framework", desc: "Configure jurisdiction, review depth, and controls.", href: null },
  { icon: Plug, title: "Integrations", desc: "Connect Recall Touch with your existing sales and communication tools.", href: null },
  { icon: HelpCircle, title: "FAQ", desc: "Common questions about governance, records, and billing.", href: `${ROUTES.PRICING}#faq` },
  { icon: MessageCircle, title: "Contact Support", desc: "Talk to our team for technical or compliance questions.", href: ROUTES.CONTACT },
];

export default function DocsPage() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3, ease: "easeOut" }} className="min-h-screen" style={{ background: "var(--bg-primary)", color: "var(--text-primary)" }}>
      <Navbar />
      <main className="pt-28 pb-24">
        <Container>
          <div className="flex flex-col lg:flex-row gap-12">
            <aside className="lg:w-56 shrink-0">
              <nav className="sticky top-24 space-y-1" aria-label="Documentation">
                {DOC_SIDEBAR.map(({ id, label }) => (
                  <a
                    key={id}
                    href={`#${id}`}
                    className="block py-1.5 text-sm rounded-md px-2 -ml-2 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {label}
                  </a>
                ))}
              </nav>
            </aside>
            <div className="min-w-0 flex-1 max-w-3xl">
              <div className="max-w-2xl mb-16">
                <p className="section-label mb-4">Documentation</p>
                <h1 className="font-bold text-3xl md:text-4xl mb-4" style={{ letterSpacing: "-0.02em", lineHeight: 1.2 }}>
                  Documentation
                </h1>
                <p className="text-base" style={{ color: "var(--text-secondary)", lineHeight: 1.65 }}>
                  Everything you need to set up and manage governed operations.
                </p>
              </div>

              <section id="getting-started" className="scroll-mt-28 mb-12">
                <h2 className="font-semibold text-xl mb-4" style={{ color: "var(--text-primary)" }}>Getting Started</h2>
                <p className="text-base mb-4" style={{ color: "var(--text-secondary)", lineHeight: 1.65 }}>
                  Set up your first governed environment in minutes. Sign up, add your business details, configure your AI agent, and connect your phone number. Your AI will answer calls and capture leads from day one.
                </p>
                <Link href={ROUTES.START} className="text-sm font-medium" style={{ color: "var(--accent-primary)" }}>Start free →</Link>
              </section>

              <section id="call-forwarding" className="scroll-mt-28 mb-12 pt-8 border-t" style={{ borderColor: "var(--border-default)" }}>
                <h2 className="font-semibold text-xl mb-4" style={{ color: "var(--text-primary)" }}>Call Forwarding</h2>
                <p className="text-base mb-4" style={{ color: "var(--text-secondary)", lineHeight: 1.65 }}>
                  Forward your existing business number to your Recall Touch number, or use the provisioned number as your primary line. Incoming calls are answered by your agent 24/7.
                </p>
                <p className="text-sm mb-2" style={{ color: "var(--text-tertiary)" }}>Carrier-specific steps: AT&T, Verizon, T-Mobile, Comcast, Vonage, Google Voice. Detailed docs coming soon. Email hello@recall-touch.com with questions.</p>
              </section>

              <section id="ai-agents" className="scroll-mt-28 mb-12 pt-8 border-t" style={{ borderColor: "var(--border-default)" }}>
                <h2 className="font-semibold text-xl mb-4" style={{ color: "var(--text-primary)" }}>AI Agents</h2>
                <p className="text-base mb-4" style={{ color: "var(--text-secondary)", lineHeight: 1.65 }}>
                  Configure your AI agent name, voice, greeting, and capabilities. Teach it your services, hours, and how to handle appointments. No coding required.
                </p>
              </section>

              <section id="campaigns" className="scroll-mt-28 mb-12 pt-8 border-t" style={{ borderColor: "var(--border-default)" }}>
                <h2 className="font-semibold text-xl mb-4" style={{ color: "var(--text-primary)" }}>Campaigns</h2>
                <p className="text-base mb-4" style={{ color: "var(--text-secondary)", lineHeight: 1.65 }}>
                  Run outbound follow-up, reminders, and recovery flows. Create campaigns from the dashboard, set audiences and scripts, and track outcomes.
                </p>
              </section>

              <section id="integrations" className="scroll-mt-28 mb-12 pt-8 border-t" style={{ borderColor: "var(--border-default)" }}>
                <h2 className="font-semibold text-xl mb-4" style={{ color: "var(--text-primary)" }}>Integrations</h2>
                <p className="text-base mb-4" style={{ color: "var(--text-secondary)", lineHeight: 1.65 }}>
                  Connect Recall Touch with your phone provider (Twilio), calendar, and CRM. Webhooks and API access available on Business and Enterprise plans.
                </p>
              </section>

              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 my-12">
                {DOC_CARDS.map((card) => (
                  <div
                    key={card.title}
                    className="card-marketing p-6 flex flex-col"
                  >
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-4" style={{ background: "var(--accent-primary-subtle)", color: "var(--accent-primary)" }}>
                      <card.icon className="w-5 h-5" />
                    </div>
                    <h2 className="font-semibold text-lg mb-2" style={{ color: "var(--text-primary)" }}>{card.title}</h2>
                    <p className="text-sm flex-1 mb-4" style={{ color: "var(--text-secondary)", lineHeight: 1.55 }}>{card.desc}</p>
                    {card.href ? (
                      <Link href={card.href} className="text-sm font-medium" style={{ color: "var(--accent-primary)" }}>
                        View →
                      </Link>
                    ) : (
                      <span className="text-xs font-medium px-2.5 py-1 rounded-full inline-block w-fit" style={{ background: "var(--bg-elevated)", color: "var(--text-tertiary)" }}>
                        Coming soon
                      </span>
                    )}
                  </div>
                ))}
              </div>

              <section id="api" className="scroll-mt-28 mt-16 pt-12 border-t" style={{ borderColor: "var(--border-default)" }}>
                <h2 className="font-semibold text-xl mb-4" style={{ color: "var(--text-primary)" }}>API Reference</h2>
                <p className="text-base mb-4" style={{ color: "var(--text-secondary)", lineHeight: 1.65 }}>
                  REST and webhook APIs for integrating Recall Touch with your existing systems are in development. Business and Enterprise plans will include full API access. Contact us for early access.
                </p>
                <Link href={ROUTES.CONTACT} className="text-sm font-medium" style={{ color: "var(--accent-primary)" }}>Contact for API access →</Link>
              </section>

              <section id="changelog" className="scroll-mt-28 mt-16 pt-12 border-t" style={{ borderColor: "var(--border-default)" }}>
                <h2 className="font-semibold text-xl mb-4" style={{ color: "var(--text-primary)" }}>Changelog</h2>
                <div className="space-y-4">
                  <div>
                    <p className="font-medium text-sm mb-1" style={{ color: "var(--text-primary)" }}>v1.0 — March 2026</p>
                    <p className="text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}>
                      Launch. Governed call handling, compliance records, follow-up automation, and multi-channel support.
                    </p>
                  </div>
                </div>
              </section>

              <div className="mt-12 text-center">
                <Link href={ROUTES.START} className="btn-marketing-primary no-underline inline-block">
                  Start free →
                </Link>
              </div>
            </div>
          </div>
        </Container>
      </main>
      <Footer />
    </motion.div>
  );
}
