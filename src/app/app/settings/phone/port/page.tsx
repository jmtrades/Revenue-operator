"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { ArrowLeft, Upload } from "lucide-react";

export default function PhonePortPage() {
  const t = useTranslations("phone");
  const [step, setStep] = useState(1);
  const [number, setNumber] = useState("");
  const [carrier, setCarrier] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [accountNumber, setAccountNumber] = useState("");
  const [accountPin, setAccountPin] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await fetch("/api/phone/port-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          phone_number: number,
          current_carrier: carrier,
          account_number: accountNumber || null,
          account_pin: accountPin || null,
        }),
      });
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <Breadcrumbs
        items={[
          { label: t("portPage.breadcrumbSettings"), href: "/app/settings" },
          { label: t("portPage.breadcrumbPhone"), href: "/app/settings/phone" },
          { label: t("portPage.breadcrumbPort") },
        ]}
      />
      <Link
        href="/app/settings/phone"
        className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        {t("portPage.backToPhone")}
      </Link>
      <h1 className="text-xl font-semibold text-white mb-1">{t("portPage.title")}</h1>
      <p className="text-sm text-zinc-400 mb-8">
        {t("portPage.subtitle")}
      </p>

      {submitted ? (
        <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-6 text-center">
          <p className="text-white font-medium mb-1">{t("portPage.requestReceived")}</p>
          <p className="text-sm text-zinc-400 mb-4">
            {t("portPage.requestReceivedBody")}
          </p>
          <Link href="/app/settings/phone" className="text-sm font-medium text-[var(--accent-primary)] hover:underline">
            {t("portPage.backToPhoneSettings")}
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {step >= 1 && (
            <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-6">
              <p className="text-sm font-medium text-white mb-2">{t("portPage.step1Title")}</p>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-zinc-500 mb-1">{t("porting.numberLabel")}</label>
                  <input
                    type="tel"
                    value={number}
                    onChange={(e) => setNumber(e.target.value)}
                    placeholder={t("portPage.numberPlaceholder")}
                    className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-white placeholder:text-zinc-500 text-sm focus:border-[var(--accent-primary)] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-500 mb-1">{t("porting.carrierLabel")}</label>
                  <input
                    type="text"
                    value={carrier}
                    onChange={(e) => setCarrier(e.target.value)}
                    placeholder={t("portPage.carrierPlaceholder")}
                    className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-white placeholder:text-zinc-500 text-sm focus:border-[var(--accent-primary)] focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}
          {step >= 2 && (
            <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-6">
              <p className="text-sm font-medium text-white mb-2">{t("portPage.step2Title")}</p>
              <p className="text-xs text-zinc-500 mb-4">{t("portPage.step2Body")}</p>
              <div className="border border-dashed border-[var(--border-default)] rounded-xl p-8 text-center">
                <Upload className="w-8 h-8 text-zinc-500 mx-auto mb-2" />
                <p className="text-sm text-zinc-400">{t("portPage.uploadHint")}</p>
                <p className="text-xs text-zinc-500 mt-1">{t("portPage.uploadFormats")}</p>
              </div>
            </div>
          )}
          {step >= 3 && (
            <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-6">
              <p className="text-sm font-medium text-white mb-2">{t("portPage.step3Title")}</p>
              <p className="text-xs text-zinc-500 mb-4">{t("portPage.step3Body")}</p>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-zinc-500 mb-1">{t("porting.accountNumber")}</label>
                  <input
                    type="text"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-white text-sm focus:border-[var(--accent-primary)] focus:outline-none"
                    placeholder={t("portPage.accountPlaceholder")}
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-500 mb-1">{t("portPage.pinLabel")}</label>
                  <input
                    type="password"
                    value={accountPin}
                    onChange={(e) => setAccountPin(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-white text-sm focus:border-[var(--accent-primary)] focus:outline-none"
                    placeholder={t("portPage.pinPlaceholder")}
                  />
                </div>
              </div>
            </div>
          )}
          <div className="flex items-center justify-between">
            {step > 1 ? (
              <button type="button" onClick={() => setStep((s) => s - 1)} className="text-sm text-zinc-400 hover:text-white">
                {t("portPage.back")}
              </button>
            ) : (
              <span />
            )}
            {step < 3 ? (
              <button type="button" onClick={() => setStep((s) => s + 1)} className="px-4 py-2 rounded-xl bg-white text-black font-medium text-sm hover:bg-zinc-100">
                {t("portPage.next")}
              </button>
            ) : (
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 rounded-xl bg-white text-black font-medium text-sm hover:bg-zinc-100 disabled:opacity-60"
              >
                {loading ? t("portPage.submitting") : t("portPage.submitLabel")}
              </button>
            )}
          </div>
        </form>
      )}
    </div>
  );
}
