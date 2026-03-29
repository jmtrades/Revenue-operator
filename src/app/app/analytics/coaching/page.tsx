"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";

export default function CoachingAnalyticsPage() {
  const t = useTranslations("common");

  useEffect(() => {
    document.title = t("coaching.pageTitle", { defaultValue: "Coaching Analytics — Recall Touch" });
    return () => { document.title = ""; };
  }, [t]);

  return (
    <div className="space-y-6 px-1">
      <Breadcrumbs
        items={[
          { label: "Analytics", href: "/app/analytics" },
          { label: "Coaching" },
        ]}
      />

      <div>
        <h1
          className="text-2xl font-bold tracking-tight"
          style={{ color: "var(--text-primary)" }}
        >
          Coaching Analytics
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
          AI coaching insights and agent performance reports.
        </p>
      </div>

      <div
        className="rounded-xl border p-12 text-center"
        style={{
          borderColor: "var(--border-default)",
          background: "var(--bg-surface)",
        }}
      >
        <div className="mx-auto max-w-md space-y-3">
          <p
            className="text-lg font-medium"
            style={{ color: "var(--text-primary)" }}
          >
            Coaching reports will appear here
          </p>
          <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
            After your AI agent handles calls, coaching analysis will generate
            insights on tone, objection handling, and conversion effectiveness.
          </p>
        </div>
      </div>
    </div>
  );
}
