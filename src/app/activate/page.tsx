"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { listBusinessTypes } from "@/lib/presets";

function ActivatePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [businessType, setBusinessType] = useState("general");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingMessage, setLoadingMessage] = useState("Preparing checkout…");

  useEffect(() => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10_000);
    fetch("/api/auth/session", { credentials: "include", signal: controller.signal })
      .then((r) => r.json())
      .then((data) => {
        const session = data?.session;
        const hasSession = session && (session.user_id || session.userId) && (session.workspace_id ?? session.workspaceId);
        if (hasSession) {
          const wid = session.workspace_id ?? session.workspaceId;
          router.replace(wid ? `/connect?workspace_id=${encodeURIComponent(wid)}` : "/connect");
          return;
        }
        setCheckingSession(false);
      })
      .catch(() => setCheckingSession(false))
      .finally(() => clearTimeout(timeoutId));
  }, [router]);

  // Check for canceled param
  useEffect(() => {
    if (searchParams.get("canceled") === "1") {
      setError("No problem — protection didn't start.");
    }
  }, [searchParams]);

  const startProtection = async () => {
    if (!email.trim() || submitting) return;
    
    setSubmitting(true);
    setError(null);
    setLoadingMessage("Preparing checkout…");
    
    // Show "Opening secure checkout" after 1200ms
    const loadingTimer = setTimeout(() => {
      setLoadingMessage("Opening secure checkout…");
    }, 1200);
    
    const tier = searchParams.get("tier") || "solo";
    const interval = searchParams.get("interval") || "year";
    try {
      const trialRes = await fetch("/api/trial/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          hired_roles: ["full_autopilot"],
          business_type: businessType || "general",
          tier: tier === "growth" || tier === "team" ? tier : "solo",
          interval: interval === "month" ? "month" : "year",
        }),
      });

      const trialData = await trialRes.json().catch(() => ({ ok: false }));
      if (!trialData.ok) {
        const reason = trialData.reason || "unknown";
        const safeReasons = ["invalid_json", "invalid_email", "missing_env", "workspace_creation_failed", "workspace_create_failed", "checkout_creation_failed", "wrong_price_mode", "stripe_unreachable"];
        const safe = safeReasons.includes(reason) ? reason : "unknown";
        let message = "Trial could not be started.";
        if (safe === "invalid_email") message = "Valid email required.";
        else if (safe === "missing_env") {
          const missing = Array.isArray(trialData.missing) ? trialData.missing as string[] : [];
          message = missing.length > 0
            ? `Trial needs config: add ${missing.join(", ")} to .env.local (or host env).`
            : "Trial is not configured yet. Add STRIPE_SECRET_KEY, STRIPE_PRICE_ID and NEXT_PUBLIC_APP_URL.";
        } else if (safe === "workspace_creation_failed" || safe === "workspace_create_failed") message = "Workspace could not be created. Try again in a moment.";
        setError(message);
        setSubmitting(false);
        clearTimeout(loadingTimer);
        return;
      }

      if (trialData.reason === "already_active" && trialData.workspace_id) {
        clearTimeout(loadingTimer);
        window.location.href = `/connect?workspace_id=${encodeURIComponent(trialData.workspace_id)}`;
        return;
      }

      const checkoutUrl = trialData.checkout_url ?? trialData.url;
      if (!checkoutUrl) {
        setError("Trial could not be started.");
        setSubmitting(false);
        clearTimeout(loadingTimer);
        return;
      }

      clearTimeout(loadingTimer);
      window.location.href = checkoutUrl;
      
    } catch (error) {
      clearTimeout(loadingTimer);
      console.error("[activate] Error:", error);
      const errorMessage = error instanceof Error ? error.message : "Something went wrong. Try again.";
      setError(errorMessage);
      setSubmitting(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await startProtection();
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8" style={{ background: "var(--background)", color: "var(--text-primary)" }}>
        <span className="inline-block w-3 h-3 rounded-full animate-pulse mb-3" style={{ background: "var(--meaning-green)" }} aria-hidden />
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>Loading…</p>
      </div>
    );
  }

  if (submitting) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8" style={{ background: "var(--background)", color: "var(--text-primary)" }}>
        <span className="inline-block w-3 h-3 rounded-full animate-pulse mb-3" style={{ background: "var(--meaning-green)" }} aria-hidden />
        <p className="text-sm" style={{ color: "var(--text-primary)" }}>{loadingMessage}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--background)", color: "var(--text-primary)" }}>
      <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-12">
        <div className="max-w-md w-full">
          <h1 className="font-headline text-xl font-semibold mb-2" style={{ color: "var(--text-primary)" }}>Set up call handling</h1>
          <p className="text-sm mb-4" style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}>
            Set jurisdiction and review level. Calls and follow-ups continue under governance.
          </p>
          <p className="text-xs mb-6" style={{ color: "var(--text-muted)" }}>
            Handling begins under review until governance is confirmed.
          </p>
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <div>
              <label htmlFor="business_type" className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Industry</label>
              <select
                id="business_type"
                value={businessType}
                onChange={(e) => setBusinessType(e.target.value)}
                className="w-full px-4 py-3 rounded-lg focus-ring"
              style={{ background: "var(--surface)", border: "1px solid var(--card-border)", color: "var(--text-primary)" }}
              >
                {listBusinessTypes().map(({ value, label }) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="email" className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@company.com"
                required
                className="w-full px-4 py-3 rounded-lg focus-ring"
                style={{ background: "var(--surface)", border: "1px solid var(--card-border)", color: "var(--text-primary)" }}
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary w-full max-w-[320px] disabled:opacity-50"
            >
              {submitting ? "Starting…" : "Set up call handling"}
            </button>
          </form>
          
          {error && (
            <div className="mt-4 p-4 rounded-lg" style={{ background: "var(--surface)", borderColor: "var(--border)", borderWidth: "1px" }}>
              <p className="text-sm mb-3" style={{ color: "var(--text-primary)" }}>{error}</p>
              <button
                onClick={startProtection}
                className="w-full py-2 px-4 rounded-lg text-sm font-medium transition-opacity hover:opacity-80"
                style={{ background: "var(--meaning-green)", color: "#0c0f13" }}
              >
                Try again
              </button>
            </div>
          )}
          
          <p className="text-xs mt-4 text-center" style={{ color: "var(--text-muted)" }}>
            $0 today. Trial has a fixed end date. Pause anytime before then.
          </p>
        </div>
      </div>
      <div className="p-4 text-center">
        <Link href="/" className="text-sm" style={{ color: "var(--text-muted)" }}>
          ← Back to home
        </Link>
      </div>
    </div>
  );
}

export default function ActivatePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex flex-col items-center justify-center p-8" style={{ background: "var(--background)", color: "var(--text-primary)" }}>
        <span className="inline-block w-3 h-3 rounded-full animate-pulse mb-3" style={{ background: "var(--meaning-green)" }} aria-hidden />
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>Loading…</p>
      </div>
    }>
      <ActivatePageContent />
    </Suspense>
  );
}
