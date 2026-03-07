"use client";

import Link from "next/link";
import { User, Users, Building2, Moon, Megaphone, Phone } from "lucide-react";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { Container } from "@/components/ui/Container";
import { AnimateOnScroll, StaggerChildren, fadeUpVariants } from "@/components/shared/AnimateOnScroll";
import { motion } from "framer-motion";

const PERSONAS = [
  { icon: User, name: "Solo operators", desc: "I can't answer the phone while I'm working. Recall Touch answers, books, and follows up so I never miss a lead." },
  { icon: Users, name: "Growing teams", desc: "We're losing leads because we can't keep up. Every call gets answered and every lead gets captured and followed up." },
  { icon: Building2, name: "Agencies & multi-location", desc: "I manage multiple locations and need consistency. One platform, one standard, everywhere." },
  { icon: Moon, name: "After-hours & overflow", desc: "We need coverage when the office is closed. Calls get answered, messages taken, and we follow up first thing." },
  { icon: Megaphone, name: "Outbound campaigns", desc: "We need to follow up with hundreds of leads. Recall Touch reaches out, qualifies, and books — at scale." },
  { icon: Phone, name: "Anyone with a phone", desc: "I want my calls handled intelligently. Answer, book, follow up, screen — without hiring a front desk." },
] as const;

export function WhoUsesSection() {
  return (
    <section id="who-uses" className="marketing-section" style={{ background: "var(--bg-surface)" }}>
      <Container>
        <AnimateOnScroll className="text-center mb-16">
          <SectionLabel>Who uses Recall Touch</SectionLabel>
          <h2 className="font-semibold max-w-2xl mx-auto" style={{ fontSize: "clamp(1.75rem, 3.5vw, 2.75rem)", letterSpacing: "-0.02em", lineHeight: 1.2, color: "var(--text-primary)" }}>
            Built for how you communicate
          </h2>
        </AnimateOnScroll>
        <StaggerChildren className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {PERSONAS.map((persona) => {
            const Icon = persona.icon;
            return (
              <Link key={persona.name} href="/activate">
                <motion.div
                  variants={fadeUpVariants}
                  className="card-marketing p-6 flex flex-col h-full hover:border-zinc-700 transition-colors min-w-0"
                >
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-4" style={{ background: "var(--accent-primary-subtle)", color: "var(--accent-primary)" }}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2" style={{ color: "var(--text-primary)" }}>{persona.name}</h3>
                  <p className="text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}>{persona.desc}</p>
                </motion.div>
              </Link>
            );
          })}
        </StaggerChildren>
        <AnimateOnScroll className="text-center mt-10">
          <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>
            Don&apos;t see your use case? Recall Touch works for any phone-based workflow.
          </p>
          <Link href="/activate" className="inline-block font-semibold text-sm" style={{ color: "var(--accent-primary)" }}>
            Get started →
          </Link>
        </AnimateOnScroll>
      </Container>
    </section>
  );
}
