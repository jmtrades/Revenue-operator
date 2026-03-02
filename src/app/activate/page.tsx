"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

const ACTIVATE_STORAGE_KEY = "recall_touch_activate";
/** Definitive spec: primary key for signup data */
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

function ActivatePageContent() {
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

  // Restore submitted state from localStorage (check both keys for backwards compat)
  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      const raw = localStorage.getItem(RT_SIGNUP_KEY) ?? localStorage.getItem(RECALLTOUCH_SIGNUP_KEY) ?? localStorage.getItem(ACTIVATE_STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw) as { submittedAt?: number };
        if (data?.submittedAt && Date.now() - data.submittedAt < 24 * 60 * 60 * 1000) setSubmittedLocal(true);
      }
    } catch {
      // ignore
    }
  }, []);

  // Bounded session check: redirect if session exists; never block showing the form
  useEffect(() => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, 2_000);
    fetch("/api/auth/session", { credentials: "include", signal: controller.signal })
      .then((r) => r.json())
      .then((data) => {
        const session = data?.session;
        const hasSession = session && (session.user_id || session.userId) && (session.workspace_id ?? session.workspaceId);
        if (hasSession) {
          const wid = session.workspace_id ?? session.workspaceId;
          router.replace(wid ? `/connect?workspace_id=${encodeURIComponent(wid)}` : "/connect");
        }
      })
      .catch(() => {
        // Ignore errors — form still renders and works without a session check
      })
      .finally(() => clearTimeout(timeoutId));
  }, [router]);

  useEffect(() => {
    if (searchParams.get("canceled") === "1") setError("No problem — protection didn't start.");
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    const payload = { name: name.trim(), businessName: businessName.trim(), email: email.trim(), phone: phone.trim(), businessType: businessType || "general", website: website.trim() };
    if (!payload.email) {
      setError("Email is required.");
      return;
    }

    setSubmitting(true);
    setError(null);
    setSubmitMessage("Creating your account…");

    const loadingTimer = setTimeout(() => setSubmitMessage("Almost there…"), 1500);

    // Store in signups table when backend is configured (launch prompt)
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
        window.location.href = `/connect?workspace_id=${encodeURIComponent(trialData.workspace_id)}`;
        return;
      }

      if (trialData.ok && (trialData.checkout_url ?? trialData.url)) {
        clearTimeout(loadingTimer);
        setSubmitMessage(null);
        window.location.href = trialData.checkout_url ?? trialData.url;
        return;
      }
    } catch {
      // API failed — fall through to localStorage
    }

    clearTimeout(loadingTimer);
    setSubmitMessage(null);
    setSubmitting(false);

    // Works without backend: store locally (definitive spec: rt_signup)
    const formData = { ...payload, submittedAt: Date.now() };
    try {
      const json = JSON.stringify(formData);
      localStorage.setItem(RT_SIGNUP_KEY, json);
      localStorage.setItem(RECALLTOUCH_SIGNUP_KEY, json);
      localStorage.setItem(ACTIVATE_STORAGE_KEY, json);
    } catch {
      // ignore
    }
    setSubmittedLocal(true);
  };

  // Success state (localStorage or after local submit)
  if (submittedLocal) {
    const savedEmail = (() => {
      try {
        const raw = localStorage.getItem(RT_SIGNUP_KEY) ?? localStorage.getItem(RECALLTOUCH_SIGNUP_KEY);
        if (raw) {
          const d = JSON.parse(raw) as { email?: string };
          return d?.email ?? null;
        }
      } catch {
        return null;
      }
      return null;
    })();
    return (
      <div className="min-h-screen flex flex-col" style={{ background: "var(--background)", color: "var(--text-primary)" }}>
        <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-12">
          <div className="max-w-md w-full text-center">
            <h1 className="font-headline text-xl font-semibold mb-3" style={{ color: "var(--text-primary)" }}>🎉 Welcome to Recall Touch!</h1>
            <p className="text-sm mb-6" style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}>
              We&apos;re setting up your AI phone system now.
              {savedEmail ? ` Check ${savedEmail} for your login link.` : " Check your email for your login link."}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/dashboard"
                className="inline-block py-2.5 px-4 rounded-lg text-sm font-medium"
                style={{ background: "var(--meaning-green)", color: "#0c0f13" }}
              >
                Go to dashboard →
              </Link>
              <Link
                href="/"
                className="inline-block py-2.5 px-4 rounded-lg text-sm font-medium border"
                style={{ borderColor: "var(--card-border)", color: "var(--text-secondary)" }}
              >
                Back to home
              </Link>
            </div>
          </div>
        </div>
        <div className="p-4 text-center">
          <Link href="/" className="text-sm" style={{ color: "var(--text-muted)" }}>← Back to home</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--background)", color: "var(--text-primary)" }}>
      <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-12">
        <div className="max-w-md w-full">
          <h1 className="font-headline text-xl font-semibold mb-2" style={{ color: "var(--text-primary)" }}>Get started with Recall Touch</h1>
          <p className="text-sm mb-6" style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}>
            Your name, business, and how to reach you. We&apos;ll set up your AI phone system.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Your name</label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Smith"
                className="w-full px-4 py-3 rounded-lg focus-ring"
                style={{ background: "var(--surface)", border: "1px solid var(--card-border)", color: "var(--text-primary)" }}
              />
            </div>
            <div>
              <label htmlFor="business_name" className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Business name</label>
              <input
                id="business_name"
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="Acme Plumbing"
                className="w-full px-4 py-3 rounded-lg focus-ring"
                style={{ background: "var(--surface)", border: "1px solid var(--card-border)", color: "var(--text-primary)" }}
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
                className="w-full px-4 py-3 rounded-lg focus-ring"
                style={{ background: "var(--surface)", border: "1px solid var(--card-border)", color: "var(--text-primary)" }}
              />
            </div>
            <div>
              <label htmlFor="phone" className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Phone number</label>
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(555) 123-4567"
                className="w-full px-4 py-3 rounded-lg focus-ring"
                style={{ background: "var(--surface)", border: "1px solid var(--card-border)", color: "var(--text-primary)" }}
              />
            </div>
            <div>
              <label htmlFor="website" className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Website URL (optional)</label>
              <p className="text-[11px] mb-1" style={{ color: "var(--text-tertiary)" }}>Helps tailor your experience.</p>
              <input
                id="website"
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://yourbusiness.com"
                className="w-full px-4 py-3 rounded-lg focus-ring"
                style={{ background: "var(--surface)", border: "1px solid var(--card-border)", color: "var(--text-primary)" }}
              />
            </div>
            <div>
              <span className="block text-xs font-medium mb-2" style={{ color: "var(--text-secondary)" }}>What type of business?</span>
              <div className="flex flex-wrap gap-2">
                {BUSINESS_TYPE_CHIPS.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setBusinessType((prev) => (prev === value ? "" : value))}
                    className="px-3 py-2 rounded-lg text-sm font-medium border transition-colors"
                    style={{
                      background: businessType === value ? "var(--accent-primary-subtle)" : "var(--surface)",
                      borderColor: businessType === value ? "var(--accent-primary)" : "var(--card-border)",
                      color: businessType === value ? "var(--accent-primary)" : "var(--text-secondary)",
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="btn-primary w-full max-w-[320px] disabled:opacity-50"
            >
              {submitting ? "Creating your account…" : "Get started free →"}
            </button>
            <p className="text-xs text-center mt-2" style={{ color: "var(--text-muted)" }}>
              No credit card required · 14-day free trial · Cancel anytime
            </p>
            <p className="text-sm text-center" style={{ color: "var(--text-secondary)" }}>
              Already have an account? <Link href="/sign-in" className="underline">Sign in →</Link>
            </p>
            {submitting && submitMessage && (
              <p className="text-sm text-center mt-2" style={{ color: "var(--text-muted)" }} aria-live="polite">
                {submitMessage}
              </p>
            )}
          </form>

          {error && (
            <div className="mt-4 p-4 rounded-lg" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <p className="text-sm mb-3" style={{ color: "var(--text-primary)" }}>{error}</p>
              <button
                type="button"
                onClick={() => setError(null)}
                className="w-full py-2 px-4 rounded-lg text-sm font-medium"
                style={{ background: "var(--meaning-green)", color: "#0c0f13" }}
              >
                Try again
              </button>
            </div>
          )}

          <p className="text-xs mt-6 text-center" style={{ color: "var(--text-muted)" }}>
            By signing up you agree to our{" "}
            <Link href="/terms" className="underline">Terms</Link> and{" "}
            <Link href="/privacy" className="underline">Privacy Policy</Link>.
          </p>
        </div>
      </div>
      <div className="p-4 text-center">
        <Link href="/" className="text-sm" style={{ color: "var(--text-muted)" }}>← Back to home</Link>
      </div>
    </div>
  );
}

export default function ActivatePage() {
  return (
    <ActivatePageContent />
  );
}
