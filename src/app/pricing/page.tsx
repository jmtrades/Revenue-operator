"use client";

import { useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { Navbar } from "@/components/sections/Navbar";
import { Footer } from "@/components/sections/Footer";
import { Container } from "@/components/ui/Container";
import { AccordionItem } from "@/components/ui/Accordion";
import { PRICING_TIERS, PRICING_FAQ, COMPARISON_FEATURES, ROUTES } from "@/lib/constants";
import { motion } from "framer-motion";

/** Licensed per operator. Monthly/annual toggle. */

export const ANNUAL_NOTE = "Two months applied without interruption on annual commitment.";

export function pricingCopyForTests(): string {
  return [
    "Less than one missed call",
    "Starter",
    "Professional",
    "Business",
    "Enterprise",
    "Start free",
    "Talk to sales",
  ].join(" ");
}

export default function PricingPage() {
  const [annual, setAnnual] = useState(false);
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3, ease: "easeOut" }} className="min-h-screen" style={{ background: "var(--bg-primary)", color: "var(--text-primary)" }}>
      <Navbar />
      <main className="pt-28 pb-24">
        <Container>
          <p className="section-label mb-4">Pricing</p>
          <h1 className="font-bold text-3xl md:text-4xl mb-4" style={{ letterSpacing: "-0.02em", lineHeight: 1.2 }}>
            Less than one missed call a month.
          </h1>
          <p className="text-base mb-8 max-w-xl" style={{ color: "var(--text-secondary)", lineHeight: 1.65 }}>
            Plans for solo operators through to established businesses. Start free, no credit card.
          </p>
          <div className="flex items-center justify-center gap-3 mb-12">
            <span className="text-sm font-medium" style={{ color: annual ? "var(--text-tertiary)" : "var(--text-primary)" }}>Monthly</span>
            <button
              type="button"
              role="switch"
              aria-checked={annual}
              onClick={() => setAnnual((a) => !a)}
              className="w-14 h-10 rounded-full border-2 transition-colors flex-shrink-0 p-0.5"
              style={{
                background: annual ? "var(--accent-primary)" : "var(--bg-surface)",
                borderColor: "var(--border-default)",
              }}
            >
              <span
                className="block w-5 h-5 rounded-full bg-white transition-transform"
                style={{ transform: annual ? "translateX(1.25rem)" : "translateX(0)" }}
              />
            </button>
            <span className="text-sm font-medium flex items-center gap-2" style={{ color: annual ? "var(--text-primary)" : "var(--text-tertiary)" }}>
              Annual
              <span className="text-xs font-semibold px-2 py-0.5 rounded" style={{ background: "var(--accent-secondary)", color: "var(--bg-primary)" }}>Save 20%</span>
            </span>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {PRICING_TIERS.map((tier) => (
              <div
                key={tier.name}
                className="card-marketing p-8 relative"
                style={tier.popular ? { borderColor: "var(--accent-primary)", boxShadow: "0 0 0 1px var(--accent-primary)" } : undefined}
              >
                {tier.popular && (
                  <span className="pill-popular absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="w-1.5 h-1.5 rounded-full bg-current" /> Popular
                  </span>
                )}
                <h3 className="font-semibold text-lg mb-1" style={{ color: "var(--text-primary)" }}>{tier.name}</h3>
                <p className="text-2xl font-bold mb-4" style={{ color: "var(--text-primary)" }}>
                  {annual ? tier.priceAnnual : tier.priceMonthly}
                  <span className="text-sm font-normal" style={{ color: "var(--text-tertiary)" }}>{tier.period}</span>
                </p>
                <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>{tier.description}</p>
                <ul className="space-y-2 mb-8">
                  {tier.features.map((feat) => (
                    <li key={feat} className="flex items-center gap-2 text-sm" style={{ color: "var(--text-secondary)" }}>
                      <Check className="w-4 h-4 shrink-0" style={{ color: "var(--accent-secondary)" }} />
                      {feat}
                    </li>
                  ))}
                </ul>
                <Link href={tier.cta === "Talk to sales" ? ROUTES.CONTACT : ROUTES.START} className={tier.cta === "Talk to sales" ? "btn-marketing-ghost w-full block text-center py-3 rounded-lg no-underline" : tier.popular ? "btn-marketing-primary w-full block text-center py-3 rounded-lg no-underline" : "btn-marketing-ghost w-full block text-center py-3 rounded-lg no-underline"}>
                  {tier.cta}
                </Link>
              </div>
            ))}
          </div>
          <p className="text-center text-sm mb-10" style={{ color: "var(--text-tertiary)" }}>
            All plans include: encrypted records · compliance framework · audit trail · 14-day free trial
          </p>

          <h2 className="font-semibold text-xl mb-6 mt-20" style={{ color: "var(--text-primary)" }}>
            Feature comparison
          </h2>
          <div className="overflow-x-auto rounded-lg border mb-20" style={{ borderColor: "var(--border-default)", background: "var(--bg-surface)" }}>
            <table className="w-full text-left text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border-default)" }}>
                  <th className="py-4 px-4 font-semibold" style={{ color: "var(--text-tertiary)" }}>Feature</th>
                  <th className="py-4 px-4 font-semibold" style={{ color: "var(--text-tertiary)" }}>Starter</th>
                  <th className="py-4 px-4 font-semibold" style={{ color: "var(--text-tertiary)" }}>Professional</th>
                  <th className="py-4 px-4 font-semibold" style={{ color: "var(--text-tertiary)" }}>Business</th>
                  <th className="py-4 px-4 font-semibold" style={{ color: "var(--text-tertiary)" }}>Enterprise</th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON_FEATURES.map((row, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid var(--border-default)", background: i % 2 === 1 ? "rgba(255,255,255,0.01)" : "transparent" }}>
                    <td className="py-3 px-4" style={{ color: "var(--text-primary)" }}>{row.name}</td>
                    <td className="py-3 px-4" style={{ color: "var(--text-secondary)" }}>{"starter" in row ? row.starter : ""}</td>
                    <td className="py-3 px-4" style={{ color: "var(--text-secondary)" }}>{"professional" in row ? row.professional : ""}</td>
                    <td className="py-3 px-4" style={{ color: "var(--text-secondary)" }}>{"business" in row ? row.business : ""}</td>
                    <td className="py-3 px-4" style={{ color: "var(--text-secondary)" }}>{"enterprise" in row ? row.enterprise : ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h2 id="faq" className="font-semibold text-xl mb-6" style={{ color: "var(--text-primary)" }}>
            Frequently asked questions
          </h2>
          <div className="max-w-2xl mb-16">
            {PRICING_FAQ.map((faq, i) => (
              <AccordionItem key={i} title={faq.q}>
                {faq.a}
              </AccordionItem>
            ))}
          </div>

          <div className="text-center">
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
