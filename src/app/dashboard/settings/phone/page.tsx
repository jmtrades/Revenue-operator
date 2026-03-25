"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  Phone,
  Plus,
  Star,
  Trash2,
  Edit3,
  X,
  CheckCircle2,
  Circle,
  Globe,
  Clock,
} from "lucide-react";
import { useWorkspace } from "@/components/WorkspaceContext";
import { PageHeader, EmptyState } from "@/components/ui";

interface PhoneNumber {
  id: string;
  number: string;
  label: string;
  status: "active" | "inactive";
  isDefault: boolean;
  monthlyCost: number;
  provisionedAt: string;
  fallbackNumber: string;
}

const DEMO_NUMBERS: PhoneNumber[] = [
  {
    id: "pn_1",
    number: "+1 (480) 555-0100",
    label: "Main Business Line",
    status: "active",
    isDefault: true,
    monthlyCost: 3,
    provisionedAt: "2026-01-15",
    fallbackNumber: "+1 (480) 555-9999",
  },
  {
    id: "pn_2",
    number: "+1 (602) 555-0200",
    label: "After Hours",
    status: "active",
    isDefault: false,
    monthlyCost: 3,
    provisionedAt: "2026-02-01",
    fallbackNumber: "",
  },
  {
    id: "pn_3",
    number: "+1 (512) 555-0300",
    label: "Marketing Campaign",
    status: "inactive",
    isDefault: false,
    monthlyCost: 3,
    provisionedAt: "2026-02-20",
    fallbackNumber: "",
  },
];

export default function SettingsPhonePage() {
  const _t = useTranslations("dashboard");
  const { workspaceId } = useWorkspace();
  const [numbers, setNumbers] = useState<PhoneNumber[]>(DEMO_NUMBERS);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newAreaCode, setNewAreaCode] = useState("");
  const [provisioning, setProvisioning] = useState(false);

  const handleSetDefault = useCallback((id: string) => {
    setNumbers((prev) =>
      prev.map((n) => ({ ...n, isDefault: n.id === id }))
    );
  }, []);

  const handleToggleStatus = useCallback((id: string) => {
    setNumbers((prev) =>
      prev.map((n) =>
        n.id === id ? { ...n, status: n.status === "active" ? "inactive" : "active" } : n
      )
    );
  }, []);

  const handleRemove = useCallback((id: string) => {
    setNumbers((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const handleProvision = useCallback(() => {
    setProvisioning(true);
    // Simulate provisioning delay
    const timer = setTimeout(() => {
      const area = newAreaCode.trim() || "480";
      const newNum: PhoneNumber = {
        id: `pn_${Date.now()}`,
        number: `+1 (${area}) 555-${String(Math.floor(1000 + Math.random() * 9000))}`,
        label: newLabel.trim() || "New Number",
        status: "active",
        isDefault: false,
        monthlyCost: 3,
        provisionedAt: new Date().toISOString().split("T")[0],
        fallbackNumber: "",
      };
      setNumbers((prev) => [...prev, newNum]);
      setNewLabel("");
      setNewAreaCode("");
      setShowAddModal(false);
      setProvisioning(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, [newLabel, newAreaCode]);

  const totalMonthlyCost = numbers
    .filter((n) => n.status === "active")
    .reduce((s, n) => s + n.monthlyCost, 0);

  if (!workspaceId) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <PageHeader title="Phone Numbers" subtitle="Manage your business phone numbers." />
        <EmptyState icon="pulse" title="Select a workspace" subtitle="Phone numbers will appear here." />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Phone Numbers</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            Manage your Recall Touch phone numbers. Monthly cost:{" "}
            <span className="font-medium text-emerald-400">${totalMonthlyCost}/mo</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="px-2 py-0.5 rounded-full border border-amber-500/40 bg-amber-500/10 text-amber-300 text-xs">
            Sample data
          </span>
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--bg-surface)] text-[var(--text-primary)] text-sm font-semibold px-4 py-2 hover:bg-[var(--bg-inset)] transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Number
          </button>
        </div>
      </div>

      {/* Phone numbers list */}
      {numbers.length === 0 ? (
        <EmptyState
          icon="phone"
          title="No phone numbers yet"
          subtitle="Add a phone number to start receiving calls with your AI agent."
        />
      ) : (
        <div className="space-y-3 mb-8">
          {numbers.map((num) => (
            <div
              key={num.id}
              className="rounded-xl border p-5 transition-colors hover:border-[var(--border-default)]"
              style={{ borderColor: "var(--border-default)", background: "var(--bg-surface)" }}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      num.status === "active" ? "bg-emerald-500/10" : "bg-[var(--bg-inset)]"
                    }`}
                  >
                    <Phone className={`w-5 h-5 ${num.status === "active" ? "text-emerald-400" : "text-[var(--text-tertiary)]"}`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-base font-semibold font-mono" style={{ color: "var(--text-primary)" }}>
                        {num.number}
                      </p>
                      {num.isDefault && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-medium">
                          <Star className="w-2.5 h-2.5" />
                          Default
                        </span>
                      )}
                      <span
                        className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] ${
                          num.status === "active"
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                            : "bg-[var(--bg-inset)] text-[var(--text-tertiary)] border-[var(--border-default)]"
                        }`}
                      >
                        {num.status === "active" ? (
                          <CheckCircle2 className="w-2.5 h-2.5" />
                        ) : (
                          <Circle className="w-2.5 h-2.5" />
                        )}
                        {num.status === "active" ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                      {num.label}
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-xs" style={{ color: "var(--text-tertiary)" }}>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Provisioned {new Date(num.provisionedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </span>
                      <span>${num.monthlyCost}/mo</span>
                      {num.fallbackNumber && (
                        <span className="flex items-center gap-1">
                          <Globe className="w-3 h-3" />
                          Fallback: {num.fallbackNumber}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {!num.isDefault && num.status === "active" && (
                    <button
                      type="button"
                      onClick={() => handleSetDefault(num.id)}
                      className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-default)] px-2.5 py-1.5 text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-inset)] transition-colors"
                    >
                      <Star className="w-3 h-3" />
                      Set Default
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleToggleStatus(num.id)}
                    className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-default)] px-2.5 py-1.5 text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-inset)] transition-colors"
                  >
                    {num.status === "active" ? "Deactivate" : "Activate"}
                  </button>
                  {!num.isDefault && (
                    <button
                      type="button"
                      onClick={() => handleRemove(num.id)}
                      className="inline-flex items-center gap-1 rounded-lg border border-red-500/30 px-2.5 py-1.5 text-xs text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Call routing link */}
      <div
        className="rounded-xl border p-5"
        style={{ borderColor: "var(--border-default)", background: "var(--bg-surface)" }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
              Call Routing Rules
            </h3>
            <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
              Configure business hours, after-hours behavior, and emergency escalation.
            </p>
          </div>
          <Link
            href="/dashboard/settings/call-rules"
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-default)] px-3 py-1.5 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-inset)] transition-colors"
          >
            <Edit3 className="w-4 h-4" />
            Configure
          </Link>
        </div>
      </div>

      {/* Add number modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div
            className="w-full max-w-md rounded-2xl border p-6"
            style={{ borderColor: "var(--border-default)", background: "var(--bg-surface)" }}
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
                Provision New Number
              </h3>
              <button type="button" onClick={() => setShowAddModal(false)} className="text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <label className="block">
                <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Label</span>
                <input
                  type="text"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-base)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  placeholder="e.g., After Hours Line"
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                  Preferred Area Code (optional)
                </span>
                <input
                  type="text"
                  value={newAreaCode}
                  onChange={(e) => setNewAreaCode(e.target.value.replace(/\D/g, "").slice(0, 3))}
                  className="mt-1.5 w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-base)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  placeholder="480"
                  maxLength={3}
                />
              </label>

              <div
                className="rounded-lg border p-3"
                style={{ borderColor: "var(--border-default)", background: "rgba(34,197,94,0.03)" }}
              >
                <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                  New numbers cost <span className="font-medium text-emerald-400">$5/month</span> with a one-time $2 setup fee.
                  Your AI agent will be assigned automatically.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 mt-6">
              <button
                type="button"
                onClick={handleProvision}
                disabled={provisioning}
                className="flex-1 rounded-xl bg-emerald-500 text-black font-semibold py-2.5 text-sm hover:bg-emerald-400 transition-colors disabled:opacity-60"
              >
                {provisioning ? "Provisioning..." : "Provision Number"}
              </button>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="rounded-xl border border-[var(--border-default)] px-4 py-2.5 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-inset)] transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
