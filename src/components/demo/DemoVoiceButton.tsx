"use client";

import { useState } from "react";

export function DemoVoiceButton() {
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleCall = async () => {
    const value = phone.trim();
    if (!value) {
      setError("Enter a phone number to receive a demo call.");
      return;
    }
    setLoading(true);
    setStatus(null);
    setError(null);
    try {
      const res = await fetch("/api/demo/call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone_number: value }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; message?: string; error?: string };
      if (res.ok && data.ok) {
        setStatus(data.message ?? "Calling you now. Answer to talk with the AI agent.");
      } else {
        setError(data.error ?? "Could not start demo call. Please try again.");
      }
    } catch {
      setError("Could not start demo call. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-2 w-full max-w-sm">
      <div className="w-full flex flex-col sm:flex-row gap-2">
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+1 (555) 123-4567"
          className="flex-1 px-3 py-2.5 rounded-xl bg-black/40 border border-white/10 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-white/40"
        />
        <button
          type="button"
          onClick={handleCall}
          disabled={loading}
          className="px-4 py-2.5 rounded-xl bg-white text-black text-sm font-semibold hover:bg-zinc-100 disabled:opacity-60"
        >
          {loading ? "Calling…" : "Call me"}
        </button>
      </div>
      {status && (
        <p className="text-xs text-emerald-300 text-center" role="status">
          {status}
        </p>
      )}
      {error && (
        <p className="text-xs text-red-400 text-center" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
