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
  const [_status, setStatus] = useState<string | null>(null);
  const [outboundFrom, setOutboundFrom] = useState<string>("");
  const [whatsappEnabled, setWhatsappEnabled] = useState(false);
  const [primaryAgentId, setPrimaryAgentId] = useState<string | null>(null);
  const [testCallNumber, setTestCallNumber] = useState("");
  const [testingCall, setTestingCall] = useState(false);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [connectError, setConnectError] = useState<string | null>(null);

  const fetchPhone = useCallback(async () => {
    try {
      const res = await fetch("/api/workspace/phone", { credentials: "include" });
      if (res.ok) {
        const data = (await res.json()) as {
          phone_number?: string | null;
          status?: string | null;
          outbound_from_number?: string | null;
          whatsapp_enabled?: boolean;
        };
        setPhoneNumber(data.phone_number ?? null);
        setStatus(data.status ?? null);
        setOutboundFrom(data.outbound_from_number ?? "");
        setWhatsappEnabled(data.whatsapp_enabled ?? false);
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

  useEffect(() => {
    fetch("/api/workspace/me", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { id?: string | null } | null) => {
        const wid = data?.id ?? null;
        if (!wid) return null;
        return fetch(`/api/agents?workspace_id=${encodeURIComponent(wid)}`, {
          credentials: "include",
        });
      })
      .then((res) => (res && "ok" in res && res.ok ? res.json() : null))
      .then((data: { agents?: Array<{ id?: string }> } | null) => {
        setPrimaryAgentId(data?.agents?.[0]?.id ?? null);
      })
      .catch(() => setPrimaryAgentId(null));
  }, []);

  const handleConnectNumber = async () => {
    setConnecting(true);
    setToast(null);
    setConnectError(null);
    try {
      const res = await fetch("/api/integrations/twilio/auto-provision", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = (await res.json().catch(() => ({}))) as {
        phone_number?: string;
        error?: string;
        message?: string;
      };
      if (data.phone_number) {
        setPhoneNumber(data.phone_number);
        setStatus("active");
        await fetchPhone();
        setToast(data.message ?? "Number connected. You can now receive calls and texts.");
      } else {
        const message = data.error ?? data.message ?? "Could not connect a number. Check Twilio config or try again.";
        setConnectError(message);
        setToast(message);
      }
    } catch {
      const message = "Something went wrong. Try again.";
      setConnectError(message);
      setToast(message);
    } finally {
      setConnecting(false);
      setTimeout(() => setToast(null), 4000);
    }
  };

  const handleSaveOutbound = async () => {
    setSaving(true);
    setToast(null);
    try {
      const res = await fetch("/api/workspace/phone", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outbound_from_number: outboundFrom.trim() || null,
          whatsapp_enabled: whatsappEnabled,
        }),
      });
      if (res.ok) {
        setToast("Settings saved.");
      } else {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        setToast(err.error ?? "Could not save.");
      }
    } catch {
      setToast("Something went wrong.");
    } finally {
      setSaving(false);
      setTimeout(() => setToast(null), 3000);
    }
  };

  const handleTestCall = async () => {
    if (!primaryAgentId) {
      setToast("Your primary agent is still loading. Try again in a moment.");
      setTimeout(() => setToast(null), 3000);
      return;
    }
    setTestingCall(true);
    setToast(null);
    try {
      const res = await fetch(`/api/agents/${primaryAgentId}/test-call`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone_number: testCallNumber.trim() }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; message?: string; error?: string };
      if (!res.ok) {
        setToast(data.error ?? "Could not start a test call.");
      } else {
        setToast(data.message ?? "Test call started. Answer your phone to hear your agent.");
      }
    } catch {
      setToast("Something went wrong.");
    } finally {
      setTestingCall(false);
      setTimeout(() => setToast(null), 4000);
    }
  };

  return (
    <div className="max-w-[600px] mx-auto p-4 md:p-6">
      <h1 className="text-lg font-semibold text-white mb-2">Phone</h1>
      <p className="text-sm text-zinc-500 mb-6">Get a new number for your AI, or forward your personal or existing business number so your agent answers.</p>

      {loading ? (
        <div className="p-4 rounded-2xl border border-zinc-800 bg-zinc-900/50 mb-4 animate-pulse h-20" />
      ) : phoneNumber ? (
        <>
          <div className="p-4 rounded-2xl border border-zinc-800 bg-zinc-900/50 mb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white font-mono">{formatPhoneNumber(phoneNumber)}</p>
                <p className="text-xs text-zinc-500 mt-1">Your AI number · Voice & SMS active</p>
              </div>
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-green-500/15 text-green-400">Active</span>
            </div>
          </div>
          <div className="p-4 rounded-2xl border border-zinc-800 bg-zinc-900/50 mb-6">
            <p className="text-sm font-medium text-white mb-2">Use your personal or existing number</p>
            <p className="text-xs text-zinc-500 mb-3">Forward your current line (personal or business) to the number above. Callers still reach you at your number; your AI answers on this line.</p>
            <div className="space-y-2 text-xs text-zinc-400">
              <p><span className="text-zinc-300 font-medium">AT&T:</span> Dial *21*{phoneNumber.replace(/\D/g, "")}#</p>
              <p><span className="text-zinc-300 font-medium">Verizon:</span> Dial *72 {formatPhoneNumber(phoneNumber)}</p>
              <p><span className="text-zinc-300 font-medium">T-Mobile:</span> Dial **21*{phoneNumber.replace(/\D/g, "")}#</p>
              <p className="text-zinc-500 mt-2">Other carriers: use your carrier’s “call forwarding” or “forward when busy” and enter the number above.</p>
            </div>
          </div>
          <div className="p-4 rounded-2xl border border-zinc-800 bg-zinc-900/50 mb-4">
            <p className="text-sm font-medium text-white mb-2">Outbound from your number</p>
            <p className="text-xs text-zinc-500 mb-3">Send calls and texts from your personal or existing business number. Enter an E.164 number (e.g. +15551234567) that’s in your Twilio account (provisioned or ported). Leave blank to use your connected number above.</p>
            <input
              type="tel"
              value={outboundFrom}
              onChange={(e) => setOutboundFrom(e.target.value)}
              placeholder="+1 555 123 4567"
              className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white placeholder:text-zinc-600 text-sm focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 focus:outline-none mb-3"
            />
            <div className="flex items-center justify-between gap-3">
              <label className="flex items-center gap-2 text-sm text-zinc-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={whatsappEnabled}
                  onChange={(e) => setWhatsappEnabled(e.target.checked)}
                  className="rounded border-zinc-600 bg-zinc-800 text-white focus:ring-zinc-500"
                />
                Enable WhatsApp (same number; enable in Twilio first)
              </label>
            </div>
            <button
              type="button"
              onClick={handleSaveOutbound}
              disabled={saving}
              className="mt-3 px-4 py-2.5 rounded-xl text-sm font-medium bg-white text-black hover:bg-zinc-100 disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
          <div className="p-4 rounded-2xl border border-zinc-800 bg-zinc-900/50 mb-4">
            <p className="text-sm font-medium text-white mb-2">Test your live phone flow</p>
            <p className="text-xs text-zinc-500 mb-3">
              Enter the phone number you want to call. We&apos;ll place a live test call using your current primary agent.
            </p>
            <input
              type="tel"
              value={testCallNumber}
              onChange={(e) => setTestCallNumber(e.target.value)}
              placeholder="+1 555 123 4567"
              className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white placeholder:text-zinc-600 text-sm focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 focus:outline-none mb-3"
            />
            <button
              type="button"
              onClick={handleTestCall}
              disabled={testingCall || !testCallNumber.trim()}
              className="px-4 py-2.5 rounded-xl text-sm font-medium bg-white text-black hover:bg-zinc-100 disabled:opacity-60"
            >
              {testingCall ? "Starting test call…" : "Start test call"}
            </button>
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
        <>
          <div className="p-6 rounded-2xl border border-zinc-800 bg-zinc-900/50 mb-4">
            <p className="text-sm font-medium text-white mb-1">Get a new number</p>
            <p className="text-sm text-zinc-400 mb-4">We’ll assign a dedicated number that your AI answers. Use it as-is or give it out as your business line.</p>
            <button
              type="button"
              onClick={handleConnectNumber}
              disabled={connecting}
              className="px-6 py-3 rounded-xl text-sm font-semibold bg-white text-black hover:bg-zinc-100 disabled:opacity-60 transition-colors"
            >
              {connecting ? "Connecting…" : "Get a number"}
            </button>
            {connectError ? (
              <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                {connectError}
              </div>
            ) : null}
          </div>
          <div className="p-6 rounded-2xl border border-zinc-800 bg-zinc-900/50 mb-6">
            <p className="text-sm font-medium text-white mb-1">Use your personal or existing number</p>
            <p className="text-sm text-zinc-400">Forward your current line to a Recall Touch number so your AI answers. Get a number above first, then set up forwarding with your carrier using the instructions that appear. Works with personal and business lines.</p>
          </div>
        </>
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
