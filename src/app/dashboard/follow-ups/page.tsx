"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Clock,
  Play,
  Pause,
  SkipForward,
  XCircle,
  MessageSquare,
  Mail,
  Phone,
} from "lucide-react";
import { useWorkspace } from "@/components/WorkspaceContext";
import { PageHeader, EmptyState, StatCard } from "@/components/ui";
import { fetchWithFallback } from "@/lib/reliability/fetch-with-fallback";

type FollowUpStatus = "active" | "paused" | "completed" | "cancelled" | "overdue";

interface FollowUpItem {
  id: string;
  contactName: string;
  phone: string;
  sequenceName: string;
  currentStep: number;
  totalSteps: number;
  dueAt: string;
  status: FollowUpStatus;
  channel: "sms" | "email" | "call";
}

const DEMO_FOLLOW_UPS: FollowUpItem[] = [
  {
    id: "1",
    contactName: "Sarah Martinez",
    phone: "+1 (480) 555-0198",
    sequenceName: "Inbound call → booking",
    currentStep: 2,
    totalSteps: 3,
    dueAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    status: "active",
    channel: "sms",
  },
  {
    id: "2",
    contactName: "James Lee",
    phone: "+1 (602) 555-0142",
    sequenceName: "Reactivation — 90 days",
    currentStep: 1,
    totalSteps: 2,
    dueAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    status: "overdue",
    channel: "sms",
  },
  {
    id: "3",
    contactName: "Dr. Megan Price",
    phone: "+1 (512) 555-0110",
    sequenceName: "No-show recovery",
    currentStep: 3,
    totalSteps: 3,
    dueAt: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
    status: "completed",
    channel: "email",
  },
  {
    id: "4",
    contactName: "Carlos Rivera",
    phone: "+1 (214) 555-0177",
    sequenceName: "New lead follow-up",
    currentStep: 1,
    totalSteps: 3,
    dueAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    status: "paused",
    channel: "call",
  },
];

type FilterKey = "all" | "due" | "overdue" | "paused";

function statusConfig(status: FollowUpStatus): { label: string; color: string } {
  switch (status) {
    case "active":
      return { label: "Active", color: "bg-[var(--bg-card)]/60 text-blue-400 border-[var(--border-default)]" };
    case "paused":
      return { label: "Paused", color: "bg-amber-500/10 text-amber-400 border-amber-500/30" };
    case "completed":
      return { label: "Completed", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" };
    case "cancelled":
      return { label: "Cancelled", color: "bg-red-500/10 text-red-400 border-red-500/30" };
    case "overdue":
      return { label: "Overdue", color: "bg-red-500/10 text-red-400 border-red-500/30" };
    default:
      return { label: status, color: "bg-[var(--bg-inset)] text-[var(--text-secondary)] border-[var(--border-default)]" };
  }
}

function channelIcon(channel: "sms" | "email" | "call") {
  if (channel === "sms") return MessageSquare;
  if (channel === "email") return Mail;
  return Phone;
}

export default function FollowUpsPage() {
  const t = useTranslations("dashboard");
  const { workspaceId } = useWorkspace();
  const searchParams = useSearchParams();
  const q = searchParams.toString() ? `?${searchParams.toString()}` : "";
  const [filter, setFilter] = useState<FilterKey>("all");
  const [liveItems, setLiveItems] = useState<FollowUpItem[] | null>(null);

  // Fetch real enrollment data from /api/sequences/
  useEffect(() => {
    if (!workspaceId) return;
    fetchWithFallback<{ id: string; name: string }[]>(
      `/api/sequences?workspace_id=${encodeURIComponent(workspaceId)}`,
      { credentials: "include" },
    ).then(async (seqRes) => {
      const sequences = seqRes.data;
      if (!sequences?.length) return;
      // For each sequence, get enrollments
      const allItems: FollowUpItem[] = [];
      for (const seq of sequences.slice(0, 5)) {
        try {
          const enrollRes = await fetchWithFallback<{ id: string; lead_id: string; status: string; current_step: number; next_step_due_at: string | null; leads?: { name: string; phone: string } }[]>(
            `/api/sequences/${seq.id}/enroll?workspace_id=${encodeURIComponent(workspaceId)}`,
            { credentials: "include" },
          );
          const enrollments = enrollRes.data;
          if (!enrollments?.length) continue;
          const stepsRes = await fetchWithFallback<{ id: string; step_order: number; type: string }[]>(
            `/api/sequences/${seq.id}/steps?workspace_id=${encodeURIComponent(workspaceId)}`,
            { credentials: "include" },
          );
          const steps = stepsRes.data ?? [];
          for (const e of enrollments) {
            const enrollment = e as { id: string; status: string; current_step: number; next_step_due_at: string | null; leads?: { name: string; phone: string } };
            const statusMap: Record<string, FollowUpStatus> = { active: "active", paused: "paused", completed: "completed", cancelled: "cancelled" };
            let status = statusMap[enrollment.status] ?? "active";
            if (status === "active" && enrollment.next_step_due_at && new Date(enrollment.next_step_due_at) < new Date()) {
              status = "overdue";
            }
            const currentStep = steps.find((s: { step_order: number }) => s.step_order === enrollment.current_step);
            allItems.push({
              id: enrollment.id,
              contactName: (enrollment.leads as { name: string } | undefined)?.name ?? "Contact",
              phone: (enrollment.leads as { phone: string } | undefined)?.phone ?? "",
              sequenceName: seq.name,
              currentStep: enrollment.current_step,
              totalSteps: steps.length,
              dueAt: enrollment.next_step_due_at ?? new Date().toISOString(),
              status,
              channel: ((currentStep as { type?: string })?.type as "sms" | "email" | "call") ?? "sms",
            });
          }
        } catch {
          // skip individual sequence errors
        }
      }
      if (allItems.length > 0) setLiveItems(allItems);
    });
  }, [workspaceId]);

  const now = useMemo(() => new Date(), []);

  const items = useMemo(() => {
    const source = liveItems ?? DEMO_FOLLOW_UPS;
    if (filter === "due") {
      return source.filter((f) => {
        const due = new Date(f.dueAt);
        return f.status === "active" && due <= new Date(now.getTime() + 24 * 60 * 60 * 1000);
      });
    }
    if (filter === "overdue") {
      return source.filter((f) => f.status === "overdue");
    }
    if (filter === "paused") {
      return source.filter((f) => f.status === "paused");
    }
    return source;
  }, [filter, now, liveItems]);

  const stats = useMemo(() => {
    const source = liveItems ?? DEMO_FOLLOW_UPS;
    const totalActive = source.filter((f) => f.status === "active").length;
    const completedThisWeek = liveItems
      ? source.filter((f) => f.status === "completed").length
      : 8;
    const successRate = liveItems
      ? (source.length > 0 ? Math.round((source.filter((f) => f.status === "completed").length / source.length) * 100) : 0)
      : 46;
    const dueToday = source.filter((f) => {
      const due = new Date(f.dueAt);
      return f.status === "active" && due.toDateString() === now.toDateString();
    }).length;
    return { totalActive, completedThisWeek, successRate, dueToday };
  }, [now, liveItems]);

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <PageHeader
        title={t("pages.followUps.title")}
        subtitle={t("pages.followUps.subtitle")}
      />

      {!workspaceId ? (
        <EmptyState
          icon="pulse"
          title={t("empty.selectContext")}
          subtitle={t("empty.followUpQueueAppearHere")}
        />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <StatCard label="Active follow-ups" value={stats.totalActive} />
            <StatCard label="Due today" value={stats.dueToday} />
            <StatCard label="Completed this week" value={stats.completedThisWeek} />
            <StatCard label="Success rate" value={stats.successRate} suffix="%" />
          </div>

          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-xs text-[var(--text-tertiary)]">
              {!liveItems && (
                <>
                  <span className="px-2 py-0.5 rounded-full border border-amber-500/40 bg-amber-500/10 text-amber-300">
                    Sample data
                  </span>
                  <span>Sequences will appear here once live traffic starts.</span>
                </>
              )}
            </div>
            <div className="inline-flex rounded-full border border-[var(--border-default)] bg-[var(--bg-base)] p-1 text-xs">
              {[
                { key: "all" as FilterKey, label: "All" },
                { key: "due" as FilterKey, label: "Due today" },
                { key: "overdue" as FilterKey, label: "Overdue" },
                { key: "paused" as FilterKey, label: "Paused" },
              ].map((f) => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setFilter(f.key)}
                  className={`px-3 py-1.5 rounded-full transition-[background-color,color] duration-[var(--duration-fast)] ease-[var(--ease-out-expo)] active:scale-[0.97] ${
                    filter === f.key
                      ? "bg-emerald-500 text-black"
                      : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {items.length === 0 ? (
            <EmptyState
              icon="calendar"
              title="No pending follow-ups"
              subtitle="Create a sequence or campaign to start filling this queue."
            />
          ) : (
            <div
              className="rounded-2xl border overflow-hidden"
              style={{ borderColor: "var(--border-default)", background: "var(--bg-surface)" }}
            >
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-[var(--border-default)]/80">
                    <th className="py-3 px-4 font-medium text-[var(--text-tertiary)]">Contact</th>
                    <th className="py-3 px-4 font-medium text-[var(--text-tertiary)]">Sequence</th>
                    <th className="py-3 px-4 font-medium text-[var(--text-tertiary)]">Step</th>
                    <th className="py-3 px-4 font-medium text-[var(--text-tertiary)]">Due</th>
                    <th className="py-3 px-4 font-medium text-[var(--text-tertiary)]">Status</th>
                    <th className="py-3 px-4 font-medium text-[var(--text-tertiary)]">Channel</th>
                    <th className="py-3 px-4 font-medium text-[var(--text-tertiary)] text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => {
                    const cfg = statusConfig(item.status);
                    const Icon = channelIcon(item.channel);
                    const due = new Date(item.dueAt);
                    const isOverdue = item.status === "overdue";
                    return (
                      <tr
                        key={item.id}
                        className="border-t border-[var(--border-default)]/60 hover:bg-[var(--bg-card)]/60 transition-[background-color] duration-[var(--duration-fast)] ease-[var(--ease-out-expo)]"
                      >
                        <td className="py-3 px-4">
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-[var(--text-primary)]">
                              {item.contactName}
                            </span>
                            <span className="text-xs text-[var(--text-tertiary)]">
                              {item.phone}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-sm text-[var(--text-primary)]">
                            {item.sequenceName}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-xs text-[var(--text-tertiary)]">
                            Step {item.currentStep} of {item.totalSteps}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${
                              isOverdue
                                ? "bg-red-500/10 text-red-400"
                                : "bg-[var(--bg-inset)] text-[var(--text-secondary)]"
                            }`}
                          >
                            <Clock className="w-3 h-3" />
                            {due.toLocaleString()}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs ${cfg.color}`}
                          >
                            {cfg.label}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center gap-1 text-xs text-[var(--text-secondary)]">
                            <Icon className="w-3 h-3" />
                            {item.channel.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-end gap-2 text-xs">
                            {item.status === "paused" ? (
                              <button
                                type="button"
                                className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 px-2 py-1 text-emerald-300 hover:bg-emerald-500/10 transition-[background-color,border-color] duration-[var(--duration-fast)] ease-[var(--ease-out-expo)] active:scale-[0.97]"
                              >
                                <Play className="w-3 h-3" />
                                Resume
                              </button>
                            ) : (
                              <button
                                type="button"
                                className="inline-flex items-center gap-1 rounded-full border border-[var(--border-default)] px-2 py-1 text-[var(--text-primary)] hover:bg-[var(--bg-inset)]/80 transition-[background-color,border-color] duration-[var(--duration-fast)] ease-[var(--ease-out-expo)] active:scale-[0.97]"
                              >
                                <Pause className="w-3 h-3" />
                                Pause
                              </button>
                            )}
                            <button
                              type="button"
                              className="inline-flex items-center gap-1 rounded-full border border-[var(--border-default)] px-2 py-1 text-[var(--text-primary)] hover:bg-[var(--bg-inset)]/80 transition-[background-color,border-color] duration-[var(--duration-fast)] ease-[var(--ease-out-expo)] active:scale-[0.97]"
                            >
                              <SkipForward className="w-3 h-3" />
                              Skip
                            </button>
                            <button
                              type="button"
                              className="inline-flex items-center gap-1 rounded-full border border-red-500/40 px-2 py-1 text-red-400 hover:bg-red-500/10 transition-[background-color,border-color] duration-[var(--duration-fast)] ease-[var(--ease-out-expo)] active:scale-[0.97]"
                            >
                              <XCircle className="w-3 h-3" />
                              Cancel
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <p className="mt-4 text-sm text-[var(--text-tertiary)]">
            <Link href={`/dashboard/record${q}`} className="underline">
              {t("followUpsPage.viewRecord")}
            </Link>
          </p>
        </>
      )}
    </div>
  );
}
