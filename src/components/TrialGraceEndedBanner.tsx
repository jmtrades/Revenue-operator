"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useWorkspace } from "@/components/WorkspaceContext";

export function TrialGraceEndedBanner() {
  const { workspaceId } = useWorkspace();
  const t = useTranslations("banners.trial");
  const [workspaceStatus, setWorkspaceStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!workspaceId) return;

    fetch(`/api/overview?workspace_id=${encodeURIComponent(workspaceId)}`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const s = d?.workspace_status;
        if (typeof s === "string") setWorkspaceStatus(s);
      })
      .catch(() => {});
  }, [workspaceId]);

  if (!workspaceId || workspaceStatus !== "grace") return null;

  return (
    <section className="mb-4 border-b pb-2" style={{ borderColor: "var(--border)" }}>
      <p className="text-sm" style={{ color: "var(--text-primary)", lineHeight: 1.6 }}>
        {t("trialGraceEnded")}{" "}
        <Link href="/app/settings/billing" className="underline" style={{ color: "var(--text-secondary)" }}>
          {t("trialUpgradeToContinue")}
        </Link>
      </p>
    </section>
  );
}

