"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useWorkspace } from "@/components/WorkspaceContext";
import { Shell } from "@/components/Shell";

interface CapsulePosition {
  institutional_state: string;
  provider_detached: boolean;
  operation_currently_anchored: boolean;
  assumed_operation: boolean;
  normalized_operation: boolean;
  protection_active: boolean;
}
interface OperatorCapsule {
  position?: CapsulePosition;
  proof?: string[];
  presence_lines?: string[];
}

function stateToLineKeys(pos: CapsulePosition): string[] {
  const keys: string[] = [];
  if (pos.institutional_state && pos.institutional_state !== "none") {
    keys.push("institutionalStatePresent");
  }
  if (pos.operation_currently_anchored) {
    keys.push("ongoingWorkDepends");
  }
  if (pos.assumed_operation) {
    keys.push("operationAssumed");
  }
  if (pos.normalized_operation) {
    keys.push("behaviourRoutine");
  }
  if (pos.provider_detached) {
    keys.push("providerNoLongerRequired");
  }
  if (pos.protection_active) {
    keys.push("protectionActive");
  }
  return keys;
}

interface CoreStatus {
  inbound_processing_active?: boolean;
  queue_processing_active?: boolean;
  assurance_attempted_recently?: boolean;
  proof_capsule_recently_available?: boolean;
  guarantees_bundle_configured?: boolean;
}

function coreStatusToKeys(c: CoreStatus | null): string[] {
  if (!c) return [];
  const keys: string[] = [];
  if (c.inbound_processing_active) keys.push("inboundWasActive");
  if (c.queue_processing_active) keys.push("queueWasActive");
  if (c.assurance_attempted_recently) keys.push("assuranceAttemptedRecently");
  if (c.proof_capsule_recently_available) keys.push("proofCapsuleRecentlyAvailable");
  if (c.guarantees_bundle_configured) keys.push("guaranteesBundleConfigured");
  return keys;
}

export default function PresencePage() {
  const t = useTranslations("dashboard.presencePage");
  const { workspaceId } = useWorkspace();
  const [capsule, setCapsule] = useState<OperatorCapsule | null>(null);
  const [silenceLines, setSilenceLines] = useState<string[]>([]);
  const [coreStatus, setCoreStatus] = useState<CoreStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!workspaceId) {
      setCapsule(null);
      setSilenceLines([]);
      setCoreStatus(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    Promise.all([
      fetch(`/api/operational/operator-capsule?workspace_id=${encodeURIComponent(workspaceId)}`).then((r) => (r.ok ? r.json() : null)),
      fetch(`/api/operational/absence-impact?workspace_id=${encodeURIComponent(workspaceId)}`).then((r) => (r.ok ? r.json() : [])).then((arr) => (Array.isArray(arr) ? arr : [])),
      fetch(`/api/system/core-status?workspace_id=${encodeURIComponent(workspaceId)}`).then((r) => (r.ok ? r.json() : null)).catch(() => null),
    ]).then(([cap, silence, core]) => {
      setCapsule(cap ?? null);
      setSilenceLines(Array.isArray(silence) ? silence : []);
      setCoreStatus(core && !(core as { error?: unknown }).error ? (core as CoreStatus) : null);
    }).finally(() => setLoading(false));
  }, [workspaceId]);

  if (!workspaceId) {
    return (
      <Shell>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>{t("selectWorkspace")}</p>
      </Shell>
    );
  }

  if (loading) {
    return (
      <Shell>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>{t("oneMoment")}</p>
      </Shell>
    );
  }

  const pos = capsule?.position;
  const stabilityLineKeys = pos ? stateToLineKeys(pos) : [];
  const proofLines = (capsule?.proof ?? []).slice(0, 8);
  const presenceLines = capsule?.presence_lines ?? [];
  const coreLineKeys = coreStatusToKeys(coreStatus);

  return (
    <Shell>
      <div className="max-w-2xl space-y-16">
        {coreLineKeys.length > 0 && (
          <section>
            <h2 className="text-sm font-medium mb-6" style={{ color: "var(--text-muted)", letterSpacing: "0.02em" }}>
              {t("coreStatus")}
            </h2>
            <div className="space-y-4">
              {coreLineKeys.map((key: string, i: number) => (
                <p key={i} className="text-sm" style={{ color: "var(--text-primary)", lineHeight: 1.7 }}>
                  {t(key)}
                </p>
              ))}
            </div>
          </section>
        )}

        <section>
          <h2 className="text-sm font-medium mb-6" style={{ color: "var(--text-muted)", letterSpacing: "0.02em" }}>
            {t("stability")}
          </h2>
          <div className="space-y-4">
            {stabilityLineKeys.length === 0 ? (
              <p className="text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>
                {t("noStabilityMarkers")}
              </p>
            ) : (
              stabilityLineKeys.map((key: string, i: number) => (
                <p key={i} className="text-sm" style={{ color: "var(--text-primary)", lineHeight: 1.7 }}>
                  {t(key)}
                </p>
              ))
            )}
          </div>
        </section>

        <section>
          <h2 className="text-sm font-medium mb-6" style={{ color: "var(--text-muted)", letterSpacing: "0.02em" }}>
            {t("presence")}
          </h2>
          <div className="space-y-4">
            {presenceLines.length === 0 ? (
              <p className="text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>
                {t("operationDidNotDepend")}
              </p>
            ) : (
              presenceLines.map((line, i) => (
                <p key={i} className="text-sm" style={{ color: "var(--text-primary)", lineHeight: 1.7 }}>
                  {line}
                </p>
              ))
            )}
          </div>
        </section>

        <section>
          <h2 className="text-sm font-medium mb-6" style={{ color: "var(--text-muted)", letterSpacing: "0.02em" }}>
            {t("reliance")}
          </h2>
          <div className="space-y-4">
            {proofLines.length === 0 ? (
              <p className="text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>
                {t("noRelianceStatements")}
              </p>
            ) : (
              proofLines.map((line, i) => (
                <p key={i} className="text-sm" style={{ color: "var(--text-primary)", lineHeight: 1.7 }}>
                  {line}
                </p>
              ))
            )}
          </div>
        </section>

        {silenceLines.length > 0 && (
          <section>
            <h2 className="text-sm font-medium mb-6" style={{ color: "var(--text-muted)", letterSpacing: "0.02em" }}>
              {t("silence")}
            </h2>
            <div className="space-y-4">
              {silenceLines.map((line, i) => (
                <p key={i} className="text-sm" style={{ color: "var(--text-primary)", lineHeight: 1.7 }}>
                  {line}
                </p>
              ))}
            </div>
          </section>
        )}

        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          <Link href="/dashboard/preferences" style={{ color: "var(--meaning-blue)" }}>
            {t("preferences")}
          </Link>
        </p>
      </div>
    </Shell>
  );
}
