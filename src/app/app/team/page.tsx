"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Plus, MoreVertical, Crown, ChevronDown, ChevronRight, Check, Minus } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useWorkspace } from "@/components/WorkspaceContext";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
type TeamRole = "owner" | "admin" | "manager" | "agent";

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: TeamRole;
  lastActive: string;
  joinedAt: string;
}

interface PendingInvite {
  id: string;
  email: string;
  role: TeamRole;
  invitedAt: string;
}

function getRoleLabels(t: (k: string) => string): Record<TeamRole, string> {
  return {
    owner: t("roles.owner"),
    admin: t("roles.admin"),
    manager: t("roles.manager"),
    agent: t("roles.agent"),
  };
}

function getPermissionsMatrix(t: (k: string) => string): { id: string; label: string; roles: Record<TeamRole, boolean> }[] {
  return [
    { id: "view_calls", label: t("permissions.viewCalls"), roles: { owner: true, admin: true, manager: true, agent: true } },
    { id: "manage_agents", label: t("permissions.manageAgents"), roles: { owner: true, admin: true, manager: true, agent: false } },
    { id: "view_analytics", label: t("permissions.viewAnalytics"), roles: { owner: true, admin: true, manager: true, agent: false } },
    { id: "manage_team", label: t("permissions.manageTeam"), roles: { owner: true, admin: true, manager: false, agent: false } },
    { id: "billing", label: t("permissions.billing"), roles: { owner: true, admin: false, manager: false, agent: false } },
    { id: "account_settings", label: t("permissions.accountSettings"), roles: { owner: true, admin: false, manager: false, agent: false } },
  ];
}

const INVITABLE_ROLES: TeamRole[] = ["admin", "manager", "agent"];

function formatRelative(timestamp: string, t: (k: string, p?: Record<string, number>) => string): string {
  const d = new Date(timestamp).getTime();
  const diff = Date.now() - d;
  const min = Math.floor(diff / 60000);
  const hour = Math.floor(diff / 3600000);
  const day = Math.floor(diff / 86400000);
  if (min < 1) return t("time.justNow");
  if (min < 60) return t("time.minAgo", { count: min });
  if (hour < 24) return t("time.hoursAgo", { count: hour });
  if (day === 1) return t("time.dayAgo");
  return t("time.daysAgo", { count: day });
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "Recently";
  return d.toLocaleDateString(undefined, {
    month: "short",
    year: "numeric",
  });
}

function initials(name: string, avatarFallback: string): string {
  if (name === "You") return avatarFallback;
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return (name[0] ?? "?").toUpperCase();
}

const AVATAR_COLORS = [
  { bg: "rgba(16, 185, 129, 0.2)", fg: "#6ee7b7" },
  { bg: "rgba(59, 130, 246, 0.2)", fg: "#93c5fd" },
  { bg: "rgba(245, 158, 11, 0.2)", fg: "#fcd34d" },
  { bg: "rgba(139, 92, 246, 0.2)", fg: "#c4b5fd" },
  { bg: "rgba(244, 63, 94, 0.2)", fg: "#fda4af" },
];

function avatarStyle(id: string): { backgroundColor: string; color: string } {
  const i = id.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_COLORS.length;
  const c = AVATAR_COLORS[i];
  return { backgroundColor: c.bg, color: c.fg };
}

export default function TeamPage() {
  const t = useTranslations("team");
  const { workspaceId } = useWorkspace();
  const roleLabels = useMemo(() => getRoleLabels(t), [t]);
  const permissionsMatrix = useMemo(() => getPermissionsMatrix(t), [t]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<TeamRole>("agent");
  const [inviteSending, setInviteSending] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [menuMemberId, setMenuMemberId] = useState<string | null>(null);
  const [roleModalMember, setRoleModalMember] = useState<TeamMember | null>(null);
  const [removeConfirmMember, setRemoveConfirmMember] = useState<TeamMember | null>(null);
  const [rolesExpanded, setRolesExpanded] = useState(false);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const showToast = useCallback((msg: string, isError?: boolean) => {
    if (isError) toast.error(msg); else toast.success(msg);
  }, []);

  const fetchTeam = useCallback(() => {
    if (!workspaceId) return;
    setLoading(true);
    fetch(`/api/team?workspace_id=${encodeURIComponent(workspaceId)}`, { credentials: "include" })
      .then((r) => r.json())
      .then((data: { team?: Array<{ id: string; name: string; email: string; role: string; created_at?: string }>; pendingInvites?: Array<{ id: string; email: string; role: string; invitedAt: string }> }) => {
        const team = data.team ?? [];
        const now = new Date().toISOString();
        setMembers(
          team.map((m) => ({
            id: m.id,
            name: m.name,
            email: m.email,
            role: m.role as TeamRole,
            lastActive: m.created_at || now,
            joinedAt: m.created_at || now,
          }))
        );
        setPendingInvites(
          (data.pendingInvites ?? []).map((p) => ({
            id: p.id,
            email: p.email,
            role: p.role as TeamRole,
            invitedAt: p.invitedAt,
          }))
        );
      })
      .catch((_err) => {
        toast.error(t("errors.fetchTeamFailed"));
      })
      .finally(() => setLoading(false));
  }, [workspaceId, t]);

  useEffect(() => {
    if (!workspaceId) return;
    let cancelled = false;
    queueMicrotask(() => setLoading(true));
    fetch(`/api/team?workspace_id=${encodeURIComponent(workspaceId)}`, { credentials: "include" })
      .then((r) => r.json())
      .then((data: { team?: Array<{ id: string; name: string; email: string; role: string; created_at?: string }>; pendingInvites?: Array<{ id: string; email: string; role: string; invitedAt: string }> }) => {
        if (cancelled) return;
        const team = data.team ?? [];
        const now = new Date().toISOString();
        setMembers(
          team.map((m) => ({
            id: m.id,
            name: m.name,
            email: m.email,
            role: m.role as TeamRole,
            lastActive: m.created_at || now,
            joinedAt: m.created_at || now,
          }))
        );
        setPendingInvites(
          (data.pendingInvites ?? []).map((p) => ({
            id: p.id,
            email: p.email,
            role: p.role as TeamRole,
            invitedAt: p.invitedAt,
          }))
        );
      })
      .catch((_err) => {
        if (!cancelled) toast.error(t("errors.fetchTeamFailed"));
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [workspaceId, t]);

  const handleSendInvite = useCallback(() => {
    if (!inviteEmail.trim() || !workspaceId || inviteSending) return;
    setInviteError(null);
    setInviteSending(true);
    fetch("/api/team/invite", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workspace_id: workspaceId,
        email: inviteEmail.trim(),
        role: inviteRole,
      }),
    })
      .then((r) => r.json())
      .then((data: { ok?: boolean; error?: string }) => {
        if (data.ok) {
          showToast(t("toast.inviteSent", { email: inviteEmail.trim() }));
          setInviteModalOpen(false);
          setInviteEmail("");
          setInviteRole("agent");
          fetchTeam();
        } else {
          setInviteError(data.error ?? t("errors.inviteFailed"));
        }
      })
      .catch(() => setInviteError(t("errors.inviteFailed")))
      .finally(() => setInviteSending(false));
  }, [inviteEmail, inviteRole, workspaceId, inviteSending, showToast, fetchTeam, t]);

  const handleChangeRole = useCallback(async (memberId: string, newRole: TeamRole) => {
    try {
      const res = await fetch(`/api/team/members/${memberId}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ role: newRole, workspace_id: workspaceId }),
      });
      if (!res.ok) throw new Error("Failed to update role");
      setMembers((prev) =>
        prev.map((m) => (m.id === memberId ? { ...m, role: newRole } : m))
      );
      toast.success(t("toast.roleUpdated"));
    } catch (err) {
      toast.error(t("errors.changeRoleFailed"));
    }
    setRoleModalMember(null);
    setMenuMemberId(null);
  }, [workspaceId, t]);

  const handleRemoveMember = useCallback(async (memberId: string) => {
    try {
      const res = await fetch(`/api/team/members/${memberId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ workspace_id: workspaceId }),
      });
      if (!res.ok) throw new Error("Failed to remove member");
      setMembers((prev) => prev.filter((m) => m.id !== memberId));
      toast.success(t("toast.memberRemoved"));
    } catch (err) {
      toast.error(t("errors.removeMemberFailed"));
    }
    setRemoveConfirmMember(null);
    setMenuMemberId(null);
  }, [workspaceId, t]);

  const invitableRoleOptions = useMemo(() => INVITABLE_ROLES.map((r) => ({ value: r, label: roleLabels[r] })), [roleLabels]);

  const handleResendInvite = useCallback((inviteId: string) => {
    if (!workspaceId || resendingId) return;
    setResendingId(inviteId);
    fetch("/api/team/invite/resend", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspace_id: workspaceId, invite_id: inviteId }),
    })
      .then((r) => r.json())
      .then((data: { ok?: boolean; error?: string }) => {
        if (data.ok) {
          showToast(t("toast.inviteResent"));
          fetchTeam();
        } else {
          showToast(data.error ?? t("toast.inviteResendFailed"), true);
        }
      })
      .catch(() => showToast(t("toast.inviteResendFailed"), true))
      .finally(() => setResendingId(null));
  }, [workspaceId, resendingId, showToast, fetchTeam, t]);

  const handleRevokeInvite = useCallback((inviteId: string) => {
    if (!workspaceId || revokingId) return;
    setRevokingId(inviteId);
    fetch("/api/team/invite/revoke", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspace_id: workspaceId, invite_id: inviteId }),
    })
      .then((r) => r.json())
      .then((data: { ok?: boolean; error?: string }) => {
        if (data.ok) {
          showToast(t("toast.inviteRevoked"));
          fetchTeam();
        } else {
          showToast(data.error ?? t("toast.inviteRevokeFailed"), true);
        }
      })
      .catch(() => showToast(t("toast.inviteRevokeFailed"), true))
      .finally(() => setRevokingId(null));
  }, [workspaceId, revokingId, showToast, fetchTeam, t]);

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <div className="p-4 md:p-6 lg:p-8">
        <Breadcrumbs items={[{ label: "Home", href: "/app" }, { label: "Team" }]} />
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl md:text-2xl font-bold tracking-[-0.025em] text-[var(--text-primary)]">{t("heading")}</h1>
            <p className="text-sm text-[var(--text-secondary)] mt-0.5">{loading ? t("loading") : t("membersCount", { count: members.length })}</p>
          </div>
          <button
            type="button"
            onClick={() => setInviteModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--accent-primary)] text-[var(--text-on-accent)] font-semibold text-sm hover:opacity-90"
          >
            <Plus className="w-4 h-4" />
            {t("inviteMember")}
          </button>
        </div>

        {/* Member cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-8">
          {members.map((member) => {
            const isOwner = member.role === "owner";
            return (
              <div
                key={member.id}
                className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4 flex flex-col"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold shrink-0"
                      style={avatarStyle(member.id)}
                    >
                      {initials(member.name, t("avatarFallback"))}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium text-[var(--text-primary)] truncate">{member.name}</span>
                        {isOwner && <Crown className="w-4 h-4 text-[var(--accent-warning,#f59e0b)] shrink-0" aria-label={t("roles.owner")} />}
                      </div>
                      <p className="text-xs text-[var(--text-secondary)] truncate">{member.email}</p>
                    </div>
                  </div>
                  {!isOwner && (
                    <div className="relative shrink-0">
                      <button
                        type="button"
                        onClick={() => setMenuMemberId(menuMemberId === member.id ? null : member.id)}
                        className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)]"
                        aria-label="Options"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                      {menuMemberId === member.id && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setMenuMemberId(null)} />
                          <div className="absolute right-0 top-full mt-1 z-20 py-1 rounded-lg bg-[var(--bg-card)] border border-[var(--border-medium)] shadow-xl min-w-[140px]">
                            <button
                              type="button"
                              onClick={() => {
                                setRoleModalMember(member);
                                setMenuMemberId(null);
                              }}
                              className="block w-full text-left px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-inset)]"
                            >
                              {t("changeRole")}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setRemoveConfirmMember(member);
                                setMenuMemberId(null);
                              }}
                              className="block w-full text-left px-3 py-2 text-sm text-[var(--accent-danger,#ef4444)] hover:bg-[var(--bg-inset)]"
                            >
                              {t("removeMemberBtn")}
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex px-2 py-0.5 rounded-md text-xs font-medium ${
                      member.role === "owner"
                        ? "bg-[var(--accent-warning,#f59e0b)]/20 text-[var(--accent-warning,#f59e0b)]"
                        : member.role === "admin"
                          ? "bg-[var(--bg-inset)] text-[var(--text-primary)]"
                          : member.role === "manager"
                            ? "bg-[var(--bg-inset)] text-[var(--text-secondary)]"
                            : "bg-[var(--bg-inset)] text-[var(--text-tertiary)]"
                    }`}
                  >
                    {roleLabels[member.role]}
                  </span>
                </div>
                <p className="text-[10px] text-[var(--text-tertiary)] mt-1">{t("joined")} {formatDate(member.joinedAt)}</p>
              </div>
            );
          })}
        </div>

        {/* Pending invitations */}
        {pendingInvites.length > 0 && (
          <section className="mb-8">
            <h2 className="text-sm font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-3">{t("pendingInvitations")}</h2>
            <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)]/30 p-4">
              <ul className="space-y-2">
                {pendingInvites.map((inv) => (
                  <li key={inv.id} className="flex flex-wrap items-center justify-between gap-2 py-2 border-b border-[var(--border-default)]/80 last:border-0">
                    <div>
                      <span className="text-sm text-[var(--text-secondary)]">{inv.email}</span>
                      <span className="ml-2 text-xs text-[var(--text-secondary)]">— {roleLabels[inv.role]}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-[var(--text-tertiary)]">{t("joined")} {formatRelative(inv.invitedAt, t)}</span>
                      <button
                        type="button"
                        onClick={() => handleResendInvite(inv.id)}
                        disabled={resendingId === inv.id}
                        className="text-xs font-medium text-[var(--text-tertiary)] hover:text-[var(--text-primary)] disabled:opacity-50"
                      >
                        {resendingId === inv.id ? t("sending") : t("resend")}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRevokeInvite(inv.id)}
                        disabled={revokingId === inv.id}
                        className="text-xs font-medium text-[var(--accent-red)] hover:text-[var(--accent-danger,#ef4444)]/80 disabled:opacity-50"
                      >
                        {revokingId === inv.id ? t("revoking") : t("revoke")}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        {/* Roles & Permissions (collapsible) */}
        <section>
          <button
            type="button"
            onClick={() => setRolesExpanded((e) => !e)}
            className="flex items-center gap-2 w-full text-left py-3 border-b border-[var(--border-default)]"
          >
            {rolesExpanded ? <ChevronDown className="w-4 h-4 text-[var(--text-secondary)]" /> : <ChevronRight className="w-4 h-4 text-[var(--text-secondary)]" />}
            <span className="text-sm font-semibold text-[var(--text-secondary)]">{t("rolesAndPermissions")}</span>
          </button>
          {rolesExpanded && (
            <div className="pt-4 overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-[var(--border-default)]">
                    <th className="py-2 pr-4 font-medium text-[var(--text-secondary)]">{t("permissionLabel")}</th>
                    <th className="py-2 px-2 font-medium text-[var(--text-secondary)]">{t("roles.owner")}</th>
                    <th className="py-2 px-2 font-medium text-[var(--text-secondary)]">{t("roles.admin")}</th>
                    <th className="py-2 px-2 font-medium text-[var(--text-secondary)]">{t("roles.manager")}</th>
                    <th className="py-2 px-2 font-medium text-[var(--text-secondary)]">{t("roles.agent")}</th>
                  </tr>
                </thead>
                <tbody>
                  {permissionsMatrix.map((row) => (
                    <tr key={row.id} className="border-b border-[var(--border-default)]/80">
                      <td className="py-2.5 pr-4 text-[var(--text-secondary)]">{row.label}</td>
                      <td className="py-2.5 px-2 text-center">{row.roles.owner ? <Check className="w-4 h-4 text-[var(--accent-primary)] mx-auto" /> : <Minus className="w-4 h-4 text-[var(--text-tertiary)] mx-auto" />}</td>
                      <td className="py-2.5 px-2 text-center">{row.roles.admin ? <Check className="w-4 h-4 text-[var(--accent-primary)] mx-auto" /> : <Minus className="w-4 h-4 text-[var(--text-tertiary)] mx-auto" />}</td>
                      <td className="py-2.5 px-2 text-center">{row.roles.manager ? <Check className="w-4 h-4 text-[var(--accent-primary)] mx-auto" /> : <Minus className="w-4 h-4 text-[var(--text-tertiary)] mx-auto" />}</td>
                      <td className="py-2.5 px-2 text-center">{row.roles.agent ? <Check className="w-4 h-4 text-[var(--accent-primary)] mx-auto" /> : <Minus className="w-4 h-4 text-[var(--text-tertiary)] mx-auto" />}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {/* Invite modal */}
      {inviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--overlay)]" onClick={(e) => e.target === e.currentTarget && setInviteModalOpen(false)}>
          <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">{t("inviteTeamMemberTitle")}</h3>
            <div className="space-y-4">
              {inviteError && (
                <p className="text-sm text-[var(--accent-red)]" role="alert">{inviteError}</p>
              )}
              <div>
                <label className="block text-xs font-medium text-[var(--text-tertiary)] mb-1.5">{t("emailLabel")}</label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => { setInviteEmail(e.target.value); setInviteError(null); }}
                  placeholder={t("inviteEmailPlaceholder")}
                  className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-medium)] text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:border-[var(--border-medium)] text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--text-tertiary)] mb-1.5">{t("roleLabel")}</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as TeamRole)}
                  className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-medium)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--border-medium)]"
                >
                  {invitableRoleOptions.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button type="button" onClick={() => { setInviteModalOpen(false); setInviteError(null); }} className="px-4 py-2 rounded-xl text-sm text-[var(--text-tertiary)] border border-[var(--border-medium)] hover:bg-[var(--bg-card)]">
                {t("cancel")}
              </button>
              <button type="button" onClick={handleSendInvite} disabled={!inviteEmail.trim() || inviteSending} className="px-4 py-2 rounded-xl text-sm font-semibold bg-[var(--accent-primary)] text-[var(--text-on-accent)] hover:opacity-90 disabled:opacity-50">
                {inviteSending ? t("sending") : t("sendInvite")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change role modal */}
      {roleModalMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--overlay)]" onClick={(e) => e.target === e.currentTarget && setRoleModalMember(null)}>
          <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-2xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">{t("changeRoleTitle")}</h3>
            <p className="text-sm text-[var(--text-secondary)] mb-4">{roleModalMember.name} — {roleModalMember.email}</p>
            <div className="space-y-1">
              {(["admin", "manager", "agent"] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => handleChangeRole(roleModalMember.id, r)}
                  className={`block w-full text-left px-3 py-2.5 rounded-lg text-sm ${roleModalMember.role === r ? "bg-[var(--bg-inset)] text-[var(--text-primary)]" : "text-[var(--text-tertiary)] hover:bg-[var(--bg-card)] hover:text-[var(--text-primary)]"}`}
                >
                  {roleLabels[r]}
                </button>
              ))}
            </div>
            <button type="button" onClick={() => setRoleModalMember(null)} className="w-full mt-4 py-2 rounded-xl text-sm text-[var(--text-tertiary)] border border-[var(--border-medium)]">
              {t("cancel")}
            </button>
          </div>
        </div>
      )}

      {removeConfirmMember && (
        <ConfirmDialog
          open
          title={t("removeMemberTitle")}
          message={t("removeMemberMessage", { name: removeConfirmMember.name })}
          confirmLabel={t("removeConfirmLabel")}
          variant="danger"
          onConfirm={() => handleRemoveMember(removeConfirmMember.id)}
          onClose={() => setRemoveConfirmMember(null)}
        />
      )}
    </div>
  );
}
