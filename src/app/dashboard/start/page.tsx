"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useWorkspace } from "@/components/WorkspaceContext";
import { DashboardExecutionStateBanner } from "@/components/ExecutionStateBanner";
import { ExecutionContinuityLine } from "@/components/ExecutionContinuityLine";
import { OperatorStartCard } from "@/components/OperatorStartCard";
import { FirstWinBanner } from "@/components/FirstWinBanner";
import { GuidanceStrip } from "@/components/institutional";
import { Shell } from "@/components/Shell";

interface StatusCard {
  call_handling: string;
  inbound_source: string;
  outbound_queue: string;
  review_level: string;
}

export default function DashboardStartPage() {
  const ts = useTranslations("dashboard.startPage");
  const _tLoad = useTranslations("dashboard");
  const router = useRouter();
  const searchParams = useSearchParams();
  const { workspaceId } = useWorkspace();
  const [activationRecorded, setActivationRecorded] = useState(false);
  const [activationFading, setActivationFading] = useState(false);
  const [status, setStatus] = useState<StatusCard | null>(null);
  const [recentEvents, setRecentEvents] = useState<Array<{ at: string; event: string }>>([]);

  useEffect(() => {
    if (searchParams.get("checkout") === "success") {
      setActivationRecorded(true);
      const fadeAt = setTimeout(() => setActivationFading(true), 3000);
      const redirectAt = setTimeout(() => {
        router.replace(workspaceId ? `/dashboard/start?workspace_id=${encodeURIComponent(workspaceId)}` : "/dashboard/start");
      }, 3400);
      return () => {
        clearTimeout(fadeAt);
        clearTimeout(redirectAt);
      };
    }
  }, [searchParams, router, workspaceId]);

  const [nextAction, setNextAction] = useState<{
    next_action?: string;
    label?: string;
    href?: string;
    record_path?: string;
    execution_stale?: boolean;
  } | null>(null);

  useEffect(() => {
    if (!workspaceId) {
      setNextAction(null);
      setStatus(null);
      setRecentEvents([]);
      return;
    }
    let cancelled = false;
    fetch(`/api/operational/next-action?workspace_id=${encodeURIComponent(workspaceId)}`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { ok?: boolean; next_action?: string; label?: string; href?: string; record_path?: string; execution_stale?: boolean } | null) => {
        if (!cancelled && data?.ok) setNextAction(data);
        else if (!cancelled) setNextAction(null);
      })
      .catch(() => { if (!cancelled) setNextAction(null); });

    fetch(`/api/operational/status?workspace_id=${encodeURIComponent(workspaceId)}`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { ok?: boolean; call_handling?: string } | null) => {
        if (!cancelled && data?.ok) setStatus(data as StatusCard);
        else if (!cancelled) setStatus(null);
      })
      .catch(() => { if (!cancelled) setStatus(null); });

    fetch(`/api/operational/record-log?workspace_id=${encodeURIComponent(workspaceId)}`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : { entries: [] }))
      .then((data: { entries?: Array<{ at: string; event: string }> }) => {
        const entries = (data.entries ?? []).slice(0, 5).map((e) => ({ at: e.at, event: e.event }));
        if (!cancelled) setRecentEvents(entries);
      })
      .catch(() => { if (!cancelled) setRecentEvents([]); });

    return () => { cancelled = true; };
  }, [workspaceId]);

  const showFirstWin =
    recentEvents.length >= 1 &&
    typeof window !== "undefined" &&
    !sessionStorage.getItem("first_win_shown");
  const handleFirstWinDone = () => {
    if (typeof window !== "undefined") sessionStorage.setItem("first_win_shown", "1");
  };

  const [_showDeclaredBanner, setShowDeclaredBanner] = useState(false);
  const [_declaredBannerFading, setDeclaredBannerFading] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !workspaceId) return;
    if (sessionStorage.getItem("declared_posture") === "1") {
      sessionStorage.removeItem("declared_posture");
      setShowDeclaredBanner(true);
      const fadeAt = setTimeout(() => setDeclaredBannerFading(true), 2000);
      const clearAt = setTimeout(() => setShowDeclaredBanner(false), 2400);
      return () => {
        clearTimeout(fadeAt);
        clearTimeout(clearAt);
      };
    }
  }, [workspaceId]);

  const guidanceItems = useMemo(
    () => [
      { period: ts("guidanceDay12Period"), line: ts("guidanceDay12Line") },
      { period: ts("guidanceDay34Period"), line: ts("guidanceDay34Line") },
      { period: ts("guidanceDay57Period"), line: ts("guidanceDay57Line") },
    ],
    [ts]
  );

  if (activationRecorded) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 gap-6" style={{ background: "var(--background)" }}>
        <p
          className="text-lg transition-opacity duration-[200ms]"
          style={{ color: "var(--text-primary)", opacity: activationFading ? 0 : 1 }}
        >
          {ts("activationGovernance")}
        </p>
        <Link href="/dashboard/start" className="btn-primary">{ts("returnToStart")}</Link>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>{ts("shareRecord")}</p>
        <button
          type="button"
          onClick={() => {
            const url = typeof window !== "undefined" ? window.location.origin + "/dashboard/start" : "";
            if (url) navigator.clipboard.writeText(url).catch(() => {});
          }}
          className="btn-secondary"
        >
          {ts("copyRecord")}
        </button>
      </div>
    );
  }

  if (!workspaceId) {
    return (
      <Shell>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>One moment…</p>
      </Shell>
    );
  }

  const isRecordAction =
    (nextAction?.next_action === "copy_record_link" || nextAction?.next_action === "share_record") &&
    nextAction?.record_path;
  const canonicalRecordUrl =
    typeof window !== "undefined" && isRecordAction
      ? `${window.location.origin}${nextAction.record_path}`
      : "";

  const hasNoSource = status?.inbound_source === "—";

  return (
    <Shell size="institutional">
      <FirstWinBanner
        show={showFirstWin}
        message={ts("firstWinMessage")}
        onDone={handleFirstWinDone}
      />
      {hasNoSource ? (
        <section className="mb-4 border-b pb-2" style={{ borderColor: "var(--border)" }}>
          <p className="text-xs font-medium uppercase" style={{ color: "var(--text-muted)", letterSpacing: "0.12em" }}>
            {ts("executionPendingSource")}
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
            {ts("recordSourceToBegin")}
          </p>
        </section>
      ) : (
        <DashboardExecutionStateBanner />
      )}
      <p className="text-sm mt-2 mb-1" style={{ color: "var(--text-secondary)" }}>
        All handling follows declared governance parameters.
      </p>
      <p className="text-sm mb-1" style={{ color: "var(--text-muted)" }}>
        You are operating at institutional standard.
      </p>
      <ExecutionContinuityLine />

      {hasNoSource && (
        <div className="mt-6 mb-4">
          <p className="text-sm mb-1" style={{ color: "var(--text-secondary)" }}>
            {ts("noSourceRecorded")}
          </p>
          <p className="text-sm mb-3" style={{ color: "var(--text-muted)", lineHeight: 1.6 }}>
            {ts("executionAfterSource")}
          </p>
          <Link href="/dashboard/import" className="btn-primary">
            {ts("recordExternalSource")}
          </Link>
          <div className="mt-6 rounded-[16px] border p-6 max-w-[720px]" style={{ borderColor: "var(--card-border)", background: "linear-gradient(180deg, #121214 0%, #101012 100%)" }}>
            <p className="text-[13px] font-medium uppercase mb-3" style={{ color: "var(--text-muted)", letterSpacing: "0.12em" }}>{ts("executionBehavior")}</p>
            <p className="text-sm mb-1" style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}>{ts("execIfCall")}</p>
            <p className="text-sm mb-1" style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}>{ts("execIfMessage")}</p>
            <p className="text-sm mb-1" style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}>{ts("execIfCommitment")}</p>
            <p className="text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}>{ts("execIfRisk")}</p>
          </div>
        </div>
      )}

      {!hasNoSource && (
        <div className="mt-8">
          {isRecordAction ? (
            <section className="rounded-[12px] border p-6" style={{ borderColor: "var(--border)" }}>
              <button
                type="button"
                onClick={() => { if (canonicalRecordUrl) navigator.clipboard.writeText(canonicalRecordUrl).catch(() => {}); }}
                className="btn-primary w-full max-w-[320px] block mx-auto"
              >
                {nextAction?.label ?? ts("copyRecordFallback")}
              </button>
            </section>
          ) : (
            <OperatorStartCard
              nextAction={
                nextAction?.href && nextAction?.label
                  ? { href: nextAction.href, label: nextAction.label }
                  : null
              }
            />
          )}
          <div className="mt-6 rounded-[16px] border p-6 max-w-[720px]" style={{ borderColor: "var(--card-border)", background: "linear-gradient(180deg, #121214 0%, #101012 100%)" }}>
            <p className="text-[13px] font-medium uppercase mb-3" style={{ color: "var(--text-muted)", letterSpacing: "0.12em" }}>{ts("executionBehavior")}</p>
            <p className="text-sm mb-1" style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}>{ts("execIfCall")}</p>
            <p className="text-sm mb-1" style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}>{ts("execIfMessage")}</p>
            <p className="text-sm mb-1" style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}>{ts("execIfCommitment")}</p>
            <p className="text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}>{ts("execIfRisk")}</p>
          </div>
        </div>
      )}

      <div
        className="mt-8 rounded-[16px] border p-8"
        style={{ background: "linear-gradient(180deg, #121214 0%, #101012 100%)", borderColor: "var(--card-border)" }}
      >
        <p className="text-[13px] font-medium uppercase mb-4" style={{ color: "var(--text-muted)", letterSpacing: "0.12em" }}>
          {ts("operationalState")}
        </p>
        <dl className="grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-sm" style={{ color: "var(--text-muted)" }}>{ts("handlingStatus")}</dt>
            <dd className="font-medium" style={{ color: "var(--text-primary)" }}>{status?.call_handling === "Active" ? ts("statusActive") : (status?.call_handling ?? "—")}</dd>
          </div>
          <div>
            <dt className="text-sm" style={{ color: "var(--text-muted)" }}>{ts("declaredJurisdiction")}</dt>
            <dd className="font-medium" style={{ color: "var(--text-primary)" }}>{ts("statusDeclared")}</dd>
          </div>
          <div>
            <dt className="text-sm" style={{ color: "var(--text-muted)" }}>{ts("reviewStructure")}</dt>
            <dd className="font-medium" style={{ color: "var(--text-primary)" }}>{ts("statusApplied")}</dd>
          </div>
        </dl>
        <div className="mt-4 pt-4 border-t" style={{ borderColor: "var(--border)" }}>
          <p className="text-sm mt-4" style={{ color: "var(--text-muted)", lineHeight: 1.6 }}>
            {ts("conversationsEvaluated")}
          </p>
        </div>
      </div>

      <div
        className="mt-8 rounded-[16px] border p-6"
        style={{ background: "linear-gradient(180deg, #121214 0%, #101012 100%)", borderColor: "var(--card-border)" }}
      >
        <p className="text-sm" style={{ color: "var(--text-muted)", lineHeight: 1.6 }}>
          {ts("executionValidation")}
        </p>
      </div>

      <GuidanceStrip items={guidanceItems} className="mt-8" />

      {nextAction?.execution_stale && (
        <p className="mt-4 text-sm" style={{ color: "var(--text-muted)" }}>
          {ts("handlingStale")}
        </p>
      )}
    </Shell>
  );
}
