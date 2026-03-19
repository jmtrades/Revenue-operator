"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Sparkles } from "lucide-react";
import { track } from "@/lib/analytics/posthog";

const ACTIVATE_STORAGE_KEY = "recall_touch_activate";
const RT_SIGNUP_KEY = "rt_signup";
const RECALLTOUCH_SIGNUP_KEY = "recalltouch_signup";

const BUSINESS_TYPE_IDS = [
  "home_services",
  "healthcare",
  "legal",
  "real_estate",
  "insurance",
  "b2b_sales",
  "local_business",
  "contractors",
] as const;

const BUSINESS_TYPE_KEY_MAP: Record<(typeof BUSINESS_TYPE_IDS)[number], string> = {
  home_services: "businessTypeHomeServices",
  healthcare: "businessTypeHealthcare",
  legal: "businessTypeLegal",
  real_estate: "businessTypeRealEstate",
  insurance: "businessTypeInsurance",
  b2b_sales: "businessTypeB2bSales",
  local_business: "businessTypeLocalBusiness",
  contractors: "businessTypeContractors",
};

export function ActivateForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations("activate");
  const businessTypeChips = useMemo(
    () => BUSINESS_TYPE_IDS.map((value) => ({ value, label: t(BUSINESS_TYPE_KEY_MAP[value]) })),
    [t]
  );
  const [name, setName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [businessType, setBusinessType] = useState<string>("");
  const [website, setWebsite] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submittedLocal, setSubmittedLocal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw =
        localStorage.getItem(RT_SIGNUP_KEY) ??
        localStorage.getItem(RECALLTOUCH_SIGNUP_KEY) ??
        localStorage.getItem(ACTIVATE_STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw) as { submittedAt?: number };
        if (data?.submittedAt && Date.now() - data.submittedAt < 24 * 60 * 60 * 1000) setSubmittedLocal(true);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (searchParams.get("canceled") === "1") setError(t("cancelError"));
  }, [searchParams, t]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    const payload = {
      name: name.trim(),
      businessName: businessName.trim(),
      email: email.trim(),
      phone: phone.trim(),
      businessType: businessType || "general",
      website: website.trim(),
    };
    if (!payload.email) {
      setError(t("emailRequired"));
      return;
    }

    setSubmitting(true);
    setError(null);
    setSubmitMessage(t("creatingAccount"));

    track("signup_started");

    const loadingTimer = setTimeout(() => setSubmitMessage(t("almostThere")), 1500);

    fetch("/api/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: payload.name,
        businessName: payload.businessName,
        email: payload.email,
        phone: payload.phone || undefined,
        industry: payload.businessType || undefined,
        website: payload.website || undefined,
      }),
    }).catch(() => {});

    try {
      const tierRaw = searchParams.get("tier") || "solo";
      const tier = tierRaw.toString().trim().toLowerCase();
      const interval = searchParams.get("interval") || "year";
      const plan =
        tier === "business" || tier === "growth"
          ? "business"
          : tier === "scale" || tier === "team"
            ? "scale"
            : tier === "enterprise"
              ? "enterprise"
              : "solo";
      const trialRes = await fetch("/api/trial/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: payload.email,
          hired_roles: ["full_autopilot"],
          business_type: payload.businessType || "general",
          tier: tier === "growth" || tier === "team" ? tier : "solo",
          interval: interval === "month" ? "month" : "year",
        }),
      });

      const trialData = await trialRes.json().catch(() => ({ ok: false }));

      if (trialData.ok && trialData.reason === "already_active" && trialData.workspace_id) {
        track("signup_completed", { plan });
        clearTimeout(loadingTimer);
        setSubmitMessage(null);
        router.push(`/connect?workspace_id=${encodeURIComponent(trialData.workspace_id)}`);
        return;
      }

      if (trialData.ok && (trialData.checkout_url ?? trialData.url)) {
        track("signup_completed", { plan });
        clearTimeout(loadingTimer);
        setSubmitMessage(null);
        window.location.href = trialData.checkout_url ?? trialData.url;
        return;
      }

      if (!trialRes.ok || !trialData.ok) {
        clearTimeout(loadingTimer);
        setSubmitting(false);
        setError(t("trialError"));
        return;
      }
    } catch {
      setSubmitting(false);
      setError(t("trialError"));
      clearTimeout(loadingTimer);
      return;
    }

    clearTimeout(loadingTimer);
    setSubmitMessage(null);
    setSubmitting(false);

    const formData = { ...payload, submittedAt: Date.now() };
    try {
      const json = JSON.stringify(formData);
      localStorage.setItem(RT_SIGNUP_KEY, json);
      localStorage.setItem(RECALLTOUCH_SIGNUP_KEY, json);
      localStorage.setItem(ACTIVATE_STORAGE_KEY, json);
      localStorage.setItem("rt_authenticated", "true");
    } catch {
      // ignore
    }
    setSubmittedLocal(true);
  };

  if (submittedLocal) {
    return (
      <div className="text-center">
        <div className="mb-4 flex justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/10">
            <Sparkles className="h-7 w-7 text-amber-400" />
          </div>
        </div>
        <h2 className="text-xl font-bold text-white mb-3">{t("welcomeAboard")}</h2>
        <p className="text-sm mb-6 text-zinc-400">
          {t("aiReady")}
        </p>
        <button
          type="button"
          onClick={() => router.push("/app")}
          className="w-full max-w-[320px] py-3.5 bg-white text-black rounded-xl font-semibold hover:bg-zinc-200 transition"
        >
          {t("setUpAgent")}
        </button>
        <p className="text-xs mt-4 text-zinc-500">
          {t("takes2Min")}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="name" className="block text-xs font-medium mb-1.5 text-zinc-400">
          {t("formName")}
        </label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("namePlaceholder")}
          className="w-full px-4 py-3 rounded-xl bg-[var(--bg-input)] border border-[var(--border-medium)] text-white placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--border-medium)]"
        />
      </div>
      <div>
        <label htmlFor="business_name" className="block text-xs font-medium mb-1.5 text-zinc-400">
          {t("formBusinessName")}
        </label>
        <input
          id="business_name"
          type="text"
          value={businessName}
          onChange={(e) => setBusinessName(e.target.value)}
          placeholder={t("businessPlaceholder")}
          className="w-full px-4 py-3 rounded-xl bg-[var(--bg-input)] border border-[var(--border-medium)] text-white placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--border-medium)]"
        />
      </div>
      <div>
        <label htmlFor="email" className="block text-xs font-medium mb-1.5 text-zinc-400">
          {t("formEmail")}
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t("emailPlaceholder")}
          required
          className="w-full px-4 py-3 rounded-xl bg-[var(--bg-input)] border border-[var(--border-medium)] text-white placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--border-medium)]"
        />
      </div>
      <div>
        <label htmlFor="phone" className="block text-xs font-medium mb-1.5 text-zinc-400">
          {t("formPhone")}
        </label>
        <input
          id="phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder={t("phonePlaceholder")}
          className="w-full px-4 py-3 rounded-xl bg-[var(--bg-input)] border border-[var(--border-medium)] text-white placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--border-medium)]"
        />
      </div>
      <div>
        <label htmlFor="website" className="block text-xs font-medium mb-1.5 text-zinc-400">
          {t("formWebsite")}
        </label>
        <p className="text-[11px] mb-1 text-zinc-600">{t("formWebsiteHint")}</p>
        <input
          id="website"
          type="url"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          placeholder={t("websitePlaceholder")}
          className="w-full px-4 py-3 rounded-xl bg-[var(--bg-input)] border border-[var(--border-medium)] text-white placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--border-medium)]"
        />
      </div>
      <div>
        <span className="block text-xs font-medium mb-2 text-zinc-400">{t("formBusinessType")}</span>
        <div className="flex flex-wrap gap-2">
          {businessTypeChips.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setBusinessType((prev) => (prev === value ? "" : value))}
              className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                businessType === value
                  ? "bg-white/10 border-white text-white"
                  : "bg-zinc-800/50 border-zinc-700 text-zinc-400 hover:border-zinc-500"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full max-w-[320px] py-3.5 bg-white text-black rounded-xl font-semibold hover:bg-zinc-200 transition disabled:opacity-60"
      >
        {submitting ? t("creatingAccount") : t("getStartedFree")}
      </button>
      <p className="text-xs text-center mt-2 text-zinc-500">
        {t("noCardRequired")}
      </p>
      <p className="text-sm text-center text-zinc-400">
        {t("alreadyHaveAccount")}{" "}
        <Link href="/sign-in" className="underline">
          {t("signInLink")}
        </Link>
      </p>
      {submitting && submitMessage && (
        <p className="text-sm text-center mt-2 text-zinc-500" aria-live="polite">
          {submitMessage}
        </p>
      )}
      {error && (
        <div className="mt-4 p-4 rounded-lg bg-red-500/10 border border-red-500/30">
          <p className="text-sm mb-2 text-red-200">{error}</p>
          <button
            type="button"
            onClick={() => setError(null)}
            className="w-full py-2 px-4 rounded-lg text-sm font-medium bg-white text-black hover:bg-zinc-200 transition"
          >
            {t("tryAgain")}
          </button>
        </div>
      )}
      <p className="text-xs mt-6 text-center text-zinc-600">
        {t("bySigningUp")}{" "}
        <Link href="/terms" className="underline">
          {t("terms")}
        </Link>{" "}
        {t("and")}{" "}
        <Link href="/privacy" className="underline">
          {t("privacyPolicy")}
        </Link>
        .
      </p>
    </form>
  );
}

