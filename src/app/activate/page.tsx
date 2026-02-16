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
    fetch("/api/auth/session", { credentials: "include" })
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
      .catch(() => setCheckingSession(false));
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
    
    try {
      // Step 1: Create workspace
      const trialRes = await fetch("/api/trial/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          hired_roles: ["full_autopilot"],
          business_type: businessType || "general",
        }),
      });
      
      if (!trialRes.ok) {
        const trialData = await trialRes.json().catch(() => ({}));
        throw new Error(trialData.error || "Failed to start trial");
      }
      
      const trialData = await trialRes.json();
      const workspaceId = trialData.workspace_id;
      
      if (!workspaceId) {
        throw new Error("No workspace ID returned");
      }
      
      // Step 2: Create checkout session
      const base = typeof window !== "undefined" ? window.location.origin : "";
      const checkoutRes = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          workspace_id: workspaceId,
        }),
      });
      
      if (!checkoutRes.ok) {
        const checkoutError = await checkoutRes.json().catch(() => ({}));
        
        if (checkoutError.error === "STRIPE_NOT_CONFIGURED") {
          setError("Payment setup isn't complete yet.");
        } else {
          setError(checkoutError.error || checkoutError.message || "Checkout could not be started.");
        }
        setSubmitting(false);
        clearTimeout(loadingTimer);
        return;
      }
      
      const checkoutData = await checkoutRes.json();
      
      if (!checkoutData.url && !checkoutData.checkout_url) {
        setError("Checkout unavailable");
        setSubmitting(false);
        clearTimeout(loadingTimer);
        return;
      }
      
      const checkoutUrl = checkoutData.url || checkoutData.checkout_url;
      
      // Redirect to Stripe
      clearTimeout(loadingTimer);
      window.location.href = checkoutUrl;
      window.location.assign(checkoutUrl); // Fallback
      
    } catch (error) {
      clearTimeout(loadingTimer);
      console.error("[activate] Error:", error);
      const errorMessage = error instanceof Error ? error.message : "Something went wrong. Please try again.";
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
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-12">
        <div className="max-w-md w-full">
          <h1 className="text-xl font-semibold mb-2" style={{ color: "var(--text-primary)" }}>Start protection</h1>
          <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>
            Enquiries, follow-ups, and reminders continue here so more people show up. You handle: calls.
          </p>
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <div>
              <label htmlFor="business_type" className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Business type</label>
              <select
                id="business_type"
                value={businessType}
                onChange={(e) => setBusinessType(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-stone-900 border border-stone-700 text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
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
                className="w-full px-4 py-3 rounded-lg bg-stone-900 border border-stone-700 text-stone-100 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 font-medium text-stone-950"
            >
              {submitting ? "Starting…" : "Start 14-day protection"}
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
        <Link href="/" className="text-stone-500 text-sm hover:text-stone-300">
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
