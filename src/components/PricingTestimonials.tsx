"use client";

import { Star } from "lucide-react";
import { SOCIAL_PROOF } from "@/lib/constants";

const TESTIMONIALS = [
  {
    quote: "We went from missing 40% of our calls to answering 100% of them overnight. First month, we booked $23K in new jobs that would have gone to competitors.",
    name: "Marcus Johnson",
    role: "Owner",
    company: "Premier Plumbing & HVAC",
    metric: "+$23K/mo",
    metricLabel: "new revenue",
    avatar: "MJ",
    plan: "Growth",
  },
  {
    quote: "My front desk was drowning in calls. Recall Touch handles 200+ calls a day for us now. No-shows dropped 50% because the AI actually follows up. Best ROI of any tool we use.",
    name: "Dr. Lisa Chen",
    role: "Practice Owner",
    company: "Bright Smile Dental Group",
    metric: "50%",
    metricLabel: "fewer no-shows",
    avatar: "LC",
    plan: "Business",
  },
  {
    quote: "I was skeptical about AI handling legal intake calls. Then it booked 3 consultations its first night — at 2 AM. Those turned into $45K in cases. I'm a believer.",
    name: "David Roth",
    role: "Managing Partner",
    company: "Roth & Associates Law",
    metric: "$45K",
    metricLabel: "from after-hours calls",
    avatar: "DR",
    plan: "Growth",
  },
  {
    quote: "We manage 14 roofing crews across 3 states. Before Recall Touch, storm season meant 60% of calls went to voicemail. Now every single call gets answered and scheduled. Revenue is up 34%.",
    name: "Mike Torres",
    role: "CEO",
    company: "Apex Roofing Group",
    metric: "+34%",
    metricLabel: "revenue increase",
    avatar: "MT",
    plan: "Agency",
  },
  {
    quote: "Setup literally took 3 minutes. That's not marketing speak — I timed it. Our AI agent was taking calls before I finished my coffee. It paid for itself within the first day.",
    name: "Sarah Kim",
    role: "Owner",
    company: "AutoCare Express",
    metric: "3 min",
    metricLabel: "to go live",
    avatar: "SK",
    plan: "Starter",
  },
  {
    quote: "I run a white-label agency. My clients think the AI is a real receptionist on their team. Twelve clients, zero complaints, and I'm making $4K/mo in pure margin on the resell.",
    name: "Chris Martinez",
    role: "Founder",
    company: "Scale Digital Agency",
    metric: "$4K/mo",
    metricLabel: "agency margin",
    avatar: "CM",
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
        <h2 className="text-2xl md:text-3xl font-bold" style={{ color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
          {SOCIAL_PROOF.businessCount} businesses can&apos;t be wrong
        </h2>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
        {TESTIMONIALS.map((t) => (
          <div
            key={t.name}
            className="rounded-2xl border border-[var(--border-default)] bg-white/[0.02] p-6 flex flex-col hover:border-[var(--border-default)] transition-all"
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
