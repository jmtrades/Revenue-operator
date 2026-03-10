"use client";

import Link from "next/link";
import { PhoneIncoming, PhoneOutgoing, Brain } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { ROUTES } from "@/lib/constants";

const USE_CASES = [
  {
    title: "Inbound",
    desc: "Answer every call. Route, book, qualify, and follow up — automatically.",
    icon: PhoneIncoming,
  },
  {
    title: "Outbound",
    desc: "Follow up with leads, confirm appointments, reactivate prospects — at scale.",
    icon: PhoneOutgoing,
  },
  {
    title: "Intelligence",
    desc: "Analyze every conversation. Find what works. Make your team better.",
    icon: Brain,
  },
] as const;

export function UseCaseSection() {
  return (
    <section className="py-16 px-6" style={{ background: "var(--bg-primary)" }}>
      <Container>
        <h2 className="text-2xl font-bold text-center mb-10" style={{ color: "var(--text-primary)" }}>
          One platform. Every call type.
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {USE_CASES.map((uc) => (
            <div
              key={uc.title}
              className="rounded-xl p-6 border"
              style={{ background: "var(--bg-elevated)", borderColor: "var(--border-default)" }}
            >
              <uc.icon className="w-6 h-6 text-zinc-400 mb-3" />
              <h3 className="text-base font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
                {uc.title}
              </h3>
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{uc.desc}</p>
            </div>
          ))}
        </div>
        <p className="text-center mt-8">
          <Link
            href={ROUTES.START}
            className="inline-flex items-center justify-center bg-white text-black font-semibold rounded-xl px-6 py-3 hover:bg-zinc-100 transition-colors"
          >
            Start free →
          </Link>
        </p>
      </Container>
    </section>
  );
}
