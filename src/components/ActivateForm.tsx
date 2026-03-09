"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Sparkles } from "lucide-react";

const ACTIVATE_STORAGE_KEY = "recall_touch_activate";
const RT_SIGNUP_KEY = "rt_signup";
const RECALLTOUCH_SIGNUP_KEY = "recalltouch_signup";

const BUSINESS_TYPE_CHIPS: { value: string; label: string }[] = [
  { value: "home_services", label: "Home Services" },
  { value: "healthcare", label: "Healthcare" },
  { value: "legal", label: "Legal" },
  { value: "real_estate", label: "Real Estate" },
  { value: "insurance", label: "Insurance" },
  { value: "b2b_sales", label: "B2B Sales" },
  { value: "local_business", label: "Local Business" },
  { value: "contractors", label: "Contractors" },
];

export function ActivateForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
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
    if (searchParams.get("canceled") === "1") setError("No problem — protection didn't start.");
  }, [searchParams]);

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
      setError("Email is required.");
      return;
    }

    setSubmitting(true);
    setError(null);
    setSubmitMessage("Creating your account…");

    const loadingTimer = setTimeout(() => setSubmitMessage("Almost there…"), 1500);

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
      const tier = searchParams.get("tier") || "solo";
      const interval = searchParams.get("interval") || "year";
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
        clearTimeout(loadingTimer);
        setSubmitMessage(null);
        router.push(`/connect?workspace_id=${encodeURIComponent(trialData.workspace_id)}`);
        return;
      }

      if (trialData.ok && (trialData.checkout_url ?? trialData.url)) {
        clearTimeout(loadingTimer);
        setSubmitMessage(null);
        window.location.href = trialData.checkout_url ?? trialData.url;
        return;
      }
    } catch {
      // ignore; fall through to localStorage success
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
        <h2 className="text-xl font-bold text-white mb-3">Welcome aboard!</h2>
        <p className="text-sm mb-6 text-zinc-400">
          Your AI phone system is ready.
        </p>
        <button
          type="button"
          onClick={() => router.push("/app")}
          className="w-full max-w-[320px] py-3.5 bg-white text-black rounded-xl font-semibold hover:bg-zinc-200 transition"
        >
          Set up my AI agent →
        </button>
        <p className="text-xs mt-4 text-zinc-500">
          Takes 2 minutes · Your first 14 days are free
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="name" className="block text-xs font-medium mb-1.5 text-zinc-400">
          Your name
        </label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Jane Smith"
          className="w-full px-4 py-3 rounded-xl bg-[var(--bg-input)] border border-[var(--border-medium)] text-white placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--border-medium)]"
        />
      </div>
      <div>
        <label htmlFor="business_name" className="block text-xs font-medium mb-1.5 text-zinc-400">
          Business name
        </label>
        <input
          id="business_name"
          type="text"
          value={businessName}
          onChange={(e) => setBusinessName(e.target.value)}
          placeholder="Acme Plumbing"
          className="w-full px-4 py-3 rounded-xl bg-[var(--bg-input)] border border-[var(--border-medium)] text-white placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--border-medium)]"
        />
      </div>
      <div>
        <label htmlFor="email" className="block text-xs font-medium mb-1.5 text-zinc-400">
          Email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com"
          required
          className="w-full px-4 py-3 rounded-xl bg-[var(--bg-input)] border border-[var(--border-medium)] text-white placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--border-medium)]"
        />
      </div>
      <div>
        <label htmlFor="phone" className="block text-xs font-medium mb-1.5 text-zinc-400">
          Phone number
        </label>
        <input
          id="phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="(555) 123-4567"
          className="w-full px-4 py-3 rounded-xl bg-[var(--bg-input)] border border-[var(--border-medium)] text-white placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--border-medium)]"
        />
      </div>
      <div>
        <label htmlFor="website" className="block text-xs font-medium mb-1.5 text-zinc-400">
          Website URL (optional)
        </label>
        <p className="text-[11px] mb-1 text-zinc-600">Helps tailor your experience.</p>
        <input
          id="website"
          type="url"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          placeholder="https://yourbusiness.com"
          className="w-full px-4 py-3 rounded-xl bg-[var(--bg-input)] border border-[var(--border-medium)] text-white placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--border-medium)]"
        />
      </div>
      <div>
        <span className="block text-xs font-medium mb-2 text-zinc-400">What type of business?</span>
        <div className="flex flex-wrap gap-2">
          {BUSINESS_TYPE_CHIPS.map(({ value, label }) => (
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
        {submitting ? "Creating your account…" : "Get started free →"}
      </button>
      <p className="text-xs text-center mt-2 text-zinc-500">
        No credit card required · 14-day free trial · Cancel anytime
      </p>
      <p className="text-sm text-center text-zinc-400">
        Already have an account?{" "}
        <Link href="/sign-in" className="underline">
          Sign in →
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
            Try again
          </button>
        </div>
      )}
      <p className="text-xs mt-6 text-center text-zinc-600">
        By signing up you agree to our{" "}
        <Link href="/terms" className="underline">
          Terms
        </Link>{" "}
        and{" "}
        <Link href="/privacy" className="underline">
          Privacy Policy
        </Link>
        .
      </p>
    </form>
  );
}

