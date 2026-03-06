"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

function formatPhoneNumber(num: string | null): string {
  if (!num) return "—";
  const cleaned = num.replace(/\D/g, "");
  if (cleaned.length === 11 && cleaned.startsWith("1")) {
    return `(${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
  }
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  return num;
}

export default function AppSettingsPhonePage() {
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const fetchPhone = useCallback(async () => {
    try {
      const res = await fetch("/api/workspace/phone", { credentials: "include" });
      if (res.ok) {
        const data = (await res.json()) as { phone_number?: string | null; status?: string | null };
        setPhoneNumber(data.phone_number ?? null);
        setStatus(data.status ?? null);
      }
    } catch {
      setPhoneNumber(null);
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPhone();
  }, [fetchPhone]);

  const handleConnectNumber = async () => {
    setConnecting(true);
    setToast(null);
    try {
      const res = await fetch("/api/integrations/twilio/auto-provision", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = (await res.json().catch(() => ({}))) as { phone_number?: string; error?: string };
      if (data.phone_number) {
        setPhoneNumber(data.phone_number);
        setStatus("active");
        setToast("Number connected. You can now receive calls and texts.");
      } else {
        setToast(data.error ?? "Could not connect a number. Check Twilio config or try again.");
      }
    } catch {
      setToast("Something went wrong. Try again.");
    } finally {
      setConnecting(false);
      setTimeout(() => setToast(null), 4000);
    }
  };

  return (
    <div className="max-w-[600px] mx-auto p-4 md:p-6">
      <h1 className="text-lg font-semibold text-white mb-2">Phone</h1>
      <p className="text-sm text-zinc-500 mb-6">Manage your AI phone number. Calls and texts are answered by your agent.</p>

      {loading ? (
        <div className="p-4 rounded-2xl border border-zinc-800 bg-zinc-900/50 mb-4 animate-pulse h-20" />
      ) : phoneNumber ? (
        <>
          <div className="p-4 rounded-2xl border border-zinc-800 bg-zinc-900/50 mb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white font-mono">{formatPhoneNumber(phoneNumber)}</p>
                <p className="text-xs text-zinc-500 mt-1">Primary number · Voice & SMS active</p>
              </div>
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-green-500/15 text-green-400">Active</span>
            </div>
          </div>
          <div className="p-4 rounded-2xl border border-zinc-800 bg-zinc-900/50 mb-6">
            <p className="text-sm font-medium text-white mb-2">Forward your existing number</p>
            <p className="text-xs text-zinc-500 mb-2">Forward calls from your current business line to this number so your AI answers.</p>
            <div className="space-y-2 text-xs text-zinc-400">
              <p><span className="text-zinc-300 font-medium">AT&T:</span> Dial *21*{phoneNumber.replace(/\D/g, "")}#</p>
              <p><span className="text-zinc-300 font-medium">Verizon:</span> Dial *72 {formatPhoneNumber(phoneNumber)}</p>
              <p><span className="text-zinc-300 font-medium">T-Mobile:</span> Dial **21*{phoneNumber.replace(/\D/g, "")}#</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => { setToast("Additional numbers are available on Growth and Scale plans."); setTimeout(() => setToast(null), 4000); }}
            className="px-4 py-2.5 rounded-xl text-sm font-medium border border-zinc-700 text-zinc-300 hover:border-zinc-500 transition-colors"
          >
            + Add number
          </button>
        </>
      ) : (
        <div className="p-6 rounded-2xl border border-zinc-800 bg-zinc-900/50 mb-6">
          <p className="text-sm text-zinc-300 mb-4">No phone number connected yet. Get a dedicated number for your AI to answer calls and texts.</p>
          <button
            type="button"
            onClick={handleConnectNumber}
            disabled={connecting}
            className="px-6 py-3 rounded-xl text-sm font-semibold bg-white text-black hover:bg-zinc-100 disabled:opacity-60 transition-colors"
          >
            {connecting ? "Connecting…" : "Connect number"}
          </button>
        </div>
      )}

      {toast && (
        <div className="fixed top-4 right-4 z-50 px-4 py-2 rounded-xl bg-zinc-900 border border-zinc-700 shadow-lg text-sm text-zinc-200">
          {toast}
        </div>
      )}

      <p className="mt-6"><Link href="/app/settings" className="text-sm text-zinc-400 hover:text-white transition-colors">← Settings</Link></p>
    </div>
  );
}
