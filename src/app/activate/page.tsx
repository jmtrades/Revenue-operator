"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function ActivatePage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [progressStep, setProgressStep] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/auth/session", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (data?.session?.userId && data?.session?.workspaceId) {
          router.replace("/dashboard/live");
          return;
        }
        setCheckingSession(false);
      })
      .catch(() => setCheckingSession(false));
  }, [router]);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSubmitting(true);
    setProgressStep(0);
    
    // Progress animation steps
    setTimeout(() => setProgressStep(1), 600);
    setTimeout(() => setProgressStep(2), 1200);
    
    try {
      const res = await fetch("/api/trial/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          hired_roles: ["full_autopilot"],
          business_type: null,
        }),
      });
      const data = await res.json();
      const workspaceId = data.workspace_id;
      if (!workspaceId) {
        setTimeout(() => router.push("/dashboard/onboarding"), 1800);
        return;
      }
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("revenue_last_workspace_id", workspaceId);
        } catch {
          // ignore
        }
      }
      const base = typeof window !== "undefined" ? window.location.origin : "";
      const checkoutRes = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspace_id: workspaceId,
          success_url: `${base}/dashboard/onboarding?workspace_id=${encodeURIComponent(workspaceId)}`,
          cancel_url: `${base}/activate`,
        }),
      });
      const checkoutData = await checkoutRes.json();
      if (checkoutData.checkout_url) {
        window.location.href = checkoutData.checkout_url;
        return;
      }
      setTimeout(() => router.push(`/dashboard/onboarding?workspace_id=${workspaceId}`), 1800);
    } catch {
      setTimeout(() => router.push("/dashboard/onboarding"), 1800);
    } finally {
      // Keep progress visible during redirect
    }
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8" style={{ background: "var(--background)", color: "var(--text-primary)" }}>
        <span className="inline-block w-3 h-3 rounded-full animate-pulse mb-3" style={{ background: "var(--meaning-green)" }} aria-hidden />
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>Restoring your conversations…</p>
      </div>
    );
  }

  if (submitting && progressStep !== null) {
    const steps = ["Creating workspace", "Preparing protection", "Securing conversations"];
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8" style={{ background: "var(--background)", color: "var(--text-primary)" }}>
        <div className="max-w-md w-full text-center">
          {steps.slice(0, progressStep + 1).map((step, i) => (
            <div key={i} className="mb-3 flex items-center justify-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full" style={{ background: "var(--meaning-green)" }} aria-hidden />
              <p className="text-sm" style={{ color: "var(--text-primary)" }}>{step}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-12">
        <div className="max-w-md w-full">
          <h1 className="text-xl font-semibold mb-2" style={{ color: "var(--text-primary)" }}>Start protection</h1>
          <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>
            We maintain continuity — reply, follow up, recover — so people show up. You take the calls.
          </p>
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              required
              className="w-full px-4 py-3 rounded-lg bg-stone-900 border border-stone-700 text-stone-100 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
            />
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 font-medium text-stone-950"
            >
              {submitting ? "Starting…" : "Start 14-day protection"}
            </button>
          </form>
          <p className="text-xs mt-4 text-center" style={{ color: "var(--text-muted)" }}>
            £0 today — trial ends in 14 days — pause anytime before renewal
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
