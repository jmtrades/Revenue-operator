"use client";

/**
 * Phase 84 — First-run dashboard checklist.
 *
 * Addresses deterrent P3 #16 from
 * docs/superpowers/evidence/phase-83-critical-analysis.md: post-onboarding
 * users land on the dashboard with zero data, an empty stats grid, and no
 * obvious next action. They bounce, never come back, and churn before
 * value gets a chance to land.
 *
 * Behavior:
 *  - Renders only when the workspace has had zero recent calls (the core
 *    "value not landed yet" signal). Once a single real call has been
 *    handled, the checklist is replaced by the actual metrics.
 *  - Five steps in the order that produces fastest time-to-first-value:
 *      1. Confirm the agent is live.
 *      2. Place a test call to your own number.
 *      3. Connect your CRM.
 *      4. Connect your calendar.
 *      5. Invite your team.
 *  - Each step links directly to the destination — no nested-menu hunt.
 *  - Lightweight; no localStorage, no checkmark persistence. Steps "tick"
 *    automatically as the underlying data lights up (calls > 0 etc) — we
 *    don't fake completion.
 */

import Link from "next/link";
import {
  CheckCircle2,
  Circle,
  Phone,
  PhoneCall,
  Settings as SettingsIcon,
  CalendarPlus,
  Users,
  ArrowRight,
} from "lucide-react";
import { ROUTES } from "@/lib/constants";

interface FirstRunChecklistProps {
  hasAgentLive?: boolean;
  hasFirstCall?: boolean;
  hasCrmConnected?: boolean;
  hasCalendarConnected?: boolean;
  hasTeamInvited?: boolean;
  workspaceNumber?: string | null;
}

export function FirstRunChecklist({
  hasAgentLive = true,
  hasFirstCall = false,
  hasCrmConnected = false,
  hasCalendarConnected = false,
  hasTeamInvited = false,
  workspaceNumber = null,
}: FirstRunChecklistProps) {
  const steps = [
    {
      id: "live",
      done: hasAgentLive,
      title: "Your AI operator is live",
      body: workspaceNumber
        ? `It's standing by on ${workspaceNumber} — answering 24/7.`
        : "It's standing by — answering 24/7.",
      icon: Phone,
      cta: { label: "Tune the agent", href: "/app/settings" },
    },
    {
      id: "test-call",
      done: hasFirstCall,
      title: "Place a test call",
      body: workspaceNumber
        ? `Pick up your phone and dial ${workspaceNumber}. Hear it work in 30 seconds.`
        : "Dial your assigned number to hear it answer in your voice in 30 seconds.",
      icon: PhoneCall,
      cta: { label: "Run the 6-scenario test →", href: "/app/test-agent" },
      highlight: !hasFirstCall && hasAgentLive,
    },
    {
      id: "crm",
      done: hasCrmConnected,
      title: "Connect your CRM",
      body: "We'll write every call, lead, and outcome straight into HubSpot, Salesforce, or Pipedrive.",
      icon: SettingsIcon,
      cta: { label: "Connect", href: "/app/settings/integrations" },
    },
    {
      id: "calendar",
      done: hasCalendarConnected,
      title: "Connect your calendar",
      body: "The agent will only book real openings. Google Calendar or Outlook.",
      icon: CalendarPlus,
      cta: { label: "Connect", href: "/app/settings/integrations" },
    },
    {
      id: "team",
      done: hasTeamInvited,
      title: "Invite your team",
      body: "Reps see live calls, transcripts, and warm-transfer briefs as they happen.",
      icon: Users,
      cta: { label: "Invite", href: "/app/settings/team" },
    },
  ];

  const completed = steps.filter((s) => s.done).length;
  const pct = Math.round((completed / steps.length) * 100);

  return (
    <section
      className="mb-12 rounded-2xl overflow-hidden"
      style={{
        background: "var(--card)",
        border: "1px solid var(--border-default)",
      }}
      aria-label="First-run setup checklist"
    >
      <div
        className="px-6 py-5 flex flex-wrap items-center justify-between gap-3"
        style={{
          background: "var(--bg-inset)",
          borderBottom: "1px solid var(--border-default)",
        }}
      >
        <div>
          <p
            className="text-[10px] font-semibold uppercase mb-1"
            style={{
              letterSpacing: "0.16em",
              color: "var(--text-tertiary)",
            }}
          >
            Get started
          </p>
          <h2
            className="font-editorial-small"
            style={{
              fontSize: "1.375rem",
              lineHeight: 1.2,
              color: "var(--text-primary)",
            }}
          >
            Your first 5 minutes with Revenue Operator
          </h2>
        </div>
        <div className="flex items-center gap-3 min-w-[160px]">
          <div
            className="flex-1 h-1.5 rounded-full overflow-hidden"
            style={{ background: "var(--bg-hover)" }}
          >
            <div
              className="h-full transition-[width] duration-500 ease-[var(--ease-out-expo)]"
              style={{
                width: `${pct}%`,
                background: "var(--accent-secondary)",
              }}
            />
          </div>
          <span
            className="text-xs font-semibold tabular-nums whitespace-nowrap"
            style={{ color: "var(--text-secondary)" }}
          >
            {completed}/{steps.length} done
          </span>
        </div>
      </div>

      <ul className="divide-y" style={{ borderColor: "var(--border-default)" }}>
        {steps.map((step) => {
          const Icon = step.icon;
          return (
            <li
              key={step.id}
              className="px-6 py-4 flex items-start gap-4"
              style={{
                borderColor: "var(--border-default)",
                background: step.highlight
                  ? "var(--accent-primary-subtle)"
                  : "transparent",
              }}
            >
              <div className="mt-0.5">
                {step.done ? (
                  <CheckCircle2
                    className="w-5 h-5"
                    style={{ color: "var(--accent-secondary)" }}
                  />
                ) : (
                  <Circle
                    className="w-5 h-5"
                    style={{ color: "var(--text-tertiary)" }}
                  />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Icon
                    className="w-4 h-4 shrink-0"
                    style={{ color: "var(--text-tertiary)" }}
                  />
                  <p
                    className="font-medium text-sm"
                    style={{
                      color: step.done
                        ? "var(--text-tertiary)"
                        : "var(--text-primary)",
                      textDecoration: step.done ? "line-through" : "none",
                    }}
                  >
                    {step.title}
                  </p>
                  {step.highlight && (
                    <span
                      className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full"
                      style={{
                        letterSpacing: "0.1em",
                        background: "var(--accent-primary)",
                        color: "var(--text-on-accent)",
                      }}
                    >
                      Do this next
                    </span>
                  )}
                </div>
                <p
                  className="text-sm leading-relaxed"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {step.body}
                </p>
              </div>
              {!step.done && (
                <Link
                  href={step.cta.href}
                  className="text-xs font-medium inline-flex items-center gap-1 shrink-0 mt-1 no-underline transition-colors"
                  style={{ color: "var(--accent-primary)" }}
                >
                  {step.cta.label}
                  <ArrowRight className="w-3 h-3" />
                </Link>
              )}
            </li>
          );
        })}
      </ul>

      <div
        className="px-6 py-4 flex flex-wrap items-center justify-between gap-2"
        style={{
          background: "var(--bg-inset)",
          borderTop: "1px solid var(--border-default)",
        }}
      >
        <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
          Need help? We&apos;ll set everything up with you on a 15-min call.
        </p>
        <Link
          href={ROUTES.CONTACT}
          className="text-xs font-medium no-underline"
          style={{ color: "var(--accent-primary)" }}
        >
          Book a setup call →
        </Link>
      </div>
    </section>
  );
}
