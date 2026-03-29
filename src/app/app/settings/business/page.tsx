"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { toast } from "sonner";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";
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
  const t = useTranslations("common");
  const tForms = useTranslations("forms.state");
  const tToast = useTranslations("toast");
  const tNav = useTranslations("nav");
  const tSettings = useTranslations("settings");
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
  const lastSavedRef = useRef({ name, address, website, timezone, industry });
  const isDirty =
    name !== lastSavedRef.current.name ||
    address !== lastSavedRef.current.address ||
    website !== lastSavedRef.current.website ||
    timezone !== lastSavedRef.current.timezone ||
    industry !== lastSavedRef.current.industry;
  useUnsavedChanges(isDirty);

  useEffect(() => {
    document.title = `${tSettings("business.pageTitle", { defaultValue: "Business Settings" })} — Recall Touch`;
  }, [tSettings]);

  useEffect(() => {
    fetchWorkspaceMeCached()
      .then((data: { name?: string; address?: string; website?: string; industry?: string } | null) => {
        const n = data?.name ?? "";
        const a = data?.address ?? "";
        const w = data?.website ?? "";
        const i = data?.industry && INDUSTRY_OPTIONS.some((item) => item.id === data.industry) ? data.industry : "other";
        setName(n);
        setAddress(a);
        setWebsite(w);
        setIndustry(i);
        lastSavedRef.current = { name: n, address: a, website: w, timezone: lastSavedRef.current.timezone, industry: i };
      })
      .finally(() => setLoading(false));
    fetch("/api/workspace/timezone", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { timezone?: string } | null) => {
        if (data?.timezone) {
          setTimezone(data.timezone);
          lastSavedRef.current = { ...lastSavedRef.current, timezone: data.timezone };
        }
      })
      .catch((err) => { /* silenced */ });
  }, []);

  const handleSave = async () => {
    if (saving) return;
    if (!name.trim()) {
      toast.error(tSettings("business.nameRequired"));
      return;
    }
    if (website.trim() && !/^https?:\/\/.+/.test(website.trim())) {
      toast.error(tSettings("business.invalidWebsite"));
      return;
    }
    setSaving(true);
    try {
      const [resMe, _resTz] = await Promise.all([
        fetch("/api/workspace/me", {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: name.trim(), address: address.trim(), website: website.trim(), industry }),
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
      lastSavedRef.current = { name, address, website, timezone, industry };
      setInlineToast(tToast("saved"));
      toast.success(tToast("saved"));
    } catch {
      setInlineToast(tToast("error.generic"));
      toast.error(tSettings("business.saveFailed"));
    } finally {
      setSaving(false);
    }
    setTimeout(() => setInlineToast(null), 3000);
  };

  const handleDeleteWorkspace = async () => {
    const expectedName = (workspaceSnapshot?.name ?? name ?? "").trim();
    if (deleteConfirmName.trim() !== expectedName) {
      toast.error(tSettings("business.nameNoMatch"));
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
      toast.success(tSettings("business.deleted"));
      window.location.href = "/";
    } catch (e) {
      toast.error(tSettings("business.deleteWorkspaceError"));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="max-w-[600px] mx-auto p-4 md:p-6">
      <Breadcrumbs items={[{ label: tNav("settings"), href: "/app/settings" }, { label: tSettings("business.label") }]} />
      <h1 className="text-lg font-bold tracking-[-0.025em] text-[var(--text-primary)] mb-2">{tSettings("businessPage.heading")}</h1>
      <p className="text-sm text-[var(--text-secondary)] mb-6">{tSettings("businessPage.description")}</p>
      <div className="space-y-4 mb-6">
        <div>
          <label htmlFor="biz-name" className="block text-xs font-medium text-[var(--text-tertiary)] mb-1">{tSettings("businessPage.nameLabel")}</label>
          <input id="biz-name" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder={tSettings("businessPage.namePlaceholder")} className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] text-sm focus:border-[var(--border-medium)] focus:ring-1 focus:ring-[var(--border-medium)] focus:outline-none" />
        </div>
        <div>
          <label htmlFor="biz-address" className="block text-xs font-medium text-[var(--text-tertiary)] mb-1">{tSettings("businessPage.addressLabel")}</label>
          <input id="biz-address" type="text" value={address} onChange={(e) => setAddress(e.target.value)} placeholder={tSettings("businessPage.addressPlaceholder")} className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] text-sm focus:border-[var(--border-medium)] focus:ring-1 focus:ring-[var(--border-medium)] focus:outline-none" />
        </div>
        <div>
          <label htmlFor="biz-website" className="block text-xs font-medium text-[var(--text-tertiary)] mb-1">{tSettings("businessPage.websiteLabel")}</label>
          <input id="biz-website" type="url" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder={tSettings("businessPage.websitePlaceholder")} className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] text-sm focus:border-[var(--border-medium)] focus:ring-1 focus:ring-[var(--border-medium)] focus:outline-none" />
        </div>
        <div>
          <label htmlFor="biz-tz" className="block text-xs font-medium text-[var(--text-tertiary)] mb-1">{tSettings("businessPage.timezoneLabel")}</label>
          <select id="biz-tz" value={timezone} onChange={(e) => setTimezone(e.target.value)} className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-[var(--text-primary)] text-sm focus:border-[var(--border-medium)] focus:outline-none">
            {TIMEZONES_BY_REGION.map(({ region, zones }) => (
              <optgroup key={region} label={region}>
                {zones.map((z) => (
                  <option key={z} value={z}>{z}</option>
                ))}
              </optgroup>
            ))}
          </select>
          <p className="mt-1 text-[11px] text-[var(--text-secondary)]">{tSettings("businessPage.timezoneHelp")}</p>
        </div>
        <div>
          <label htmlFor="biz-industry" className="block text-xs font-medium text-[var(--text-tertiary)] mb-1">{tSettings("businessPage.industryLabel")}</label>
          <select id="biz-industry" value={industry} onChange={(e) => setIndustry(e.target.value)} className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-[var(--text-primary)] text-sm focus:border-[var(--border-medium)] focus:outline-none">
            {INDUSTRY_OPTIONS.map((opt) => (
              <option key={opt.id} value={opt.id}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>
      <button type="button" disabled={loading || saving} onClick={handleSave} className="px-6 py-3 rounded-xl text-sm font-semibold bg-[var(--accent-primary)] text-[var(--text-on-accent)] hover:opacity-90 transition-colors disabled:opacity-60">
        {saving ? tForms("saving") : t("saveChanges")}
      </button>

      <div className="mt-12 pt-8 border-t border-[var(--border-default)]">
        <h2 className="text-sm font-semibold text-[var(--text-danger)]">{tSettings("businessPage.dangerTitle")}</h2>
        <p className="mt-1 text-xs text-[var(--text-secondary)]">{tSettings("businessPage.dangerBody")}</p>
        <button type="button" onClick={() => setDeleteConfirmOpen(true)} className="mt-3 px-4 py-2 rounded-xl border border-[var(--accent-danger)]/50 text-sm font-medium text-[var(--accent-danger)] hover:bg-[var(--accent-danger)]/10 transition-colors">
          {tSettings("businessPage.deleteWorkspace")}
        </button>
      </div>

      {deleteConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--overlay)]" role="dialog" aria-modal="true" aria-labelledby="delete-dialog-title">
          <div className="w-full max-w-md rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-6 shadow-xl">
            <h3 id="delete-dialog-title" className="text-lg font-semibold text-[var(--text-primary)]">{tSettings("businessPage.deleteWorkspaceTitle")}</h3>
            <p className="mt-2 text-sm text-[var(--text-tertiary)]">{tSettings("businessPage.deleteWorkspaceBody")}</p>
            <p className="mt-2 text-xs text-[var(--text-secondary)]">{tSettings("businessPage.workspaceNameLabel")} <strong className="text-[var(--text-secondary)]">{(workspaceSnapshot?.name ?? name ?? "").trim() || tSettings("businessPage.workspaceNameFallback")}</strong></p>
            <input type="text" value={deleteConfirmName} onChange={(e) => setDeleteConfirmName(e.target.value)} placeholder={tSettings("businessPage.confirmPlaceholder")} className="mt-3 w-full px-4 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-[var(--text-primary)] text-sm placeholder:text-[var(--text-secondary)]" />
            <div className="mt-4 flex gap-3 justify-end">
              <button type="button" onClick={() => { setDeleteConfirmOpen(false); setDeleteConfirmName(""); }} className="px-4 py-2 rounded-xl border border-[var(--border-default)] text-[var(--text-secondary)] text-sm hover:bg-[var(--bg-inset)]">{t("cancel")}</button>
              <button type="button" onClick={handleDeleteWorkspace} disabled={deleting} className="px-4 py-2 rounded-xl bg-[var(--accent-danger)] text-[var(--text-primary)] text-sm font-medium hover:opacity-90 disabled:opacity-60">
                {deleting ? tForms("deleting") : t("deletePermanently")}
              </button>
            </div>
          </div>
        </div>
      )}

      {inlineToast && (
        <div className="fixed top-4 right-4 z-50 px-4 py-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border-medium)] shadow-lg text-sm text-[var(--text-primary)]">
          {inlineToast}
        </div>
      )}

      <p className="mt-6"><Link href="/app/settings" className="text-sm text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors">{tSettings("businessPage.backToSettings")}</Link></p>
    </div>
  );
}
