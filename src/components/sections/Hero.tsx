"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { Container } from "@/components/ui/Container";
import { ROUTES } from "@/lib/constants";

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, ease: "easeOut" as const },
};

const INDUSTRY_ICONS = [
  "Healthcare",
  "Legal",
  "Home services",
  "Real estate",
  "Insurance",
  "Dental",
];

export function Hero() {
  return (
    <section
      className="pt-28 pb-16 md:pt-32 md:pb-20 relative overflow-hidden"
      style={{ background: "#0F1729" }}
    >
      <div
        className="absolute inset-0 pointer-events-none z-0"
        style={{
          background:
            "radial-gradient(ellipse 900px 450px at 0% 0%, rgba(59,130,246,0.15), transparent 60%), radial-gradient(ellipse 700px 400px at 100% 10%, rgba(16,185,129,0.1), transparent 60%)",
          opacity: 0.9,
        }}
      />
      <Container className="relative z-10">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] items-center">
          <div>
            <motion.div {...fadeUp}>
              <SectionLabel>Revenue continuity for every call</SectionLabel>
            </motion.div>
            <motion.h1
              className="font-bold max-w-xl mt-4 mb-4"
              style={{
                fontSize: "clamp(2.4rem, 4vw, 3.5rem)",
                letterSpacing: "-0.03em",
                lineHeight: 1.05,
                color: "#F8FAFC",
              }}
              initial={fadeUp.initial}
              animate={fadeUp.animate}
              transition={{ ...fadeUp.transition, delay: 0.05 }}
            >
              Your AI phone team. Always on. Always perfect.
            </motion.h1>
            <motion.p
              className="text-base md:text-lg max-w-lg mb-6"
              style={{ color: "#94A3B8", lineHeight: 1.7 }}
              initial={fadeUp.initial}
              animate={fadeUp.animate}
              transition={{ ...fadeUp.transition, delay: 0.1 }}
            >
              The phone system that quietly makes sure customers reach you, appointments stick, and revenue stops leaking through missed calls.
            </motion.p>
            <motion.div
              className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center mb-3"
              initial={fadeUp.initial}
              animate={fadeUp.animate}
              transition={{ ...fadeUp.transition, delay: 0.15 }}
            >
              <a
                href="#live-audio-demo"
                className="bg-white text-black font-semibold rounded-xl px-5 py-2.5 hover:bg-zinc-100 transition-colors no-underline w-full sm:w-auto text-center"
              >
                Hear it live
              </a>
              <Link
                href={ROUTES.START}
                className="bg-white text-black font-semibold rounded-xl px-5 py-2.5 hover:bg-zinc-100 transition-colors no-underline w-full sm:w-auto text-center"
              >
                Start free — 5 min setup →
              </Link>
            </motion.div>
            <motion.p
              className="text-sm mb-6"
              style={{ color: "#64748B" }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.25 }}
            >
              Works with your existing number · No credit card · 14-day free trial
            </motion.p>

            <motion.div
              className="mt-4 pt-4 border-t border-white/10 flex flex-col gap-4"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <p className="text-xs font-semibold tracking-wide uppercase text-left" style={{ color: "#64748B" }}>
                Built for
              </p>
              <div className="flex flex-wrap gap-2">
                {INDUSTRY_ICONS.map((label) => (
                  <div
                    key={label}
                    className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs"
                    style={{
                      backgroundColor: "rgba(15,23,42,0.8)",
                      border: "1px solid rgba(148,163,184,0.35)",
                      color: "#E2E8F0",
                    }}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    <span>{label}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          <motion.div
            className="relative rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl px-5 py-5 md:px-6 md:py-6 shadow-[0_24px_80px_rgba(15,23,42,0.8)]"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.25 }}
            aria-hidden="true"
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs font-semibold tracking-wide uppercase" style={{ color: "#64748B" }}>
                  Live call lane
                </p>
                <p className="text-sm mt-1" style={{ color: "#E5E7EB" }}>
                  Caller hearing a calm, human receptionist.
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                <span style={{ color: "#BBF7D0" }}>On track</span>
              </div>
            </div>
            <div className="relative h-32 md:h-36 mb-5 overflow-hidden rounded-xl bg-slate-900/70 border border-slate-700/60">
              <div className="absolute inset-x-0 top-2 flex justify-between px-3 text-[11px]" style={{ color: "#64748B" }}>
                <span>00:18</span>
                <span>Riverside Plumbing</span>
                <span>In progress</span>
              </div>
              <div className="absolute inset-x-0 bottom-0 flex h-20 items-end gap-[3px] px-3 pb-3">
                {Array.from({ length: 52 }).map((_, i) => {
                  const height = 20 + ((i * 37) % 50);
                  const delay = (i % 10) * 0.12;
                  return (
                    <span
                      // biome-ignore lint/suspicious/noArrayIndexKey: purely decorative
                      key={i}
                      className="w-[3px] rounded-full bg-blue-400/70 animate-[pulseWave_1.6s_ease-in-out_infinite]"
                      style={{
                        height,
                        animationDelay: `${delay}s`,
                        backgroundImage:
                          "linear-gradient(to top, rgba(59,130,246,0.2), rgba(59,130,246,0.9))",
                      }}
                    />
                  );
                })}
              </div>
            </div>
            <div className="space-y-3 text-xs md:text-sm">
              <div
                className="rounded-xl px-3 py-2"
                style={{ backgroundColor: "rgba(15,23,42,0.9)", border: "1px solid rgba(148,163,184,0.35)", color: "#E5E7EB" }}
              >
                <p className="text-[11px] uppercase tracking-wide mb-1" style={{ color: "#64748B" }}>
                  Caller · New customer
                </p>
                <p>“Hi, our water heater started leaking this morning. Can someone take a look today?”</p>
              </div>
              <div
                className="rounded-xl px-3 py-2 ml-6"
                style={{ backgroundColor: "rgba(17,24,39,0.9)", border: "1px solid rgba(34,197,94,0.45)", color: "#DCFCE7" }}
              >
                <p className="text-[11px] uppercase tracking-wide mb-1" style={{ color: "#6EE7B7" }}>
                  Reception
                </p>
                <p>“We can help. What&apos;s the best time today, and what&apos;s the address you&apos;re at?”</p>
              </div>
              <div
                className="rounded-xl px-3 py-2"
                style={{ backgroundColor: "rgba(15,23,42,0.9)", border: "1px dashed rgba(148,163,184,0.35)", color: "#94A3B8" }}
              >
                <p className="text-[11px] uppercase tracking-wide mb-1">Result</p>
                <p>Appointment locked in · Card on file · Confirmation text sent.</p>
              </div>
            </div>
          </motion.div>
        </div>
      </Container>
    </section>
  );
}
