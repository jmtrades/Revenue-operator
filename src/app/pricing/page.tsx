"use client";

import Link from "next/link";
import { AuthorityHeader, InstitutionalCard, AuthorityNav } from "@/components/institutional";

/** Licensed per operator. No toggles. No feature lists. */

export const ANNUAL_NOTE = "Two months applied without interruption on annual commitment.";

export function pricingCopyForTests(): string {
  return [
    "Licensed per operator environment",
    "Solo",
    "Growth",
    "Team",
    "Conversations handled under governance",
    "Declare governance",
    "Execution is applied under declared jurisdiction",
  ].join(" ");
}

export default function PricingPage() {
  return (
    <main className="min-h-screen" style={{ background: "var(--background)", color: "var(--text-primary)" }}>
      <AuthorityNav />
      <div className="max-w-[1100px] mx-auto px-6 sm:px-8 py-[120px]">
        <AuthorityHeader
          label="Pricing"
          title="Call handling without exposure."
        />

        <p className="mt-8 text-sm" style={{ color: "var(--text-muted)", lineHeight: 1.6 }}>
          Governance license applied per operator environment.
        </p>
        <p className="mt-1 text-sm" style={{ color: "var(--text-muted)", lineHeight: 1.6 }}>
          Applied upon declaration.
        </p>
        <p className="mt-1 text-sm" style={{ color: "var(--text-muted)", lineHeight: 1.6 }}>
          No additional configuration required.
        </p>
        <p className="mt-1 text-sm" style={{ color: "var(--text-muted)", lineHeight: 1.6 }}>
          No onboarding team required.
        </p>

        <div className="mt-12 space-y-[40px]">
          <InstitutionalCard>
            <h3 className="font-headline mb-2" style={{ fontSize: "22px", fontWeight: 450 }}>Solo — 297 / month</h3>
            <p className="text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}>
              Conversations handled under governance.
            </p>
          </InstitutionalCard>

          <InstitutionalCard>
            <h3 className="font-headline mb-2" style={{ fontSize: "22px", fontWeight: 450 }}>Growth — 897 / month</h3>
            <p className="text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}>
              Conversations handled under governance.
            </p>
          </InstitutionalCard>

          <InstitutionalCard>
            <h3 className="font-headline mb-2" style={{ fontSize: "22px", fontWeight: 450 }}>Team — 2400 / month</h3>
            <p className="text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}>
              Conversations handled under governance.
            </p>
          </InstitutionalCard>
        </div>

        <p className="mt-12 text-sm text-center" style={{ color: "var(--text-muted)", lineHeight: 1.6 }}>
          Execution is applied under declared jurisdiction and review depth.
        </p>

        <p className="mt-8 text-sm text-center mb-6" style={{ color: "var(--text-muted)" }}>
          Execution begins under record.
        </p>
        <div className="text-center">
          <Link href="/activate" className="btn-primary">
            Declare governance
          </Link>
        </div>
      </div>
    </main>
  );
}
