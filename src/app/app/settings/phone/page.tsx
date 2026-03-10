"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { Phone, PhoneForwarded } from "lucide-react";
import {
  fetchWorkspaceMeCached,
  getWorkspaceMeSnapshotSync,
  invalidateWorkspaceMeCache,
} from "@/lib/client/workspace-me";

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

/** Normalize to E.164 for API: 10 digits → +1..., 11 starting with 1 → +1... */
function toE164(value: string): string | null {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (digits.length >= 10 && digits.length <= 15) return `+${digits}`;
  return null;
}

function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

type PhoneSettingsSnapshot = {
  phoneNumber: string | null;
  status: string | null;
  outboundFrom: string;
  whatsappEnabled: boolean;
};

const PHONE_SETTINGS_SNAPSHOT_PREFIX = "rt_phone_settings_snapshot:";

function readPhoneSettingsSnapshot(workspaceId: string): PhoneSettingsSnapshot | null {
  if (typeof window === "undefined" || !workspaceId) return null;
  try {
    const raw = window.localStorage.getItem(
      `${PHONE_SETTINGS_SNAPSHOT_PREFIX}${workspaceId}`,
    );
    return raw ? (JSON.parse(raw) as PhoneSettingsSnapshot) : null;
  } catch {
    return null;
  }
}

function persistPhoneSettingsSnapshot(
  workspaceId: string,
  snapshot: PhoneSettingsSnapshot,
) {
  if (typeof window === "undefined" || !workspaceId) return;
  try {
    window.localStorage.setItem(
      `${PHONE_SETTINGS_SNAPSHOT_PREFIX}${workspaceId}`,
      JSON.stringify(snapshot),
    );
  } catch {
    // ignore persistence errors
  }
}

export default function AppSettingsPhonePage() {
  const workspaceSnapshot = getWorkspaceMeSnapshotSync() as { id?: string | null } | null;
  const snapshotWorkspaceId = workspaceSnapshot?.id?.trim() || "default";
  const initialSnapshot = readPhoneSettingsSnapshot(snapshotWorkspaceId);
  const [phoneNumber, setPhoneNumber] = useState<string | null>(
    initialSnapshot?.phoneNumber ?? null,
  );
  const [_status, setStatus] = useState<string | null>(null);
  const [outboundFrom, setOutboundFrom] = useState<string>(
    initialSnapshot?.outboundFrom ?? "",
  );
  const [whatsappEnabled, setWhatsappEnabled] = useState(
    initialSnapshot?.whatsappEnabled ?? false,
  );
  const [primaryAgentId, setPrimaryAgentId] = useState<string | null>(null);
  const [testCallNumber, setTestCallNumber] = useState("");
  const [testingCall, setTestingCall] = useState(false);
  const [loading, setLoading] = useState(initialSnapshot == null);
  const [connecting, setConnecting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [connectAction, setConnectAction] = useState<string | null>(null);
  const [notifyEmail, setNotifyEmail] = useState("");
  const [copySuccess, setCopySuccess] = useState(false);
  const [testCallError, setTestCallError] = useState<string | null>(null);
  const numberHeadingRef = useRef<HTMLParagraphElement>(null);
  const [areaCode, setAreaCode] = useState("");
  const [verifyPhone, setVerifyPhone] = useState("");
  const [verifyCode, setVerifyCode] = useState("");
  const [verifySending, setVerifySending] = useState(false);
  const [verifyChecking, setVerifyChecking] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [verifiedNumber, setVerifiedNumber] = useState<string | null>(null);
  const [verifyCodeSent, setVerifyCodeSent] = useState(false);

  const fetchPhone = useCallback(async () => {
    try {
      const res = await fetch("/api/workspace/phone", { credentials: "include" });
      if (res.ok) {
        const data = (await res.json()) as {
          phone_number?: string | null;
          status?: string | null;
          outbound_from_number?: string | null;
          whatsapp_enabled?: boolean;
          verified_phone?: string | null;
        };
        setPhoneNumber(data.phone_number ?? null);
        setStatus(data.status ?? null);
        setOutboundFrom(data.outbound_from_number ?? "");
        setWhatsappEnabled(data.whatsapp_enabled ?? false);
        setVerifiedNumber(data.verified_phone ?? null);
        persistPhoneSettingsSnapshot(snapshotWorkspaceId, {
          phoneNumber: data.phone_number ?? null,
          status: data.status ?? null,
          outboundFrom: data.outbound_from_number ?? "",
          whatsappEnabled: data.whatsapp_enabled ?? false,
        });
      }
    } catch {
      setPhoneNumber(null);
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }, [snapshotWorkspaceId]);

  useEffect(() => {
    fetchPhone();
  }, [fetchPhone]);

  useEffect(() => {
    fetchWorkspaceMeCached()
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
        body: JSON.stringify(areaCode ? { area_code: areaCode } : {}),
      });
      const data = (await res.json().catch(() => ({}))) as {
        phone_number?: string;
        error?: string;
        message?: string;
        action?: string;
      };
      if (data.phone_number) {
        setPhoneNumber(data.phone_number);
        setStatus("active");
        setConnectError(null);
        setConnectAction(null);
        await fetchPhone();
        invalidateWorkspaceMeCache();
        setToast(data.message ?? "Number connected. You can now receive calls and texts.");
        setTimeout(() => numberHeadingRef.current?.focus({ preventScroll: true }), 100);
      } else {
        const message = data.error ?? data.message ?? "Could not connect a number. Try again.";
        setConnectError(message);
        setConnectAction(data.action ?? null);
        setToast(message);
      }
    } catch {
      const message = "Something went wrong. Try again.";
      setConnectError(message);
      setConnectAction("retry");
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
        invalidateWorkspaceMeCache();
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
    const normalized = toE164(testCallNumber);
    if (!normalized || digitsOnly(testCallNumber).length < 10) {
      setTestCallError("Enter a valid 10-digit US number.");
      return;
    }
    if (!primaryAgentId) {
      setToast("Create an agent first in the Agents section, then try again.");
      setTimeout(() => setToast(null), 4000);
      return;
    }
    setTestCallError(null);
    setTestingCall(true);
    setToast(null);
    try {
      const res = await fetch(`/api/agents/${primaryAgentId}/test-call`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone_number: normalized }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; message?: string; error?: string };
      if (!res.ok) {
        const msg = data.error ?? "Could not start a test call.";
        setToast(msg);
        setTestCallError(msg);
      } else {
        setTestCallError(null);
        setToast(data.message ?? "Calling you now — answer your phone to hear your agent.");
      }
    } catch {
      setToast("Something went wrong. Try again.");
      setTestCallError("Something went wrong. Try again.");
    } finally {
      setTestingCall(false);
      setTimeout(() => setToast(null), 5000);
    }
  };

  const handleCopyNumber = () => {
    if (!phoneNumber) return;
    const toCopy = toE164(phoneNumber) ?? phoneNumber;
    navigator.clipboard.writeText(toCopy).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }).catch(() => {});
  };

  const testCallDigits = digitsOnly(testCallNumber);
  const testCallValid = testCallDigits.length >= 10;

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-xl font-semibold text-white mb-1">Connect your phone number</h1>
      <p className="text-sm text-white/60 mb-8">Choose how you want your AI to receive calls.</p>

      {loading ? (
        <div className="p-6 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] animate-pulse h-24 mb-4" />
      ) : phoneNumber ? (
        <>
          {/* Option A — Your AI number */}
          <div className="p-6 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] mb-6">
            <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">Option A — Your AI number</p>
            <div className="flex flex-wrap items-center gap-3">
              <p ref={numberHeadingRef} tabIndex={-1} className="text-2xl font-semibold text-white font-mono tracking-tight outline-none" aria-label={`Your number: ${formatPhoneNumber(phoneNumber)}`}>{formatPhoneNumber(phoneNumber)}</p>
              <button
                type="button"
                onClick={handleCopyNumber}
                aria-label={copySuccess ? "Copied to clipboard" : "Copy number"}
                className="px-4 py-2 rounded-xl text-sm font-medium bg-white text-black hover:bg-zinc-100 transition-colors"
              >
                {copySuccess ? "Copied" : "Copy number"}
              </button>
            </div>
            <p className="text-sm text-zinc-400 mt-2">Your AI number is ready! Calls to this number will be answered by your AI agent.</p>
          </div>

          {/* Forward your current number — simple steps */}
          <div className="p-6 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] mb-6">
            <p className="text-sm font-medium text-white mb-1">Option B — Forward your existing number</p>
            <p className="text-xs text-zinc-400 mb-4">Keep your current number. Forward unanswered calls to your AI number below.</p>
            <ol className="space-y-2 text-sm text-zinc-300 list-decimal list-inside">
              <li>Open your phone carrier’s app or website (AT&T, Verizon, T-Mobile, etc.).</li>
              <li>Find “Call forwarding” or “Forward when busy.”</li>
              <li>Enter the number below in your carrier or device settings.</li>
            </ol>
            <p className="text-xs text-zinc-500 mt-2 mb-2">Forward to: <span className="font-mono text-white">{formatPhoneNumber(phoneNumber)}</span></p>
            <p className="text-xs font-medium text-zinc-400 mb-1">Or by device:</p>
            <ul className="space-y-1 text-xs text-zinc-400 mb-3">
              <li><span className="text-zinc-300">iPhone:</span> Settings → Phone → Call Forwarding</li>
              <li><span className="text-zinc-300">Android:</span> Phone → ⋮ → Settings → Call Forwarding</li>
              <li><span className="text-zinc-300">Business line:</span> Call your carrier; ask to forward to {formatPhoneNumber(phoneNumber)}</li>
            </ul>
            <details className="mt-4 group">
              <summary className="text-xs text-zinc-500 cursor-pointer hover:text-zinc-400 list-none flex items-center gap-1">
                <span className="group-open:inline hidden">▼</span><span className="group-open:hidden inline">▶</span> Quick dial codes
              </summary>
              <div className="mt-2 pt-2 border-t border-[var(--border-default)] space-y-1.5 text-xs text-zinc-400">
                <p><span className="text-zinc-300">AT&T:</span> *21*{phoneNumber.replace(/\D/g, "")}#</p>
                <p><span className="text-zinc-300">Verizon:</span> *72 then {formatPhoneNumber(phoneNumber)}</p>
                <p><span className="text-zinc-300">T-Mobile:</span> **21*{phoneNumber.replace(/\D/g, "")}#</p>
              </div>
            </details>
          </div>

          {/* Test forwarding */}
          <div id="test" className="p-6 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] mb-6">
            <p className="text-sm font-medium text-white mb-1">Test forwarding</p>
            <p className="text-xs text-zinc-400 mb-3">We’ll call you so you can talk to your agent right now.</p>
            {!primaryAgentId ? (
              <div className="rounded-xl border border-[var(--border-medium)] bg-[var(--bg-card)]/50 px-4 py-3 text-sm text-zinc-400">
                <p>Create an agent first so we know who should answer.</p>
                <Link href="/app/agents" className="mt-2 inline-block text-white font-medium hover:underline">Go to Agents →</Link>
              </div>
            ) : (
              <>
                <input
                  type="tel"
                  value={testCallNumber}
                  onChange={(e) => { setTestCallNumber(e.target.value); setTestCallError(null); }}
                  placeholder="(555) 123-4567"
                  aria-label="Your phone number for test call"
                  aria-invalid={!!testCallError}
                  aria-describedby={testCallError ? "test-call-error" : undefined}
                  className={`w-full px-4 py-3 rounded-xl bg-[var(--bg-input)] border text-white placeholder:text-zinc-500 text-base focus:ring-1 focus:ring-[var(--border-medium)] focus:outline-none mb-2 ${testCallError ? "border-red-500/50" : "border-[var(--border-default)] focus:border-[var(--border-medium)]"}`}
                />
                {testCallError ? <p id="test-call-error" className="text-sm text-[var(--accent-red)] mb-3" role="alert">{testCallError}</p> : null}
                <button
                  type="button"
                  onClick={handleTestCall}
                  disabled={testingCall || !testCallValid}
                  aria-label={testCallValid ? "Call my phone to test" : "Enter a valid 10-digit number to enable"}
                  className="w-full py-3 rounded-xl text-sm font-semibold bg-white text-black hover:bg-zinc-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {testingCall ? "Calling you…" : "Call my phone to test"}
                </button>
              </>
            )}
          </div>

          {/* Optional: outbound caller ID — collapsed by default */}
          <details className="p-6 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] mb-4 group">
            <summary className="text-sm font-medium text-zinc-400 cursor-pointer hover:text-zinc-300 list-none flex items-center justify-between gap-2">
              Outbound caller ID (optional)
              <span className="text-zinc-500 group-open:rotate-180 transition-transform">▼</span>
            </summary>
            <p className="text-xs text-zinc-500 mt-3 mb-3">Show a different number when your AI places outbound calls. Leave blank to use your AI number above.</p>
            <input
              type="tel"
              value={outboundFrom}
              onChange={(e) => setOutboundFrom(e.target.value)}
              placeholder="(555) 123-4567"
              aria-label="Outbound caller ID number"
              className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-white placeholder:text-zinc-500 text-sm focus:border-[var(--border-medium)] focus:ring-1 focus:ring-[var(--border-medium)] focus:outline-none mb-3"
            />
            <label className="flex items-center gap-2 text-sm text-zinc-400 cursor-pointer mb-3">
              <input
                type="checkbox"
                checked={whatsappEnabled}
                onChange={(e) => setWhatsappEnabled(e.target.checked)}
                className="rounded border-[var(--border-medium)] bg-[var(--bg-card)] text-white focus:ring-[var(--border-medium)]"
              />
              Enable WhatsApp on this number
            </label>
            <button
              type="button"
              onClick={handleSaveOutbound}
              disabled={saving}
              className="px-4 py-2.5 rounded-xl text-sm font-medium bg-white text-black hover:bg-zinc-100 disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </details>

          {/* Verify a number by SMS */}
          <div className="p-6 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] mb-6">
            <p className="text-sm font-medium text-white mb-1">Verify a number by SMS</p>
            <p className="text-xs text-zinc-400 mb-3">We’ll send a 6-digit code to confirm you own this number. Useful for forwarding numbers.</p>
            {verifiedNumber ? (
              <>
                <p className="text-sm text-green-400">Phone verified ✓ {formatPhoneNumber(verifiedNumber)}</p>
                {phoneNumber && (
                  <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl p-5 mt-4">
                    <h3 className="text-base font-medium text-[var(--text-primary)] mb-3">
                      Forward calls to your AI
                    </h3>
                    <div className="space-y-2">
                      <div className="bg-[var(--bg-input)] rounded-lg p-3">
                        <p className="text-sm font-medium text-[var(--text-primary)]">iPhone</p>
                        <p className="text-xs text-[var(--text-secondary)]">Settings → Phone → Call Forwarding → {formatPhoneNumber(phoneNumber)}</p>
                      </div>
                      <div className="bg-[var(--bg-input)] rounded-lg p-3">
                        <p className="text-sm font-medium text-[var(--text-primary)]">Android</p>
                        <p className="text-xs text-[var(--text-secondary)]">Phone → ⋮ → Settings → Call Forwarding → {formatPhoneNumber(phoneNumber)}</p>
                      </div>
                      <div className="bg-[var(--bg-input)] rounded-lg p-3">
                        <p className="text-sm font-medium text-[var(--text-primary)]">Business line</p>
                        <p className="text-xs text-[var(--text-secondary)]">Call your provider: &quot;Forward unanswered calls to {formatPhoneNumber(phoneNumber)}&quot;</p>
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                <input
                  type="tel"
                  value={verifyPhone}
                  onChange={(e) => { setVerifyPhone(e.target.value); setVerifyError(null); }}
                  placeholder="+1 (555) 000-0000"
                  className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-white placeholder:text-zinc-500 text-sm focus:border-[var(--border-medium)] focus:ring-1 focus:outline-none mb-2"
                />
                <div className="flex gap-2 mb-2">
                  <button
                    type="button"
                    onClick={async () => {
                      const cleaned = digitsOnly(verifyPhone);
                      if (cleaned.length < 10 || cleaned.length > 15) {
                        setVerifyError("Enter a valid phone number with country code (e.g., +1 555 000 0000).");
                        return;
                      }
                      const num = toE164(verifyPhone);
                      if (!num) {
                        setVerifyError("Enter a valid phone number with country code (e.g., +1 555 000 0000).");
                        return;
                      }
                      setVerifyError(null);
                      setVerifySending(true);
                      try {
                        const r = await fetch("/api/phone/verify-start", {
                          method: "POST",
                          credentials: "include",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ phone_number: num }),
                        });
                        const d = (await r.json().catch(() => ({}))) as { sent?: boolean; error?: string; action?: string };
                        if (r.ok && d.sent) {
                          setToast("Code sent. Check your phone.");
                        } else {
                          const msg = d.error ?? "Failed to send code.";
                          setVerifyError(msg);
                          if (d.action === "redirect") {
                            setToast("Use 'Get a new AI number' to get a dedicated line.");
                          }
                        }
                      } catch {
                        setVerifyError("Failed to send code. Check your connection and try again.");
                      } finally {
                        setVerifySending(false);
                      }
                    }}
                    disabled={verifySending || digitsOnly(verifyPhone).length < 10 || digitsOnly(verifyPhone).length > 15}
                    className="px-4 py-2 rounded-xl text-sm font-medium border border-[var(--border-medium)] text-zinc-300 hover:bg-[var(--bg-card)] disabled:opacity-50"
                  >
                    {verifySending ? "Sending…" : "Send code"}
                  </button>
                </div>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={verifyCode}
                  onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="000000"
                  className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-white placeholder:text-zinc-500 text-sm focus:border-[var(--border-medium)] focus:ring-1 focus:outline-none mb-2"
                />
                <button
                  type="button"
                  onClick={async () => {
                    const num = toE164(verifyPhone);
                    if (!num || verifyCode.length < 4) {
                      setVerifyError("Enter the 6-digit code from your phone.");
                      return;
                    }
                    setVerifyError(null);
                    setVerifyChecking(true);
                    try {
                      const r = await fetch("/api/phone/verify-check", {
                        method: "POST",
                        credentials: "include",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ phone_number: num, code: verifyCode }),
                      });
                      const d = await r.json();
                      if (r.ok && (d as { verified?: boolean }).verified) {
                        setVerifiedNumber(num);
                        setVerifyCode("");
                        setToast("Phone verified ✓");
                      } else {
                        setVerifyError((d as { error?: string }).error ?? "Code didn’t match. Try again or resend.");
                      }
                    } catch {
                      setVerifyError("Verification failed.");
                    } finally {
                      setVerifyChecking(false);
                    }
                  }}
                  disabled={verifyChecking || verifyCode.length < 4}
                  className="w-full py-2.5 rounded-xl text-sm font-semibold bg-white text-black hover:bg-zinc-100 disabled:opacity-50"
                >
                  {verifyChecking ? "Verifying…" : "Verify"}
                </button>
                {verifyError && <p className="mt-2 text-sm text-[var(--accent-red)]" role="alert">{verifyError}</p>}
              </>
            )}
          </div>

          <p className="text-xs text-zinc-500">Need another number? Available on Growth and Scale plans.</p>
        </>
      ) : (
        <>
          {/* No number — two-option flow */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-[#161B22] border border-white/[0.08] rounded-2xl p-6">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center mb-4">
                <Phone className="w-5 h-5 text-blue-400" />
              </div>
              <h2 className="text-base font-semibold text-white mb-1">Get a new AI number</h2>
              <p className="text-sm text-white/50 mb-1">Recommended</p>
              <p className="text-sm text-white/60 mb-4">We&apos;ll give you a dedicated number. Give it out as your business line, or forward calls to it.</p>
              <div className="mb-4">
                <label htmlFor="phone-area-code" className="text-xs text-white/40 mb-1 block">Area code (optional)</label>
                <input
                  id="phone-area-code"
                  type="tel"
                  inputMode="numeric"
                  maxLength={3}
                  value={areaCode}
                  onChange={(e) => setAreaCode(e.target.value.replace(/\D/g, "").slice(0, 3))}
                  placeholder="e.g. 503"
                  className="w-full bg-[#0D1117] border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/20"
                />
              </div>
              <button
                type="button"
                onClick={handleConnectNumber}
                disabled={connecting}
                className="w-full py-2.5 bg-white text-gray-900 font-semibold rounded-lg text-sm hover:bg-gray-100 disabled:opacity-60 transition-colors"
              >
                {connecting ? "Getting your number…" : "Get my number →"}
              </button>
              <p className="text-xs text-white/30 mt-2 text-center">Takes about 10 seconds</p>
              {connectError ? (
                <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300" role="alert">
                  <p>{connectError}</p>
                  {connectAction === "notify" ? (
                    <div className="mt-3 space-y-2">
                      <p className="text-xs text-red-200/90">We&apos;re setting up phone service. Enter your email to be notified when numbers are available.</p>
                      <input
                        type="email"
                        value={notifyEmail}
                        onChange={(e) => setNotifyEmail(e.target.value)}
                        placeholder="you@company.com"
                        className="w-full bg-black/30 border border-red-500/30 rounded-lg px-3 py-2 text-sm text-white placeholder:text-red-200/50"
                      />
                      <button type="button" onClick={() => { setToast("We'll notify you when numbers are available."); setTimeout(() => setToast(null), 4000); }} className="mt-1 text-xs font-medium underline">Notify me</button>
                    </div>
                  ) : connectAction === "retry_or_notify" ? (
                    <div className="mt-3 space-y-2">
                      <p className="text-xs text-red-200/90">Try a different area code, or leave blank for any available number.</p>
                      <input
                        type="tel"
                        inputMode="numeric"
                        maxLength={3}
                        value={areaCode}
                        onChange={(e) => setAreaCode(e.target.value.replace(/\D/g, "").slice(0, 3))}
                        placeholder="e.g. 503"
                        className="w-full bg-black/30 border border-red-500/30 rounded-lg px-3 py-2 text-sm text-white placeholder:text-red-200/50"
                      />
                      <button type="button" onClick={() => { setConnectError(null); setConnectAction(null); setToast(null); handleConnectNumber(); }} disabled={connecting} className="mt-2 text-xs font-medium underline">Try again</button>
                    </div>
                  ) : (
                    <button type="button" onClick={() => { setConnectError(null); setConnectAction(null); setToast(null); handleConnectNumber(); }} disabled={connecting} className="mt-2 text-xs font-medium underline">Try again</button>
                  )}
                </div>
              ) : null}
            </div>
            <div className="bg-[#161B22] border border-white/[0.08] rounded-2xl p-6">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-4">
                <PhoneForwarded className="w-5 h-5 text-emerald-400" />
              </div>
              <h2 className="text-base font-semibold text-white mb-1">Use your existing number</h2>
              <p className="text-sm text-white/50 mb-1">Forward calls to AI</p>
              <p className="text-sm text-white/60 mb-4">Keep your current number. Set up call forwarding so unanswered calls go to your AI.</p>
              <div className="mb-4">
                <label htmlFor="verify-phone-existing" className="text-xs text-white/40 mb-1 block">Your phone number</label>
                <input
                  id="verify-phone-existing"
                  type="tel"
                  value={verifyPhone}
                  onChange={(e) => { setVerifyPhone(e.target.value); setVerifyError(null); }}
                  placeholder="+1 (555) 000-0000"
                  className="w-full bg-[#0D1117] border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/20"
                />
              </div>
              <button
                type="button"
                onClick={async () => {
                  const num = toE164(verifyPhone);
                  if (!num || digitsOnly(verifyPhone).length < 10) {
                    setVerifyError("Enter a valid 10-digit US number.");
                    return;
                  }
                  setVerifyError(null);
                  setVerifySending(true);
                  try {
                        const r = await fetch("/api/phone/verify-start", {
                          method: "POST",
                          credentials: "include",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ phone_number: num }),
                        });
                        const d = (await r.json().catch(() => ({}))) as { sent?: boolean; error?: string; action?: string };
                        if (r.ok && d.sent) {
                          setToast("Code sent. Check your phone.");
                          setVerifyCodeSent(true);
                        } else {
                          setVerifyError(d.error ?? "Failed to send code.");
                          if (d.action === "redirect") setToast("Use 'Get a new AI number' to get a dedicated line.");
                        }
                      } catch {
                        setVerifyError("Failed to send code. Check your connection and try again.");
                      } finally {
                        setVerifySending(false);
                      }
                    }}
                    disabled={verifySending || digitsOnly(verifyPhone).length < 10 || digitsOnly(verifyPhone).length > 15}
                    className="w-full py-2.5 bg-white/[0.06] border border-white/[0.1] text-white font-semibold rounded-lg text-sm hover:bg-white/[0.1] disabled:opacity-50 transition-colors"
              >
                {verifySending ? "Sending code…" : "Verify my number →"}
              </button>
              <p className="text-xs text-white/30 mt-2 text-center">We&apos;ll send a verification code</p>
              {verifyError && <p className="mt-2 text-xs text-red-400" role="alert">{verifyError}</p>}
              {verifiedNumber ? (
                <div className="mt-4 pt-4 border-t border-white/[0.08] space-y-3">
                  <p className="text-sm text-emerald-400">✓ Verified {formatPhoneNumber(verifiedNumber)}</p>
                  <p className="text-xs text-white/50 mb-2">Forward unanswered calls to your AI number (get one from the left card first).</p>
                  <div className="space-y-2 text-xs text-white/60">
                    <p className="font-medium text-white/70">iPhone:</p>
                    <p>Settings → Phone → Call Forwarding → [your AI number]</p>
                    <p className="font-medium text-white/70 mt-2">Android:</p>
                    <p>Phone → ⋮ → Settings → Call Forwarding → [your AI number]</p>
                    <p className="font-medium text-white/70 mt-2">Business line:</p>
                    <p>Call your provider: &quot;Forward unanswered calls to [your AI number]&quot;</p>
                  </div>
                  <Link href="/app/settings/phone#test" className="inline-block mt-2 text-sm font-medium text-emerald-400 hover:text-emerald-300">Test forwarding →</Link>
                </div>
              ) : (verifyCodeSent || verifyCode.length >= 4) && (
                <div className="mt-4 space-y-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={verifyCode}
                    onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="000000"
                    className="w-full bg-[#0D1117] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30"
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      const num = toE164(verifyPhone);
                      if (!num || verifyCode.length < 4) return;
                      setVerifyChecking(true);
                      try {
                        const r = await fetch("/api/phone/verify-check", {
                          method: "POST",
                          credentials: "include",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ phone_number: num, code: verifyCode }),
                        });
                        const d = await r.json();
                        if (r.ok && (d as { verified?: boolean }).verified) {
                          setVerifiedNumber(num);
                          setVerifyCode("");
                          setToast("Phone verified ✓");
                        } else {
                          setVerifyError((d as { error?: string }).error ?? "Code didn't match.");
                        }
                      } catch {
                        setVerifyError("Verification failed.");
                      } finally {
                        setVerifyChecking(false);
                      }
                    }}
                    disabled={verifyChecking || verifyCode.length < 4}
                    className="w-full py-2 rounded-lg text-sm font-medium bg-white text-black hover:bg-gray-100 disabled:opacity-50"
                  >
                    {verifyChecking ? "Verifying…" : "Confirm code"}
                  </button>
                </div>
              )}
            </div>
          </div>
          <p className="mt-6 text-sm text-zinc-500 text-center">
            <Link href="/app/activity" className="text-zinc-400 hover:text-white transition-colors">I&apos;ll add a number later</Link>
          </p>

        </>
      )}

      {toast && (
        <div role="status" aria-live="polite" className="fixed right-4 z-50 bottom-4 sm:bottom-auto sm:top-4 max-w-[calc(100vw-2rem)]">
          <div className="px-4 py-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border-medium)] shadow-lg text-sm text-zinc-200">
            {toast}
          </div>
        </div>
      )}

      <p className="mt-6"><Link href="/app/settings" className="text-sm text-zinc-400 hover:text-white transition-colors">← Settings</Link></p>
    </div>
  );
}
