"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { ArrowLeft, Building2, Phone, Zap } from "lucide-react";
import Link from "next/link";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";

interface SubAccountDetail {
  id: string;
  child_workspace_id: string;
  plan: string;
  status: string;
  monthly_calls_limit: number | null;
  monthly_leads_limit: number | null;
  created_at: string;
  updated_at: string;
  child_workspace?: {
    id: string;
    name: string;
    created_at: string;
  };
}

interface AccountMetrics {
  calls_used: number;
  leads_used: number;
  monthly_revenue: number;
  mrr: number;
}

export default function AgencySubAccountDetailPage() {
  const t = useTranslations("agency");
  const router = useRouter();
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [account, setAccount] = useState<SubAccountDetail | null>(null);
  const [metrics, setMetrics] = useState<AccountMetrics | null>(null);

  useEffect(() => {
    if (!id) return;

    const loadData = async () => {
      try {
        const res = await fetch(`/api/white-label/sub-accounts/${id}`, {
          credentials: "include",
        });

        if (!res.ok) {
          throw new Error(res.status === 404 ? "Account not found" : "Failed to load account");
        }

        const data = await res.json();
        setAccount(data.sub_account);

        // Try to load metrics if available
        try {
          const metricsRes = await fetch(`/api/white-label/sub-accounts/${id}/metrics`, {
            credentials: "include",
          });
          if (metricsRes.ok) {
            const metricsData = await metricsRes.json();
            setMetrics(metricsData.metrics);
          }
        } catch {
          // Metrics are optional
        }

        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load account");
        toast.error("Failed to load account details");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [id]);

  if (loading) {
    return (
      <div className="p-6 md:p-8 max-w-2xl mx-auto space-y-6">
        <div className="h-4 w-32 bg-[var(--bg-inset)] rounded skeleton-shimmer" />
        <div className="h-8 w-64 bg-[var(--bg-inset)] rounded skeleton-shimmer" />
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 bg-[var(--bg-inset)] rounded-xl skeleton-shimmer" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !account) {
    return (
      <div className="p-6 md:p-8 max-w-2xl mx-auto">
        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 text-sm text-[var(--text-tertiary)] hover:text-[var(--text-primary)] mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          {t("backToAgency", { defaultValue: "Back to Agency" })}
        </button>
        <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-6">
          <p className="text-sm text-[var(--text-tertiary)]">
            {error ?? t("accountNotFound", { defaultValue: "Account not found" })}
          </p>
        </div>
      </div>
    );
  }

  const accountName = account.child_workspace?.name || "Unknown Account";
  const statusColor =
    account.status === "active"
      ? "bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]"
      : "bg-[var(--bg-inset)] text-[var(--text-secondary)]";

  return (
    <div className="p-6 md:p-8 max-w-2xl mx-auto">
      <Breadcrumbs
        items={[
          { label: t("dashboard.title", { defaultValue: "Reseller Dashboard" }), href: "/app/agency" },
          { label: accountName },
        ]}
      />

      {/* Header */}
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-[-0.025em] text-[var(--text-primary)] flex items-center gap-2">
            <Building2 className="w-6 h-6 text-[var(--text-secondary)]" />
            {accountName}
          </h1>
          <p className="text-[13px] text-[var(--text-secondary)] mt-1.5 leading-relaxed">
            {t("detailPage", { defaultValue: "Manage sub-account settings and view metrics" })}
          </p>
        </div>
        <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${statusColor}`}>
          {account.status}
        </span>
      </header>

      {/* Account Info Cards */}
      <div className="space-y-4 mb-8">
        {/* Plan Card */}
        <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-5">
          <p className="text-xs text-[var(--text-tertiary)] font-medium mb-2">
            {t("plan", { defaultValue: "Plan" })}
          </p>
          <p className="text-lg font-semibold text-[var(--text-primary)] capitalize">{account.plan}</p>
          <p className="text-xs text-[var(--text-secondary)] mt-2">
            {t("planDescription", { defaultValue: "Current subscription tier" })}
          </p>
        </div>

        {/* Workspace ID Card */}
        <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-5">
          <p className="text-xs text-[var(--text-tertiary)] font-medium mb-2">
            {t("workspaceId", { defaultValue: "Workspace ID" })}
          </p>
          <p className="text-sm font-mono text-[var(--text-primary)] break-all">{account.child_workspace_id}</p>
          <p className="text-xs text-[var(--text-secondary)] mt-2">
            {t("workspaceIdDescription", { defaultValue: "Unique identifier for this workspace" })}
          </p>
        </div>

        {/* Calls Limit Card */}
        {account.monthly_calls_limit !== null && (
          <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-5">
            <div className="flex items-center gap-2 mb-2">
              <Phone className="w-4 h-4 text-[var(--text-tertiary)]" />
              <p className="text-xs text-[var(--text-tertiary)] font-medium">
                {t("monthlyCallsLimit", { defaultValue: "Monthly Calls Limit" })}
              </p>
            </div>
            <p className="text-lg font-semibold text-[var(--text-primary)]">
              {account.monthly_calls_limit?.toLocaleString() || "Unlimited"}
            </p>
            {metrics && (
              <div className="mt-2">
                <div className="flex justify-between items-center text-xs text-[var(--text-secondary)] mb-1">
                  <span>{t("used", { defaultValue: "Used" })}</span>
                  <span>{metrics.calls_used?.toLocaleString() || 0}</span>
                </div>
                <div className="w-full h-2 bg-[var(--border-default)] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[var(--accent-primary)]"
                    style={{
                      width: account.monthly_calls_limit
                        ? `${Math.min(100, (metrics.calls_used / account.monthly_calls_limit) * 100)}%`
                        : "0%",
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Leads Limit Card */}
        {account.monthly_leads_limit !== null && (
          <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-5">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-[var(--text-tertiary)]" />
              <p className="text-xs text-[var(--text-tertiary)] font-medium">
                {t("monthlyLeadsLimit", { defaultValue: "Monthly Leads Limit" })}
              </p>
            </div>
            <p className="text-lg font-semibold text-[var(--text-primary)]">
              {account.monthly_leads_limit?.toLocaleString() || "Unlimited"}
            </p>
            {metrics && (
              <div className="mt-2">
                <div className="flex justify-between items-center text-xs text-[var(--text-secondary)] mb-1">
                  <span>{t("used", { defaultValue: "Used" })}</span>
                  <span>{metrics.leads_used?.toLocaleString() || 0}</span>
                </div>
                <div className="w-full h-2 bg-[var(--border-default)] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[var(--accent-primary)]"
                    style={{
                      width: account.monthly_leads_limit
                        ? `${Math.min(100, (metrics.leads_used / account.monthly_leads_limit) * 100)}%`
                        : "0%",
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Revenue Card */}
        {metrics && (
          <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-5">
            <p className="text-xs text-[var(--text-tertiary)] font-medium mb-2">
              {t("monthlyRevenue", { defaultValue: "Monthly Revenue" })}
            </p>
            <p className="text-lg font-semibold text-[var(--text-primary)]">
              ${metrics.mrr?.toFixed(2) || "0.00"}
            </p>
            <p className="text-xs text-[var(--text-secondary)] mt-2">
              {t("mrrDescription", { defaultValue: "Monthly recurring revenue" })}
            </p>
          </div>
        )}

        {/* Created & Updated Card */}
        <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-5">
          <p className="text-xs text-[var(--text-tertiary)] font-medium mb-3">
            {t("timestamps", { defaultValue: "Timeline" })}
          </p>
          <div className="space-y-2 text-xs text-[var(--text-secondary)]">
            <div>
              <span className="text-[var(--text-tertiary)]">{t("created", { defaultValue: "Created:" })}</span>
              <p className="text-[var(--text-primary)] font-mono">
                {new Date(account.created_at).toLocaleString()}
              </p>
            </div>
            <div>
              <span className="text-[var(--text-tertiary)]">{t("updated", { defaultValue: "Updated:" })}</span>
              <p className="text-[var(--text-primary)] font-mono">
                {new Date(account.updated_at).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Back Link */}
      <Link
        href="/app/agency"
        className="inline-flex items-center gap-2 text-sm text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        {t("backToAgency", { defaultValue: "Back to Agency Dashboard" })}
      </Link>
    </div>
  );
}
