"use client";

import { Star } from "lucide-react";

const TESTIMONIALS = [
  {
    quote: "We went from missing after-hours calls to answering every single one overnight. The AI books appointments, follows up on quotes, and routes urgent calls — all automatically.",
    name: "",
    role: "Owner",
    company: "Home Services Company — Texas",
    metric: "24/7",
    metricLabel: "call coverage",
    avatar: "HS",
    plan: "Growth",
  },
  {
    quote: "Our front desk was drowning in calls. Revenue Operator handles the full volume for us now. No-shows dropped significantly because the AI actually follows up with reminders and reschedules cancellations.",
    name: "",
    role: "Practice Owner",
    company: "Multi-Location Dental — Florida",
    metric: "100%",
    metricLabel: "calls answered",
    avatar: "MD",
    plan: "Business",
  },
  {
    quote: "I was skeptical about AI handling legal intake calls. Then it booked consultations its first night — at 2 AM. The voice quality is so natural that callers don't realize it's AI.",
    name: "",
    role: "Managing Partner",
    company: "Personal Injury Firm — Illinois",
    metric: "24/7",
    metricLabel: "intake coverage",
    avatar: "PI",
    plan: "Growth",
  },
  {
    quote: "We manage crews across multiple states. Storm season used to mean most calls went to voicemail — those are high-value jobs just evaporating. Now every call gets answered and scheduled instantly.",
    name: "",
    role: "CEO",
    company: "Roofing & Restoration — Texas",
    metric: "100%",
    metricLabel: "calls captured",
    avatar: "RR",
    plan: "Agency",
  },
  {
    quote: "Setup literally took minutes. That's not marketing speak — I timed it. Our AI operator was taking calls before I finished my coffee. It handled the full workflow from day one.",
    name: "",
    role: "Owner",
    company: "Auto Service Center — Georgia",
    metric: "< 5 min",
    metricLabel: "to go live",
    avatar: "AS",
    plan: "Starter",
  },
  {
    quote: "I run a white-label agency. My clients think the AI is a real receptionist on their team. Multiple clients, zero complaints, and consistent margin on the resell.",
    name: "",
    role: "Founder",
    company: "Digital Marketing Agency — Remote",
    metric: "White-label",
    metricLabel: "ready",
    avatar: "DM",
    plan: "Agency",
  },
];

export function PricingTestimonials() {
  return (
    <div className="py-12">
      <div className="text-center mb-10">
        <p className="text-xs font-semibold tracking-wider uppercase text-emerald-400 mb-2">
          What Our Customers Say
        </p>
        <h2 className="font-editorial" style={{ fontSize: "clamp(1.75rem, 3.5vw, 2.5rem)", color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
          Trusted by businesses across every industry
        </h2>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
        {TESTIMONIALS.map((t) => (
          <div
            key={t.name}
            className="rounded-2xl border border-[var(--border-default)] bg-white/[0.02] p-6 flex flex-col hover:bg-white/[0.04] transition-[background-color,border-color]"
          >
            {/* Stars */}
            <div className="flex gap-0.5 mb-3">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              ))}
            </div>

            {/* Quote */}
            <p className="text-sm leading-relaxed flex-1 mb-5" style={{ color: "var(--text-secondary)" }}>
              &ldquo;{t.quote}&rdquo;
            </p>

            {/* Metric Badge */}
            <div className="inline-flex self-start items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 mb-4">
              <span className="text-sm font-bold text-emerald-400">{t.metric}</span>
              <span className="text-xs text-emerald-400/70">{t.metricLabel}</span>
            </div>

            {/* Author */}
            <div className="flex items-center gap-3 pt-4 border-t border-white/5">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-500/30 to-blue-500/30 flex items-center justify-center text-xs font-bold text-white/80 border border-[var(--border-default)]">
                {t.avatar}
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-white/90">{t.name}</p>
                <p className="text-xs text-[var(--text-tertiary)]">{t.role}, {t.company}</p>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-white/5 text-[var(--text-tertiary)] border border-[var(--border-default)]">
                {t.plan}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
