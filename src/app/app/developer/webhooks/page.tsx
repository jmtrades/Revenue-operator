"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Webhook,
  Plus,
  ChevronDown,
  ChevronRight,
  Send,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useWorkspace } from "@/components/WorkspaceContext";

const EVENT_TYPES = [
  "call.started",
  "call.completed",
  "call.failed",
  "lead.created",
  "lead.updated",
  "lead.converted",
  "appointment.booked",
  "appointment.completed",
  "campaign.completed",
  "payment.received",
] as const;

type Endpoint = {
  id: string;
  url: string;
  events: string[];
  enabled: boolean;
  has_secret: boolean;
  created_at: string;
  updated_at?: string;
};

type Delivery = {
  id: string;
  event: string;
  payload: unknown;
  response_status: number | null;
  response_time_ms: number | null;
  success: boolean;
  created_at: string;
};

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function DeveloperWebhooksPage() {
  const { workspaceId } = useWorkspace();
  const [endpoints, setEndpoints] = useState<Endpoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deliveriesByEndpoint, setDeliveriesByEndpoint] = useState<Record<string, Delivery[]>>({});
  const [addModal, setAddModal] = useState(false);
  const [formUrl, setFormUrl] = useState("");
  const [formSecret, setFormSecret] = useState("");
  const [formEvents, setFormEvents] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<Endpoint | null>(null);
  const [payloadExpand, setPayloadExpand] = useState<string | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [retryingId, setRetryingId] = useState<string | null>(null);

  const fetchEndpoints = useCallback(() => {
    if (!workspaceId) return;
    setLoading(true);
    fetch("/api/developer/webhooks", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : { endpoints: [] }))
      .then((data: { endpoints?: Endpoint[] }) => setEndpoints(data.endpoints ?? []))
      .catch(() => setEndpoints([]))
      .finally(() => setLoading(false));
  }, [workspaceId]);

  useEffect(() => {
    fetchEndpoints();
  }, [fetchEndpoints]);

  const fetchDeliveries = useCallback((id: string) => {
    fetch(`/api/developer/webhooks/${id}?limit=30`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : { deliveries: [] }))
      .then((data: { deliveries?: Delivery[] }) =>
        setDeliveriesByEndpoint((prev) => ({ ...prev, [id]: data.deliveries ?? [] }))
      )
      .catch(() => setDeliveriesByEndpoint((prev) => ({ ...prev, [id]: [] })));
  }, []);

  useEffect(() => {
    if (expandedId) fetchDeliveries(expandedId);
  }, [expandedId, fetchDeliveries]);

  const toggleEvent = (e: string) => {
    setFormEvents((prev) => (prev.includes(e) ? prev.filter((x) => x !== e) : [...prev, e]));
  };

  const handleAdd = () => {
    if (!formUrl.trim()) return;
    setSaving(true);
    fetch("/api/developer/webhooks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ url: formUrl.trim(), secret: formSecret.trim() || undefined, events: formEvents }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((created) => {
        if (created) {
          setEndpoints((prev) => [created, ...prev]);
          setAddModal(false);
          setFormUrl("");
          setFormSecret("");
          setFormEvents([]);
        }
      })
      .finally(() => setSaving(false));
  };

  const handleTest = (id: string) => {
    setTestingId(id);
    fetch(`/api/developer/webhooks/${id}/test`, { method: "POST", credentials: "include" })
      .then((r) => r.json())
      .then(() => {
        if (expandedId === id) fetchDeliveries(id);
      })
      .finally(() => setTestingId(null));
  };

  const handleRetry = (deliveryId: string) => {
    setRetryingId(deliveryId);
    fetch(`/api/developer/webhooks/deliveries/${deliveryId}/retry`, {
      method: "POST",
      credentials: "include",
    })
      .then((r) => r.json())
      .then(() => {
        if (expandedId) fetchDeliveries(expandedId);
      })
      .finally(() => setRetryingId(null));
  };

  const handleDelete = (ep: Endpoint) => {
    fetch(`/api/developer/webhooks/${ep.id}`, { method: "DELETE", credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((ok) => {
        if (ok) {
          setEndpoints((prev) => prev.filter((e) => e.id !== ep.id));
          setDeleteConfirm(null);
          if (expandedId === ep.id) setExpandedId(null);
        }
      });
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6">
      <div className="flex items-center gap-2 text-sm text-zinc-500 mb-2">
        <Link href="/app/developer" className="hover:text-white transition-colors">
          Developer
        </Link>
        <span>/</span>
        <span className="text-white">Webhooks</span>
      </div>
      <h1 className="text-xl font-semibold text-white mb-1">Webhooks</h1>
      <p className="text-sm text-zinc-400 mb-6">
        Send events to your endpoint. Configure URL, events, and a secret for signature verification.
      </p>

      <div className="flex justify-end mb-4">
        <button
          type="button"
          onClick={() => setAddModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-black font-semibold text-sm hover:bg-zinc-200"
        >
          <Plus className="w-4 h-4" /> Add endpoint
        </button>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-8 text-center text-zinc-500">
          Loading…
        </div>
      ) : endpoints.length === 0 ? (
        <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-8 text-center text-zinc-500">
          <Webhook className="w-10 h-10 mx-auto mb-3 opacity-50" />
          <p>No webhook endpoints yet. Add one to receive call, lead, and appointment events.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {endpoints.map((ep) => (
            <div
              key={ep.id}
              className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] overflow-hidden"
            >
              <div className="flex items-center justify-between p-4">
                <button
                  type="button"
                  onClick={() => setExpandedId(expandedId === ep.id ? null : ep.id)}
                  className="flex items-center gap-3 min-w-0 text-left"
                >
                  {expandedId === ep.id ? (
                    <ChevronDown className="w-4 h-4 text-zinc-500 shrink-0" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-zinc-500 shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className="font-mono text-sm text-white truncate">{ep.url}</p>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      {ep.events.length} events · {ep.has_secret ? "Secret set" : "No secret"}
                    </p>
                  </div>
                </button>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleTest(ep.id)}
                    disabled={!!testingId}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border border-[var(--border-medium)] text-zinc-300 hover:border-zinc-500"
                  >
                    <Send className="w-3.5 h-3.5" /> {testingId === ep.id ? "Sending…" : "Test"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteConfirm(ep)}
                    className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10"
                    aria-label="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {expandedId === ep.id && (
                <div className="border-t border-[var(--border-default)] p-4 bg-black/20">
                  <p className="text-xs font-medium text-zinc-400 mb-3">Delivery log</p>
                  {(!deliveriesByEndpoint[ep.id] || deliveriesByEndpoint[ep.id].length === 0) ? (
                    <p className="text-xs text-zinc-500">No deliveries yet. Use Test to send a sample.</p>
                  ) : (
                    <ul className="space-y-2">
                      {(deliveriesByEndpoint[ep.id] ?? []).map((d) => (
                        <li
                          key={d.id}
                          className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] p-3 text-sm"
                        >
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <span className="text-zinc-300">{d.event}</span>
                            <span className="text-xs text-zinc-500">{formatTime(d.created_at)}</span>
                          </div>
                          <div className="flex items-center gap-3 mt-1.5 text-xs">
                            <span className={d.success ? "text-green-500" : "text-red-400"}>
                              {d.response_status ?? "—"} {d.response_time_ms != null ? `· ${d.response_time_ms} ms` : ""}
                            </span>
                            {!d.success && (
                              <button
                                type="button"
                                onClick={() => handleRetry(d.id)}
                                disabled={!!retryingId}
                                className="inline-flex items-center gap-1 text-[var(--accent-primary)] hover:underline"
                              >
                                <RefreshCw className="w-3 h-3" /> {retryingId === d.id ? "Retrying…" : "Retry"}
                              </button>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => setPayloadExpand(payloadExpand === d.id ? null : d.id)}
                            className="mt-2 text-xs text-zinc-500 hover:text-white"
                          >
                            {payloadExpand === d.id ? "Hide payload" : "Show payload"}
                          </button>
                          {payloadExpand === d.id && (
                            <pre className="mt-2 p-2 rounded-lg bg-black/40 text-[10px] text-zinc-400 overflow-x-auto max-h-40 overflow-y-auto">
                              {JSON.stringify(d.payload, null, 2)}
                            </pre>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {addModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70"
          onClick={(e) => e.target === e.currentTarget && setAddModal(false)}
        >
          <div
            className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-2xl w-full max-w-md p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-white mb-4">Add webhook endpoint</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">URL</label>
                <input
                  type="url"
                  value={formUrl}
                  onChange={(e) => setFormUrl(e.target.value)}
                  placeholder="https://your-server.com/webhooks/recall"
                  className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-white placeholder:text-zinc-500 focus:outline-none focus:border-[var(--border-medium)] text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Secret (optional)</label>
                <input
                  type="password"
                  value={formSecret}
                  onChange={(e) => setFormSecret(e.target.value)}
                  placeholder="whsec_..."
                  className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-white placeholder:text-zinc-500 focus:outline-none focus:border-[var(--border-medium)] text-sm"
                />
                <p className="text-[11px] text-zinc-500 mt-1">Used for X-Webhook-Signature: sha256=...</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-2">Events</label>
                <div className="flex flex-wrap gap-2">
                  {EVENT_TYPES.map((e) => (
                    <label key={e} className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formEvents.includes(e)}
                        onChange={() => toggleEvent(e)}
                        className="rounded border-[var(--border-medium)] text-white"
                      />
                      <span className="text-xs text-zinc-300">{e}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                type="button"
                onClick={() => setAddModal(false)}
                className="px-4 py-2 rounded-xl text-sm text-zinc-400 hover:text-white border border-[var(--border-medium)]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAdd}
                disabled={!formUrl.trim() || saving}
                className="px-4 py-2 rounded-xl text-sm font-semibold bg-white text-black hover:bg-zinc-200 disabled:opacity-50"
              >
                {saving ? "Adding…" : "Add"}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <ConfirmDialog
          open
          title="Delete webhook endpoint?"
          message={`Remove ${deleteConfirm.url}? Delivery history will be deleted.`}
          confirmLabel="Delete"
          variant="danger"
          onConfirm={() => handleDelete(deleteConfirm)}
          onClose={() => setDeleteConfirm(null)}
        />
      )}
    </div>
  );
}
