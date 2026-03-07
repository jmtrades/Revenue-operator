"use client";

import { useState, useCallback } from "react";
import { Plus, MoreVertical, Crown, ChevronDown, ChevronRight } from "lucide-react";
import {
  ROLE_LABELS,
  PERMISSIONS_MATRIX,
  INVITABLE_ROLES,
  type TeamMember,
  type TeamRole,
  type PendingInvite,
} from "@/lib/mock/team";

function formatRelative(timestamp: string): string {
  const d = new Date(timestamp).getTime();
  const diff = Date.now() - d;
  const min = Math.floor(diff / 60000);
  const hour = Math.floor(diff / 3600000);
  const day = Math.floor(diff / 86400000);
  if (min < 1) return "Just now";
  if (min < 60) return `${min} min ago`;
  if (hour < 24) return `${hour} hours ago`;
  if (day === 1) return "1 day ago";
  return `${day} days ago`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    year: "numeric",
  });
}

function initials(name: string): string {
  if (name === "You") return "Y";
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
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<TeamRole>("agent");
  const [toast, setToast] = useState("");
  const [menuMemberId, setMenuMemberId] = useState<string | null>(null);
  const [roleModalMember, setRoleModalMember] = useState<TeamMember | null>(null);
  const [removeConfirmMember, setRemoveConfirmMember] = useState<TeamMember | null>(null);
  const [rolesExpanded, setRolesExpanded] = useState(false);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    const t = setTimeout(() => setToast(""), 2500);
    return () => clearTimeout(t);
  }, []);

  const handleSendInvite = useCallback(() => {
    if (!inviteEmail.trim()) return;
    setPendingInvites((prev) => [
      ...prev,
      {
        id: `inv-${Date.now()}`,
        email: inviteEmail.trim(),
        role: inviteRole,
        invitedAt: new Date().toISOString(),
      },
    ]);
    showToast(`Invitation sent to ${inviteEmail.trim()}`);
    setInviteModalOpen(false);
    setInviteEmail("");
    setInviteRole("agent");
  }, [inviteEmail, inviteRole, showToast]);

  const handleChangeRole = useCallback((memberId: string, newRole: TeamRole) => {
    setMembers((prev) =>
      prev.map((m) => (m.id === memberId ? { ...m, role: newRole } : m))
    );
    setRoleModalMember(null);
    setMenuMemberId(null);
  }, []);

  const handleRemoveMember = useCallback((memberId: string) => {
    setMembers((prev) => prev.filter((m) => m.id !== memberId));
    setRemoveConfirmMember(null);
    setMenuMemberId(null);
  }, []);

  const invitableRoleOptions = INVITABLE_ROLES.map((r) => ({ value: r, label: ROLE_LABELS[r] }));

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="p-4 md:p-6 lg:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl md:text-2xl font-semibold text-white">Team</h1>
            <p className="text-sm text-zinc-500 mt-0.5">{members.length} members</p>
          </div>
          <button
            type="button"
            onClick={() => setInviteModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-black font-semibold text-sm hover:bg-zinc-200"
          >
            <Plus className="w-4 h-4" />
            Invite Member
          </button>
        </div>

        {/* Member cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-8">
          {members.map((member) => {
            const isOwner = member.role === "owner";
            return (
              <div
                key={member.id}
                className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 flex flex-col"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold shrink-0"
                      style={avatarStyle(member.id)}
                    >
                      {initials(member.name)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium text-white truncate">{member.name}</span>
                        {isOwner && <Crown className="w-4 h-4 text-amber-400 shrink-0" aria-label="Owner" />}
                      </div>
                      <p className="text-xs text-zinc-500 truncate">{member.email}</p>
                    </div>
                  </div>
                  {!isOwner && (
                    <div className="relative shrink-0">
                      <button
                        type="button"
                        onClick={() => setMenuMemberId(menuMemberId === member.id ? null : member.id)}
                        className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800"
                        aria-label="Options"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                      {menuMemberId === member.id && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setMenuMemberId(null)} />
                          <div className="absolute right-0 top-full mt-1 z-20 py-1 rounded-lg bg-zinc-800 border border-zinc-700 shadow-xl min-w-[140px]">
                            <button
                              type="button"
                              onClick={() => {
                                setRoleModalMember(member);
                                setMenuMemberId(null);
                              }}
                              className="block w-full text-left px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-700"
                            >
                              Change role
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setRemoveConfirmMember(member);
                                setMenuMemberId(null);
                              }}
                              className="block w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-zinc-700"
                            >
                              Remove member
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
                        ? "bg-amber-500/20 text-amber-300"
                        : member.role === "admin"
                          ? "bg-zinc-600 text-zinc-200"
                          : member.role === "manager"
                            ? "bg-zinc-700 text-zinc-300"
                            : "bg-zinc-700 text-zinc-400"
                    }`}
                  >
                    {ROLE_LABELS[member.role]}
                  </span>
                  <span className="text-[10px] text-zinc-500">Last active {formatRelative(member.lastActive)}</span>
                </div>
                <p className="text-[10px] text-zinc-600 mt-1">Joined {formatDate(member.joinedAt)}</p>
              </div>
            );
          })}
        </div>

        {/* Pending invitations */}
        {pendingInvites.length > 0 && (
          <section className="mb-8">
            <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">Pending invitations</h2>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4">
              <ul className="space-y-2">
                {pendingInvites.map((inv) => (
                  <li key={inv.id} className="flex items-center justify-between gap-2 py-2 border-b border-zinc-800/80 last:border-0">
                    <div>
                      <span className="text-sm text-zinc-300">{inv.email}</span>
                      <span className="ml-2 text-xs text-zinc-500">— {ROLE_LABELS[inv.role]}</span>
                    </div>
                    <span className="text-[10px] text-zinc-600">Invited {formatRelative(inv.invitedAt)}</span>
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
            className="flex items-center gap-2 w-full text-left py-3 border-b border-zinc-800"
          >
            {rolesExpanded ? <ChevronDown className="w-4 h-4 text-zinc-500" /> : <ChevronRight className="w-4 h-4 text-zinc-500" />}
            <span className="text-sm font-semibold text-zinc-300">Roles & Permissions</span>
          </button>
          {rolesExpanded && (
            <div className="pt-4 overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-zinc-800">
                    <th className="py-2 pr-4 font-medium text-zinc-500">Permission</th>
                    <th className="py-2 px-2 font-medium text-zinc-500">Owner</th>
                    <th className="py-2 px-2 font-medium text-zinc-500">Admin</th>
                    <th className="py-2 px-2 font-medium text-zinc-500">Manager</th>
                    <th className="py-2 px-2 font-medium text-zinc-500">Agent</th>
                  </tr>
                </thead>
                <tbody>
                  {PERMISSIONS_MATRIX.map((row) => (
                    <tr key={row.id} className="border-b border-zinc-800/80">
                      <td className="py-2.5 pr-4 text-zinc-300">{row.label}</td>
                      <td className="py-2.5 px-2 text-center">{row.roles.owner ? "✓" : "—"}</td>
                      <td className="py-2.5 px-2 text-center">{row.roles.admin ? "✓" : "—"}</td>
                      <td className="py-2.5 px-2 text-center">{row.roles.manager ? "✓" : "—"}</td>
                      <td className="py-2.5 px-2 text-center">{row.roles.agent ? "✓" : "—"}</td>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70" onClick={(e) => e.target === e.currentTarget && setInviteModalOpen(false)}>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-white mb-4">Invite team member</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Email</label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="colleague@company.com"
                  className="w-full px-3 py-2.5 rounded-xl bg-zinc-800 border border-zinc-700 text-white placeholder:text-zinc-500 focus:outline-none focus:border-zinc-600 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Role</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as TeamRole)}
                  className="w-full px-3 py-2.5 rounded-xl bg-zinc-800 border border-zinc-700 text-white text-sm focus:outline-none focus:border-zinc-600"
                >
                  {invitableRoleOptions.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button type="button" onClick={() => setInviteModalOpen(false)} className="px-4 py-2 rounded-xl text-sm text-zinc-400 border border-zinc-700 hover:bg-zinc-800">
                Cancel
              </button>
              <button type="button" onClick={handleSendInvite} disabled={!inviteEmail.trim()} className="px-4 py-2 rounded-xl text-sm font-semibold bg-white text-black hover:bg-zinc-200 disabled:opacity-50">
                Send Invite
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change role modal */}
      {roleModalMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70" onClick={(e) => e.target === e.currentTarget && setRoleModalMember(null)}>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-white mb-2">Change role</h3>
            <p className="text-sm text-zinc-500 mb-4">{roleModalMember.name} — {roleModalMember.email}</p>
            <div className="space-y-1">
              {(["admin", "manager", "agent"] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => handleChangeRole(roleModalMember.id, r)}
                  className={`block w-full text-left px-3 py-2.5 rounded-lg text-sm ${roleModalMember.role === r ? "bg-zinc-700 text-white" : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"}`}
                >
                  {ROLE_LABELS[r]}
                </button>
              ))}
            </div>
            <button type="button" onClick={() => setRoleModalMember(null)} className="w-full mt-4 py-2 rounded-xl text-sm text-zinc-400 border border-zinc-700">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Remove confirmation */}
      {removeConfirmMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70" onClick={(e) => e.target === e.currentTarget && setRemoveConfirmMember(null)}>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-white mb-2">Remove member?</h3>
            <p className="text-sm text-zinc-400 mb-4">
              {removeConfirmMember.name} will lose access to this workspace. This can&apos;t be undone.
            </p>
            <div className="flex gap-2">
              <button type="button" onClick={() => setRemoveConfirmMember(null)} className="flex-1 py-2 rounded-xl text-sm text-zinc-300 border border-zinc-700 hover:bg-zinc-800">
                Cancel
              </button>
              <button type="button" onClick={() => handleRemoveMember(removeConfirmMember.id)} className="flex-1 py-2 rounded-xl text-sm font-semibold bg-red-600 text-white hover:bg-red-500">
                Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-[60] px-4 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white text-sm font-medium shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
