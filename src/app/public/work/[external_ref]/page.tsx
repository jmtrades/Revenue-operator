"use client";

import { useParams } from "next/navigation";
import { useEffect, useState, useCallback } from "react";

const FOLLOW_UP_TYPES = [
  "request_adjustment",
  "schedule_follow_up",
  "approve_next_step",
  "acknowledge_responsibility",
  "attach_outcome_evidence",
  "assign_third_party",
  "transfer_responsibility",
] as const;

const FOLLOW_UP_LABELS: Record<(typeof FOLLOW_UP_TYPES)[number], string> = {
  request_adjustment: "Request adjustment",
  schedule_follow_up: "Schedule follow-up",
  approve_next_step: "Approve next step",
  acknowledge_responsibility: "Acknowledge responsibility",
  attach_outcome_evidence: "Attach outcome evidence",
  assign_third_party: "Assign third party",
  transfer_responsibility: "Transfer responsibility",
};

interface PublicWorkData {
  what_happened: string[];
  if_removed: string[];
  reliance: string[];
  continuation?: string[];
  continuation_surface?: boolean;
  pending_responsibility_statement?: string | null;
  pending_assignment_statement?: string | null;
  record_external_dependence_statement?: string | null;
  evidence_present?: boolean;
  evidence_statement?: string | null;
  reference_continuation_statement?: string | null;
  amendment_statement?: string | null;
  stability_statement?: string | null;
  chain_header_line?: string | null;
  participants?: { role: string; hint?: string | null }[];
  can_respond?: boolean;
  can_follow_up?: boolean;
}

export default function PublicWorkPage() {
  const params = useParams();
  const externalRef = typeof params.external_ref === "string" ? params.external_ref : "";
  const [data, setData] = useState<PublicWorkData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [responding, setResponding] = useState<string | null>(null);
  const [responseDone, setResponseDone] = useState(false);

  useEffect(() => {
    if (!externalRef) {
      const id = setTimeout(() => {
        setLoading(false);
        setNotFound(true);
      }, 0);
      return () => clearTimeout(id);
    }
    const id = setTimeout(() => {
      setLoading(true);
      setNotFound(false);
    }, 0);
    fetch(`/api/public/work/${encodeURIComponent(externalRef)}`, { cache: "no-store" })
      .then((res) => {
        if (res.status === 404) {
          setNotFound(true);
          return null;
        }
        if (!res.ok) return null;
        return res.json();
      })
      .then((json) => setData(json as PublicWorkData | null))
      .finally(() => setLoading(false));
    return () => clearTimeout(id);
  }, [externalRef]);

  const copyRecordLink = useCallback(() => {
    if (typeof window === "undefined" || !externalRef) return;
    const url = `${window.location.origin}/public/work/${encodeURIComponent(externalRef)}`;
    navigator.clipboard.writeText(url).catch(() => {});
  }, [externalRef]);

  if (!externalRef || notFound) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6" style={{ background: "var(--background)" }}>
        <p className="text-lg" style={{ color: "var(--text-muted)" }}>Not found.</p>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6" style={{ background: "var(--background)" }}>
        <p className="text-lg" style={{ color: "var(--text-muted)" }}>One moment…</p>
      </main>
    );
  }

  const what_happened = data?.what_happened ?? [];
  const if_removed = data?.if_removed ?? [];
  const reliance = data?.reliance ?? [];
  const continuation = data?.continuation ?? [];
  const continuationSurface = data?.continuation_surface === true;
  const pendingResponsibility = data?.pending_responsibility_statement ?? null;
  const pendingAssignment = data?.pending_assignment_statement ?? null;
  const recordExternalDependence = data?.record_external_dependence_statement ?? null;
  const evidenceStatement = data?.evidence_statement ?? null;
  const referenceContinuation = data?.reference_continuation_statement ?? null;
  const amendmentStatement = data?.amendment_statement ?? null;
  const stabilityStatement = data?.stability_statement ?? null;
  const chainHeaderLine = data?.chain_header_line ?? null;
  const participants = data?.participants ?? [];
  const canRespond = data?.can_respond === true;
  const canFollowUp = data?.can_follow_up === true;

  const sendResponse = (type: string, text?: string, extra?: { actor_role?: string; participant_hint?: string; evidence_text?: string; evidence_pointer?: string }) => {
    if (responseDone || responding) return;
    setResponding(type);
    fetch(`/api/public/work/${encodeURIComponent(externalRef)}/respond`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type,
        ...(text ? { text: text.slice(0, 200) } : {}),
        ...(extra?.actor_role ? { actor_role: extra.actor_role } : {}),
        ...(extra?.participant_hint ? { participant_hint: extra.participant_hint.slice(0, 60) } : {}),
        ...(extra?.evidence_text ? { evidence_text: extra.evidence_text.slice(0, 140) } : {}),
        ...(extra?.evidence_pointer ? { evidence_pointer: extra.evidence_pointer.slice(0, 120) } : {}),
      }),
    })
      .then((r) => r.json())
      .then((json: { ok?: boolean }) => {
        if (json.ok) setResponseDone(true);
      })
      .finally(() => setResponding(null));
  };

  return (
    <main className="min-h-screen py-16 sm:py-24 px-6" style={{ background: "var(--background)", color: "var(--text-primary)" }}>
      <div className="mx-auto max-w-[680px] space-y-20 text-center" style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.25)" }}>
        <header className="space-y-4 pb-12 border-b-2" style={{ borderColor: "var(--accent)", paddingBottom: "3rem" }}>
          <h1 className="font-headline text-[28px] sm:text-[32px] uppercase tracking-tight">
            Governed commercial record
          </h1>
          <p className="text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}>
            Verified under declared jurisdiction.
          </p>
          <p className="text-sm mx-auto" style={{ color: "var(--text-secondary)", lineHeight: 1.75, letterSpacing: "0.01em" }}>
            This record reflects governed execution under declared jurisdiction and review level.
          </p>
        </header>
        <div className="text-sm text-left" style={{ color: "var(--text-muted)", lineHeight: 1.75, letterSpacing: "0.01em", display: "flex", flexDirection: "column", gap: "16px" }}>
          <p>Chronological.</p>
          <p>Immutable.</p>
          <p>Unalterable once issued.</p>
          <p>Forwardable without modification.</p>
          <p className="pt-2" style={{ color: "var(--text-secondary)" }}>This record confirms execution occurred under governance.</p>
          <p className="pt-1" style={{ color: "var(--text-secondary)" }}>Communication was evaluated before issuance.</p>
          <p className="pt-1" style={{ color: "var(--text-secondary)" }}>Record integrity is enforced at issuance.</p>
        </div>
        <div className="flex justify-center">
          <button
            type="button"
            onClick={copyRecordLink}
            className="btn-primary"
          >
            Copy record
          </button>
        </div>

        {participants.length > 0 && (
          <section className="text-left pt-12 border-t" style={{ borderColor: "var(--border)" }}>
            <h2 className="text-[13px] font-medium uppercase mb-4" style={{ color: "var(--text-muted)", letterSpacing: "0.12em" }}>
              Participants
            </h2>
            <ul className="space-y-1">
              {participants.map((p, i) => (
                <li key={i} className="text-base leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                  {p.role}
                  {p.hint ? ` — ${p.hint}` : ""}
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="text-left pt-16 border-t" style={{ borderColor: "var(--border)" }}>
          <h2 className="text-[13px] font-medium uppercase mb-4" style={{ color: "var(--text-muted)", letterSpacing: "0.12em" }}>
            What happened
          </h2>
          {what_happened.length === 0 ? (
            <p className="text-base leading-relaxed" style={{ color: "var(--text-muted)" }}>No entries.</p>
          ) : (
            <ul className="space-y-2">
              {what_happened.map((s, i) => (
                <li key={i} className="text-base leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                  {s}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="text-left pt-12 border-t" style={{ borderColor: "var(--border)" }}>
          <h2 className="text-[13px] font-medium uppercase mb-4" style={{ color: "var(--text-muted)", letterSpacing: "0.12em" }}>
            If removed
          </h2>
          {if_removed.length === 0 ? (
            <p className="text-base leading-relaxed" style={{ color: "var(--text-muted)" }}>Nothing listed.</p>
          ) : (
            <ul className="space-y-2">
              {if_removed.map((s, i) => (
                <li key={i} className="text-base leading-relaxed" style={{ color: "var(--text-secondary)" }}>{s}</li>
              ))}
            </ul>
          )}
        </section>

        <section className="text-left pt-12 border-t" style={{ borderColor: "var(--border)" }}>
          <h2 className="text-[13px] font-medium uppercase mb-4" style={{ color: "var(--text-muted)", letterSpacing: "0.12em" }}>
            Integrations
          </h2>
          {reliance.length === 0 ? (
            <p className="text-base leading-relaxed" style={{ color: "var(--text-muted)" }}>Nothing listed.</p>
          ) : (
            <ul className="space-y-2">
              {reliance.map((s, i) => (
                <li key={i} className="text-base leading-relaxed" style={{ color: "var(--text-secondary)" }}>{s}</li>
              ))}
            </ul>
          )}
        </section>

        {pendingResponsibility && (
          <section className="text-left pt-12 border-t" style={{ borderColor: "var(--border)" }}>
            <p className="text-base leading-relaxed" style={{ color: "var(--text-secondary)" }}>{pendingResponsibility}</p>
          </section>
        )}

        {pendingAssignment && (
          <section className="text-left pt-12 border-t" style={{ borderColor: "var(--border)" }}>
            <p className="text-base leading-relaxed" style={{ color: "var(--text-secondary)" }}>{pendingAssignment}</p>
          </section>
        )}

        {recordExternalDependence && (
          <section className="text-left pt-12 border-t" style={{ borderColor: "var(--border)" }}>
            <p className="text-base leading-relaxed" style={{ color: "var(--text-secondary)" }}>{recordExternalDependence}</p>
          </section>
        )}

        {evidenceStatement && (
          <section className="text-left pt-12 border-t" style={{ borderColor: "var(--border)" }}>
            <p className="text-base leading-relaxed" style={{ color: "var(--text-secondary)" }}>{evidenceStatement}</p>
          </section>
        )}

        {referenceContinuation && (
          <section className="text-left pt-12 border-t" style={{ borderColor: "var(--border)" }}>
            <p className="text-base leading-relaxed" style={{ color: "var(--text-secondary)" }}>{referenceContinuation}</p>
          </section>
        )}

        {amendmentStatement && (
          <section className="text-left pt-12 border-t" style={{ borderColor: "var(--border)" }}>
            <p className="text-base leading-relaxed" style={{ color: "var(--text-secondary)" }}>{amendmentStatement}</p>
          </section>
        )}

        {stabilityStatement && (
          <section className="text-left pt-12 border-t" style={{ borderColor: "var(--border)" }}>
            <p className="text-base leading-relaxed" style={{ color: "var(--text-secondary)" }}>{stabilityStatement}</p>
          </section>
        )}

        {continuationSurface && continuation.length > 0 && (
          <section className="text-left pt-12 border-t" style={{ borderColor: "var(--border)" }}>
            <h2 className="text-[13px] font-medium uppercase mb-4" style={{ color: "var(--text-muted)", letterSpacing: "0.12em" }}>
              Continuation
            </h2>
            {chainHeaderLine && (
              <p className="text-base leading-relaxed mb-4" style={{ color: "var(--text-secondary)" }}>{chainHeaderLine}</p>
            )}
            <ul className="space-y-2">
              {continuation.map((s, i) => (
                <li key={i} className="text-base leading-relaxed" style={{ color: "var(--text-secondary)" }}>{s}</li>
              ))}
            </ul>
          </section>
        )}

        {canRespond && !responseDone && (
          <section className="text-left pt-12 border-t" style={{ borderColor: "var(--border)" }}>
            <h2 className="text-[13px] font-medium uppercase mb-4" style={{ color: "var(--text-muted)", letterSpacing: "0.12em" }}>
              Enter response
            </h2>
            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={() => sendResponse("confirm")} disabled={!!responding} className="btn-secondary text-sm py-2">Confirm</button>
              <button type="button" onClick={() => sendResponse("dispute")} disabled={!!responding} className="btn-secondary text-sm py-2">Dispute</button>
              <button type="button" onClick={() => sendResponse("info")} disabled={!!responding} className="btn-secondary text-sm py-2">Provide information</button>
            </div>
          </section>
        )}

        {canFollowUp && !responseDone && (
          <section className="text-left pt-12 border-t" style={{ borderColor: "var(--border)" }}>
            <h2 className="text-[13px] font-medium uppercase mb-4" style={{ color: "var(--text-muted)", letterSpacing: "0.12em" }}>
              Next action
            </h2>
            <div className="flex flex-wrap gap-3">
              {FOLLOW_UP_TYPES.map((action) => (
                <button key={action} type="button" onClick={() => sendResponse(action)} disabled={!!responding} className="btn-secondary text-sm py-2">
                  {FOLLOW_UP_LABELS[action]}
                </button>
              ))}
            </div>
          </section>
        )}

        {responseDone && (
          <section className="text-left pt-12 border-t" style={{ borderColor: "var(--border)" }}>
            <p className="text-base leading-relaxed" style={{ color: "var(--text-muted)" }}>Response recorded.</p>
          </section>
        )}

        <footer className="pt-20 mt-20 text-center space-y-4 border-t" style={{ borderColor: "var(--border)" }}>
          <p className="text-base font-medium" style={{ color: "var(--text-secondary)" }}>
            If revenue depends on conversation, it must be governed.
          </p>
          <p className="text-[13px]" style={{ color: "var(--text-muted)" }}>
            Used by independent operators and enterprise teams.
          </p>
        </footer>
      </div>
    </main>
  );
}
