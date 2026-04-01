"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ProofDrawer } from "@/components/ProofDrawer";
import { LoadingState, Card } from "@/components/ui";
import { Shell } from "@/components/Shell";
import { PrimaryAction } from "@/components/PrimaryAction";
import { SecondaryAction } from "@/components/SecondaryAction";
import { fetchWithFallback } from "@/lib/reliability/fetch-with-fallback";

interface Lead {
  id: string;
  workspace_id?: string;
  name: string | null;
  email: string | null;
  company: string | null;
  state: string;
  created_at?: string;
  responsibility_state?: string;
}

interface Message {
  role: string;
  content: string;
  created_at: string;
}

interface Deal {
  id: string;
}

interface PreCallBrief {
  context?: string;
  motivation?: string;
  risks?: string[];
  hesitations?: string[];
  recommended_strategy?: string;
}

export default function LeadViewPage() {
  const params = useParams();
  const _router = useRouter();
  const tSituation = useTranslations("dashboard.leadDetailSituation");
  const tLead = useTranslations("dashboard.leadDetailPage");
  const id = params.id as string;
  const [lead, setLead] = useState<Lead | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [_preCallBrief, setPreCallBrief] = useState<PreCallBrief | null>(null);
  const [workspacePaused, setWorkspacePaused] = useState(false);
  const [_callContinuity, setCallContinuity] = useState<{ status: "Prepared" | "Waiting" | "Recovering" } | null>(null);
  const [loading, setLoading] = useState(true);
  const [proofOpen, setProofOpen] = useState(false);
  const [openEscalationId, setOpenEscalationId] = useState<string | null>(null);
  const [beyondScope, setBeyondScope] = useState<boolean>(false);
  const [recordedBanner, setRecordedBanner] = useState(false);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      fetchWithFallback(`/api/leads/${id}`, { cacheKey: `lead-${id}` }),
      fetchWithFallback(`/api/leads/${id}/messages`, { cacheKey: `lead-messages-${id}` }),
    ])
      .then(([lResult, mResult]) => {
        if (lResult.data && !(lResult.data as { error?: unknown }).error) {
          const leadData = lResult.data as Lead & { deals?: Deal[] };
          setLead(leadData);
          setDeals(leadData.deals ?? []);
        }
        if (mResult.data) {
          const msgData = mResult.data as { messages?: Message[] };
          setMessages(msgData.messages ?? []);
        }
        // Keep previous state on error
      })
      .catch(() => {
        // Keep previous state
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!lead?.workspace_id) return;
    fetchWithFallback(`/api/overview?workspace_id=${encodeURIComponent(lead.workspace_id)}`, {
      cacheKey: `overview-${lead.workspace_id}`,
    }).then((result) => {
      if (result.data) {
        setWorkspacePaused((result.data as { workspace_status?: string }).workspace_status === "paused");
      }
    });
  }, [lead?.workspace_id]);

  useEffect(() => {
    if (!id || !lead?.workspace_id) return;
    fetchWithFallback<{ status: "Prepared" | "Waiting" | "Recovering" }>(`/api/leads/${id}/call-continuity?workspace_id=${encodeURIComponent(lead.workspace_id)}`, {
      cacheKey: `call-continuity-${id}`,
    }).then((result) => {
      if (result.data && !(result.data as { error?: unknown }).error) {
        setCallContinuity(result.data as { status: "Prepared" | "Waiting" | "Recovering" });
      }
      // Keep previous state on error
    });
  }, [id, lead?.workspace_id]);

  useEffect(() => {
    if (!id || !lead) return;
    const dealId = deals?.length && deals[0] ? (deals[0] as Deal).id : undefined;
    fetchWithFallback<PreCallBrief>(`/api/leads/${id}/pre-call-brief${dealId ? `?deal_id=${dealId}` : ""}`, {
      cacheKey: `pre-call-brief-${id}-${dealId ?? "none"}`,
    }).then((result) => {
      if (result.data && !(result.data as { error?: unknown }).error) {
        setPreCallBrief(result.data);
      }
      // Keep previous state on error
    });
  }, [id, lead, deals]);

  useEffect(() => {
    if (!id) return;
    fetchWithFallback<{ escalation_id?: string; beyond_scope?: boolean }>(`/api/leads/${id}/open-handoff`, { cacheKey: `open-handoff-${id}` }).then(
      (result) => {
        if (result.data) {
          const d = result.data as { escalation_id?: string; beyond_scope?: boolean };
          if (typeof d.escalation_id === "string") setOpenEscalationId(d.escalation_id);
          setBeyondScope(d.beyond_scope === true);
        }
      }
    );
  }, [id]);

  if (loading) return (
    <Shell size="md">
      <LoadingState message={tLead("loadingMessage")} submessage="" />
    </Shell>
  );
  if (!lead) return (
    <Shell size="md">
      <Card>
        <span style={{ color: "var(--text-secondary)" }}>{tLead("dataRemainsFromLastView")}</span>
      </Card>
    </Shell>
  );

  const displayName = lead.name || lead.email || lead.company || tLead("unknown");
  const isCompleted = lead.responsibility_state === "COMPLETED";

  if (isCompleted) {
    return (
      <div className="min-h-screen" style={{ background: "var(--background)", color: "var(--text-primary)" }}>
        <Shell size="md">
          <p className="text-sm mb-8" style={{ color: "var(--text-muted)", letterSpacing: "0.01em" }}>
            <Link href="/dashboard/conversations" className="focus-ring rounded px-0.5" style={{ color: "var(--text-muted)" }}>{tLead("followThrough")}</Link>
            <span className="mx-1">/</span>
            <span style={{ color: "var(--text-secondary)" }}>{displayName}</span>
          </p>
          <section className="mb-10">
            <h1 className="text-xl font-bold tracking-[-0.025em]" style={{ color: "var(--text-primary)", lineHeight: 1.4 }}>{displayName}</h1>
            {lead.company && <p className="mt-2 text-sm" style={{ color: "var(--text-muted)", lineHeight: 1.6 }}>{lead.company}</p>}
            <p className="mt-2 text-sm" style={{ color: "var(--text-muted)" }}>{tLead("recordIntegrityDemonstrable")}</p>
          </section>
          <p className="text-sm mb-8" style={{ color: "var(--text-muted)" }}>{tLead("handled")}</p>
          <section className="mb-10" style={{ borderTop: "1px solid var(--border)", paddingTop: "var(--space-8)" }}>
            <h2 className="text-sm font-medium mb-4" style={{ color: "var(--text-secondary)" }}>{tLead("record")}</h2>
            {messages.length === 0 ? (
              <p className="text-sm" style={{ color: "var(--text-muted)", lineHeight: 1.6 }}>{tLead("noRecord")}</p>
            ) : (
              <div className="space-y-4">
                {messages.map((m, i) => (
                  <div key={i} className="py-4" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                    <p className="text-sm" style={{ color: "var(--text-primary)", lineHeight: 1.6 }}>{m.content}</p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </Shell>
      </div>
    );
  }

  const situationKeys = ["NEW", "CONTACTED", "ENGAGED", "QUALIFIED", "BOOKED", "SHOWED", "LOST", "REACTIVATE"] as const;
  const situationLine = situationKeys.includes(lead.state as (typeof situationKeys)[number])
    ? tSituation(lead.state as (typeof situationKeys)[number])
    : tSituation("fallback");

  const recordDecision = () => {
    if (!openEscalationId) return;
    fetch(`/api/escalations/${openEscalationId}/ack`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" })
      .then((r) => {
        if (r.ok) {
          setOpenEscalationId(null);
          setRecordedBanner(true);
        }
      })
      .catch((e) => { console.warn("[page] failed:", e instanceof Error ? e.message : String(e)); });
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--background)", color: "var(--text-primary)" }}>
      <Shell size="md">
        {recordedBanner && (
          <p className="mb-6 text-sm py-2 border-b" style={{ color: "var(--text-muted)", borderColor: "var(--border-subtle)" }}>{tLead("entryStored")}</p>
        )}
        <p className="text-sm mb-8" style={{ color: "var(--text-muted)", letterSpacing: "0.01em" }}>
          <Link href="/dashboard/conversations" className="focus-ring rounded px-0.5" style={{ color: "var(--text-muted)" }}>{tLead("followThrough")}</Link>
          <span className="mx-1">/</span>
          <span style={{ color: "var(--text-secondary)" }}>{displayName}</span>
        </p>

        {/* Identity — no label */}
        <section className="mb-10">
          <h1 className="text-xl font-bold tracking-[-0.025em]" style={{ color: "var(--text-primary)", lineHeight: 1.4 }}>{displayName}</h1>
          {lead.company && <p className="mt-2 text-sm" style={{ color: "var(--text-muted)", lineHeight: 1.6 }}>{lead.company}</p>}
          <p className="mt-2 text-sm" style={{ color: "var(--text-muted)", lineHeight: 1.6 }}>{situationLine}</p>
          <p className="mt-2 text-sm" style={{ color: "var(--text-muted)" }}>{tLead("recordIntegrityDemonstrable")}</p>
        </section>

        {workspacePaused && (
          <div className="mb-6 py-3 px-4 rounded-xl" style={{ background: "rgba(243, 156, 18, 0.08)", border: "1px solid var(--border)", borderRadius: "var(--radius-container)" }}>
            <p className="text-sm" style={{ color: "var(--text-primary)" }}>{tLead("normalConditionsNotPresentResume")}</p>
          </div>
        )}

        {/* Record */}
        <section className="mb-10" style={{ borderTop: "1px solid var(--border)", paddingTop: "var(--space-8)" }}>
          <h2 className="text-sm font-medium mb-4" style={{ color: "var(--text-secondary)" }}>{tLead("record")}</h2>
          {messages.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--text-muted)", lineHeight: 1.6 }}>{tLead("noRecord")}</p>
          ) : (
            <div className="space-y-4">
              {messages.map((m, i) => (
                <div key={i} className="py-4" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                  <p className="text-sm" style={{ color: "var(--text-primary)", lineHeight: 1.6 }}>{m.content}</p>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Outcome */}
        <section style={{ borderTop: "1px solid var(--border)", paddingTop: "var(--space-8)" }}>
          <h2 className="text-sm font-medium mb-4" style={{ color: "var(--text-secondary)" }}>{tLead("outcome")}</h2>
          {openEscalationId && (
            <>
              <p className="text-sm mb-3" style={{ color: "var(--text-muted)" }}>{tLead("outsideAuthority")}</p>
              {beyondScope && <p className="text-sm mb-3 -mt-2" style={{ color: "var(--text-muted)" }}>{tLead("beyondScope")}</p>}
              <p className="text-sm mb-3 -mt-2" style={{ color: "var(--text-muted)" }}>{tLead("entryExistsForRecord")}</p>
              <p className="text-sm mb-3 -mt-2" style={{ color: "var(--text-muted)" }}>{tLead("unrecordedOutcomesCreateExposure")}</p>
              <p className="text-sm mb-3 -mt-2" style={{ color: "var(--text-muted)" }}>{tLead("entryRestoresReliance")}</p>
            </>
          )}
          <div className="flex flex-wrap gap-3">
            {openEscalationId && (
              <PrimaryAction onClick={recordDecision}>{tLead("enterOutcome")}</PrimaryAction>
            )}
            <SecondaryAction onClick={() => setProofOpen(true)}>{tLead("howItProgressed")}</SecondaryAction>
          </div>
        </section>
      </Shell>
      <ProofDrawer leadId={id} isOpen={proofOpen} onClose={() => setProofOpen(false)} />
    </div>
  );
}
