"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { SetupStepLayout, AuthorityNav } from "@/components/institutional";

export default function DeclarePage() {
  const router = useRouter();
  const t = useTranslations("declare");
  const [step, setStep] = useState(1);
  const [jurisdiction, setJurisdiction] = useState<string | null>(null);
  const [reviewLevel, setReviewLevel] = useState<string | null>(null);
  const [_sourceDone, setSourceDone] = useState(false);
  const [purpose, setPurpose] = useState<string | null>(null);
  const [activated, setActivated] = useState(false);
  const [fading, setFading] = useState(false);

  const JURISDICTIONS = t.raw("jurisdictions") as Array<{ value: string; label: string }>;
  const REVIEW_LEVELS = t.raw("reviewLevels") as Array<{ value: string; label: string }>;
  const SOURCE_OPTIONS = t.raw("sourceOptions") as Array<{ id: string; label: string }>;
  const PURPOSE_OPTIONS = t.raw("purposeOptions") as Array<{ value: string; label: string }>;

  const handleActivate = () => {
    if (typeof window !== "undefined") window.sessionStorage.setItem("declared_posture", "1");
    setActivated(true);
    setTimeout(() => setFading(true), 3000);
    setTimeout(() => router.push("/app/dashboard"), 3400);
  };

  if (activated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 gap-4" style={{ background: "var(--background)" }}>
        <p
          className="text-lg transition-opacity duration-[180ms] text-center"
          style={{ color: "var(--text-primary)", opacity: fading ? 0 : 1 }}
        >
          {t("successMessage")}
        </p>
        <p className="text-sm text-center" style={{ color: "var(--text-muted)", opacity: fading ? 0 : 1 }}>
          {t("successHint")}
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--background)", color: "var(--text-primary)" }}>
      <AuthorityNav />
      <div className="max-w-[720px] mx-auto px-6 sm:px-8 pt-12">
        <h1 className="font-headline mb-2" style={{ fontSize: "32px" }}>{t("heading")}</h1>
        <p className="text-sm mb-1" style={{ color: "var(--text-muted)", lineHeight: 1.6 }}>{t("descriptionLine1")}</p>
        <p className="text-sm mb-12" style={{ color: "var(--text-muted)", lineHeight: 1.6 }}>{t("descriptionLine2")}</p>
      </div>
      {step === 1 && (
        <SetupStepLayout
          title={t("jurisdictionStep.title")}
          description={t("jurisdictionStep.description")}
        >
          <div className="max-w-2xl">
            <label className="block text-[13px] uppercase tracking-wide mb-2" style={{ color: "var(--text-muted)", letterSpacing: "0.12em" }}>{t("jurisdictionLabel")}</label>
            <select
              value={jurisdiction ?? ""}
              onChange={(e) => setJurisdiction(e.target.value || null)}
              className="w-full px-4 py-3 rounded-[12px] border focus-ring"
              style={{ background: "var(--surface-card)", borderColor: "var(--card-border)", color: "var(--text-primary)" }}
            >
              <option value="">{t("selectPlaceholder")}</option>
              {JURISDICTIONS.map((j) => (
                <option key={j.value} value={j.value}>{j.label}</option>
              ))}
            </select>
          </div>
          <p className="mt-4 text-sm" style={{ color: "var(--text-muted)", lineHeight: 1.6 }}>{t("jurisdictionHint")}</p>
          <div className="mt-8 flex gap-4">
            <button type="button" onClick={() => setStep(2)} className="btn-primary">
              {t("continueButton")}
            </button>
          </div>
        </SetupStepLayout>
      )}

      {step === 2 && (
        <SetupStepLayout
          title={t("reviewStep.title")}
          description={t("reviewStep.description")}
        >
          <div className="max-w-2xl">
            <label className="block text-[13px] uppercase tracking-wide mb-2" style={{ color: "var(--text-muted)", letterSpacing: "0.12em" }}>{t("reviewLabel")}</label>
            <select
              value={reviewLevel ?? ""}
              onChange={(e) => setReviewLevel(e.target.value || null)}
              className="w-full px-4 py-3 rounded-[12px] border focus-ring"
              style={{ background: "var(--surface-card)", borderColor: "var(--card-border)", color: "var(--text-primary)" }}
            >
              <option value="">{t("selectPlaceholder")}</option>
              {REVIEW_LEVELS.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>
          <p className="mt-4 text-sm" style={{ color: "var(--text-muted)", lineHeight: 1.6 }}>{t("reviewHint")}</p>
          <div className="mt-8 flex gap-4">
            <button type="button" onClick={() => setStep(1)} className="btn-secondary">{t("backButton")}</button>
            <button type="button" onClick={() => setStep(3)} className="btn-primary">{t("continueButton")}</button>
          </div>
        </SetupStepLayout>
      )}

      {step === 3 && (
        <SetupStepLayout
          title={t("sourceStep.title")}
          description={t("sourceStep.description")}
        >
          <div className="grid gap-4 sm:grid-cols-3 max-w-3xl">
            {SOURCE_OPTIONS.map((opt) =>
              opt.id === "csv" ? (
                <Link
                  key={opt.id}
                  href="/app/contacts"
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
          <p className="mt-4 text-sm" style={{ color: "var(--text-muted)", lineHeight: 1.6 }}>{t("sourceHint1")}</p>
          <p className="mt-2 text-sm" style={{ color: "var(--text-muted)", lineHeight: 1.6 }}>{t("sourceHint2")}</p>
          <p className="mt-2 text-sm" style={{ color: "var(--text-muted)", lineHeight: 1.6 }}>{t("sourceHint3")}</p>
          <div className="mt-8 flex gap-4">
            <button type="button" onClick={() => setStep(2)} className="btn-secondary">{t("backButton")}</button>
            <button type="button" onClick={() => setStep(4)} className="btn-primary">{t("continueButton")}</button>
          </div>
        </SetupStepLayout>
      )}

      {step === 4 && (
        <SetupStepLayout
          title={t("purposeStep.title")}
          description={t("purposeStep.description")}
        >
          <div className="grid gap-3 sm:grid-cols-2 max-w-2xl">
            {PURPOSE_OPTIONS.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => setPurpose(p.value)}
                className="rounded-[16px] border p-6 text-left transition-colors focus-ring hover:border-[var(--accent)]"
                style={{
                  background: "var(--surface-card)",
                  borderColor: purpose === p.value ? "var(--accent)" : "var(--card-border)",
                  color: "var(--text-primary)",
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
          <p className="mt-4 text-sm" style={{ color: "var(--text-muted)", lineHeight: 1.6 }}>{t("purposeHint")}</p>
          <div className="mt-8 flex gap-4">
            <button type="button" onClick={() => setStep(3)} className="btn-secondary">{t("backButton")}</button>
            <button type="button" onClick={() => setStep(5)} className="btn-primary">{t("continueButton")}</button>
          </div>
        </SetupStepLayout>
      )}

      {step === 5 && (
        <SetupStepLayout title={t("governanceStep.title")}>
          <p className="mb-8 text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}>
            {t("governanceHint")}
          </p>
          <button type="button" onClick={handleActivate} className="btn-primary">
            {t("activateButton")}
          </button>
        </SetupStepLayout>
      )}
    </div>
  );
}
