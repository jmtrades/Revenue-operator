"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Shell } from "@/components/Shell";
import { fetchWithFallback } from "@/lib/reliability/fetch-with-fallback";

interface Lead {
  id: string;
  workspace_id?: string;
  name: string | null;
  email: string | null;
  company: string | null;
  state: string;
  responsibility_state?: string;
}
interface Message {
  role: string;
  content: string;
  created_at: string;
}
interface CallRow {
  id: string;
  call_started_at: string | null;
  call_ended_at: string | null;
  outcome: string | null;
  summary: string | null;
}

export default function RecordLeadPage() {
  const t = useTranslations("dashboard");
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params.id as string;
  const [lead, setLead] = useState<Lead | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [calls, setCalls] = useState<CallRow[]>([]);
  const [openEscalationId, setOpenEscalationId] = useState<string | null>(null);
  const [beyondScope, setBeyondScope] = useState(false);
  const [loading, setLoading] = useState(true);
  const [recorded, setRecorded] = useState(false);
  const [publicRecordPath, setPublicRecordPath] = useState<string | null>(null);
  const [authorityNote, setAuthorityNote] = useState("");
  const [submittingNote, setSubmittingNote] = useState(false);
  const [absenceModal, setAbsenceModal] = useState<{
    lines: string[];
    onRecord: () => void;
  } | null>(null);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      fetchWithFallback<Lead>(`/api/leads/${id}`),
      fetchWithFallback<{ messages: Message[] }>(`/api/leads/${id}/messages`),
      fetchWithFallback<{ escalation_id?: string; beyond_scope?: boolean }>(`/api/leads/${id}/open-handoff`),
      fetchWithFallback<{ calls: CallRow[] }>(`/api/leads/${id}/calls`, { credentials: "include" }),
    ]).then(([lRes, mRes, hRes, cRes]) => {
      if (lRes.data && !(lRes.data as { error?: unknown }).error) setLead(lRes.data as Lead);
      if (mRes.data?.messages) setMessages(mRes.data.messages);
      if (hRes.data?.escalation_id) {
        setOpenEscalationId((hRes.data as { escalation_id: string }).escalation_id);
        setBeyondScope((hRes.data as { beyond_scope?: boolean }).beyond_scope === true);
      }
      if (cRes.data?.calls) setCalls(cRes.data.calls);
    }).finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!lead?.workspace_id) return;
    fetch(`/api/operational/public-work-ref?workspace_id=${encodeURIComponent(lead.workspace_id)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { path?: string } | null) => (d?.path ? setPublicRecordPath(d.path) : setPublicRecordPath(null)))
      .catch(() => setPublicRecordPath(null));
  }, [lead?.workspace_id]);

  const doRecordOutcome = () => {
    if (!openEscalationId) return;
    fetch(`/api/escalations/${openEscalationId}/ack`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" })
      .then((r) => { if (r.ok) { setOpenEscalationId(null); setRecorded(true); } })
      .catch((e: unknown) => { console.warn("[page] failed:", e instanceof Error ? e.message : String(e)); });
  };

  const doRecordAuthorityNote = () => {
    const wid = lead?.workspace_id;
    if (!wid || !authorityNote.trim()) return;
    setSubmittingNote(true);
    fetch("/api/operational/authority-note", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspace_id: wid, subject_ref: id, text: authorityNote.trim() }),
    })
      .then((r) => {
        if (r.ok) {
          setAuthorityNote("");
          setRecorded(true);
        }
      })
      .finally(() => setSubmittingNote(false));
  };

  const recordOutcome = () => {
    if (!openEscalationId) return;
    if (publicRecordPath) {
      doRecordOutcome();
      return;
    }
    const wid = lead?.workspace_id;
    if (!wid) return;
    fetch(`/api/operational/absence-impact?workspace_id=${encodeURIComponent(wid)}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((lines: string[]) => {
        setAbsenceModal({ lines: Array.isArray(lines) ? lines : [], onRecord: doRecordOutcome });
      })
      .catch(() => setAbsenceModal({ lines: [], onRecord: doRecordOutcome }));
  };

  const recordAuthorityNote = () => {
    const wid = lead?.workspace_id;
    if (!wid || !authorityNote.trim()) return;
    if (publicRecordPath) {
      doRecordAuthorityNote();
      return;
    }
    fetch(`/api/operational/absence-impact?workspace_id=${encodeURIComponent(wid)}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((lines: string[]) => {
        setAbsenceModal({ lines: Array.isArray(lines) ? lines : [], onRecord: doRecordAuthorityNote });
      })
      .catch(() => setAbsenceModal({ lines: [], onRecord: doRecordAuthorityNote }));
  };

  if (loading) {
    return (
      <Shell>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>{t("loadingMessage")}</p>
      </Shell>
    );
  }
  if (!lead) {
    return (
      <Shell>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{t("recordLead.noRecord")}</p>
        <Link href="/dashboard/record" className="text-sm mt-4 inline-block" style={{ color: "var(--meaning-blue)" }}>{t("recordLead.recordBreadcrumb")}</Link>
      </Shell>
    );
  }

  const displayName = lead.name || lead.email || lead.company || "—";
  const wid = searchParams.get("workspace_id");
  const recordHref = wid ? `/dashboard/record?workspace_id=${encodeURIComponent(wid)}` : "/dashboard/record";

  return (
    <Shell>
      <div className="border-b pb-6 mb-8" style={{ borderColor: "var(--border)" }}>
        <Link href={recordHref} className="text-sm" style={{ color: "var(--text-muted)" }}>{t("recordLead.recordBreadcrumb")}</Link>
        <span className="mx-2" style={{ color: "var(--text-muted)" }}>/</span>
        <span className="text-sm" style={{ color: "var(--text-secondary)" }}>{displayName}</span>
      </div>

      <section className="mb-10">
        <h1 className="text-lg font-bold tracking-[-0.025em]" style={{ color: "var(--text-primary)", lineHeight: 1.5 }}>{displayName}</h1>
        {lead.company && <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>{lead.company}</p>}
      </section>

      {recorded && (
        <p className="text-sm mb-6 pb-4 border-b" style={{ color: "var(--text-muted)", borderColor: "var(--border)" }}>{t("recordLead.entryStored")}</p>
      )}

      {calls.length > 0 && (
        <section className="mb-10">
          <h2 className="text-sm font-medium mb-4" style={{ color: "var(--text-muted)", letterSpacing: "0.02em" }}>{t("recordLead.callsHeading")}</h2>
          <ul className="space-y-2">
            {calls.map((call) => (
              <li key={call.id} className="text-sm py-2 border-b" style={{ borderColor: "var(--border)" }}>
                <span style={{ color: "var(--text-muted)" }}>{call.call_started_at ? new Date(call.call_started_at).toLocaleString() : "—"}</span>
                {call.outcome && <span className="ml-2" style={{ color: "var(--text-secondary)" }}>· {call.outcome}</span>}
                {call.summary && <p className="mt-1" style={{ color: "var(--text-secondary)" }}>{call.summary}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mb-10">
        <h2 className="text-sm font-medium mb-4" style={{ color: "var(--text-muted)", letterSpacing: "0.02em" }}>{t("recordLead.recordHeading")}</h2>
        {messages.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--text-muted)", lineHeight: 1.7 }}>{t("recordLead.noEntries")}</p>
        ) : (
          <div className="space-y-0">
            {messages.map((m, i) => (
              <div
                key={i}
                className="flex gap-6 py-4 border-b"
                style={{ borderColor: "var(--border)", lineHeight: 1.6 }}
              >
                <span className="text-sm shrink-0 w-36" style={{ color: "var(--text-muted)" }}>
                  {new Date(m.created_at).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" })}
                </span>
                <span className="text-sm shrink-0 w-20" style={{ color: "var(--text-secondary)" }}>
                  {m.role === "user" ? t("recordLead.roleInbound") : m.role === "assistant" ? t("recordLead.roleOutbound") : t("recordLead.roleMessage")}
                </span>
                <p className="text-sm flex-1 min-w-0" style={{ color: "var(--text-primary)" }}>{m.content || "—"}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="pt-6 border-t" style={{ borderColor: "var(--border)" }}>
        <h2 className="text-sm font-medium mb-4" style={{ color: "var(--text-muted)", letterSpacing: "0.02em" }}>
          {t("recordLead.authorityActions")}
        </h2>
        {openEscalationId && (
          <div className="space-y-2 mb-4">
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>{t("recordLead.outsideAuthority")}</p>
            {beyondScope && <p className="text-sm" style={{ color: "var(--text-muted)" }}>{t("recordLead.beyondScope")}</p>}
            <button
              type="button"
              onClick={recordOutcome}
              className="text-sm font-medium py-2 px-0 border-b border-transparent focus-ring"
              style={{ color: "var(--text-primary)", borderColor: "var(--meaning-blue)" }}
            >
              {t("recordLead.enterOutcome")}
            </button>
          </div>
        )}
        <div className="space-y-2">
          <label className="block text-sm" style={{ color: "var(--text-secondary)" }}>{t("recordLead.authorityNoteLabel")}</label>
          <input
            type="text"
            value={authorityNote}
            onChange={(e) => setAuthorityNote(e.target.value)}
            placeholder={t("recordLead.authorityNotePlaceholder")}
            maxLength={80}
            className="w-full max-w-md text-sm py-2 px-0 border-b bg-transparent focus-ring"
            style={{ borderColor: "var(--border)", color: "var(--text-primary)" }}
          />
          <button
            type="button"
            onClick={recordAuthorityNote}
            disabled={!authorityNote.trim() || submittingNote}
            className="text-sm font-medium py-2 px-0 border-b border-transparent focus-ring disabled:opacity-50"
            style={{ color: "var(--text-primary)", borderColor: "var(--meaning-blue)" }}
          >
            {t("recordLead.recordNote")}
          </button>
        </div>
      </section>

      {publicRecordPath && (
        <footer className="mt-12 pt-6 border-t text-sm" style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}>
          {t("recordLead.publicRecordLabel")} {publicRecordPath}
        </footer>
      )}

      {absenceModal && (
        <div
          className="fixed inset-0 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.4)" }}
          role="dialog"
          aria-modal="true"
        >
          <div className="max-w-md w-full p-6 rounded-lg shadow-lg" style={{ background: "var(--card)", borderColor: "var(--border)", borderWidth: "1px" }}>
            <p className="text-sm font-medium mb-4" style={{ color: "var(--text-primary)" }}>
              {t("recordLead.outcomeNotInRecord")}
            </p>
            {absenceModal.lines.length > 0 && (
              <ul className="space-y-1 mb-4 text-sm" style={{ color: "var(--text-secondary)" }}>
                {absenceModal.lines.map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
            )}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => { absenceModal.onRecord(); setAbsenceModal(null); }}
                className="text-sm font-medium py-2 px-3 rounded border focus-ring"
                style={{ borderColor: "var(--border)", color: "var(--text-primary)" }}
              >
                {t("recordLead.recordOutcome")}
              </button>
              <button
                type="button"
                onClick={() => setAbsenceModal(null)}
                className="text-sm font-medium py-2 px-3 rounded border focus-ring"
                style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
              >
                {t("recordLead.continueWithoutRecord")}
              </button>
            </div>
          </div>
        </div>
      )}
    </Shell>
  );
}
