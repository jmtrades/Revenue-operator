"use client";

import { useState } from "react";

export default function OpsLoginPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setLoading(true);
    try {
      const res = await fetch("/api/ops/auth/magic-link", { credentials: "include",
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = (await res.json()) as { token?: string; error?: string };
      if (!res.ok) {
        setMessage({ type: "error", text: data.error ?? "Request failed" });
        return;
      }
      if (data.token && (process.env.NODE_ENV === "development" || process.env.NEXT_PUBLIC_OPS_DEV_MAGIC_LINK === "true")) {
        setMessage({
          type: "success",
          text: `Magic link (dev): ${data.token}`,
        });
        return;
      }
      setMessage({ type: "success", text: "Check the inbox for the magic link." });
    } catch {
      setMessage({ type: "error", text: "Request failed" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-stone-950 flex items-center justify-center">
      <div className="w-full max-w-sm p-6 rounded-xl bg-stone-900/80 border border-stone-800">
        <h1 className="text-lg font-semibold text-rose-400 mb-1">Ops Login</h1>
        <p className="text-xs text-stone-500 mb-6">Staff only · Magic link</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            placeholder="email@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-3 py-2 rounded-lg bg-stone-800 border border-stone-700 text-stone-100 placeholder-stone-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 rounded-lg bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-sm font-medium"
          >
            {loading ? "Sending…" : "Send magic link"}
          </button>
        </form>
        {message && (
          <p
            className={`mt-4 text-sm ${
              message.type === "success" ? "text-emerald-400" : "text-rose-400"
            }`}
          >
            {message.text}
          </p>
        )}
      </div>
    </div>
  );
}
