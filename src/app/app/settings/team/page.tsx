"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useWorkspace } from "@/components/WorkspaceContext";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

interface TeamMember {
  name: string;
  email: string;
  role: string;
  status: string;
}

export default function AppSettingsTeamPage() {
  const t = useTranslations("settings");
  const { workspaceId } = useWorkspace();
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("viewer");
  const [toast, setToast] = useState<string | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [removeConfirm, setRemoveConfirm] = useState<string | null>(null);

  useEffect(() => {
    if (!workspaceId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/workspace/members?workspace_id=${workspaceId}`, { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          if (!cancelled && Array.isArray(data.members)) {
            setMembers(data.members.map((m: { name?: string; email?: string; role?: string; status?: string }) => ({
              name: m.name || m.email?.split("@")[0] || t("team.memberYouOwner"),
              email: m.email || "",
              role: m.role || "admin",
              status: m.status || "active",
            })));
          }
        }
      } catch { /* ignore fetch error */ }
      if (!cancelled) setLoadingMembers(false);
    })();
    return () => { cancelled = true; };
  }, [workspaceId, t]);

  // Fallback: show current user if API doesn't return members
  const displayMembers = members.length > 0 ? members : (loadingMembers ? [] : [
    { name: t("team.memberYouOwner"), email: "", role: "admin", status: "active" },
  ]);

  // Show "You (Owner)" label in empty state
  const emptyStateName = displayMembers.length === 1 && !displayMembers[0].email ? t("team.memberYouOwner") : null;

  const handleRoleChange = async (email: string, newRole: string) => {
    if (!workspaceId) return;
    try {
      const res = await fetch("/api/workspace/members/role", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspace_id: workspaceId, email, role: newRole }),
      });
      if (res.ok) {
        setMembers((prev) => prev.map((m) => m.email === email ? { ...m, role: newRole } : m));
        setToast(t("team.roleUpdatedToast"));
      } else {
        const data = await res.json().catch(() => ({}));
        setToast((data as { error?: string }).error || t("team.roleUpdateFailed"));
      }
    } catch {
      setToast(t("team.networkError"));
    }
    setTimeout(() => setToast(null), 3000);
  };

  const handleRemoveMember = (email: string) => {
    setRemoveConfirm(email);
  };

  const confirmRemoveMember = async (email: string) => {
    if (!workspaceId) return;
    try {
      const res = await fetch("/api/workspace/members/remove", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspace_id: workspaceId, email }),
      });
      if (res.ok) {
        setMembers((prev) => prev.filter((m) => m.email !== email));
        setToast(t("team.memberRemovedToast"));
      } else {
        const data = await res.json().catch(() => ({}));
        setToast((data as { error?: string }).error || t("team.removeFailed"));
      }
    } catch {
      setToast(t("team.networkError"));
    }
    setTimeout(() => setToast(null), 3000);
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim() || !workspaceId) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteEmail.trim())) {
      setToast(t("team.invalidEmail"));
      setTimeout(() => setToast(null), 3000);
      return;
    }
    try {
      const res = await fetch("/api/workspace/invite", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspace_id: workspaceId, email: inviteEmail.trim(), role: inviteRole }),
      });
      if (res.ok) {
        setToast(t("team.inviteSentToast", { email: inviteEmail }));
        setInviteEmail("");
      } else {
        const data = await res.json().catch(() => ({}));
        setToast((data as { error?: string }).error || t("team.inviteFailed"));
      }
    } catch {
      setToast(t("team.networkError"));
    }
    setTimeout(() => setToast(null), 3000);
  };

  return (
    <div className="max-w-[600px] mx-auto p-4 md:p-6">
      <h1 className="text-lg font-semibold text-[var(--text-primary)] mb-2">{t("team.pageTitle")}</h1>
      <p className="text-sm text-[var(--text-secondary)] mb-6">{t("team.subtitle")}</p>

      <div className="space-y-2 mb-6">
        {loadingMembers && displayMembers.length === 0 && (
          <div className="p-4 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] animate-pulse">
            <div className="h-4 w-32 bg-[var(--bg-inset)] rounded mb-2" />
            <div className="h-3 w-48 bg-[var(--bg-inset)] rounded" />
          </div>
        )}
        {displayMembers.map((m, i) => (
          <div key={m.email || i} className="flex items-center justify-between p-4 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)]">
            <div>
              <p className="text-sm font-medium text-[var(--text-primary)]">{m.name}</p>
              <p className="text-xs text-[var(--text-secondary)]">{m.email}</p>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={m.role}
                onChange={(e) => handleRoleChange(m.email, e.target.value)}
                className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[var(--bg-inset)] text-[var(--text-secondary)] border-none focus:outline-none cursor-pointer"
                disabled={!m.email}
              >
                <option value="admin">{t("team.roleAdmin")}</option>
                <option value="manager">{t("team.roleManager")}</option>
                <option value="viewer">{t("team.roleViewer")}</option>
              </select>
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ background: "rgba(34,197,94,0.15)", color: "var(--accent-secondary)" }}>{m.status}</span>
              {m.email && (
                <button
                  type="button"
                  onClick={() => handleRemoveMember(m.email)}
                  className="text-[10px] px-1.5 py-0.5 rounded-full hover:bg-red-500/15 transition-colors"
                  style={{ color: "var(--text-tertiary)" }}
                  title={t("team.removeMember")}
                >
                  ×
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] mb-6">
        <p className="text-sm font-medium text-[var(--text-primary)] mb-3">{t("team.inviteSectionTitle")}</p>
        <div className="flex gap-2">
          <input
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder={t("team.invitePlaceholder")}
            className="flex-1 px-4 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] text-sm focus:border-[var(--border-medium)] focus:ring-1 focus:ring-[var(--border-medium)] focus:outline-none"
            onKeyDown={(e) => e.key === "Enter" && handleInvite()}
          />
          <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)} className="px-3 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-xs text-[var(--text-secondary)] focus:outline-none">
            <option value="admin">{t("team.roleAdmin")}</option>
            <option value="manager">{t("team.roleManager")}</option>
            <option value="viewer">{t("team.roleViewer")}</option>
          </select>
        </div>
        <button type="button" onClick={handleInvite} disabled={!inviteEmail.trim()} className="mt-3 px-6 py-2.5 rounded-xl text-sm font-semibold bg-[var(--accent-primary)] text-[var(--text-on-accent)] hover:opacity-90 disabled:opacity-40 transition-colors">
          {t("team.sendInvite")}
        </button>
      </div>

      <div className="p-4 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)]">
        <p className="text-sm font-medium text-[var(--text-primary)] mb-2">{t("team.escalationOrderTitle")}</p>
        <p className="text-xs text-[var(--text-secondary)]">{t("team.escalationOrderHint")}</p>
        <div className="mt-3 space-y-1.5">
          <div className="flex items-center gap-2 p-2 rounded-xl bg-[var(--bg-inset)]/50 text-xs text-[var(--text-secondary)]">
            <span className="text-[var(--text-secondary)]">1.</span> {displayMembers[0]?.name || t("team.memberYouOwner")} — {t("team.smsPush")}
          </div>
        </div>
      </div>

      {removeConfirm && (
        <ConfirmDialog
          open
          title={t("team.confirmRemoveTitle")}
          message={t("team.confirmRemoveMessage", { email: removeConfirm })}
          confirmLabel={t("team.confirmRemoveLabel")}
          variant="danger"
          onConfirm={async () => {
            await confirmRemoveMember(removeConfirm);
            setRemoveConfirm(null);
          }}
          onClose={() => setRemoveConfirm(null)}
        />
      )}

      {toast && (
        <div className="fixed top-4 right-4 z-50 px-4 py-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border-medium)] shadow-lg text-sm text-[var(--text-primary)]">{toast}</div>
      )}

      <p className="mt-6"><Link href="/app/settings" className="text-sm text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors">{t("team.backToSettings")}</Link></p>
    </div>
  );
}
