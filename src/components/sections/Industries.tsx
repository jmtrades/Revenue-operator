"use client";

import Link from "next/link";
import { Wrench, Heart, Scale, Home, Shield, Briefcase, Store, HardHat } from "lucide-react";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { Container } from "@/components/ui/Container";
import { AnimateOnScroll, StaggerChildren, fadeUpVariants } from "@/components/shared/AnimateOnScroll";
import { motion } from "framer-motion";

const INDUSTRIES = [
  { icon: Wrench, name: "Home Services", slug: "home-services", desc: "Answer calls from the jobsite. Capture every lead. Book every job." },
  { icon: Heart, name: "Healthcare", slug: "healthcare", desc: "Schedule patients. Handle intake. Send reminders. HIPAA-compliant." },
  { icon: Scale, name: "Legal", slug: "legal", desc: "Professional intake. 24/7 availability. Every call documented." },
  { icon: Home, name: "Real Estate", slug: "real-estate", desc: "Qualify buyers instantly. Schedule showings. Never lose a listing lead." },
  { icon: Shield, name: "Insurance", slug: "insurance", desc: "Quote intake. Policy questions. Renewal reminders. Claims routing." },
  { icon: Briefcase, name: "B2B Sales", slug: "b2b-sales", desc: "Follow up on every lead in seconds. Qualify, book demos, track everything." },
  { icon: Store, name: "Local Business", slug: "local-business", desc: "Salons, restaurants, auto shops. Answer while you serve. Book while you work." },
  { icon: HardHat, name: "Contractors", slug: "contractors", desc: "Roofing, painting, landscaping. Every estimate captured. Every job booked." },
];

export function Industries() {
  return (
    <section id="industries" className="marketing-section" style={{ background: "var(--bg-surface)" }}>
      <Container>
        <AnimateOnScroll className="text-center mb-16">
          <SectionLabel>Industries</SectionLabel>
          <h2 className="font-semibold max-w-2xl mx-auto" style={{ fontSize: "clamp(1.75rem, 3.5vw, 2.75rem)", letterSpacing: "-0.02em", lineHeight: 1.2, color: "var(--text-primary)" }}>
            Built for how YOUR business works.
          </h2>
        </AnimateOnScroll>
        <StaggerChildren className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 overflow-x-auto scrollbar-hide pb-2">
          {INDUSTRIES.map((ind) => (
            <Link key={ind.name} href={`/industries/${ind.slug}`}>
              <motion.div
                variants={fadeUpVariants}
                className="card-marketing p-6 flex flex-col min-w-[260px] hover:border-[var(--accent-primary)] transition-colors"
              >
                <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-4" style={{ background: "var(--accent-primary-subtle)", color: "var(--accent-primary)" }}>
                  <ind.icon className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-lg mb-2" style={{ color: "var(--text-primary)" }}>{ind.name}</h3>
                <p className="text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}>{ind.desc}</p>
              </motion.div>
            </Link>
          ))}
        </StaggerChildren>
      </Container>
    </section>
  );
}
