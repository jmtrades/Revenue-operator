"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useWorkspace } from "@/components/WorkspaceContext";
import { Shell } from "@/components/Shell";
import { DashboardExecutionStateBanner } from "@/components/ExecutionStateBanner";
import { TrialGraceEndedBanner } from "@/components/TrialGraceEndedBanner";
import { AuthorityHeader } from "@/components/institutional";
import { track } from "@/lib/analytics/posthog";

const PURPOSE_VALUES = ["qualify", "confirm", "collect", "reactivate", "route", "recover"] as const;

export default function ImportPage() {
  const t = useTranslations("dashboard");
  const { workspaceId } = useWorkspace();
  const purposeOptions = useMemo(
    () => PURPOSE_VALUES.map((value) => ({ value, label: t(`importPage.purpose.${value}`) })),
    [t]
  );
  const [_file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ ingested: number; duplicates: number } | null>(null);
  const [listPurpose, setListPurpose] = useState<string>("qualify");

  const parseCsv = (text: string): { headers: string[]; rows: string[][] } => {
    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length === 0) return { headers: [], rows: [] };
    const headers = lines[0].split(",").map((h) => h.trim());
    const rows = lines.slice(1).map((line) => line.split(",").map((c) => c.trim()));
    return { headers, rows };
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setResult(null);
    const reader = new FileReader();
    reader.onload = () => {
      const { headers: h, rows: r } = parseCsv(String(reader.result ?? ""));
      setHeaders(h);
      setRows(r);
    };
    reader.readAsText(f);
  };

  const doImport = async () => {
    if (!workspaceId || rows.length === 0 || importing) return;
    setImporting(true);
    setResult(null);
    let ingested = 0;
    let duplicates = 0;
    const headerLower = headers.map((h) => h.toLowerCase());

    const findIndex = (candidates: string[]): number => {
      for (const c of candidates) {
        const idx = headerLower.findIndex((h) => h === c);
        if (idx !== -1) return idx;
      }
      return -1;
    };

    const emailIdx = findIndex(["email", "email_address"]);
    const phoneIdx = findIndex(["phone", "phone_number", "mobile", "tel"]);
    const nameIdx = findIndex(["name", "full_name", "contact_name"]);
    const notesIdx = findIndex(["notes", "note", "comments"]);

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const payload: Record<string, string> = {};
      if (emailIdx >= 0 && row[emailIdx]) payload.email = row[emailIdx];
      if (phoneIdx >= 0 && row[phoneIdx]) payload.phone = row[phoneIdx];
      if (nameIdx >= 0 && row[nameIdx]) payload.name = row[nameIdx];
      if (notesIdx >= 0 && row[notesIdx]) payload.notes = row[notesIdx];
      const external_id = `csv_import_${workspaceId}_${i}_${Date.now()}`;
      try {
        const r = await fetch("/api/connectors/events/ingest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            workspace_id: workspaceId,
            channel: "csv_import",
            external_id,
            payload: { ...payload, list_purpose: listPurpose },
            domain_hints: { list_purpose: listPurpose },
          }),
        });
        const json = await r.json();
        if (json.ok) {
          if (json.duplicate) duplicates++;
          else ingested++;
        }
      } catch {
        // skip row
      }
    }
    setResult({ ingested, duplicates });
    track("contact_imported", { count: ingested, source: "csv" });
    setImporting(false);
  };

  if (!workspaceId) {
    return (
      <Shell>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>{t("importPage.selectWorkspace")}</p>
      </Shell>
    );
  }

  const success = result !== null;

  return (
    <Shell>
      <TrialGraceEndedBanner />
      <DashboardExecutionStateBanner />
      {!success ? (
        <div className="space-y-8">
          <AuthorityHeader
            label={t("layout.navLabels.import")}
            title={t("importPage.title")}
          />
          <p className="text-sm" style={{ color: "var(--text-muted)", lineHeight: 1.6 }}>
            {t("importPage.hint")}
          </p>
          <div>
            <label className="block text-[13px] uppercase tracking-wide mb-2" style={{ color: "var(--text-muted)" }}>{t("importPage.purposeLabel")}</label>
            <select
              value={listPurpose}
              onChange={(e) => setListPurpose(e.target.value)}
              className="w-full px-4 py-3 rounded-[12px] border focus-ring"
              style={{ background: "var(--surface-card)", borderColor: "var(--border)", color: "var(--text-primary)" }}
            >
              {purposeOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[13px] uppercase tracking-wide mb-2" style={{ color: "var(--text-muted)" }}>{t("importPage.csvFileLabel")}</label>
            <input
              type="file"
              accept=".csv"
              onChange={onFileChange}
              className="block w-full text-sm"
              style={{ color: "var(--text-primary)" }}
            />
          </div>
          {headers.length > 0 && (
            <>
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                {t("importPage.rowsDetected", { count: rows.length })}
              </p>
              <button
                type="button"
                onClick={doImport}
                disabled={importing}
                className="btn-primary"
              >
                {importing ? t("importPage.importing") : t("importPage.confirm")}
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-8">
          <p className="text-lg" style={{ color: "var(--text-primary)" }}>
            {t("importPage.ingestionRecorded")}
          </p>
          <p className="text-sm" style={{ color: "var(--text-muted)", lineHeight: 1.6 }}>
            {t("importPage.executionFollowPurpose")}
          </p>
          <p className="text-sm" style={{ color: "var(--text-muted)", lineHeight: 1.6 }}>
            {t("importPage.conversationsGovernance")}
          </p>
          <Link href="/dashboard/start" className="btn-primary">
            {t("importPage.returnToStart")}
          </Link>
        </div>
      )}
    </Shell>
  );
}
