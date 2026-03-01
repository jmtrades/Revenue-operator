"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { Container } from "@/components/ui/Container";
import { ActivityFeedMockup } from "./ActivityFeedMockup";
import { ROUTES } from "@/lib/constants";

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, ease: "easeOut" as const },
};

export function Hero() {
  return (
    <section className="pt-28 pb-16 md:pt-36 md:pb-24 relative overflow-hidden" style={{ background: "var(--bg-primary)", backgroundImage: "var(--gradient-hero-radial)", backgroundRepeat: "no-repeat", backgroundPosition: "top center" }}>
      <div
        className="absolute inset-0 pointer-events-none z-0"
        style={{
          background: "radial-gradient(ellipse 800px 400px at 50% 0%, rgba(79, 140, 255, 0.04), transparent 50%), radial-gradient(ellipse 400px 300px at 70% 20%, rgba(0, 212, 170, 0.02), transparent 40%)",
          filter: "blur(60px)",
        }}
      />
      <Container className="text-center relative z-10">
        <motion.div {...fadeUp}>
          <SectionLabel>AI PHONE SYSTEM FOR EVERY BUSINESS</SectionLabel>
        </motion.div>
        <motion.h1
          className="font-bold text-center max-w-[800px] mx-auto mb-6"
          style={{
            fontSize: "clamp(2.5rem, 5vw, 4rem)",
            letterSpacing: "-0.03em",
            lineHeight: 1.1,
            color: "var(--text-primary)",
          }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          Your AI phone team. Always on. Always perfect.
        </motion.h1>
        <motion.p
          className="text-center max-w-[620px] mx-auto mb-8 text-lg md:text-xl"
          style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          Recall Touch answers your calls, follows up with leads, books appointments, handles emergencies, and makes outbound calls — so you can focus on running your business.
        </motion.p>
        <motion.div
          className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Link href={ROUTES.START} className="btn-marketing-primary btn-lg no-underline w-full sm:w-auto text-center">
            Start free — 5 minute setup →
          </Link>
          <Link href={ROUTES.DEMO} className="btn-marketing-ghost btn-lg no-underline w-full sm:w-auto text-center inline-flex items-center justify-center gap-2">
            Hear a live demo ▶
          </Link>
        </motion.div>
        <motion.p
          className="text-sm"
          style={{ color: "var(--text-tertiary)" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          Works with your existing number · No credit card · 14-day free trial
        </motion.p>

        <motion.div
          className="mt-12 md:mt-16 relative"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          <div
            className="absolute -inset-[10%] -z-10"
            style={{
              background: "radial-gradient(ellipse at center, rgba(79, 140, 255, 0.06), transparent 70%)",
              filter: "blur(40px)",
            }}
          />
          <div className="lg:[transform:perspective(2000px)_rotateX(2deg)]" aria-hidden="true">
            <ActivityFeedMockup />
          </div>
        </motion.div>
      </Container>
    </section>
  );
}
