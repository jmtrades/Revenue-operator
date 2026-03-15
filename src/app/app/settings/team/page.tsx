"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";

export default function AppSettingsTeamPage() {
  const t = useTranslations("settings");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("viewer");
  const [toast, setToast] = useState<string | null>(null);

  const demoMembers = [
    { name: t("team.memberYouOwner"), email: "you@business.com", role: t("team.roleAdmin"), status: t("team.statusActive") },
  ];

  const handleInvite = () => {
    if (!inviteEmail.trim()) return;
    setToast(t("team.inviteSentToast", { email: inviteEmail }));
    setInviteEmail("");
    setTimeout(() => setToast(null), 3000);
  };

  return (
    <div className="max-w-[600px] mx-auto p-4 md:p-6">
      <h1 className="text-lg font-semibold text-white mb-2">{t("team.pageTitle")}</h1>
      <p className="text-sm text-zinc-500 mb-6">{t("team.subtitle")}</p>

      <div className="space-y-2 mb-6">
        {demoMembers.map((m) => (
          <div key={m.email} className="flex items-center justify-between p-4 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)]">
            <div>
              <p className="text-sm font-medium text-white">{m.name}</p>
              <p className="text-xs text-zinc-500">{m.email}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300">{m.role}</span>
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-green-500/15 text-green-400">{m.status}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] mb-6">
        <p className="text-sm font-medium text-white mb-3">{t("team.inviteSectionTitle")}</p>
        <div className="flex gap-2">
          <input
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder={t("team.invitePlaceholder")}
            className="flex-1 px-4 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-white placeholder:text-zinc-600 text-sm focus:border-[var(--border-medium)] focus:ring-1 focus:ring-[var(--border-medium)] focus:outline-none"
            onKeyDown={(e) => e.key === "Enter" && handleInvite()}
          />
          <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)} className="px-3 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-xs text-zinc-300 focus:outline-none">
            <option value="admin">{t("team.roleAdmin")}</option>
            <option value="manager">{t("team.roleManager")}</option>
            <option value="viewer">{t("team.roleViewer")}</option>
          </select>
        </div>
        <button type="button" onClick={handleInvite} disabled={!inviteEmail.trim()} className="mt-3 px-6 py-2.5 rounded-xl text-sm font-semibold bg-white text-black hover:bg-zinc-100 disabled:opacity-40 transition-colors">
          {t("team.sendInvite")}
        </button>
      </div>

      <div className="p-4 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)]">
        <p className="text-sm font-medium text-white mb-2">{t("team.escalationOrderTitle")}</p>
        <p className="text-xs text-zinc-500">{t("team.escalationOrderHint")}</p>
        <div className="mt-3 space-y-1.5">
          <div className="flex items-center gap-2 p-2 rounded-xl bg-zinc-800/50 text-xs text-zinc-300">
            <span className="text-zinc-500">1.</span> {t("team.memberYouOwner")} — SMS + Push
          </div>
        </div>
      </div>

      {toast && (
        <div className="fixed top-4 right-4 z-50 px-4 py-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border-medium)] shadow-lg text-sm text-zinc-200">{toast}</div>
      )}

      <p className="mt-6"><Link href="/app/settings" className="text-sm text-zinc-400 hover:text-white transition-colors">{t("team.backToSettings")}</Link></p>
    </div>
  );
}
