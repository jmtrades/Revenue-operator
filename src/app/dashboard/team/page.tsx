"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useWorkspace } from "@/components/WorkspaceContext";
import { PageHeader, EmptyState } from "@/components/ui";
import { ListSkeleton } from "@/components/ui/ListSkeleton";
import { fetchWithFallback } from "@/lib/reliability/fetch-with-fallback";

interface Member {
  id: string;
  name: string;
  email: string;
  role: string;
  is_on_call: boolean;
}

export default function TeamPage() {
  const t = useTranslations("dashboard");
  const { workspaceId } = useWorkspace();
  const [team, setTeam] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!workspaceId) {
      setTeam([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    fetchWithFallback<{ team: Member[] }>(`/api/team?workspace_id=${encodeURIComponent(workspaceId)}`, { credentials: "include" })
      .then((r) => { if (r.data?.team) setTeam(r.data.team); })
      .finally(() => setLoading(false));
  }, [workspaceId]);

  if (!workspaceId) {
    return (
      <div className="p-8 max-w-4xl">
        <PageHeader title={t("pages.team.title")} subtitle={t("pages.team.subtitleShort")} />
        <EmptyState icon="watch" title={t("empty.selectContext")} />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl">
      <PageHeader title={t("pages.team.title")} subtitle={t("pages.team.subtitle")} />
      {loading ? (
        <ListSkeleton rows={4} />
      ) : team.length === 0 ? (
        <div className="rounded-lg border p-8 text-center" style={{ borderColor: "var(--border)" }}>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>{t("empty.noTeamYet")}</p>
        </div>
      ) : (
        <ul className="rounded-lg border overflow-hidden" style={{ borderColor: "var(--border)", background: "var(--surface-card)" }}>
          {team.map((m) => (
            <li key={m.id} className="border-b last:border-b-0 px-4 py-3" style={{ borderColor: "var(--border)" }}>
              <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{m.name}</p>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{m.email} · {m.role}{m.is_on_call ? " · On call" : ""}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
