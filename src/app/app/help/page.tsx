"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";

export default function HelpPage() {
  const t = useTranslations("help");

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-6">
      <Breadcrumbs
        items={[
          { label: t("breadcrumbs.settings", { defaultValue: "Settings" }), href: "/app/settings" },
          { label: t("breadcrumbs.help", { defaultValue: "Help" }), href: "/app/help" },
        ]}
      />
      <h1 className="text-lg font-semibold text-[var(--text-primary)] mb-2">{t("title", { defaultValue: "Help & Support" })}</h1>
      <p className="text-sm text-[var(--text-secondary)] mb-6">
        {t("subtitle", { defaultValue: "Answers to common questions from onboarding through daily operations." })}
      </p>

      <div className="space-y-6">
        <section className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-5">
          <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-2">{t("connectNumber.title", { defaultValue: "How to connect a number" })}</h2>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
            {t("connectNumber.desc1", { defaultValue: "Go to" })} <Link className="underline" href="/app/settings/phone">{t("connectNumber.phone", { defaultValue: "Phone" })}</Link>, {t("connectNumber.desc2", { defaultValue: "provision or connect a number, and verify forwarding. Once connected, run a test call so your agent can handle live inbound conversations." })}
          </p>
        </section>

        <section className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-5">
          <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-2">{t("createCampaign.title", { defaultValue: "How to create a campaign" })}</h2>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
            {t("createCampaign.desc1", { defaultValue: "Open" })} <Link className="underline" href="/app/campaigns/create">{t("createCampaign.campaigns", { defaultValue: "Campaigns" })}</Link>, {t("createCampaign.desc2", { defaultValue: "choose an audience and sequence, then review compliance settings. When everything looks right, launch the campaign and track outcomes in analytics." })}
          </p>
        </section>

        <section className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-5">
          <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-2">{t("readDashboard.title", { defaultValue: "How to read the dashboard" })}</h2>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
            {t("readDashboard.desc", { defaultValue: "Start with the revenue recovered metric and the quick stats row. Needs-attention items show what your team should handle next, and the activity feed explains which calls led to each outcome." })}
          </p>
        </section>

        <section className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-5">
          <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-2">{t("configureAgent.title", { defaultValue: "How to configure an agent" })}</h2>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
            {t("configureAgent.desc1", { defaultValue: "Use" })} <Link className="underline" href="/app/settings/agent">{t("configureAgent.agent", { defaultValue: "Agent" })}</Link> {t("configureAgent.desc2", { defaultValue: "to set your greeting, voice, knowledge, and behavior rules. Complete a test call and then enable go-live once the readiness checklist is met." })}
          </p>
        </section>

        <section className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-5">
          <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-2">{t("inviteTeam.title", { defaultValue: "How to invite team members" })}</h2>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
            {t("inviteTeam.desc1", { defaultValue: "Go to" })} <Link className="underline" href="/app/settings/team">{t("inviteTeam.team", { defaultValue: "Team" })}</Link> {t("inviteTeam.desc2", { defaultValue: "and invite teammates with the appropriate role. They will automatically see the right workspaces and receive notifications based on your configuration." })}
          </p>
        </section>

        <section className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-5">
          <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-4">{t("troubleshooting.title", { defaultValue: "Troubleshooting" })}</h2>
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-[var(--text-primary)] mb-1">{t("troubleshooting.noCallsTitle", { defaultValue: "Why am I not receiving calls?" })}</h3>
              <p className="text-sm text-[var(--text-secondary)]">{t("troubleshooting.noCallsDesc", { defaultValue: "Make sure you have a phone number connected in Settings > Phone Numbers. Your agent must also be configured and your account must be on an active plan." })}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-[var(--text-primary)] mb-1">{t("troubleshooting.noVoiceTitle", { defaultValue: "Why can't I hear voice previews?" })}</h3>
              <p className="text-sm text-[var(--text-secondary)]">{t("troubleshooting.noVoiceDesc", { defaultValue: "Voice preview requires the voice server to be configured. Contact support if previews are not playing." })}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-[var(--text-primary)] mb-1">{t("troubleshooting.crmSyncTitle", { defaultValue: "My CRM shows Connected but contacts aren't syncing" })}</h3>
              <p className="text-sm text-[var(--text-secondary)]">{t("troubleshooting.crmSyncDesc", { defaultValue: "CRM sync is currently in beta. Inbound contact syncing works automatically. Two-way sync is rolling out progressively — check Settings > Integrations for your current sync status." })}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-[var(--text-primary)] mb-1">{t("troubleshooting.callsCutOffTitle", { defaultValue: "Calls are being cut off" })}</h3>
              <p className="text-sm text-[var(--text-secondary)]">{t("troubleshooting.callsCutOffDesc", { defaultValue: "Check your plan's minute allowance in Settings > Billing. Calls are limited to 15 minutes by default." })}</p>
            </div>
          </div>
        </section>
      </div>

      <div className="mt-8 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-5">
        <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-2">{t("stuck.title", { defaultValue: "Still stuck?" })}</h2>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
          {t("stuck.desc1", { defaultValue: "Email" })} <a className="underline" href="mailto:support@recall-touch.com">support@recall-touch.com</a> {t("stuck.desc2", { defaultValue: "and include what you were trying to do. We typically respond within 1 business day." })}
        </p>
      </div>
    </div>
  );
}

