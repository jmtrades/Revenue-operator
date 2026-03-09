"use client";

import { useState, useCallback } from "react";
import {
  Key,
  Webhook,
  ListOrdered,
  Plus,
  MoreVertical,
  Copy,
  X,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import type {
  ApiKeyRow,
  ApiKeyPermission,
  WebhookRow,
  WebhookEvent,
  EventLogRow,
  EventLogKind,
  EventLogStatus,
} from "@/lib/mock/developer";

type TabId = "keys" | "webhooks" | "events";

function formatRelative(timestamp: string): string {
  const d = new Date(timestamp).getTime();
  const diff = Date.now() - d;
  const min = Math.floor(diff / 60000);
  const hour = Math.floor(diff / 3600000);
  const day = Math.floor(diff / 86400000);
  if (min < 1) return "Just now";
  if (min < 60) return `${min} min ago`;
  if (hour < 24) return `${hour} hr ago`;
  if (day < 7) return `${day} days ago`;
  return new Date(timestamp).toLocaleDateString();
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function maskKey(prefix: string, suffix: string): string {
  return `${prefix}****...****${suffix}`;
}

function copyToClipboard(text: string, onCopied: () => void) {
  if (typeof navigator?.clipboard?.writeText === "function") {
    navigator.clipboard.writeText(text).then(() => onCopied());
  } else {
    onCopied();
  }
}

// ----- API Keys tab -----
function ApiKeysTab({
  keys,
  onRevoke,
  onCreate,
  onCopyKey,
}: {
  keys: ApiKeyRow[];
  onRevoke: (id: string) => void;
  onCreate: (label: string, permission: ApiKeyPermission) => void;
  onCopyKey: (fullKey: string) => void;
}) {
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [revokeId, setRevokeId] = useState<string | null>(null);
  const [createModal, setCreateModal] = useState(false);
  const [newKeyModal, setNewKeyModal] = useState<{ label: string; fullKey: string } | null>(null);
  const [createLabel, setCreateLabel] = useState("");
  const [createPermission, setCreatePermission] = useState<ApiKeyPermission>("read_write");

  const handleCreateSubmit = () => {
    if (!createLabel.trim()) return;
    const fullKey = `sk_live_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
    onCreate(createLabel.trim(), createPermission);
    setNewKeyModal({ label: createLabel.trim(), fullKey });
    setCreateModal(false);
    setCreateLabel("");
    setCreatePermission("read_write");
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setCreateModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-black font-semibold text-sm hover:bg-zinc-200"
        >
          <Plus className="w-4 h-4" />
          Create API Key
        </button>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block rounded-xl border border-[var(--border-default)] overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-[var(--bg-card)]/80 border-b border-[var(--border-default)]">
            <tr>
              <th className="py-3 px-4 font-medium text-zinc-400">Label</th>
              <th className="py-3 px-4 font-medium text-zinc-400">Key</th>
              <th className="py-3 px-4 font-medium text-zinc-400">Permissions</th>
              <th className="py-3 px-4 font-medium text-zinc-400">Created</th>
              <th className="py-3 px-4 font-medium text-zinc-400">Last Used</th>
              <th className="py-3 px-4 font-medium text-zinc-400">Status</th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {keys.filter((k) => k.status === "active").map((key) => (
              <tr key={key.id} className="border-b border-[var(--border-default)]/80 hover:bg-[var(--bg-card)]">
                <td className="py-3 px-4 text-white font-medium">{key.label}</td>
                <td className="py-3 px-4">
                  <span className="font-mono text-zinc-400">{maskKey(key.keyPrefix, key.keySuffix)}</span>
                  <button
                    type="button"
                    onClick={() => {
                      copyToClipboard(key.fullKey, () => onCopyKey(key.fullKey));
                    }}
                    className="ml-2 inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium text-zinc-400 hover:text-white hover:bg-[var(--bg-card)]"
                  >
                    <Copy className="w-3 h-3" /> Copy
                  </button>
                </td>
                <td className="py-3 px-4">
                  <span className="inline-flex px-2 py-0.5 rounded-md text-[10px] font-medium bg-zinc-700 text-zinc-300">
                    {key.permission === "admin" ? "Admin" : key.permission === "read_write" ? "Read/Write" : "Read only"}
                  </span>
                </td>
                <td className="py-3 px-4 text-zinc-500">{formatDate(key.createdAt)}</td>
                <td className="py-3 px-4 text-zinc-500">{formatRelative(key.lastUsedAt)}</td>
                <td className="py-3 px-4">
                  <span className="text-emerald-400 text-xs">Active</span>
                </td>
                <td className="py-3 px-2 relative">
                  <button
                    type="button"
                    onClick={() => setMenuOpen(menuOpen === key.id ? null : key.id)}
                    className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-[var(--bg-card)]"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>
                  {menuOpen === key.id && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(null)} />
                      <div className="absolute right-2 top-10 z-20 py-1 rounded-lg bg-[var(--bg-card)] border border-[var(--border-medium)] shadow-xl">
                        <button
                          type="button"
                          onClick={() => {
                            setRevokeId(key.id);
                            setMenuOpen(null);
                          }}
                          className="block w-full text-left px-3 py-2 text-sm text-[var(--accent-red)] hover:bg-[var(--bg-hover)]"
                        >
                          Revoke
                        </button>
                      </div>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {keys.filter((k) => k.status === "active").map((key) => (
          <div
            key={key.id}
            className="p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border-default)] space-y-2"
          >
            <div className="flex items-start justify-between">
              <span className="font-medium text-white">{key.label}</span>
              <span className="text-emerald-400 text-xs">Active</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs text-zinc-500">{maskKey(key.keyPrefix, key.keySuffix)}</span>
              <button
                type="button"
                onClick={() => copyToClipboard(key.fullKey, () => onCopyKey(key.fullKey))}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-zinc-400 hover:text-white hover:bg-[var(--bg-card)]"
              >
                <Copy className="w-3 h-3" /> Copy
              </button>
            </div>
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <span className="px-2 py-0.5 rounded bg-[var(--bg-card)] text-zinc-400">
                {key.permission === "admin" ? "Admin" : key.permission === "read_write" ? "Read/Write" : "Read only"}
              </span>
              <span>Created {formatDate(key.createdAt)}</span>
              <span>Used {formatRelative(key.lastUsedAt)}</span>
            </div>
            <button
              type="button"
              onClick={() => setRevokeId(key.id)}
              className="text-xs text-[var(--accent-red)] hover:underline"
            >
              Revoke key
            </button>
          </div>
        ))}
      </div>

      {/* Create key modal */}
      {createModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70" onClick={(e) => e.target === e.currentTarget && setCreateModal(false)}>
          <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-white mb-4">Create API Key</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Label</label>
                <input
                  type="text"
                  value={createLabel}
                  onChange={(e) => setCreateLabel(e.target.value)}
                  placeholder="e.g. Production"
                  className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-medium)] text-white placeholder:text-zinc-500 focus:outline-none focus:border-[var(--border-medium)] text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-2">Permissions</label>
                <div className="space-y-2">
                  {(["read", "read_write", "admin"] as const).map((p) => (
                    <label key={p} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="permission"
                        checked={createPermission === p}
                        onChange={() => setCreatePermission(p)}
                        className="rounded-full border-[var(--border-medium)] text-white focus:ring-[var(--border-medium)]"
                      />
                      <span className="text-sm text-zinc-300">
                        {p === "read" ? "Read only" : p === "read_write" ? "Read + Write" : "Admin"}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button type="button" onClick={() => setCreateModal(false)} className="px-4 py-2 rounded-xl text-sm text-zinc-400 hover:text-white border border-[var(--border-medium)]">
                Cancel
              </button>
              <button type="button" onClick={handleCreateSubmit} disabled={!createLabel.trim()} className="px-4 py-2 rounded-xl text-sm font-semibold bg-white text-black hover:bg-zinc-200 disabled:opacity-50">
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New key shown once */}
      {newKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70" onClick={(e) => e.target === e.currentTarget && setNewKeyModal(null)}>
          <div className="bg-[var(--bg-card)] border border-amber-500/30 rounded-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-amber-200 mb-2">API Key created: {newKeyModal.label}</h3>
            <p className="text-sm text-amber-200/80 mb-4">Save this key — you won&apos;t see it again.</p>
            <div className="p-3 rounded-xl bg-black/40 border border-[var(--border-medium)] mb-4">
              <code className="font-mono text-xs text-zinc-300 break-all">{newKeyModal.fullKey}</code>
            </div>
            <button
              type="button"
              onClick={() => {
                copyToClipboard(newKeyModal.fullKey, () => onCopyKey(newKeyModal.fullKey));
              }}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white text-black font-semibold text-sm hover:bg-zinc-200"
            >
              <Copy className="w-4 h-4" /> Copy key
            </button>
            <button type="button" onClick={() => setNewKeyModal(null)} className="w-full mt-2 px-4 py-2 rounded-xl text-sm text-zinc-400 hover:text-white border border-[var(--border-medium)]">
              I&apos;ve saved it
            </button>
          </div>
        </div>
      )}

      {/* Revoke confirm */}
      {revokeId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70" onClick={(e) => e.target === e.currentTarget && setRevokeId(null)}>
          <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-2xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-white mb-2">Revoke API key?</h3>
            <p className="text-sm text-zinc-400 mb-4">This key will stop working immediately. This can&apos;t be undone.</p>
            <div className="flex gap-2">
              <button type="button" onClick={() => setRevokeId(null)} className="flex-1 py-2 rounded-xl text-sm text-zinc-300 border border-[var(--border-medium)] hover:bg-[var(--bg-card)]">Cancel</button>
              <button type="button" onClick={() => { onRevoke(revokeId); setRevokeId(null); }} className="flex-1 py-2 rounded-xl text-sm font-semibold bg-red-600 text-white hover:bg-red-500">Revoke</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// ----- Webhooks tab -----
const AVAILABLE_WEBHOOK_EVENT_TYPES: WebhookEvent[] = [
  "call.started",
  "call.completed",
  "call.failed",
  "lead.created",
  "appointment.booked",
  "sentiment.flagged",
  "campaign.completed",
  "agent.error",
];

function WebhooksTab({
  webhooks,
  onAdd,
  availableEvents,
}: {
  webhooks: WebhookRow[];
  onAdd: (url: string, events: WebhookEvent[]) => void;
  availableEvents: WebhookEvent[];
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [addModal, setAddModal] = useState(false);
  const [payloadModal, setPayloadModal] = useState<string | null>(null);
  const [newUrl, setNewUrl] = useState("");
  const [newEvents, setNewEvents] = useState<WebhookEvent[]>([]);
  const [newSecret] = useState(() => `whsec_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`);

  const toggleEvent = (e: WebhookEvent) => {
    setNewEvents((prev) => (prev.includes(e) ? prev.filter((x) => x !== e) : [...prev, e]));
  };

  const handleAddSubmit = () => {
    if (!newUrl.trim()) return;
    onAdd(newUrl.trim(), newEvents);
    setAddModal(false);
    setNewUrl("");
    setNewEvents([]);
  };

  const truncateUrl = (url: string) => (url.length > 40 ? url.slice(0, 37) + "..." : url);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setAddModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-black font-semibold text-sm hover:bg-zinc-200"
        >
          <Plus className="w-4 h-4" /> Add Webhook
        </button>
      </div>

      <div className="space-y-3">
        {webhooks.map((wh) => (
          <div key={wh.id} className="rounded-xl border border-[var(--border-default)] overflow-hidden bg-[var(--bg-card)]/30">
            <button
              type="button"
              onClick={() => setExpandedId(expandedId === wh.id ? null : wh.id)}
              className="w-full flex items-center justify-between p-4 text-left hover:bg-[var(--bg-card)]/30"
            >
              <div className="flex items-center gap-3 min-w-0">
                {expandedId === wh.id ? <ChevronDown className="w-4 h-4 text-zinc-500 shrink-0" /> : <ChevronRight className="w-4 h-4 text-zinc-500 shrink-0" />}
                <div className="min-w-0">
                  <p className="font-mono text-sm text-zinc-300 truncate">{truncateUrl(wh.url)}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {wh.events.map((ev) => (
                      <span key={ev} className="px-2 py-0.5 rounded text-[10px] bg-[var(--bg-card)] text-zinc-400">{ev}</span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className={`text-xs font-medium ${wh.lastDeliveryStatus === 200 ? "text-emerald-400" : "text-red-400"}`}>{wh.lastDeliveryStatus}</span>
                <span className="text-xs text-zinc-500">{formatRelative(wh.lastDeliveryAt)}</span>
                <span className="text-xs text-emerald-400">Active</span>
              </div>
            </button>
            {expandedId === wh.id && (
              <div className="border-t border-[var(--border-default)] p-4 bg-[var(--bg-card)]">
                <p className="text-xs font-medium text-zinc-500 mb-3">Recent deliveries (last 5)</p>
                <div className="space-y-2">
                  {wh.deliveries.slice(0, 5).map((d) => (
                    <div key={d.id} className="flex items-center justify-between gap-2 py-2 border-b border-[var(--border-default)]/80 last:border-0">
                      <div>
                        <span className="text-xs text-zinc-400">{d.eventType}</span>
                        <span className="text-[10px] text-zinc-600 ml-2">{formatRelative(d.timestamp)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-mono ${d.statusCode === 200 ? "text-emerald-400" : "text-red-400"}`}>{d.statusCode}</span>
                        <span className="text-[10px] text-zinc-500">{d.responseTimeMs}ms</span>
                        <button
                          type="button"
                          onClick={() => setPayloadModal(d.payload)}
                          className="text-xs text-zinc-400 hover:text-white underline"
                        >
                          View payload
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {addModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 overflow-y-auto" onClick={(e) => e.target === e.currentTarget && setAddModal(false)}>
          <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-2xl w-full max-w-md p-6 my-8" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-white mb-4">Add Webhook</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">URL</label>
                <input
                  type="url"
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-medium)] text-white font-mono text-sm placeholder:text-zinc-500 focus:outline-none focus:border-[var(--border-medium)]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Secret (auto-generated)</label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 px-3 py-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border-medium)] text-xs text-zinc-400 font-mono truncate">{newSecret}</code>
                  <button type="button" onClick={() => copyToClipboard(newSecret, () => {})} className="px-2 py-2 rounded-lg text-zinc-400 hover:text-white hover:bg-[var(--bg-card)]" title="Copy"><Copy className="w-4 h-4" /></button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-2">Events</label>
                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                  {availableEvents.map((ev) => (
                    <label key={ev} className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={newEvents.includes(ev)} onChange={() => toggleEvent(ev)} className="rounded border-zinc-600 text-white" />
                      <span className="text-xs text-zinc-400 font-mono">{ev}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button type="button" onClick={() => setAddModal(false)} className="px-4 py-2 rounded-xl text-sm text-zinc-400 border border-[var(--border-medium)]">Cancel</button>
              <button type="button" onClick={handleAddSubmit} disabled={!newUrl.trim()} className="px-4 py-2 rounded-xl text-sm font-semibold bg-white text-black hover:bg-zinc-200 disabled:opacity-50">Save</button>
            </div>
          </div>
        </div>
      )}

      {payloadModal !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70" onClick={(e) => e.target === e.currentTarget && setPayloadModal(null)}>
          <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-[var(--border-default)]">
              <h3 className="text-sm font-semibold text-white">Payload</h3>
              <button type="button" onClick={() => setPayloadModal(null)} className="p-2 rounded-lg text-zinc-400 hover:text-white"><X className="w-4 h-4" /></button>
            </div>
            <pre className="p-4 overflow-auto text-xs font-mono text-zinc-300 bg-black/40 flex-1 whitespace-pre-wrap break-words">
              <code>{payloadModal}</code>
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

// ----- Event Log tab -----
function EventLogTab({ events, kindFilter, statusFilter, onKindFilter, onStatusFilter }: {
  events: EventLogRow[];
  kindFilter: EventLogKind | "all";
  statusFilter: EventLogStatus | "all";
  onKindFilter: (v: EventLogKind | "all") => void;
  onStatusFilter: (v: EventLogStatus | "all") => void;
}) {
  const filtered = events.filter((e) => {
    if (kindFilter !== "all" && e.kind !== kindFilter) return false;
    if (statusFilter !== "all" && e.status !== statusFilter) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <span className="text-xs text-zinc-500 self-center mr-2">Event type:</span>
        {(["all", "api_call", "webhook_delivery"] as const).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => onKindFilter(k === "all" ? "all" : k)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium ${kindFilter === k ? "bg-zinc-700 text-white" : "bg-[var(--bg-card)]/50 text-zinc-400 hover:text-zinc-300"}`}
          >
            {k === "all" ? "All" : k === "api_call" ? "API Call" : "Webhook Delivery"}
          </button>
        ))}
        <span className="text-xs text-zinc-500 self-center ml-4 mr-2">Status:</span>
        {(["all", "success", "failed"] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onStatusFilter(s === "all" ? "all" : s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium ${statusFilter === s ? "bg-zinc-700 text-white" : "bg-[var(--bg-card)]/50 text-zinc-400 hover:text-zinc-300"}`}
          >
            {s === "all" ? "All" : s === "success" ? "Success" : "Failed"}
          </button>
        ))}
      </div>

      <div className="hidden md:block rounded-xl border border-[var(--border-default)] overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-[var(--bg-card)]/80 border-b border-[var(--border-default)]">
            <tr>
              <th className="py-3 px-4 font-medium text-zinc-400">Time</th>
              <th className="py-3 px-4 font-medium text-zinc-400">Event</th>
              <th className="py-3 px-4 font-medium text-zinc-400">Endpoint / URL</th>
              <th className="py-3 px-4 font-medium text-zinc-400">Status</th>
              <th className="py-3 px-4 font-medium text-zinc-400">Time</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => (
              <tr key={row.id} className="border-b border-[var(--border-default)]/80 hover:bg-[var(--bg-card)]">
                <td className="py-3 px-4 text-zinc-500 text-xs">{formatRelative(row.timestamp)}</td>
                <td className="py-3 px-4 text-zinc-300">{row.kind === "api_call" ? "API Call" : "Webhook Delivery"}</td>
                <td className="py-3 px-4 font-mono text-xs text-zinc-400">
                  {row.kind === "api_call" ? `${row.method} ${row.endpoint}` : row.webhookUrl}
                </td>
                <td className="py-3 px-4">
                  <span className={`font-mono text-xs ${row.statusCode >= 200 && row.statusCode < 300 ? "text-emerald-400" : "text-red-400"}`}>{row.statusCode}</span>
                </td>
                <td className="py-3 px-4 text-zinc-500 text-xs">{row.responseTimeMs}ms</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="md:hidden space-y-2">
        {filtered.map((row) => (
          <div key={row.id} className="p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border-default)]">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-zinc-500">{formatRelative(row.timestamp)}</span>
              <span className={`font-mono text-xs ${row.statusCode >= 200 && row.statusCode < 300 ? "text-emerald-400" : "text-red-400"}`}>{row.statusCode}</span>
            </div>
            <p className="text-sm text-zinc-300">{row.kind === "api_call" ? "API Call" : "Webhook"}</p>
            <p className="font-mono text-xs text-zinc-500 truncate">{row.kind === "api_call" ? `${row.method} ${row.endpoint}` : row.webhookUrl}</p>
            <p className="text-[10px] text-zinc-600 mt-1">{row.responseTimeMs}ms</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ----- Page -----
const TABS: { id: TabId; label: string; icon: typeof Key }[] = [
  { id: "keys", label: "API Keys", icon: Key },
  { id: "webhooks", label: "Webhooks", icon: Webhook },
  { id: "events", label: "Event Log", icon: ListOrdered },
];

export default function DeveloperPage() {
  const [tab, setTab] = useState<TabId>("keys");
  const [keys, setKeys] = useState<ApiKeyRow[]>([]);
  const [webhooks, setWebhooks] = useState<WebhookRow[]>([]);
  const eventLog: EventLogRow[] = [];
  const [toast, setToast] = useState("");
  const [eventKindFilter, setEventKindFilter] = useState<EventLogKind | "all">("all");
  const [eventStatusFilter, setEventStatusFilter] = useState<EventLogStatus | "all">("all");

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    const t = setTimeout(() => setToast(""), 2000);
    return () => clearTimeout(t);
  }, []);

  const handleCopyKey = useCallback(() => {
    showToast("Copied to clipboard");
  }, [showToast]);

  const handleRevokeKey = useCallback((id: string) => {
    setKeys((prev) => prev.map((k) => (k.id === id ? { ...k, status: "revoked" as const } : k)));
  }, []);

  const handleCreateKey = useCallback((label: string, permission: ApiKeyPermission) => {
    const suffix = Math.random().toString(36).slice(2, 6);
    setKeys((prev) => [
      ...prev,
      {
        id: `key-${Date.now()}`,
        label,
        keyPrefix: "sk_live_",
        keySuffix: suffix,
        fullKey: `sk_live_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}${suffix}`,
        permission,
        createdAt: new Date().toISOString(),
        lastUsedAt: new Date().toISOString(),
        status: "active",
      },
    ]);
  }, []);

  const handleAddWebhook = useCallback((url: string, events: WebhookEvent[]) => {
    setWebhooks((prev) => [
      ...prev,
      {
        id: `wh-${Date.now()}`,
        url,
        secret: `whsec_${Math.random().toString(36).slice(2)}`,
        events,
        status: "active",
        lastDeliveryAt: new Date().toISOString(),
        lastDeliveryStatus: 200,
        deliveries: [],
      },
    ]);
  }, []);

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="p-4 md:p-6 lg:p-8">
        <h1 className="text-xl md:text-2xl font-semibold text-white mb-6">Developer</h1>

        <div className="flex border-b border-[var(--border-default)] mb-6">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
                tab === t.id ? "border-white text-white" : "border-transparent text-zinc-500 hover:text-zinc-300"
              }`}
            >
              <t.icon className="w-4 h-4" />
              {t.label}
            </button>
          ))}
        </div>

        {tab === "keys" && (
          <ApiKeysTab
            keys={keys}
            onRevoke={handleRevokeKey}
            onCreate={handleCreateKey}
            onCopyKey={handleCopyKey}
          />
        )}
        {tab === "webhooks" && (
          <WebhooksTab
            webhooks={webhooks}
            onAdd={handleAddWebhook}
            availableEvents={AVAILABLE_WEBHOOK_EVENT_TYPES}
          />
        )}
        {tab === "events" && (
          <EventLogTab
            events={eventLog}
            kindFilter={eventKindFilter}
            statusFilter={eventStatusFilter}
            onKindFilter={setEventKindFilter}
            onStatusFilter={setEventStatusFilter}
          />
        )}
      </div>

      {toast && (
        <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-[60] px-4 py-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-medium)] text-white text-sm font-medium shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
