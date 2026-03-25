"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useWorkspace } from "./WorkspaceContext";
import { useExecutionUxState, type ExecutionUxState } from "@/lib/execution-ux/state";

function ExecutionStateBannerBase({ state, context }: { state: ExecutionUxState | null; context: "main" | "onboard" }) {
  const t = useTranslations("banners.executionState");
  if (!state) return null;

  let headline: string;
  let nextLine: string;
  let href: string | null = null;

  if (state === "under_review") {
    headline = t("underReview");
    nextLine = t("underReviewNext");
    href = context === "onboard" ? "/onboard/governance" : "/dashboard/policies";
  } else if (state === "paused") {
    headline = t("paused");
    nextLine = t("pausedNext");
    href = "/dashboard/billing";
  } else {
    headline = t("active");
    nextLine = t("activeNext");
    href = null;
  }

  return (
    <section className="mb-4 border-b pb-2" style={{ borderColor: "var(--border)" }}>
      <p className="text-xs font-medium tracking-wide uppercase" style={{ color: "var(--text-muted)" }}>
        {headline}
      </p>
      {href ? (
        <p className="text-xs mt-1">
          <Link href={href} className="underline" style={{ color: "var(--text-secondary)" }}>
            {nextLine}
          </Link>
        </p>
      ) : (
        <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
          {nextLine}
        </p>
      )}
    </section>
  );
}

export function DashboardExecutionStateBanner() {
  const { workspaceId } = useWorkspace();
  const state = useExecutionUxState(workspaceId || null);
  return <ExecutionStateBannerBase state={state} context="main" />;
}

export function OnboardExecutionStateBanner() {
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const wsId = window.sessionStorage.getItem("onboard_workspace_id");
      setWorkspaceId(wsId);
    } catch {
      setWorkspaceId(null);
    }
  }, []);

  const state = useExecutionUxState(workspaceId);
  return <ExecutionStateBannerBase state={state} context="onboard" />;
}

