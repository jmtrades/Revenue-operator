"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Bell, Check, CheckCheck, Settings } from "lucide-react";
import { useWorkspace } from "@/components/WorkspaceContext";
import { cn } from "@/lib/cn";

export type NotificationItem = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  metadata: Record<string, unknown>;
  read: boolean;
  created_at: string;
};

const TYPE_LABELS: Record<string, string> = {
  new_lead: "New lead",
  call_completed: "Call completed",
  appointment_booked: "Appointment booked",
  campaign_milestone: "Campaign",
  quality_alert: "Quality alert",
  billing_event: "Billing",
  system_update: "System",
};

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffM = Math.floor(diffMs / 60000);
  if (diffM < 1) return "Just now";
  if (diffM < 60) return `${diffM}m ago`;
  const diffH = Math.floor(diffM / 60);
  if (diffH < 24) return `${diffH}h ago`;
  const diffD = Math.floor(diffH / 24);
  if (diffD === 1) return "Yesterday";
  if (diffD < 7) return `${diffD}d ago`;
  return d.toLocaleDateString();
}

export function NotificationCenter({
  open,
  onClose,
  onToggle,
  anchorRef,
}: {
  open: boolean;
  onClose: () => void;
  onToggle: () => void;
  anchorRef?: React.RefObject<HTMLButtonElement | null>;
}) {
  const { workspaceId } = useWorkspace();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!workspaceId) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/notifications?workspace_id=${encodeURIComponent(workspaceId)}&limit=50`,
        { credentials: "include" }
      );
      if (!res.ok) return;
      const data = (await res.json()) as {
        notifications?: NotificationItem[];
        unreadCount?: number;
      };
      setNotifications(data.notifications ?? []);
      setUnreadCount(data.unreadCount ?? 0);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    if (open && workspaceId) void fetchNotifications();
  }, [open, workspaceId, fetchNotifications]);

  const markRead = useCallback(
    async (id: string) => {
      try {
        await fetch(`/api/notifications/${id}`, {
          method: "PATCH",
          credentials: "include",
        });
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, read: true } : n))
        );
        setUnreadCount((c) => Math.max(0, c - 1));
      } catch {
        // ignore
      }
    },
    []
  );

  const markAllRead = useCallback(async () => {
    if (!workspaceId) return;
    try {
      await fetch(
        `/api/notifications?workspace_id=${encodeURIComponent(workspaceId)}`,
        { method: "PATCH", credentials: "include" }
      );
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch {
      // ignore
    }
  }, [workspaceId]);

  const byType = notifications.reduce(
    (acc, n) => {
      const t = n.type in TYPE_LABELS ? n.type : "system_update";
      if (!acc[t]) acc[t] = [];
      acc[t].push(n);
      return acc;
    },
    {} as Record<string, NotificationItem[]>
  );
  const typeOrder = [
    "new_lead",
    "call_completed",
    "appointment_booked",
    "campaign_milestone",
    "quality_alert",
    "billing_event",
    "system_update",
  ];

  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        onClick={onToggle}
        className="relative p-2 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/[0.03] transition-all duration-150 focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/50 focus-visible:outline-none"
        aria-label="Notifications"
        aria-expanded={open}
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-[var(--accent-danger)] px-1 text-[10px] font-medium text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>
      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={onClose}
            aria-hidden
          />
          <div className="fixed right-4 top-16 z-50 w-[380px] max-w-[calc(100vw-2rem)] bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[min(80vh,420px)]">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-default)] shrink-0">
              <h3 className="text-sm font-medium text-[var(--text-primary)]">
                Notifications
              </h3>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={markAllRead}
                    className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/[0.04]"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    Mark all read
                  </button>
                )}
                <Link
                  href="/app/settings/notifications"
                  onClick={onClose}
                  className="p-2 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/[0.04]"
                  aria-label="Notification preferences"
                >
                  <Settings className="w-4 h-4" />
                </Link>
              </div>
            </div>
            <div className="overflow-y-auto flex-1 min-h-0">
              {loading && notifications.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-[var(--text-secondary)]">
                  Loading…
                </div>
              ) : notifications.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <Bell className="w-8 h-8 text-[var(--text-secondary)]/50 mx-auto mb-2" />
                  <p className="text-sm text-[var(--text-secondary)]">
                    No notifications yet
                  </p>
                  <p className="text-xs text-[var(--text-secondary)]/70 mt-1">
                    You&apos;ll see call alerts and system updates here
                  </p>
                </div>
              ) : (
                <div className="py-2">
                  {typeOrder.map(
                    (type) =>
                      byType[type]?.length > 0 && (
                        <div key={type} className="mb-4 last:mb-0">
                          <p className="px-4 py-1 text-[10px] font-medium uppercase tracking-wide text-[var(--text-secondary)]">
                            {TYPE_LABELS[type] ?? type}
                          </p>
                          {byType[type].map((n) => (
                            <div
                              key={n.id}
                              className={cn(
                                "flex gap-3 px-4 py-2.5 border-l-2 transition-colors",
                                n.read
                                  ? "border-transparent bg-transparent"
                                  : "border-[var(--accent-primary)]/50 bg-white/[0.02]"
                              )}
                            >
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                                  {n.title}
                                </p>
                                {n.body && (
                                  <p className="text-xs text-[var(--text-secondary)] mt-0.5 line-clamp-2">
                                    {n.body}
                                  </p>
                                )}
                                <p className="text-[11px] text-[var(--text-secondary)]/70 mt-1">
                                  {formatTime(n.created_at)}
                                </p>
                              </div>
                              {!n.read && (
                                <button
                                  type="button"
                                  onClick={() => markRead(n.id)}
                                  className="shrink-0 p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/[0.04]"
                                  aria-label="Mark as read"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      )
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
