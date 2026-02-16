"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

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
      setLoading(false);
      setNotFound(true);
      return;
    }
    setLoading(true);
    setNotFound(false);
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
  }, [externalRef]);

  if (!externalRef || notFound) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#fafaf9] p-6">
        <p className="text-[18px] text-[#78716c]">Not found.</p>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#fafaf9] p-6">
        <p className="text-[18px] text-[#78716c]">Loading.</p>
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
    <main className="min-h-screen bg-[#fafaf9] text-[#1c1917] p-6">
      <div className="mx-auto max-w-[880px] space-y-12">
        <h1 className="text-[21px] font-normal text-[#1c1917]">Record</h1>

        {participants.length > 0 && (
          <section>
            <h2 className="text-[13px] font-medium uppercase tracking-wide text-[#78716c] mb-4">
              Participants
            </h2>
            <ul className="space-y-1">
              {participants.map((p, i) => (
                <li key={i} className="text-[18px] leading-relaxed text-[#44403c]">
                  {p.role}
                  {p.hint ? ` — ${p.hint}` : ""}
                </li>
              ))}
            </ul>
          </section>
        )}

        <section>
          <h2 className="text-[13px] font-medium uppercase tracking-wide text-[#78716c] mb-4">
            What happened
          </h2>
          {what_happened.length === 0 ? (
            <p className="text-[18px] leading-relaxed text-[#78716c]">No entries.</p>
          ) : (
            <ul className="space-y-2">
              {what_happened.map((s, i) => (
                <li key={i} className="text-[18px] leading-relaxed text-[#44403c]">
                  {s}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="border-t border-[#e7e5e4] pt-8">
          <h2 className="text-[13px] font-medium uppercase tracking-wide text-[#78716c] mb-4">
            If removed
          </h2>
          {if_removed.length === 0 ? (
            <p className="text-[18px] leading-relaxed text-[#78716c]">Nothing listed.</p>
          ) : (
            <ul className="space-y-2">
              {if_removed.map((s, i) => (
                <li key={i} className="text-[18px] leading-relaxed text-[#44403c]">
                  {s}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="border-t border-[#e7e5e4] pt-8">
          <h2 className="text-[13px] font-medium uppercase tracking-wide text-[#78716c] mb-4">
            Reliance
          </h2>
          {reliance.length === 0 ? (
            <p className="text-[18px] leading-relaxed text-[#78716c]">Nothing listed.</p>
          ) : (
            <ul className="space-y-2">
              {reliance.map((s, i) => (
                <li key={i} className="text-[18px] leading-relaxed text-[#44403c]">
                  {s}
                </li>
              ))}
            </ul>
          )}
        </section>

        {pendingResponsibility && (
          <section className="border-t border-[#e7e5e4] pt-8">
            <p className="text-[18px] leading-relaxed text-[#44403c]">{pendingResponsibility}</p>
          </section>
        )}

        {pendingAssignment && (
          <section className="border-t border-[#e7e5e4] pt-8">
            <p className="text-[18px] leading-relaxed text-[#44403c]">{pendingAssignment}</p>
          </section>
        )}

        {recordExternalDependence && (
          <section className="border-t border-[#e7e5e4] pt-8">
            <p className="text-[18px] leading-relaxed text-[#44403c]">{recordExternalDependence}</p>
          </section>
        )}

        {evidenceStatement && (
          <section className="border-t border-[#e7e5e4] pt-8">
            <p className="text-[18px] leading-relaxed text-[#44403c]">{evidenceStatement}</p>
          </section>
        )}

        {referenceContinuation && (
          <section className="border-t border-[#e7e5e4] pt-8">
            <p className="text-[18px] leading-relaxed text-[#44403c]">{referenceContinuation}</p>
          </section>
        )}

        {amendmentStatement && (
          <section className="border-t border-[#e7e5e4] pt-8">
            <p className="text-[18px] leading-relaxed text-[#44403c]">{amendmentStatement}</p>
          </section>
        )}

        {stabilityStatement && (
          <section className="border-t border-[#e7e5e4] pt-8">
            <p className="text-[18px] leading-relaxed text-[#44403c]">{stabilityStatement}</p>
          </section>
        )}

        {continuationSurface && continuation.length > 0 && (
          <section className="border-t border-[#e7e5e4] pt-8">
            <h2 className="text-[13px] font-medium uppercase tracking-wide text-[#78716c] mb-4">
              Continuation
            </h2>
            {chainHeaderLine && (
              <p className="text-[18px] leading-relaxed text-[#44403c] mb-4">
                {chainHeaderLine}
              </p>
            )}
            <ul className="space-y-2">
              {continuation.map((s, i) => (
                <li key={i} className="text-[18px] leading-relaxed text-[#44403c]">
                  {s}
                </li>
              ))}
            </ul>
          </section>
        )}

        {canRespond && !responseDone && (
          <section className="border-t border-[#e7e5e4] pt-8">
            <h2 className="text-[13px] font-medium uppercase tracking-wide text-[#78716c] mb-4">
              Enter response
            </h2>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => sendResponse("confirm")}
                disabled={!!responding}
                className="text-[18px] py-2 px-0 border-b border-transparent hover:border-[#44403c] disabled:opacity-50"
                style={{ color: "#44403c" }}
              >
                Confirm
              </button>
              <button
                type="button"
                onClick={() => sendResponse("dispute")}
                disabled={!!responding}
                className="text-[18px] py-2 px-0 border-b border-transparent hover:border-[#44403c] disabled:opacity-50"
                style={{ color: "#44403c" }}
              >
                Dispute
              </button>
              <button
                type="button"
                onClick={() => sendResponse("info")}
                disabled={!!responding}
                className="text-[18px] py-2 px-0 border-b border-transparent hover:border-[#44403c] disabled:opacity-50"
                style={{ color: "#44403c" }}
              >
                Provide information
              </button>
            </div>
          </section>
        )}

        {canFollowUp && !responseDone && (
          <section className="border-t border-[#e7e5e4] pt-8">
            <h2 className="text-[13px] font-medium uppercase tracking-wide text-[#78716c] mb-4">
              Next action
            </h2>
            <div className="flex flex-wrap gap-3">
              {FOLLOW_UP_TYPES.map((action) => (
                <button
                  key={action}
                  type="button"
                  onClick={() => sendResponse(action)}
                  disabled={!!responding}
                  className="text-[18px] py-2 px-0 border-b border-transparent hover:border-[#44403c] disabled:opacity-50"
                  style={{ color: "#44403c" }}
                >
                  {FOLLOW_UP_LABELS[action]}
                </button>
              ))}
            </div>
          </section>
        )}

        {responseDone && (
          <section className="border-t border-[#e7e5e4] pt-8">
            <p className="text-[18px] leading-relaxed text-[#78716c]">Response recorded.</p>
          </section>
        )}
      </div>
    </main>
  );
}
