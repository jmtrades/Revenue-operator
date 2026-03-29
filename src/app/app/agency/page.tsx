"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Building2, Plus, Trash2, Eye } from "lucide-react";

interface SubAccount {
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

interface Analytics {
  total_sub_accounts: number;
  active_sub_accounts: number;
  total_calls: number;
  total_leads: number;
  total_revenue: number;
  mrr: number;
  usage_by_account: Array<{
    id: string;
    name: string;
    calls: number;
    leads: number;
    revenue: number;
    status: string;
  }>;
}

export default function AgencyPage() {
  const router = useRouter();
  const t = useTranslations("agency");
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [subAccounts, setSubAccounts] = useState<SubAccount[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    owner_email: "",
    plan: "standard",
  });
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [analyticsRes, subAccountsRes] = await Promise.all([
          fetch("/api/white-label/analytics", { credentials: "include" }),
          fetch("/api/white-label/sub-accounts", { credentials: "include" }),
        ]);

        if (!analyticsRes.ok || !subAccountsRes.ok) {
          throw new Error("Failed to load data");
        }

        const analyticsData = await analyticsRes.json();
        const subAccountsData = await subAccountsRes.json();

        setAnalytics(analyticsData.analytics);
        setSubAccounts(subAccountsData.sub_accounts);
      } catch (err) {
        toast.error("Failed to load agency dashboard");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const handleCreateSubAccount = async () => {
    if (!formData.name || !formData.owner_email) {
      toast.error("Please fill in all fields");
      return;
    }

    setCreating(true);
    try {
      const res = await fetch("/api/white-label/sub-accounts", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          owner_email: formData.owner_email,
          plan: formData.plan,
        }),
      });

      if (!res.ok) throw new Error("Failed to create sub-account");

      const data = await res.json();
      setSubAccounts([data.sub_account, ...subAccounts]);
      setFormData({ name: "", owner_email: "", plan: "standard" });
      setShowCreateModal(false);
      toast.success("Sub-account created successfully");
    } catch (err) {
      toast.error("Failed to create sub-account");
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteSubAccount = async (subAccountId: string) => {
    if (!confirm("Are you sure you want to deactivate this sub-account?")) return;

    setDeleting(subAccountId);
    try {
      const res = await fetch(`/api/white-label/sub-accounts/${subAccountId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!res.ok) throw new Error("Failed to delete sub-account");

      setSubAccounts(subAccounts.filter((s) => s.id !== subAccountId));
      toast.success("Sub-account deactivated");
    } catch (err) {
      toast.error("Failed to deactivate sub-account");
    } finally {
      setDeleting(null);
    }
  };

  if (loading) {
    return (
      <div className="p-6 md:p-8 max-w-7xl mx-auto">
        <div className="skeleton-shimmer">
          <div className="h-8 w-64 bg-[var(--bg-inset)] rounded mb-8" />
          <div className="grid grid-cols-4 gap-4 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-[var(--bg-inset)] rounded" />
            ))}
          </div>
          <div className="h-96 bg-[var(--bg-inset)] rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-[-0.025em] text-[var(--text-primary)]">{t("dashboard.title", { defaultValue: "Reseller Dashboard" })}</h1>
          <p className="text-[13px] text-[var(--text-secondary)] mt-1.5 leading-relaxed">{t("dashboard.subtitle", { defaultValue: "Manage your sub-accounts and track performance" })}</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="mt-4 md:mt-0 bg-[var(--accent-primary)] text-white font-semibold py-3 px-6 rounded-lg hover:opacity-90 transition-colors flex items-center gap-2 justify-center"
        >
          <Plus className="h-5 w-5" />
          {t("createButton", { defaultValue: "Create Sub-Account" })}
        </button>
      </div>

      {/* Stats Cards */}
      {analytics && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-6">
            <p className="text-xs text-[var(--text-tertiary)] font-medium">{t("stats.subAccounts", { defaultValue: "Total Sub-Accounts" })}</p>
            <p className="text-2xl font-bold text-[var(--text-primary)] mt-2">{analytics.total_sub_accounts}</p>
            <p className="text-xs text-[var(--text-secondary)] mt-2">
              {analytics.active_sub_accounts} {t("stats.active", { defaultValue: "active" })}
            </p>
          </div>

          <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-6">
            <p className="text-xs text-[var(--text-tertiary)] font-medium">{t("stats.calls", { defaultValue: "Total Calls" })}</p>
            <p className="text-2xl font-bold text-[var(--text-primary)] mt-2">{analytics.total_calls.toLocaleString()}</p>
            <p className="text-xs text-[var(--text-secondary)] mt-2">{t("stats.thisMonth", { defaultValue: "This month" })}</p>
          </div>

          <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-6">
            <p className="text-xs text-[var(--text-tertiary)] font-medium">{t("stats.leads", { defaultValue: "Total Leads" })}</p>
            <p className="text-2xl font-bold text-[var(--text-primary)] mt-2">{analytics.total_leads.toLocaleString()}</p>
            <p className="text-xs text-[var(--text-secondary)] mt-2">{t("stats.thisMonth", { defaultValue: "This month" })}</p>
          </div>

          <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-6">
            <p className="text-xs text-[var(--text-tertiary)] font-medium">{t("stats.revenue", { defaultValue: "Monthly Revenue" })}</p>
            <p className="text-2xl font-bold text-[var(--text-primary)] mt-2">${analytics.mrr.toFixed(2)}</p>
            <p className="text-xs text-[var(--text-secondary)] mt-2">{t("stats.mrr", { defaultValue: "MRR" })}</p>
          </div>
        </div>
      )}

      {/* Sub-Accounts Table */}
      <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border-default)] bg-[var(--bg-inset)]">
                <th className="text-left px-6 py-4 font-semibold text-[var(--text-primary)]">Name</th>
                <th className="text-left px-6 py-4 font-semibold text-[var(--text-primary)]">Plan</th>
                <th className="text-right px-6 py-4 font-semibold text-[var(--text-primary)]">Calls</th>
                <th className="text-right px-6 py-4 font-semibold text-[var(--text-primary)]">Leads</th>
                <th className="text-right px-6 py-4 font-semibold text-[var(--text-primary)]">Revenue</th>
                <th className="text-left px-6 py-4 font-semibold text-[var(--text-primary)]">Status</th>
                <th className="text-right px-6 py-4 font-semibold text-[var(--text-primary)]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {subAccounts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Building2 className="h-8 w-8 text-[var(--text-tertiary)]" />
                      <p className="text-[var(--text-secondary)]">{t("empty.message", { defaultValue: "No sub-accounts yet" })}</p>
                      <button
                        onClick={() => setShowCreateModal(true)}
                        className="mt-4 text-sm text-[var(--accent-primary)] font-medium hover:underline"
                      >
                        {t("empty.cta", { defaultValue: "Create your first sub-account" })}
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                subAccounts.map((account) => {
                  const accountAnalytics = analytics?.usage_by_account.find((a) => a.id === account.child_workspace_id);
                  return (
                    <tr key={account.id} className="border-b border-[var(--border-default)] hover:bg-[var(--bg-inset)] transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-medium text-[var(--text-primary)]">{account.child_workspace?.name}</p>
                        <p className="text-xs text-[var(--text-tertiary)] break-all">{account.child_workspace_id}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex px-3 py-1 rounded-full text-xs font-medium bg-[var(--bg-inset)] text-[var(--text-primary)]">
                          {account.plan}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right text-[var(--text-primary)] font-medium">
                        {accountAnalytics?.calls || 0}
                      </td>
                      <td className="px-6 py-4 text-right text-[var(--text-primary)] font-medium">
                        {accountAnalytics?.leads || 0}
                      </td>
                      <td className="px-6 py-4 text-right text-[var(--text-primary)] font-medium">
                        ${accountAnalytics?.revenue.toFixed(2) || "0.00"}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${
                            account.status === "active"
                              ? "bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]"
                              : "bg-[var(--bg-inset)] text-[var(--text-secondary)]"
                          }`}
                        >
                          {account.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => router.push(`/app/agency/${account.id}`)}
                            className="p-2 hover:bg-[var(--bg-hover)] rounded transition-colors text-[var(--text-secondary)]"
                            title="View details"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteSubAccount(account.id)}
                            disabled={deleting === account.id}
                            className="p-2 hover:bg-[var(--accent-danger)]/10 rounded transition-colors text-[var(--accent-danger)] disabled:opacity-50"
                            title="Deactivate"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border-default)] p-6 max-w-md w-full mx-4">
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">{t("modal.title", { defaultValue: "Create Sub-Account" })}</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                  {t("modal.nameLabel", { defaultValue: "Sub-Account Name" })}
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Acme Sales"
                  className="w-full px-4 py-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-inset)] text-[var(--text-primary)] placeholder-[var(--text-tertiary)]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                  {t("modal.emailLabel", { defaultValue: "Owner Email" })}
                </label>
                <input
                  type="email"
                  value={formData.owner_email}
                  onChange={(e) => setFormData({ ...formData, owner_email: e.target.value })}
                  placeholder="owner@example.com"
                  className="w-full px-4 py-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-inset)] text-[var(--text-primary)] placeholder-[var(--text-tertiary)]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">{t("modal.planLabel", { defaultValue: "Plan" })}</label>
                <select
                  value={formData.plan}
                  onChange={(e) => setFormData({ ...formData, plan: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-inset)] text-[var(--text-primary)]"
                >
                  <option value="starter">{t("modal.plans.starter", { defaultValue: "Starter" })}</option>
                  <option value="standard">{t("modal.plans.standard", { defaultValue: "Standard" })}</option>
                  <option value="professional">{t("modal.plans.professional", { defaultValue: "Professional" })}</option>
                  <option value="enterprise">{t("modal.plans.enterprise", { defaultValue: "Enterprise" })}</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 rounded-lg border border-[var(--border-default)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
                >
                  {t("modal.cancel", { defaultValue: "Cancel" })}
                </button>
                <button
                  onClick={handleCreateSubAccount}
                  disabled={creating}
                  className="flex-1 px-4 py-2 rounded-lg bg-[var(--accent-primary)] text-white font-medium hover:opacity-90 transition-colors disabled:opacity-50"
                >
                  {creating ? t("modal.creating", { defaultValue: "Creating..." }) : t("modal.create", { defaultValue: "Create" })}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

