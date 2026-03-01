"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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

function stateToLine(pos: CapsulePosition): string[] {
  const lines: string[] = [];
  if (pos.institutional_state && pos.institutional_state !== "none") {
    lines.push("Institutional state is present.");
  }
  if (pos.operation_currently_anchored) {
    lines.push("Ongoing work depends on the process remaining active.");
  }
  if (pos.assumed_operation) {
    lines.push("Operation is assumed by the organization.");
  }
  if (pos.normalized_operation) {
    lines.push("Behaviour has become routine and expected.");
  }
  if (pos.provider_detached) {
    lines.push("The provider is no longer required for operation.");
  }
  if (pos.protection_active) {
    lines.push("Protection is active.");
  }
  return lines;
}

interface CoreStatus {
  inbound_processing_active?: boolean;
  queue_processing_active?: boolean;
  assurance_attempted_recently?: boolean;
  proof_capsule_recently_available?: boolean;
  guarantees_bundle_configured?: boolean;
}

function coreStatusToLines(c: CoreStatus | null): string[] {
  if (!c) return [];
  const lines: string[] = [];
  if (c.inbound_processing_active) lines.push("Inbound was active.");
  if (c.queue_processing_active) lines.push("Queue was active.");
  if (c.assurance_attempted_recently) lines.push("Assurance was attempted recently.");
  if (c.proof_capsule_recently_available) lines.push("Proof capsule was recently available.");
  if (c.guarantees_bundle_configured) lines.push("Guarantees bundle was configured.");
  return lines;
}

export default function PresencePage() {
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
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>Presence appears when operation is in place.</p>
      </Shell>
    );
  }

  if (loading) {
    return (
      <Shell>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>Preparing…</p>
      </Shell>
    );
  }

  const pos = capsule?.position;
  const stabilityLines = pos ? stateToLine(pos) : [];
  const proofLines = (capsule?.proof ?? []).slice(0, 8);
  const presenceLines = capsule?.presence_lines ?? [];
  const coreLines = coreStatusToLines(coreStatus);

  return (
    <Shell>
      <div className="max-w-2xl space-y-16">
        {coreLines.length > 0 && (
          <section>
            <h2 className="text-sm font-medium mb-6" style={{ color: "var(--text-muted)", letterSpacing: "0.02em" }}>
              Core status
            </h2>
            <div className="space-y-4">
              {coreLines.map((line, i) => (
                <p key={i} className="text-sm" style={{ color: "var(--text-primary)", lineHeight: 1.7 }}>
                  {line}
                </p>
              ))}
            </div>
          </section>
        )}

        <section>
          <h2 className="text-sm font-medium mb-6" style={{ color: "var(--text-muted)", letterSpacing: "0.02em" }}>
            Stability
          </h2>
          <div className="space-y-4">
            {stabilityLines.length === 0 ? (
              <p className="text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>
                No stability markers recorded.
              </p>
            ) : (
              stabilityLines.map((line, i) => (
                <p key={i} className="text-sm" style={{ color: "var(--text-primary)", lineHeight: 1.7 }}>
                  {line}
                </p>
              ))
            )}
          </div>
        </section>

        <section>
          <h2 className="text-sm font-medium mb-6" style={{ color: "var(--text-muted)", letterSpacing: "0.02em" }}>
            Presence
          </h2>
          <div className="space-y-4">
            {presenceLines.length === 0 ? (
              <p className="text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>
                Operation did not depend on the record.
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
            Reliance
          </h2>
          <div className="space-y-4">
            {proofLines.length === 0 ? (
              <p className="text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>
                No reliance statements yet.
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
              Silence
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
            Preferences
          </Link>
        </p>
      </div>
    </Shell>
  );
}
