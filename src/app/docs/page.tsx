"use client";

import Link from "next/link";
import { BookOpen, Code, Shield, Plug, HelpCircle, MessageCircle } from "lucide-react";
import { Navbar } from "@/components/sections/Navbar";
import { Footer } from "@/components/sections/Footer";
import { Container } from "@/components/ui/Container";
import { ROUTES } from "@/lib/constants";
import { motion } from "framer-motion";

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
          <div className="max-w-2xl mb-16">
            <p className="section-label mb-4">Documentation</p>
            <h1 className="font-bold text-3xl md:text-4xl mb-4" style={{ letterSpacing: "-0.02em", lineHeight: 1.2 }}>
              Documentation
            </h1>
            <p className="text-base" style={{ color: "var(--text-secondary)", lineHeight: 1.65 }}>
              Everything you need to set up and manage governed operations.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
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
          <div className="mt-12 text-center">
            <Link href={ROUTES.START} className="btn-marketing-primary no-underline inline-block">
              Start free →
            </Link>
          </div>
        </Container>
      </main>
      <Footer />
    </motion.div>
  );
}
