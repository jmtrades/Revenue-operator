"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { formatCurrencyCents } from "@/lib/currency";
import { toast as sonnerToast } from "sonner";
import { Phone, PhoneForwarded, Plus, FileInput } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { safeGetItem, safeSetItem, safeRemoveItem } from "@/lib/client/safe-storage";
import {
  fetchWorkspaceMeCached,
  getWorkspaceMeSnapshotSync,
  invalidateWorkspaceMeCache,
} from "@/lib/client/workspace-me";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";

type WorkspacePhoneNumber = {
  id: string;
  phone_number: string;
  friendly_name: string | null;
  number_type: string;
  status: string;
  monthly_cost_cents: number;
  capabilities: { voice?: boolean; sms?: boolean; mms?: boolean };
  assigned_agent_id: string | null;
};

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
  const digits = (value ?? "").replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (digits.length >= 10 && digits.length <= 15) return `+${digits}`;
  return null;
}

function digitsOnly(value: string): string {
  return (value ?? "").replace(/\D/g, "");
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
  const key = `${PHONE_SETTINGS_SNAPSHOT_PREFIX}${workspaceId}`;
  try {
    const raw = safeGetItem(key);
    return raw ? (JSON.parse(raw) as PhoneSettingsSnapshot) : null;
  } catch {
    safeRemoveItem(key);
    return null;
  }
}

function persistPhoneSettingsSnapshot(
  workspaceId: string,
  snapshot: PhoneSettingsSnapshot,
) {
  if (typeof window === "undefined" || !workspaceId) return;
  safeSetItem(`${PHONE_SETTINGS_SNAPSHOT_PREFIX}${workspaceId}`, JSON.stringify(snapshot));
}

export default function AppSettingsPhonePage() {
  const locale = useLocale() || "en-US";
  const t = useTranslations("common");
  const tSettings = useTranslations("settings");
  const tPhone = useTranslations("phone");
  const tForms = useTranslations("forms.state");
  const workspaceSnapshot = getWorkspaceMeSnapshotSync() as { id?: string | null } | null;
  const snapshotWorkspaceId = workspaceSnapshot?.id?.trim() || "default";
  const initialSnapshot = readPhoneSettingsSnapshot(snapshotWorkspaceId);
  const [phoneNumber, setPhoneNumber] = useState<string | null>(
    initialSnapshot?.phoneNumber ?? null,
  );
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
  const [connectErrorCode, setConnectErrorCode] = useState<string | null>(null);
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
  const [workspaceNumbers, setWorkspaceNumbers] = useState<WorkspacePhoneNumber[]>([]);
  const [numbersLoading, setNumbersLoading] = useState(true);
  const [totalMonthlyCents, setTotalMonthlyCents] = useState(0);
  const [releasingId, setReleasingId] = useState<string | null>(null);
  const [releaseConfirm, setReleaseConfirm] = useState<WorkspacePhoneNumber | null>(null);
  const lastSavedOutboundRef = useRef({ outboundFrom, whatsappEnabled });
  const isDirty =
    outboundFrom !== lastSavedOutboundRef.current.outboundFrom ||
    whatsappEnabled !== lastSavedOutboundRef.current.whatsappEnabled;
  useUnsavedChanges(isDirty);

  useEffect(() => {
    document.title = tPhone("pageTitle");
  }, [tPhone]);

  const fetchWorkspaceNumbers = useCallback(async () => {
    try {
      const res = await fetch("/api/phone/numbers", { credentials: "include" });
      if (res.ok) {
        const data = (await res.json()) as { numbers?: WorkspacePhoneNumber[]; total_monthly_cents?: number };
        setWorkspaceNumbers(data.numbers ?? []);
        setTotalMonthlyCents(data.total_monthly_cents ?? 0);
      }
    } catch {
      setWorkspaceNumbers([]);
    } finally {
      setNumbersLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWorkspaceNumbers();
  }, [fetchWorkspaceNumbers]);

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
        setOutboundFrom(data.outbound_from_number ?? "");
        setWhatsappEnabled(data.whatsapp_enabled ?? false);
        setVerifiedNumber(data.verified_phone ?? null);
        const outbound = data.outbound_from_number ?? "";
        const whatsapp = data.whatsapp_enabled ?? false;
        lastSavedOutboundRef.current = { outboundFrom: outbound, whatsappEnabled: whatsapp };
        persistPhoneSettingsSnapshot(snapshotWorkspaceId, {
          phoneNumber: data.phone_number ?? null,
          status: data.status ?? null,
          outboundFrom: outbound,
          whatsappEnabled: whatsapp,
        });
      }
    } catch {
      setPhoneNumber(null);
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
      .catch((err) => {
        setPrimaryAgentId(null);
      });
  }, []);

  const handleConnectNumber = async () => {
    if (areaCode && (areaCode.length < 3 || !/^\d{3}$/.test(areaCode))) {
      setConnectError(tPhone("toast.invalidAreaCode"));
      setToast(tPhone("toast.invalidAreaCode"));
      setTimeout(() => setToast(null), 4000);
      return;
    }
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
        code?: string;
      };
      if (data.phone_number) {
        setPhoneNumber(data.phone_number);
        setConnectError(null);
        setConnectErrorCode(null);
        await fetchPhone();
        invalidateWorkspaceMeCache();
        setToast(data.message ?? tPhone("toast.numberConnected"));
        setTimeout(() => numberHeadingRef.current?.focus({ preventScroll: true }), 100);
      } else {
        const message = data.error ?? data.message ?? tPhone("toast.connectFailed");
        setConnectError(message);
        setConnectErrorCode(data.code ?? null);
        setToast(message);
      }
    } catch {
      const message = tPhone("toast.errorRetry");
      setConnectError(message);
      setConnectErrorCode("PROVISION_ERROR");
      setToast(message);
      sonnerToast.error(tPhone("toast.connectFailed"));
    } finally {
      setConnecting(false);
      setTimeout(() => setToast(null), 4000);
    }
  };

  const handleSaveOutbound = async () => {
    if (saving) return;
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
        lastSavedOutboundRef.current = { outboundFrom, whatsappEnabled };
        setToast(tPhone("toast.saved"));
        sonnerToast.success(tPhone("toast.saved"));
      } else {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        const message = err.error ?? tPhone("toast.saveFailed");
        setToast(message);
        sonnerToast.error(tPhone("toast.saveFailed"));
      }
    } catch {
      setToast(tPhone("toast.error"));
      sonnerToast.error(tPhone("toast.saveFailed"));
    } finally {
      setSaving(false);
      setTimeout(() => setToast(null), 3000);
    }
  };

  const handleTestCall = async () => {
    const normalized = toE164(testCallNumber);
    if (!normalized || digitsOnly(testCallNumber).length < 10) {
      setTestCallError(tPhone("validNumberError"));
      return;
    }
    if (!primaryAgentId) {
      setToast(tPhone("toast.createAgentFirst"));
      sonnerToast.error(tPhone("toast.createAgentFirst"));
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
        const msg = data.error ?? tPhone("toast.testCallFailed");
        setToast(msg);
        setTestCallError(msg);
      } else {
        setTestCallError(null);
        setToast(data.message ?? tPhone("toast.testCallStarted"));
      }
    } catch {
      setToast(tPhone("toast.errorRetry"));
      sonnerToast.error(tPhone("toast.testCallFailed"));
      setTestCallError(tPhone("toast.errorRetry"));
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
    }).catch((err) => {
      setToast(tPhone("toast.copyFailed", { defaultValue: "Failed to copy phone number" }));
    });
  };

  const testCallDigits = digitsOnly(testCallNumber);
  const testCallValid = testCallDigits.length >= 10;

  return (
    <div className="max-w-3xl mx-auto p-6">
      <Breadcrumbs items={[{ label: tSettings("integrations.breadcrumbSettings"), href: "/app/settings" }, { label: tSettings("phone.title") }]} />
      <h1 className="text-xl font-bold tracking-[-0.025em] text-[var(--text-primary)] mb-1">{tPhone("heading")}</h1>
      <p className="text-sm text-[var(--text-secondary)] mb-6">{tPhone("description")}</p>

      {/* Phone Status Summary Card */}
      {!numbersLoading && workspaceNumbers.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4">
            <p className="text-xs text-[var(--text-tertiary)] uppercase tracking-wide mb-2">{tPhone("statusTotalNumbers")}</p>
            <p className="text-2xl font-bold text-[var(--text-primary)]">{workspaceNumbers.length}</p>
            <p className="text-xs text-[var(--text-secondary)] mt-2">{workspaceNumbers.filter(n => n.status === "active").length} {tPhone("active")} (provisioned via telephony provider)</p>
          </div>
          <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4">
            <p className="text-xs text-[var(--text-tertiary)] uppercase tracking-wide mb-2">{tPhone("statusMonthlyCost")}</p>
            <p className="text-2xl font-bold text-[var(--text-primary)]">{formatCurrencyCents(totalMonthlyCents, "USD", locale)}</p>
            <p className="text-xs text-[var(--text-secondary)] mt-2">{tPhone("statusPerMonth")}</p>
          </div>
          <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4">
            <p className="text-xs text-[var(--text-tertiary)] uppercase tracking-wide mb-2">{tPhone("statusPrimary")}</p>
            <p className="text-sm font-mono text-[var(--text-primary)] mt-2">{phoneNumber && !loading ? formatPhoneNumber(phoneNumber) : "—"}</p>
            <p className="text-xs text-[var(--text-secondary)] mt-2">{tPhone("statusInbound")}</p>
          </div>
        </div>
      )}

      {/* Management dashboard: list + Get New / Port */}
      <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-4">
            <span className="text-sm text-[var(--text-secondary)]">
              {numbersLoading ? "…" : tPhone("managingNumbers")}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/app/settings/phone/marketplace"
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--accent-primary)] text-[var(--text-on-accent)] font-medium text-sm hover:opacity-90 transition-[background-color,opacity,transform] duration-[var(--duration-fast)] ease-[var(--ease-out-expo)] active:scale-[0.97]"
            >
              <Plus className="w-4 h-4" />
              {tPhone("getNumber")}
            </Link>
            <Link
              href="/app/settings/phone/port"
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[var(--border-default)] text-[var(--text-secondary)] font-medium text-sm hover:bg-[var(--bg-hover)] transition-[background-color,border-color,transform] duration-[var(--duration-fast)] ease-[var(--ease-out-expo)] active:scale-[0.97]"
            >
              <FileInput className="w-4 h-4" />
              {tPhone("portNumber")}
            </Link>
          </div>
        </div>
        {numbersLoading ? (
          <div className="py-6 text-center text-[var(--text-secondary)] text-sm">{tPhone("loadingNumbers")}</div>
        ) : workspaceNumbers.length === 0 ? (
          <div className="py-8 text-center rounded-xl bg-[var(--bg-input)]/50 border border-[var(--border-default)]">
            <Phone className="w-10 h-10 text-[var(--text-secondary)] mx-auto mb-2" />
            <p className="text-sm font-medium text-[var(--text-primary)] mb-1">{tPhone("noNumbersYet")}</p>
            <p className="text-xs text-[var(--text-secondary)] mb-4">{tPhone("noNumbersYetDesc")}</p>
            <Link
              href="/app/settings/phone/marketplace"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--accent-primary)] text-[var(--text-on-accent)] font-medium text-sm hover:opacity-90 transition-[background-color,opacity,transform] duration-[var(--duration-fast)] ease-[var(--ease-out-expo)] active:scale-[0.97]"
            >
              <Plus className="w-4 h-4" />
              {tPhone("getNumber")}
            </Link>
          </div>
        ) : (
          <ul className="space-y-2">
            {workspaceNumbers.map((n) => (
              <li
                key={n.id}
                className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 py-3 px-4 rounded-xl border transition-colors ${
                  n.status === "active"
                    ? "bg-[var(--accent-primary)]/5 border-[var(--accent-primary)]/20 hover:border-[var(--accent-primary)]/40"
                    : "bg-[var(--bg-input)]/50 border-[var(--border-default)] opacity-60"
                }`}
              >
                <div className="flex items-start sm:items-center gap-3 flex-1">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 sm:mt-0 ${
                    n.status === "active" ? "bg-[var(--accent-primary)]" : "bg-[var(--text-tertiary)]/30"
                  }`} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="font-medium text-[var(--text-primary)] font-mono text-sm">{formatPhoneNumber(n.phone_number)}</p>
                      {n.assigned_agent_id && n.status === "active" && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--accent-primary)]/20 text-[var(--accent-primary)] font-medium">
                          ✓ {tPhone("assigned")}
                        </span>
                      )}
                      {!n.assigned_agent_id && n.status === "active" && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--accent-warning,#f59e0b)]/20 text-[var(--accent-warning,#f59e0b)] font-medium">
                          {tPhone("unassigned")}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] capitalize mb-2">{n.number_type.replace("_", " ")} · {formatCurrencyCents(n.monthly_cost_cents, "USD", locale)}/mo</p>
                    <div className="flex flex-wrap gap-1.5">
                      {n.capabilities?.voice && <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg-inset)] text-[var(--text-secondary)]">{tPhone("voice")}</span>}
                      {n.capabilities?.sms && <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg-inset)] text-[var(--text-secondary)]">{tPhone("sms")}</span>}
                      {n.capabilities?.mms && <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg-inset)] text-[var(--text-secondary)]">{tPhone("mms")}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 sm:flex-shrink-0">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium capitalize ${
                    n.status === "active"
                      ? "bg-[var(--accent-primary)]/20 text-[var(--accent-primary)]"
                      : "bg-[var(--bg-inset)] text-[var(--text-tertiary)]"
                  }`}>
                    {n.status}
                  </span>
                  {n.status === "active" && (
                    <button
                      type="button"
                      disabled={!!n.assigned_agent_id || releasingId === n.id}
                      title={n.assigned_agent_id ? tPhone("releaseTitleUnassign") : tPhone("releaseTitleRelease")}
                      onClick={() => {
                        if (n.assigned_agent_id) return;
                        setReleaseConfirm(n);
                      }}
                      className="text-[10px] px-2 py-1 rounded-lg border border-[var(--border-default)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {releasingId === n.id ? "…" : tPhone("releaseLabel")}
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">{tPhone("connectTitle")}</h2>
      <p className="text-sm text-[var(--text-secondary)] mb-6">{tPhone("connectDescription")}</p>

      {loading ? (
        <div className="p-6 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] skeleton-shimmer h-24 mb-4" />
      ) : phoneNumber ? (
        <>
          {/* Option A — Your AI number */}
          <div className="p-6 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] mb-6">
            <p className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-2">{tPhone("optionA")}</p>
            <div className="flex flex-wrap items-center gap-3">
              <p ref={numberHeadingRef} tabIndex={-1} className="text-2xl font-semibold text-[var(--text-primary)] font-mono tracking-tight outline-none" aria-label={`Your number: ${formatPhoneNumber(phoneNumber)}`}>{formatPhoneNumber(phoneNumber)}</p>
              <button
                type="button"
                onClick={handleCopyNumber}
                aria-label={copySuccess ? tPhone("copiedAria") : tPhone("copyNumber")}
                className="px-4 py-2 rounded-xl text-sm font-medium bg-[var(--accent-primary)] text-[var(--text-on-accent)] hover:opacity-90 transition-[background-color,opacity,transform] duration-[var(--duration-fast)] ease-[var(--ease-out-expo)] active:scale-[0.97]"
              >
                {copySuccess ? tPhone("copied") : tPhone("copyNumber")}
              </button>
            </div>
            <p className="text-sm text-[var(--text-tertiary)] mt-2">{tPhone("aiNumberReady")}</p>
          </div>

          {/* Forward your current number — simple steps */}
          <div className="p-6 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] mb-6">
            <p className="text-sm font-medium text-[var(--text-primary)] mb-1">{tPhone("optionB")}</p>
            <p className="text-xs text-[var(--text-tertiary)] mb-4">{tPhone("optionBDesc")}</p>
            <ol className="space-y-2 text-sm text-[var(--text-secondary)] list-decimal list-inside">
              <li>{tPhone("forwardStep1")}</li>
              <li>{tPhone("forwardStep2")}</li>
              <li>{tPhone("forwardStep3")}</li>
            </ol>
            <p className="text-xs text-[var(--text-secondary)] mt-2 mb-2">{tPhone("forwardTo")} <span className="font-mono text-[var(--text-primary)]">{formatPhoneNumber(phoneNumber)}</span></p>
            <p className="text-xs font-medium text-[var(--text-tertiary)] mb-1">{tPhone("orByDevice")}</p>
            <ul className="space-y-1 text-xs text-[var(--text-tertiary)] mb-3">
              <li><span className="text-[var(--text-secondary)]">{tPhone("iphone")}:</span> {tPhone("iphonePath")}</li>
              <li><span className="text-[var(--text-secondary)]">{tPhone("android")}:</span> {tPhone("androidPath")}</li>
              <li><span className="text-[var(--text-secondary)]">{tPhone("businessLine")}:</span> {tPhone("businessLinePath", { number: formatPhoneNumber(phoneNumber) })}</li>
            </ul>
            <details className="mt-4 group">
              <summary className="text-xs text-[var(--text-secondary)] cursor-pointer hover:text-[var(--text-tertiary)] list-none flex items-center gap-1">
                <span className="group-open:inline hidden">▼</span><span className="group-open:hidden inline">▶</span> {tPhone("quickDialCodes")}
              </summary>
              <div className="mt-2 pt-2 border-t border-[var(--border-default)] space-y-1.5 text-xs text-[var(--text-tertiary)]">
                <p><span className="text-[var(--text-secondary)]">{tPhone("att")}:</span> *21*{phoneNumber.replace(/\D/g, "")}#</p>
                <p><span className="text-[var(--text-secondary)]">{tPhone("verizon")}:</span> *72 then {formatPhoneNumber(phoneNumber)}</p>
                <p><span className="text-[var(--text-secondary)]">{tPhone("tmobile")}:</span> **21*{phoneNumber.replace(/\D/g, "")}#</p>
              </div>
            </details>
          </div>

          {/* Test call section */}
          <div id="test" className="p-6 rounded-2xl border border-[var(--accent-primary)]/20 bg-[var(--accent-primary)]/5 mb-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-[var(--accent-primary)]/20 flex items-center justify-center flex-shrink-0">
                <Phone className="w-4 h-4 text-[var(--accent-primary)]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--text-primary)]">{tPhone("testCall")}</p>
                <p className="text-xs text-[var(--text-secondary)] mt-1">{tPhone("testCallDescription")}</p>
              </div>
            </div>
            <div className="bg-[var(--bg-card)] rounded-lg p-4 border border-[var(--border-default)] mb-4">
              <p className="text-xs text-[var(--text-tertiary)] uppercase tracking-wide mb-2">{tPhone("howItWorks")}</p>
              <ol className="space-y-1.5 text-xs text-[var(--text-secondary)]">
                <li><span className="text-[var(--accent-primary)] font-semibold">1.</span> {tPhone("testStep1")}</li>
                <li><span className="text-[var(--accent-primary)] font-semibold">2.</span> {tPhone("testStep2")}</li>
                <li><span className="text-[var(--accent-primary)] font-semibold">3.</span> {tPhone("testStep3")}</li>
              </ol>
            </div>
            {!primaryAgentId ? (
              <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-input)]/50 px-4 py-3 text-sm">
                <p className="text-[var(--text-secondary)]">{tPhone("createAgentFirst")}</p>
                <Link href="/app/agents" className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--accent-primary)] text-[var(--text-on-accent)] font-medium text-xs hover:opacity-90 transition-colors">
                  {tPhone("goToAgents")}
                </Link>
              </div>
            ) : (
              <>
                <input
                  type="tel"
                  value={testCallNumber}
                  onChange={(e) => { setTestCallNumber(e.target.value); setTestCallError(null); }}
                  placeholder={tPhone("testCallNumberPlaceholder")}
                  aria-label={tPhone("yourPhoneNumber")}
                  aria-invalid={!!testCallError}
                  aria-describedby={testCallError ? "test-call-error" : undefined}
                  className={`w-full px-4 py-3 rounded-xl bg-[var(--bg-input)] border text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] text-base focus:ring-1 focus:ring-[var(--border-medium)] focus:outline-none mb-2 ${testCallError ? "border-[var(--accent-danger,#ef4444)]/50" : "border-[var(--border-default)] focus:border-[var(--border-medium)]"}`}
                />
                {testCallError ? <p id="test-call-error" className="text-sm text-[var(--accent-red)] mb-3" role="alert">{testCallError}</p> : null}
                <button
                  type="button"
                  onClick={handleTestCall}
                  disabled={testingCall || !testCallValid}
                  aria-label={testCallValid ? tPhone("ariaCallTest") : tPhone("ariaEnterValid")}
                  className="w-full py-3 rounded-xl text-sm font-semibold bg-[var(--accent-primary)] text-[var(--text-on-accent)] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-[background-color,opacity,transform] duration-[var(--duration-fast)] ease-[var(--ease-out-expo)] active:scale-[0.97] flex items-center justify-center gap-2"
                >
                  <Phone className="w-4 h-4" />
                  {testingCall ? tPhone("callingYou") : tPhone("callMyPhoneToTest")}
                </button>
                <p className="text-[11px] text-[var(--text-tertiary)] mt-2">For calls to work, you also need an AI operator configured with a voice and greeting.</p>
              </>
            )}
          </div>

          {/* Optional: outbound caller ID — collapsed by default */}
          <details className="p-6 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] mb-4 group">
            <summary className="text-sm font-medium text-[var(--text-tertiary)] cursor-pointer hover:text-[var(--text-secondary)] list-none flex items-center justify-between gap-2">
              {tPhone("outboundCallerId")}
              <span className="text-[var(--text-secondary)] group-open:rotate-180 transition-[transform] duration-[var(--duration-fast)] ease-[var(--ease-out-expo)]">▼</span>
            </summary>
            <p className="text-xs text-[var(--text-secondary)] mt-3 mb-3">{tPhone("outboundCallerIdHint")}</p>
            <input
              type="tel"
              value={outboundFrom}
              onChange={(e) => setOutboundFrom(e.target.value)}
              placeholder={tPhone("testCallNumberPlaceholder")}
              aria-label={tPhone("outboundCallerId")}
              className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] text-sm focus:border-[var(--border-medium)] focus:ring-1 focus:ring-[var(--border-medium)] focus:outline-none mb-3"
            />
            <label className="flex items-center gap-2 text-sm text-[var(--text-tertiary)] cursor-pointer mb-3">
              <input
                type="checkbox"
                checked={whatsappEnabled}
                onChange={(e) => setWhatsappEnabled(e.target.checked)}
                className="rounded border-[var(--border-medium)] bg-[var(--bg-card)] text-[var(--text-primary)] focus:ring-[var(--border-medium)]"
              />
              {tPhone("enableWhatsApp")}
            </label>
            <button
              type="button"
              onClick={handleSaveOutbound}
              disabled={saving}
              className="px-4 py-2.5 rounded-xl text-sm font-medium bg-[var(--accent-primary)] text-[var(--text-on-accent)] hover:opacity-90 disabled:opacity-60"
            >
              {saving ? tForms("saving") : t("save")}
            </button>
          </details>

          {/* Verify a number by SMS */}
          <div className="p-6 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] mb-6">
            <p className="text-sm font-medium text-[var(--text-primary)] mb-1">{tPhone("verifyBySms")}</p>
            <p className="text-xs text-[var(--text-tertiary)] mb-3">{tPhone("verifyBySmsDesc")}</p>
            {verifiedNumber ? (
              <>
                <p className="text-sm text-[var(--accent-primary)]">{tPhone("verifiedLabel")} {formatPhoneNumber(verifiedNumber)}</p>
                {phoneNumber && (
                  <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl p-5 mt-4">
                    <h3 className="text-base font-medium text-[var(--text-primary)] mb-3">
                      {tPhone("forwardCallsToAi")}
                    </h3>
                    <div className="space-y-2">
                      <div className="bg-[var(--bg-input)] rounded-lg p-3">
                        <p className="text-sm font-medium text-[var(--text-primary)]">{tPhone("iphone")}</p>
                        <p className="text-xs text-[var(--text-secondary)]">{tPhone("forwardInstructionIphone")}</p>
                      </div>
                      <div className="bg-[var(--bg-input)] rounded-lg p-3">
                        <p className="text-sm font-medium text-[var(--text-primary)]">{tPhone("android")}</p>
                        <p className="text-xs text-[var(--text-secondary)]">{tPhone("forwardInstructionAndroid")}</p>
                      </div>
                      <div className="bg-[var(--bg-input)] rounded-lg p-3">
                        <p className="text-sm font-medium text-[var(--text-primary)]">{tPhone("businessLine")}</p>
                        <p className="text-xs text-[var(--text-secondary)]">{tPhone("forwardInstructionBusiness")}</p>
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
                  placeholder={tPhone("verifyPhonePlaceholder")}
                  className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] text-sm focus:border-[var(--border-medium)] focus:ring-1 focus:outline-none mb-2"
                />
                <div className="flex gap-2 mb-2">
                  <button
                    type="button"
                    onClick={async () => {
                      const cleaned = digitsOnly(verifyPhone);
                      if (cleaned.length < 10 || cleaned.length > 15) {
                        setVerifyError(tPhone("validPhoneError"));
                        return;
                      }
                      const num = toE164(verifyPhone);
                      if (!num) {
                        setVerifyError(tPhone("validPhoneError"));
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
                          setToast(tPhone("toast.codeSent"));
                        } else {
                          const msg = d.error ?? tPhone("sendCodeFailed");
                          setVerifyError(msg);
                          if (d.action === "redirect") {
                            setToast(tPhone("toast.getAiNumber"));
                          }
                        }
                      } catch {
                        setVerifyError(tPhone("failedToSendCode"));
                      } finally {
                        setVerifySending(false);
                      }
                    }}
                    disabled={verifySending || digitsOnly(verifyPhone).length < 10 || digitsOnly(verifyPhone).length > 15}
                    className="px-4 py-2 rounded-xl text-sm font-medium border border-[var(--border-medium)] text-[var(--text-secondary)] hover:bg-[var(--bg-card)] disabled:opacity-50"
                  >
                    {verifySending ? tPhone("sending") : tPhone("sendCode")}
                  </button>
                </div>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={verifyCode}
                  onChange={(e) => setVerifyCode((e.target.value ?? "").replace(/\D/g, "").slice(0, 6))}
                  placeholder={tPhone("verificationCodePlaceholder")}
                  className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] text-sm focus:border-[var(--border-medium)] focus:ring-1 focus:outline-none mb-2"
                />
                <button
                  type="button"
                  onClick={async () => {
                    const num = toE164(verifyPhone);
                    if (!num || verifyCode.length < 4) {
                      setVerifyError(tPhone("enterCodeFromPhone"));
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
                        setToast(tPhone("toast.phoneVerified"));
                      } else {
                        setVerifyError((d as { error?: string }).error ?? tPhone("codeNotMatch"));
                      }
                    } catch {
                      setVerifyError(tPhone("verificationFailed"));
                    } finally {
                      setVerifyChecking(false);
                    }
                  }}
                  disabled={verifyChecking || verifyCode.length < 4}
                  className="w-full py-2.5 rounded-xl text-sm font-semibold bg-[var(--accent-primary)] text-[var(--text-on-accent)] hover:opacity-90 disabled:opacity-50"
                >
                  {verifyChecking ? tPhone("verifying") : tPhone("verifyLabel")}
                </button>
                {verifyError && <p className="mt-2 text-sm text-[var(--accent-red)]" role="alert">{verifyError}</p>}
              </>
            )}
          </div>

          <p className="text-xs text-[var(--text-secondary)]">{tPhone("needAnotherNumber")}</p>
        </>
      ) : (
        <>
          {/* No number — two-option flow */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-2xl p-6">
              <div className="w-10 h-10 rounded-xl bg-[var(--bg-inset)]/70 flex items-center justify-center mb-4">
                <Phone className="w-5 h-5 text-[var(--text-tertiary)]" />
              </div>
              <h2 className="text-base font-semibold text-[var(--text-primary)] mb-1">{tPhone("getNewAiNumber")}</h2>
              <p className="text-sm text-[var(--text-tertiary)] mb-1">{tPhone("recommended")}</p>
              <p className="text-sm text-[var(--text-secondary)] mb-4">{tPhone("getNewAiNumberDesc")}</p>
              <div className="mb-4">
                <label htmlFor="phone-area-code" className="text-xs text-[var(--text-tertiary)] mb-1 block">{tPhone("areaCodeOptional")}</label>
                <input
                  id="phone-area-code"
                  type="tel"
                  inputMode="numeric"
                  maxLength={3}
                  value={areaCode}
                  onChange={(e) => setAreaCode((e.target.value ?? "").replace(/\D/g, "").slice(0, 3))}
                  placeholder={tPhone("areaCodePlaceholder")}
                  className="w-full bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-lg px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent-primary)]"
                />
              </div>
              <button
                type="button"
                onClick={handleConnectNumber}
                disabled={connecting}
                className="w-full py-2.5 bg-[var(--accent-primary)] text-[var(--text-on-accent)] font-semibold rounded-lg text-sm hover:opacity-90 disabled:opacity-60 transition-[background-color,opacity,transform] duration-[var(--duration-fast)] ease-[var(--ease-out-expo)] active:scale-[0.97]"
              >
                {connecting ? tPhone("gettingYourNumber") : tPhone("getMyNumber")}
              </button>
              <p className="text-xs text-[var(--text-tertiary)] mt-2 text-center">{tPhone("takesAbout10Seconds")}</p>
              {connectError ? (
                <div className="mt-4 rounded-xl border border-[var(--accent-danger,#ef4444)]/20 bg-[var(--accent-danger,#ef4444)]/[0.06] p-4" role="alert">
                  <p className="text-sm text-[var(--accent-danger,#ef4444)] mb-2">{connectError}</p>
                  {connectErrorCode === "NOT_CONFIGURED" && (
                    <div className="flex gap-2 mt-2">
                      <input
                        type="email"
                        value={notifyEmail}
                        onChange={(e) => setNotifyEmail(e.target.value)}
                        placeholder={tPhone("emailPlaceholder")}
                        className="flex-1 bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]"
                      />
                      <button type="button" onClick={() => { setToast(tPhone("toast.waitlistJoined")); setTimeout(() => setToast(null), 4000); }} className="px-4 py-2 bg-[var(--accent-primary)] text-[var(--text-on-accent)] font-semibold rounded-lg text-sm shrink-0">{tPhone("notifyMe")}</button>
                    </div>
                  )}
                  {connectErrorCode === "NO_INVENTORY" && (
                    <div className="mt-2">
                      <p className="text-xs text-[var(--text-tertiary)] mb-2">{tPhone("tryDifferentAreaCodeHint")}</p>
                      <div className="flex gap-2">
                        <input
                          type="tel"
                          inputMode="numeric"
                          maxLength={3}
                          value={areaCode}
                          onChange={(e) => setAreaCode((e.target.value ?? "").replace(/\D/g, "").slice(0, 3))}
                          placeholder={tPhone("areaCodePlaceholderAlt")}
                          className="w-24 bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)]"
                        />
                        <button type="button" onClick={() => { setConnectError(null); setConnectErrorCode(null); setToast(null); handleConnectNumber(); }} disabled={connecting} className="px-4 py-2 bg-[var(--accent-primary)] text-[var(--text-on-accent)] font-semibold rounded-lg text-sm">{tPhone("tryAgain")}</button>
                      </div>
                    </div>
                  )}
                  {connectErrorCode === "PROVISION_ERROR" && (
                    <button type="button" onClick={() => { setConnectError(null); setConnectErrorCode(null); setToast(null); handleConnectNumber(); }} disabled={connecting} className="mt-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:underline">{tPhone("tryAgain")}</button>
                  )}
                </div>
              ) : null}
            </div>
            <div className="bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-2xl p-6">
              <div className="w-10 h-10 rounded-xl bg-[var(--accent-primary)]/10 flex items-center justify-center mb-4">
                <PhoneForwarded className="w-5 h-5 text-[var(--accent-primary)]" />
              </div>
              <h2 className="text-base font-semibold text-[var(--text-primary)] mb-1">{tPhone("useExistingNumber")}</h2>
              <p className="text-sm text-[var(--text-tertiary)] mb-1">{tPhone("forwardCallsToAi")}</p>
              <p className="text-sm text-[var(--text-secondary)] mb-4">{tPhone("optionBDesc")}</p>
              <div className="mb-4">
                <label htmlFor="verify-phone-existing" className="text-xs text-[var(--text-tertiary)] mb-1 block">{tPhone("yourPhoneNumber")}</label>
                <input
                  id="verify-phone-existing"
                  type="tel"
                  value={verifyPhone}
                  onChange={(e) => { setVerifyPhone(e.target.value); setVerifyError(null); }}
                  placeholder={tPhone("verifyPhonePlaceholder")}
                  className="w-full bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-lg px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent-primary)]"
                />
              </div>
              <button
                type="button"
                onClick={async () => {
                  const num = toE164(verifyPhone);
                  if (!num || digitsOnly(verifyPhone).length < 10) {
                    setVerifyError(tPhone("validNumberError"));
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
                          setToast(tPhone("toast.codeSent"));
                          setVerifyCodeSent(true);
                        } else {
                          setVerifyError(d.error ?? tPhone("sendCodeFailed"));
                          if (d.action === "redirect") setToast(tPhone("toast.getAiNumber"));
                        }
                      } catch {
                        setVerifyError(tPhone("failedToSendCode"));
                      } finally {
                        setVerifySending(false);
                      }
                    }}
                    disabled={verifySending || digitsOnly(verifyPhone).length < 10 || digitsOnly(verifyPhone).length > 15}
                    className="w-full py-2.5 bg-[var(--bg-inset)] border border-[var(--border-default)] text-[var(--text-primary)] font-semibold rounded-lg text-sm hover:bg-[var(--bg-hover)] disabled:opacity-50 transition-[background-color,border-color,transform] duration-[var(--duration-fast)] ease-[var(--ease-out-expo)] active:scale-[0.97]"
              >
                {verifySending ? tPhone("sendingCode") : tPhone("verifyMyNumber")}
              </button>
              <p className="text-xs text-[var(--text-tertiary)] mt-2 text-center">{tPhone("weSendVerificationCode")}</p>
              {verifyError && <p className="mt-2 text-xs text-[var(--accent-danger,#ef4444)]" role="alert">{verifyError}</p>}
              {verifiedNumber ? (
                <div className="mt-4 pt-4 border-t border-[var(--border-default)] space-y-3">
                  <p className="text-sm text-[var(--accent-primary)]">{tPhone("verifiedLabel")} {formatPhoneNumber(verifiedNumber)}</p>
                  <p className="text-xs text-[var(--text-tertiary)] mb-2">{tPhone("forwardUnansweredHint")}</p>
                  <div className="space-y-2 text-xs text-[var(--text-secondary)]">
                    <p className="font-medium text-[var(--text-secondary)]">{tPhone("iphone")}:</p>
                    <p>{tPhone("forwardInstructionIphone")}</p>
                    <p className="font-medium text-[var(--text-secondary)] mt-2">{tPhone("android")}:</p>
                    <p>{tPhone("forwardInstructionAndroid")}</p>
                    <p className="font-medium text-[var(--text-secondary)] mt-2">{tPhone("businessLine")}:</p>
                    <p>{tPhone("forwardInstructionBusiness")}</p>
                  </div>
                  <Link href="/app/settings/phone#test" className="inline-block mt-2 text-sm font-medium text-[var(--accent-primary)] hover:text-[var(--accent-primary)]/80">{tPhone("testForwardingLink")}</Link>
                </div>
              ) : (verifyCodeSent || verifyCode.length >= 4) && (
                <div className="mt-4 space-y-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={verifyCode}
                    onChange={(e) => setVerifyCode((e.target.value ?? "").replace(/\D/g, "").slice(0, 6))}
                    placeholder={tPhone("verificationCodePlaceholder")}
                    className="w-full bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]"
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
                          setToast(tPhone("toast.phoneVerified"));
                        } else {
                          setVerifyError((d as { error?: string }).error ?? tPhone("codeNotMatch"));
                        }
                      } catch {
                        setVerifyError(tPhone("verificationFailed"));
                      } finally {
                        setVerifyChecking(false);
                      }
                    }}
                    disabled={verifyChecking || verifyCode.length < 4}
                    className="w-full py-2 rounded-lg text-sm font-medium bg-[var(--accent-primary)] text-[var(--text-on-accent)] hover:opacity-90 disabled:opacity-50"
                  >
                    {verifyChecking ? tPhone("verifying") : tPhone("verifyLabel")}
                  </button>
                </div>
              )}
            </div>
          </div>
          <p className="mt-6 text-sm text-[var(--text-secondary)] text-center">
            <Link href="/app/dashboard" className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-[color,transform] duration-[var(--duration-fast)] ease-[var(--ease-out-expo)] active:scale-[0.97]">{tPhone("addNumberLater")}</Link>
          </p>

        </>
      )}

      {releaseConfirm && (
        <ConfirmDialog
          open
          title={tPhone("releaseConfirmTitle")}
          message={tPhone("releaseConfirmMessage")}
          confirmLabel={tPhone("releaseLabel")}
          variant="danger"
          onConfirm={async () => {
            if (!releaseConfirm) return;
            setReleasingId(releaseConfirm.id);
            try {
              const res = await fetch(`/api/phone/numbers/${releaseConfirm.id}/release`, { method: "POST", credentials: "include" });
              const data = (await res.json()) as { error?: string };
              if (res.ok) {
                fetchWorkspaceNumbers();
                sonnerToast.success(tPhone("toast.numberReleased"));
              } else {
                sonnerToast.error(data.error ?? tPhone("toast.releaseFailed"));
              }
            } finally {
              setReleasingId(null);
              setReleaseConfirm(null);
            }
          }}
          onClose={() => setReleaseConfirm(null)}
        />
      )}

      {toast && (
        <div role="status" aria-live="polite" className="fixed right-4 z-50 bottom-4 sm:bottom-auto sm:top-4 max-w-[calc(100vw-2rem)]">
          <div className="px-4 py-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border-medium)] shadow-lg text-sm text-[var(--text-primary)]">
            {toast}
          </div>
        </div>
      )}

      <p className="text-xs text-[var(--text-secondary)] mt-6">
        {tPhone("needHelpPhoneSetup")} <a href="mailto:support@revenueoperator.ai" className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] underline underline-offset-2">support@revenueoperator.ai</a>
      </p>
      <p className="mt-4"><Link href="/app/settings" className="text-sm text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-[color,transform] duration-[var(--duration-fast)] ease-[var(--ease-out-expo)] active:scale-[0.97]">{tPhone("backToSettings")}</Link></p>
    </div>
  );
}
