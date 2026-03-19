import Link from "next/link";
import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";

export const metadata: Metadata = {
  title: "Help — Recall Touch",
  description: "Common help topics for using Recall Touch: connecting numbers, creating campaigns, reading analytics, and managing your team.",
};

export default function HelpPage() {
  return (
    <div className="max-w-3xl mx-auto p-4 md:p-6">
      <Breadcrumbs
        items={[
          { label: "Settings", href: "/app/settings" },
          { label: "Help", href: "/app/help" },
        ]}
      />
      <h1 className="text-lg font-semibold text-[var(--text-primary)] mb-2">Help & Support</h1>
      <p className="text-sm text-[var(--text-secondary)] mb-6">
        Answers to common questions from onboarding through daily operations.
      </p>

      <div className="space-y-6">
        <section className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-5">
          <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-2">How to connect a number</h2>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
            Go to <Link className="underline" href="/app/settings/phone">Phone</Link>, provision or connect a number,
            and verify forwarding. Once connected, run a test call so your agent can handle live inbound conversations.
          </p>
        </section>

        <section className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-5">
          <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-2">How to create a campaign</h2>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
            Open <Link className="underline" href="/app/campaigns/create">Campaigns</Link>, choose an audience and sequence,
            then review compliance settings. When everything looks right, launch the campaign and track outcomes in analytics.
          </p>
        </section>

        <section className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-5">
          <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-2">How to read the dashboard</h2>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
            Start with the revenue recovered metric and the quick stats row. Needs-attention items show what your team
            should handle next, and the activity feed explains which calls led to each outcome.
          </p>
        </section>

        <section className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-5">
          <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-2">How to configure an agent</h2>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
            Use <Link className="underline" href="/app/settings/agent">Agent</Link> to set your greeting, voice, knowledge,
            and behavior rules. Complete a test call and then enable go-live once the readiness checklist is met.
          </p>
        </section>

        <section className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-5">
          <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-2">How to invite team members</h2>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
            Go to <Link className="underline" href="/app/settings/team">Team</Link> and invite teammates with the appropriate role.
            They will automatically see the right workspaces and receive notifications based on your configuration.
          </p>
        </section>
      </div>

      <div className="mt-8 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-5">
        <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-2">Still stuck?</h2>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
          Email <a className="underline" href="mailto:support@recall-touch.com">support@recall-touch.com</a> and include what you were trying to do.
          We typically respond within 1 business day.
        </p>
      </div>
    </div>
  );
}

