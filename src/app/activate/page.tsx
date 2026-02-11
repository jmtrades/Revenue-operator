"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function ActivatePage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSubmitting(true);
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
      if (data.workspace_id) {
        if (typeof window !== "undefined") sessionStorage.setItem("revenue_workspace_id", data.workspace_id);
        router.push(`/dashboard/onboarding?workspace_id=${data.workspace_id}`);
        return;
      }
      router.push("/dashboard/onboarding");
    } catch {
      router.push("/dashboard/onboarding");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-12">
        <div className="max-w-md w-full">
          <h1 className="text-xl font-semibold text-stone-50 mb-2">More calls on your calendar</h1>
          <p className="text-stone-400 text-sm mb-6">
            We protect your pipeline — follow-ups, reminders, revivals. You take the calls.
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
              {submitting ? "Starting…" : "Connect pipeline"}
            </button>
          </form>
          <p className="text-stone-500 text-xs mt-4 text-center">
            No credit card. You&apos;ll connect your pipeline next.
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
