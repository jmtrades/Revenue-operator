"use client";

import Link from "next/link";
import { InstitutionalCard, RecordPreview } from "@/components/institutional";
import { AuthorityNav } from "@/components/institutional/AuthorityNav";

export default function LandingPage() {
  return (
    <div className="min-h-screen" style={{ background: "var(--background)", color: "var(--text-primary)" }}>
      <AuthorityNav />

      {/* 1. Hero */}
      <section className="min-h-[70vh] flex flex-col items-center justify-center px-6 sm:px-8 py-[7.25rem] max-w-[900px] mx-auto">
        <p className="text-[13px] font-medium uppercase mb-2" style={{ color: "var(--text-muted)", letterSpacing: "0.12em" }}>
          COMMERCIAL EXECUTION STANDARD
        </p>
        <h1 className="font-headline text-center" style={{ fontSize: "clamp(2rem, 4vw, 48px)" }}>
          Every commercial conversation must be governed.
        </h1>
        <p className="text-lg text-center mt-6 mb-2" style={{ color: "var(--text-secondary)", lineHeight: 1.6, maxWidth: "28rem" }}>
          Inbound. Outbound. Voice. Confirmation. Compliance.
        </p>
        <p className="text-sm text-center mb-2" style={{ color: "var(--text-muted)", lineHeight: 1.6, maxWidth: "32rem" }}>
          Recall Touch governs calls, confirmations, and follow-ups under record.
        </p>
        <p className="text-sm text-center mb-2" style={{ color: "var(--text-muted)", fontSize: "14px", lineHeight: 1.6, maxWidth: "32rem" }}>
          It replaces improvised call handling with governed execution.
        </p>
        <p className="text-sm text-center mb-2" style={{ color: "var(--text-muted)", fontSize: "14px", lineHeight: 1.6, maxWidth: "32rem" }}>
          It handles conversations without requiring manual oversight.
        </p>
        <p className="text-sm text-center mb-2" style={{ color: "var(--text-secondary)", fontSize: "14px", lineHeight: 1.6, maxWidth: "32rem" }}>
          Improvisation is removed.
        </p>
        <p className="text-sm text-center mb-4" style={{ color: "var(--text-muted)", fontSize: "14px", lineHeight: 1.6, maxWidth: "32rem" }}>
          Oversight is structural.
        </p>
        <p className="text-[13px] mb-4 uppercase tracking-wide" style={{ color: "var(--text-muted)", letterSpacing: "0.12em" }}>
          Execution begins under record.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link href="/activate" className="btn-primary w-full sm:w-auto max-w-[320px]">
            Declare governance
          </Link>
          <Link href="/pricing" className="btn-secondary w-full sm:w-auto max-w-[320px]">
            Pricing
          </Link>
        </div>
        <p className="mt-4 mb-0" style={{ fontSize: "12px", opacity: 0.65, color: "var(--text-muted)", fontWeight: 400 }}>
          Declaration takes less than one minute.
        </p>
      </section>

      {/* Execution transformed */}
      <section className="py-16 px-6 sm:px-8 max-w-[720px] mx-auto text-center">
        <p className="text-[13px] font-medium uppercase mb-6" style={{ color: "var(--text-muted)", letterSpacing: "0.12em" }}>
          EXECUTION TRANSFORMED
        </p>
        <p className="text-sm mb-3" style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}>
          Manual calls become governed conversations.
        </p>
        <p className="text-sm mb-3" style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}>
          Follow-ups become structured commitments.
        </p>
        <p className="text-sm mb-8" style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}>
          Escalations become controlled decisions.
        </p>
        <p className="text-[12px] font-medium uppercase mb-4" style={{ color: "var(--text-muted)", letterSpacing: "0.12em" }}>
          OPERATING CONTEXT
        </p>
        <p className="text-sm mb-3" style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}>
          Operators handling inbound conversations.
        </p>
        <p className="text-sm mb-3" style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}>
          Teams executing outbound engagement.
        </p>
        <p className="text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}>
          Organizations requiring compliance certainty.
        </p>
      </section>

      {/* 2. Category Definition */}
      <section id="institutional-overview" className="py-[120px] px-6 sm:px-8 max-w-[720px] mx-auto">
        <h2 className="font-headline mb-6 text-center" style={{ fontSize: "32px" }}>
          Call handling is infrastructure.
        </h2>
        <p className="text-center max-w-2xl mx-auto mb-10" style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}>
          When revenue depends on conversation, that conversation becomes operational risk.
        </p>
        <p className="text-center text-sm mb-1" style={{ color: "var(--text-muted)", lineHeight: 1.6 }}>
          Improvised handling increases volatility.
        </p>
        <p className="text-center text-sm mb-1" style={{ color: "var(--text-muted)", lineHeight: 1.6 }}>
          Unstructured escalation increases exposure.
        </p>
        <p className="text-center text-sm mb-1" style={{ color: "var(--text-muted)", lineHeight: 1.6 }}>
          Jurisdiction ambiguity increases liability.
        </p>
      </section>

      {/* 3. Institutional Handling */}
      <section className="py-[120px] px-6 sm:px-8" style={{ background: "var(--surface)" }}>
        <div className="max-w-[720px] mx-auto">
          <h2 className="font-headline mb-4 text-center" style={{ fontSize: "32px" }}>
            Handling governed before issuance.
          </h2>
          <p className="text-center max-w-2xl mx-auto mb-6" style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}>
            Execution does not leave record without jurisdiction, review depth, and structural controls.
          </p>
          <p className="text-sm text-center mb-3" style={{ color: "var(--text-muted)", lineHeight: 1.6 }}>
            This applies to:
          </p>
          <p className="text-sm text-center" style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}>
            Inbound enquiries · Outbound lead calls · Payment confirmations
          </p>
        </div>
      </section>

      {/* 4. Public Record Preview */}
      <section className="py-[120px] px-6 sm:px-8 max-w-[720px] mx-auto">
        <h2 className="font-headline mb-12 text-center" style={{ fontSize: "32px" }}>
          Public record
        </h2>
        <div className="max-w-lg mx-auto">
          <RecordPreview onCopy={() => {}} />
        </div>
      </section>

      {/* 5. Pricing Tease */}
      <section className="py-[120px] px-6 sm:px-8" style={{ background: "var(--surface)" }}>
        <div className="max-w-[720px] mx-auto text-center">
          <p className="text-sm mb-6" style={{ color: "var(--text-muted)", lineHeight: 1.6 }}>
            Governance license applied per operator environment. Solo. Growth. Team.
          </p>
          <Link href="/pricing" className="btn-secondary">
            View pricing
          </Link>
        </div>
      </section>

      {/* 6. Authority Close */}
      <section className="py-[120px] px-6 sm:px-8 w-full" style={{ background: "#0B0B0C" }}>
        <div className="max-w-[720px] mx-auto text-center">
          <p className="text-lg mb-8" style={{ color: "var(--text-primary)", lineHeight: 1.6 }}>
            If revenue depends on conversation, it must be governed.
          </p>
          <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>
            Execution begins under record.
          </p>
          <Link href="/activate" className="btn-primary">
            Declare governance
          </Link>
        </div>
      </section>
    </div>
  );
}
