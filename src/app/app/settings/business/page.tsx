"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { toast } from "sonner";
import { TIMEZONES_BY_REGION } from "@/lib/constants";
import { INDUSTRY_OPTIONS } from "@/lib/constants/industries";
import {
  fetchWorkspaceMeCached,
  getWorkspaceMeSnapshotSync,
  invalidateWorkspaceMeCache,
} from "@/lib/client/workspace-me";

function getInitialTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "America/Los_Angeles";
  }
}

export default function AppSettingsBusinessPage() {
  const workspaceSnapshot = getWorkspaceMeSnapshotSync() as
    | { name?: string; address?: string; website?: string; industry?: string }
    | null;
  const hasSnapshot =
    Boolean(workspaceSnapshot?.name) ||
    Boolean(workspaceSnapshot?.address) ||
    Boolean(workspaceSnapshot?.website) ||
    Boolean(workspaceSnapshot?.industry);
  const [loading, setLoading] = useState(!hasSnapshot);
  const [name, setName] = useState(workspaceSnapshot?.name ?? "");
  const [address, setAddress] = useState(workspaceSnapshot?.address ?? "");
  const [website, setWebsite] = useState(workspaceSnapshot?.website ?? "");
  const [timezone, setTimezone] = useState(getInitialTimezone);
  const [industry, setIndustry] = useState(
    workspaceSnapshot?.industry &&
      INDUSTRY_OPTIONS.some((item) => item.id === workspaceSnapshot.industry)
      ? workspaceSnapshot.industry
      : "other",
  );
  const [inlineToast, setInlineToast] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchWorkspaceMeCached()
      .then((data: { name?: string; address?: string; website?: string; industry?: string } | null) => {
        setName(data?.name ?? "");
        setAddress(data?.address ?? "");
        setWebsite(data?.website ?? "");
        setIndustry(data?.industry && INDUSTRY_OPTIONS.some((item) => item.id === data.industry) ? data.industry : "other");
      })
      .finally(() => setLoading(false));
    fetch("/api/workspace/timezone", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { timezone?: string } | null) => {
        if (data?.timezone) setTimezone(data.timezone);
      })
      .catch(() => {});
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const [resMe, _resTz] = await Promise.all([
        fetch("/api/workspace/me", {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, address, website, industry }),
        }),
        fetch("/api/workspace/timezone", {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ timezone }),
        }),
      ]);
      if (!resMe.ok) throw new Error("save_failed");
      invalidateWorkspaceMeCache();
      setInlineToast("Settings saved");
      toast.success("Settings saved");
    } catch {
      setInlineToast("Could not save settings");
      toast.error("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
    setTimeout(() => setInlineToast(null), 3000);
  };

  const handleDeleteWorkspace = async () => {
    const expectedName = (workspaceSnapshot?.name ?? name ?? "").trim();
    if (deleteConfirmName.trim() !== expectedName) {
      toast.error("Workspace name does not match. Type it exactly to confirm.");
      return;
    }
    setDeleting(true);
    try {
      const res = await fetch("/api/workspace/delete", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: deleteConfirmName }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? "Failed to delete");
      }
      toast.success("Workspace deleted. Redirecting…");
      window.location.href = "/";
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not delete workspace.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="max-w-[600px] mx-auto p-4 md:p-6">
      <Breadcrumbs items={[{ label: "Settings", href: "/app/settings" }, { label: "Business" }]} />
      <h1 className="text-lg font-semibold text-white mb-2">Business</h1>
      <p className="text-sm text-zinc-500 mb-6">Your business details help your AI answer calls accurately.</p>
      <div className="space-y-4 mb-6">
        <div>
          <label htmlFor="biz-name" className="block text-xs font-medium text-zinc-400 mb-1">Business name</label>
          <input id="biz-name" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Acme Plumbing" className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-white placeholder:text-zinc-600 text-sm focus:border-[var(--border-medium)] focus:ring-1 focus:ring-[var(--border-medium)] focus:outline-none" />
        </div>
        <div>
          <label htmlFor="biz-address" className="block text-xs font-medium text-zinc-400 mb-1">Address</label>
          <input id="biz-address" type="text" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="123 Main St, Portland, OR" className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-white placeholder:text-zinc-600 text-sm focus:border-[var(--border-medium)] focus:ring-1 focus:ring-[var(--border-medium)] focus:outline-none" />
        </div>
        <div>
          <label htmlFor="biz-website" className="block text-xs font-medium text-zinc-400 mb-1">Website</label>
          <input id="biz-website" type="url" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://yourbusiness.com" className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-white placeholder:text-zinc-600 text-sm focus:border-[var(--border-medium)] focus:ring-1 focus:ring-[var(--border-medium)] focus:outline-none" />
        </div>
        <div>
          <label htmlFor="biz-tz" className="block text-xs font-medium text-zinc-400 mb-1">Timezone</label>
          <select id="biz-tz" value={timezone} onChange={(e) => setTimezone(e.target.value)} className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-white text-sm focus:border-[var(--border-medium)] focus:outline-none">
            {TIMEZONES_BY_REGION.map(({ region, zones }) => (
              <optgroup key={region} label={region}>
                {zones.map((z) => (
                  <option key={z} value={z}>{z}</option>
                ))}
              </optgroup>
            ))}
          </select>
          <p className="mt-1 text-[11px] text-zinc-500">Used for scheduling and display. Hover on times for UTC.</p>
        </div>
        <div>
          <label htmlFor="biz-industry" className="block text-xs font-medium text-zinc-400 mb-1">Industry</label>
          <select id="biz-industry" value={industry} onChange={(e) => setIndustry(e.target.value)} className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-white text-sm focus:border-[var(--border-medium)] focus:outline-none">
            {INDUSTRY_OPTIONS.map((opt) => (
              <option key={opt.id} value={opt.id}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>
      <button type="button" disabled={loading || saving} onClick={handleSave} className="px-6 py-3 rounded-xl text-sm font-semibold bg-white text-black hover:bg-zinc-100 transition-colors disabled:opacity-60">
        {saving ? "Saving…" : "Save changes"}
      </button>

      <div className="mt-12 pt-8 border-t border-[var(--border-default)]">
        <h2 className="text-sm font-semibold text-[var(--text-danger)]">Danger Zone</h2>
        <p className="mt-1 text-xs text-zinc-500">Permanently delete this workspace and all its data. This cannot be undone.</p>
        <button type="button" onClick={() => setDeleteConfirmOpen(true)} className="mt-3 px-4 py-2 rounded-xl border border-[var(--accent-danger)]/50 text-sm font-medium text-[var(--accent-danger)] hover:bg-[var(--accent-danger)]/10 transition-colors">
          Delete workspace
        </button>
      </div>

      {deleteConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70" role="dialog" aria-modal="true" aria-labelledby="delete-dialog-title">
          <div className="w-full max-w-md rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-6 shadow-xl">
            <h3 id="delete-dialog-title" className="text-lg font-semibold text-white">Delete workspace?</h3>
            <p className="mt-2 text-sm text-zinc-400">This will permanently delete the workspace and all data. Type the workspace name to confirm.</p>
            <p className="mt-2 text-xs text-zinc-500">Workspace name: <strong className="text-zinc-300">{(workspaceSnapshot?.name ?? name ?? "").trim() || "My Workspace"}</strong></p>
            <input type="text" value={deleteConfirmName} onChange={(e) => setDeleteConfirmName(e.target.value)} placeholder="Type workspace name" className="mt-3 w-full px-4 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-white text-sm placeholder:text-zinc-500" />
            <div className="mt-4 flex gap-3 justify-end">
              <button type="button" onClick={() => { setDeleteConfirmOpen(false); setDeleteConfirmName(""); }} className="px-4 py-2 rounded-xl border border-zinc-600 text-zinc-300 text-sm hover:bg-zinc-800">Cancel</button>
              <button type="button" onClick={handleDeleteWorkspace} disabled={deleting} className="px-4 py-2 rounded-xl bg-[var(--accent-danger)] text-white text-sm font-medium hover:opacity-90 disabled:opacity-60">
                {deleting ? "Deleting…" : "Delete permanently"}
              </button>
            </div>
          </div>
        </div>
      )}

      {inlineToast && (
        <div className="fixed top-4 right-4 z-50 px-4 py-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border-medium)] shadow-lg text-sm text-zinc-200">
          {inlineToast}
        </div>
      )}

      <p className="mt-6"><Link href="/app/settings" className="text-sm text-zinc-400 hover:text-white transition-colors">← Settings</Link></p>
    </div>
  );
}
