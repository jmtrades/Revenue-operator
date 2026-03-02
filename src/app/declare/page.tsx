"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { SetupStepLayout, AuthorityNav } from "@/components/institutional";

const JURISDICTIONS = [{ value: "United States", label: "United States" }, { value: "UK", label: "UK" }, { value: "EU", label: "EU" }, { value: "Other", label: "Other" }] as const;
const REVIEW_LEVELS = ["Preview required", "Approval required", "Standard"] as const;

const SOURCE_OPTIONS: { id: string; label: string; href?: string }[] = [
  { id: "csv", label: "Upload source", href: "/dashboard/import" },
  { id: "calendar", label: "Connect calendar" },
  { id: "phone", label: "Connect phone" },
];

const PURPOSE_OPTIONS = ["Qualify", "Confirm", "Collect", "Reactivate", "Route", "Recover"] as const;

export default function DeclarePage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [jurisdiction, setJurisdiction] = useState<string | null>(null);
  const [reviewLevel, setReviewLevel] = useState<string | null>(null);
  const [_sourceDone, setSourceDone] = useState(false);
  const [purpose, setPurpose] = useState<string | null>(null);
  const [activated, setActivated] = useState(false);
  const [fading, setFading] = useState(false);

  const handleActivate = () => {
    if (typeof window !== "undefined") window.sessionStorage.setItem("declared_posture", "1");
    setActivated(true);
    setTimeout(() => setFading(true), 3000);
    setTimeout(() => router.push("/dashboard/start"), 3400);
  };

  if (activated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 gap-4" style={{ background: "var(--background)" }}>
        <p
          className="text-lg transition-opacity duration-[180ms] text-center"
          style={{ color: "var(--text-primary)", opacity: fading ? 0 : 1 }}
        >
          Execution is now under institutional governance.
        </p>
        <p className="text-sm text-center" style={{ color: "var(--text-muted)", opacity: fading ? 0 : 1 }}>
          Handling begins once a source is recorded.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--background)", color: "var(--text-primary)" }}>
      <AuthorityNav />
      <div className="max-w-[720px] mx-auto px-6 sm:px-8 pt-12">
        <h1 className="font-headline mb-2" style={{ fontSize: "32px" }}>Declare operating posture.</h1>
        <p className="text-sm mb-1" style={{ color: "var(--text-muted)", lineHeight: 1.6 }}>You are defining how conversations are handled.</p>
        <p className="text-sm mb-12" style={{ color: "var(--text-muted)", lineHeight: 1.6 }}>Declaration may be amended without interrupting execution.</p>
      </div>
      {step === 1 && (
        <SetupStepLayout
          title="Declared jurisdiction"
          description="All execution is governed according to declared jurisdiction."
        >
          <div className="max-w-2xl">
            <label className="block text-[13px] uppercase tracking-wide mb-2" style={{ color: "var(--text-muted)", letterSpacing: "0.12em" }}>Jurisdiction</label>
            <select
              value={jurisdiction ?? ""}
              onChange={(e) => setJurisdiction(e.target.value || null)}
              className="w-full px-4 py-3 rounded-[12px] border focus-ring"
              style={{ background: "var(--surface-card)", borderColor: "var(--card-border)", color: "var(--text-primary)" }}
            >
              <option value="">Select</option>
              {JURISDICTIONS.map((j) => (
                <option key={j.value} value={j.value}>{j.label}</option>
              ))}
            </select>
          </div>
          <p className="mt-4 text-sm" style={{ color: "var(--text-muted)", lineHeight: 1.6 }}>Jurisdiction determines compliance boundaries.</p>
          <div className="mt-8 flex gap-4">
            <button type="button" onClick={() => setStep(2)} className="btn-primary">
              Continue
            </button>
          </div>
        </SetupStepLayout>
      )}

      {step === 2 && (
        <SetupStepLayout
          title="Review structure"
          description="Defines escalation and oversight structure."
        >
          <div className="max-w-2xl">
            <label className="block text-[13px] uppercase tracking-wide mb-2" style={{ color: "var(--text-muted)", letterSpacing: "0.12em" }}>Review structure</label>
            <select
              value={reviewLevel ?? ""}
              onChange={(e) => setReviewLevel(e.target.value || null)}
              className="w-full px-4 py-3 rounded-[12px] border focus-ring"
              style={{ background: "var(--surface-card)", borderColor: "var(--card-border)", color: "var(--text-primary)" }}
            >
              <option value="">Select</option>
              {REVIEW_LEVELS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
          <p className="mt-4 text-sm" style={{ color: "var(--text-muted)", lineHeight: 1.6 }}>Review structure determines escalation behavior.</p>
          <div className="mt-8 flex gap-4">
            <button type="button" onClick={() => setStep(1)} className="btn-secondary">Back</button>
            <button type="button" onClick={() => setStep(3)} className="btn-primary">Continue</button>
          </div>
        </SetupStepLayout>
      )}

      {step === 3 && (
        <SetupStepLayout
          title="Record primary source"
          description="Execution begins only after a source is recorded."
        >
          <div className="grid gap-4 sm:grid-cols-3 max-w-3xl">
            {SOURCE_OPTIONS.map((opt) =>
              opt.href ? (
                <Link
                  key={opt.id}
                  href={opt.href}
                  className="rounded-[16px] border p-8 text-center transition-colors focus-ring hover:border-[var(--accent)]"
                  style={{ background: "var(--surface-card)", borderColor: "var(--card-border)" }}
                >
                  <span className="font-medium" style={{ color: "var(--text-primary)" }}>{opt.label}</span>
                </Link>
              ) : (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setSourceDone(true)}
                  className="rounded-[16px] border p-8 text-center transition-colors focus-ring hover:border-[var(--accent)]"
                  style={{ background: "var(--surface-card)", borderColor: "var(--card-border)" }}
                >
                  <span className="font-medium" style={{ color: "var(--text-primary)" }}>{opt.label}</span>
                </button>
              )
            )}
          </div>
          <p className="mt-4 text-sm" style={{ color: "var(--text-muted)", lineHeight: 1.6 }}>No source. No execution.</p>
          <p className="mt-2 text-sm" style={{ color: "var(--text-muted)", lineHeight: 1.6 }}>Sources include uploaded lead lists, phone lines, and calendar enquiries.</p>
          <p className="mt-2 text-sm" style={{ color: "var(--text-muted)", lineHeight: 1.6 }}>You may begin with a single source.</p>
          <div className="mt-8 flex gap-4">
            <button type="button" onClick={() => setStep(2)} className="btn-secondary">Back</button>
            <button type="button" onClick={() => setStep(4)} className="btn-primary">Continue</button>
          </div>
        </SetupStepLayout>
      )}

      {step === 4 && (
        <SetupStepLayout
          title="Operational purpose"
          description="Purpose determines objective and stop conditions."
        >
          <div className="grid gap-3 sm:grid-cols-2 max-w-2xl">
            {PURPOSE_OPTIONS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPurpose(p)}
                className="rounded-[16px] border p-6 text-left transition-colors focus-ring hover:border-[var(--accent)]"
                style={{
                  background: "var(--surface-card)",
                  borderColor: purpose === p ? "var(--accent)" : "var(--card-border)",
                  color: "var(--text-primary)",
                }}
              >
                {p}
              </button>
            ))}
          </div>
          <p className="mt-4 text-sm" style={{ color: "var(--text-muted)", lineHeight: 1.6 }}>Purpose directs objectives and outcomes.</p>
          <div className="mt-8 flex gap-4">
            <button type="button" onClick={() => setStep(3)} className="btn-secondary">Back</button>
            <button type="button" onClick={() => setStep(5)} className="btn-primary">Continue</button>
          </div>
        </SetupStepLayout>
      )}

      {step === 5 && (
        <SetupStepLayout title="Place under governance">
          <p className="mb-8 text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}>
            Execution is applied under declared jurisdiction and review depth.
          </p>
          <button type="button" onClick={handleActivate} className="btn-primary">
            Place under governance
          </button>
        </SetupStepLayout>
      )}
    </div>
  );
}
