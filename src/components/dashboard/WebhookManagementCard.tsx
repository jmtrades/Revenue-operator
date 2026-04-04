"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Webhook,
  Plus,
  Pause,
  Play,
  Send,
  CheckCircle,
  XCircle,
  Copy,
} from "lucide-react";
import { useWorkspaceSafe } from "@/components/WorkspaceContext";

interface WebhookEndpoint {
  id: string;
  url: string;
  events: string[];
  active: boolean;
  created_at: string;
  deliveries_total: number;
  deliveries_success: number;
  deliveries_failed: number;
  last_delivery_at: string | null;
}

interface WebhooksResponse {
  endpoints: WebhookEndpoint[];
}

export function WebhookManagementCard() {
  const ws = useWorkspaceSafe();
  const workspaceId = ws?.workspaceId ?? "";
  const [endpoints, setEndpoints] = useState<WebhookEndpoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newUrl, setNewUrl] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const availableEvents = [
    "call.completed",
    "call.failed",
    "message.sent",
    "message.received",
    "voice.test.completed",
  ];

  const load = useCallback(() => {
    if (!workspaceId) {
      setLoading(false);
      return;
    }
    fetch(`/api/webhooks/manage?workspace_id=${encodeURIComponent(workspaceId)}`, {
      credentials: "include",
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: WebhooksResponse | null) => {
        setEndpoints(data?.endpoints ?? []);
      })
      .catch(() => setEndpoints([]))
      .finally(() => setLoading(false));
  }, [workspaceId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleAddEndpoint = async () => {
    if (!newUrl.trim() || selectedEvents.length === 0) return;

    setSubmitting(true);
    try {
      const response = await fetch("/api/webhooks/manage", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspace_id: workspaceId,
          url: newUrl,
          events: selectedEvents,
        }),
      });

      if (response.ok) {
        setNewUrl("");
        setSelectedEvents([]);
        setShowForm(false);
        await load();
      }
    } catch (error) {
      console.error("Failed to add endpoint:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      const response = await fetch("/api/webhooks/manage", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspace_id: workspaceId,
          endpoint_id: id,
          active: !currentStatus,
        }),
      });

      if (response.ok) {
        await load();
      }
    } catch (error) {
      console.error("Failed to toggle status:", error);
    }
  };

  const handleTestEndpoint = async (id: string) => {
    try {
      await fetch("/api/webhooks/manage", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspace_id: workspaceId,
          endpoint_id: id,
          action: "test",
        }),
      });
    } catch (error) {
      console.error("Failed to send test event:", error);
    }
  };

  const handleCopyUrl = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (loading) {
    return (
      <div className="dash-section p-5 md:p-6">
        <div className="h-5 w-44 rounded bg-[var(--bg-hover)] mb-4 skeleton-shimmer" />
        <div className="h-24 rounded-lg bg-[var(--bg-hover)] skeleton-shimmer" />
      </div>
    );
  }

  return (
    <div className="dash-section p-5 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Webhook className="w-4 h-4 text-cyan-400" />
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">
            Webhook Endpoints
          </h2>
          {endpoints.length > 0 && (
            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400">
              {endpoints.length} endpoint{endpoints.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="text-xs text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors inline-flex items-center gap-1"
        >
          <Plus className="w-3 h-3" />
          Add
        </button>
      </div>

      {showForm && (
        <div className="mb-4 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-4">
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-[var(--text-secondary)] block mb-1.5">
                Webhook URL
              </label>
              <input
                type="url"
                placeholder="https://your-server.com/webhook"
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--border-default)] bg-[var(--bg-hover)] text-[var(--text-primary)] placeholder-[var(--text-tertiary)]"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-[var(--text-secondary)] block mb-1.5">
                Subscribe to Events
              </label>
              <div className="space-y-2">
                {availableEvents.map((event) => (
                  <label key={event} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedEvents.includes(event)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedEvents([...selectedEvents, event]);
                        } else {
                          setSelectedEvents(
                            selectedEvents.filter((e) => e !== event)
                          );
                        }
                      }}
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-xs text-[var(--text-secondary)]">
                      {event}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={handleAddEndpoint}
                disabled={submitting || !newUrl.trim() || selectedEvents.length === 0}
                className="flex-1 px-3 py-2 text-xs font-medium rounded-lg bg-cyan-500 text-white hover:bg-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? "Creating..." : "Create Endpoint"}
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="px-3 py-2 text-xs font-medium rounded-lg border border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {endpoints.length === 0 ? (
        <div className="py-6 text-center">
          <p className="text-sm text-[var(--text-secondary)]">
            No webhook endpoints. Set up webhooks to receive events in real-time.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {endpoints.map((endpoint) => {
            const successRate =
              endpoint.deliveries_total > 0
                ? ((endpoint.deliveries_success / endpoint.deliveries_total) * 100).toFixed(1)
                : "—";
            const truncatedUrl =
              endpoint.url.length > 50
                ? endpoint.url.substring(0, 47) + "..."
                : endpoint.url;

            return (
              <div
                key={endpoint.id}
                className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-4"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                        {truncatedUrl}
                      </p>
                      <button
                        onClick={() => handleCopyUrl(endpoint.url, endpoint.id)}
                        className="flex-shrink-0 p-1 hover:bg-[var(--bg-hover)] rounded transition-colors"
                        title="Copy URL"
                      >
                        <Copy className="w-3 h-3 text-[var(--text-tertiary)]" />
                      </button>
                    </div>
                    <p className="text-xs text-[var(--text-tertiary)]">
                      {endpoint.events.join(", ")}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 ml-2">
                    <span
                      className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-full ${
                        endpoint.active
                          ? "bg-emerald-500/10 text-emerald-400"
                          : "bg-slate-500/10 text-slate-400"
                      }`}
                    >
                      {endpoint.active ? "Active" : "Paused"}
                    </span>
                  </div>
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-3 gap-2 mb-3 py-3 border-t border-b border-[var(--border-default)]">
                  <div className="text-center">
                    <p className="text-xs text-[var(--text-tertiary)] mb-0.5">
                      Deliveries
                    </p>
                    <p className="text-sm font-semibold text-[var(--text-primary)]">
                      {endpoint.deliveries_total}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-[var(--text-tertiary)] mb-0.5">
                      Success Rate
                    </p>
                    <p className="text-sm font-semibold text-emerald-400">
                      {successRate}%
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-[var(--text-tertiary)] mb-0.5">
                      Last Delivery
                    </p>
                    <p className="text-sm font-semibold text-[var(--text-primary)]">
                      {endpoint.last_delivery_at
                        ? new Date(endpoint.last_delivery_at).toLocaleDateString()
                        : "—"}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleToggleStatus(endpoint.id, endpoint.active)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors"
                  >
                    {endpoint.active ? (
                      <>
                        <Pause className="w-3 h-3" />
                        Pause
                      </>
                    ) : (
                      <>
                        <Play className="w-3 h-3" />
                        Resume
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => handleTestEndpoint(endpoint.id)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors"
                  >
                    <Send className="w-3 h-3" />
                    Test
                  </button>
                </div>

                {/* Delivery summary line */}
                {endpoint.deliveries_total > 0 && (
                  <div className="mt-3 pt-3 border-t border-[var(--border-default)] flex items-center gap-2 text-xs text-[var(--text-tertiary)]">
                    <CheckCircle className="w-3 h-3 text-emerald-400" />
                    <span>{endpoint.deliveries_success} successful</span>
                    {endpoint.deliveries_failed > 0 && (
                      <>
                        <XCircle className="w-3 h-3 text-red-400 ml-2" />
                        <span>{endpoint.deliveries_failed} failed</span>
                      </>
                    )}
                  </div>
                )}

                {copiedId === endpoint.id && (
                  <div className="mt-2 text-xs text-emerald-400">
                    URL copied to clipboard
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
