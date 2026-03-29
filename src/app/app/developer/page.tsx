"use client";

import { useState, useCallback, useEffect } from "react";
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
import { useTranslations } from "next-intl";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";

type ApiKeyPermission = "read" | "read_write" | "admin";

interface ApiKeyRow {
  id: string;
  label: string;
  keyPrefix: string;
  keySuffix: string;
  fullKey: string;
  permission: ApiKeyPermission;
  createdAt: string;
  lastUsedAt: string;
  status: "active" | "revoked";
}

type WebhookEvent =
  | "call.started"
  | "call.completed"
  | "call.failed"
  | "lead.created"
  | "appointment.booked"
  | "sentiment.flagged"
  | "campaign.completed"
  | "agent.error";

interface WebhookDelivery {
  id: string;
  eventType: string;
  statusCode: number;
  responseTimeMs: number;
  timestamp: string;
  payload: string;
}

interface WebhookRow {
  id: string;
  url: string;
  secret: string;
  events: WebhookEvent[];
  status: "active" | "paused";
  lastDeliveryAt: string;
  lastDeliveryStatus: number;
  deliveries: WebhookDelivery[];
}

type EventLogKind = "api_call" | "webhook_delivery";
type EventLogStatus = "success" | "failed";

interface EventLogRow {
  id: string;
  kind: EventLogKind;
  timestamp: string;
  method?: string;
  endpoint?: string;
  webhookUrl?: string;
  eventType?: string;
  statusCode: number;
  responseTimeMs: number;
  status: EventLogStatus;
}

type TabId = "keys" | "webhooks" | "events";

function formatRelative(
  timestamp: string,
  t: (key: string, values?: Record<string, number>) => string
): string {
  const d = new Date(timestamp).getTime();
  const diff = Date.now() - d;
  const min = Math.floor(diff / 60000);
  const hour = Math.floor(diff / 3600000);
  const day = Math.floor(diff / 86400000);
  if (min < 1) return t("justNow");
  if (min < 60) return t("minAgo", { count: min });
  if (hour < 24) return t("hrAgo", { count: hour });
  if (day < 7) return t("daysAgo", { count: day });
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
  const t = useTranslations("developer");
  const tCommon = useTranslations("common");
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [revokeId, setRevokeId] = useState<string | null>(null);
  const [createModal, setCreateModal] = useState(false);
  const [newKeyModal, setNewKeyModal] = useState<{ label: string; fullKey: string } | null>(null);
  const [createLabel, setCreateLabel] = useState("");
  const [createPermission, setCreatePermission] = useState<ApiKeyPermission>("read_write");

  const handleCreateSubmit = () => {
    if (!createLabel.trim()) return;
    const buf = new Uint8Array(24);
    crypto.getRandomValues(buf);
    const fullKey = `sk_live_${Array.from(buf, (b) => b.toString(16).padStart(2, "0")).join("")}`;
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
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--accent-primary)] text-[var(--text-on-accent)] font-semibold text-sm hover:opacity-90"
        >
          <Plus className="w-4 h-4" />
          {t("createApiKey")}
        </button>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block rounded-xl border border-[var(--border-default)] overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-[var(--bg-card)]/80 border-b border-[var(--border-default)]">
            <tr>
              <th className="py-3 px-4 font-medium text-[var(--text-tertiary)]">{t("tableLabel")}</th>
              <th className="py-3 px-4 font-medium text-[var(--text-tertiary)]">{t("tableKey")}</th>
              <th className="py-3 px-4 font-medium text-[var(--text-tertiary)]">{t("tablePermissions")}</th>
              <th className="py-3 px-4 font-medium text-[var(--text-tertiary)]">{t("tableCreated")}</th>
              <th className="py-3 px-4 font-medium text-[var(--text-tertiary)]">{t("tableLastUsed")}</th>
              <th className="py-3 px-4 font-medium text-[var(--text-tertiary)]">{t("tableStatus")}</th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {keys.filter((k) => k.status === "active").map((key) => (
              <tr key={key.id} className="border-b border-[var(--border-default)]/80 hover:bg-[var(--bg-card)]">
                <td className="py-3 px-4 text-[var(--text-primary)] font-medium">{key.label}</td>
                <td className="py-3 px-4">
                  <span className="font-mono text-[var(--text-tertiary)]">{maskKey(key.keyPrefix, key.keySuffix)}</span>
                  <button
                    type="button"
                    onClick={() => {
                      copyToClipboard(key.fullKey, () => onCopyKey(key.fullKey));
                    }}
                    className="ml-2 inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)]"
                  >
                    <Copy className="w-3 h-3" /> {t("copy")}
                  </button>
                </td>
                <td className="py-3 px-4">
                  <span className="inline-flex px-2 py-0.5 rounded-md text-[10px] font-medium bg-[var(--bg-inset)] text-[var(--text-secondary)]">
                    {key.permission === "admin" ? t("permissionAdmin") : key.permission === "read_write" ? t("permissionReadWrite") : t("permissionReadOnly")}
                  </span>
                </td>
                <td className="py-3 px-4 text-[var(--text-secondary)]">{formatDate(key.createdAt)}</td>
                <td className="py-3 px-4 text-[var(--text-secondary)]">{formatRelative(key.lastUsedAt, t)}</td>
                <td className="py-3 px-4">
                  <span className="text-[var(--accent-primary)] text-xs">{t("active")}</span>
                </td>
                <td className="py-3 px-2 relative">
                  <button
                    type="button"
                    onClick={() => setMenuOpen(menuOpen === key.id ? null : key.id)}
                    className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)]"
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
                          {t("revoke")}
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
              <span className="font-medium text-[var(--text-primary)]">{key.label}</span>
              <span className="text-[var(--accent-primary)] text-xs">{t("active")}</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs text-[var(--text-secondary)]">{maskKey(key.keyPrefix, key.keySuffix)}</span>
              <button
                type="button"
                onClick={() => copyToClipboard(key.fullKey, () => onCopyKey(key.fullKey))}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)]"
              >
                <Copy className="w-3 h-3" /> {t("copy")}
              </button>
            </div>
            <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
              <span className="px-2 py-0.5 rounded bg-[var(--bg-card)] text-[var(--text-tertiary)]">
                {key.permission === "admin" ? t("permissionAdmin") : key.permission === "read_write" ? t("permissionReadWrite") : t("permissionReadOnly")}
              </span>
              <span>{t("createdLabel")} {formatDate(key.createdAt)}</span>
              <span>{t("usedLabel")} {formatRelative(key.lastUsedAt, t)}</span>
            </div>
            <button
              type="button"
              onClick={() => setRevokeId(key.id)}
              className="text-xs text-[var(--accent-red)] hover:underline"
            >
              {t("revokeKey")}
            </button>
          </div>
        ))}
      </div>

      {/* Create key modal */}
      {createModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--overlay)]" onClick={(e) => e.target === e.currentTarget && setCreateModal(false)}>
          <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">{t("createApiKey")}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[var(--text-tertiary)] mb-1.5">{t("formLabel")}</label>
                <input
                  type="text"
                  value={createLabel}
                  onChange={(e) => setCreateLabel(e.target.value)}
                  placeholder={t("labelPlaceholder")}
                  className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-medium)] text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:border-[var(--border-medium)] text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--text-tertiary)] mb-2">{t("formPermissions")}</label>
                <div className="space-y-2">
                  {(["read", "read_write", "admin"] as const).map((p) => (
                    <label key={p} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="permission"
                        checked={createPermission === p}
                        onChange={() => setCreatePermission(p)}
                        className="rounded-full border-[var(--border-medium)] text-[var(--text-primary)] focus:ring-[var(--border-medium)]"
                      />
                      <span className="text-sm text-[var(--text-secondary)]">
                        {p === "read" ? t("permissionReadOnly") : p === "read_write" ? t("permissionReadPlusWrite") : t("permissionAdmin")}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button type="button" onClick={() => setCreateModal(false)} className="px-4 py-2 rounded-xl text-sm text-[var(--text-tertiary)] hover:text-[var(--text-primary)] border border-[var(--border-medium)]">
                {tCommon("cancel")}
              </button>
              <button type="button" onClick={handleCreateSubmit} disabled={!createLabel.trim()} className="px-4 py-2 rounded-xl text-sm font-semibold bg-[var(--accent-primary)] text-[var(--text-on-accent)] hover:opacity-90 disabled:opacity-50">
                {t("create")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New key shown once */}
      {newKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--overlay)]" onClick={(e) => e.target === e.currentTarget && setNewKeyModal(null)}>
          <div className="bg-[var(--bg-card)] border border-[var(--accent-warning,#f59e0b)]/30 rounded-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-[var(--accent-warning,#f59e0b)]/80 mb-2">{t("apiKeyCreatedTitle", { label: newKeyModal.label })}</h3>
            <p className="text-sm text-[var(--accent-warning,#f59e0b)]/80/80 mb-4">{t("saveKeyWarning")}</p>
            <div className="p-3 rounded-xl bg-[var(--bg-inset)] border border-[var(--border-medium)] mb-4">
              <code className="font-mono text-xs text-[var(--text-secondary)] break-all">{newKeyModal.fullKey}</code>
            </div>
            <button
              type="button"
              onClick={() => {
                copyToClipboard(newKeyModal.fullKey, () => onCopyKey(newKeyModal.fullKey));
              }}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--accent-primary)] text-[var(--text-on-accent)] font-semibold text-sm hover:opacity-90"
            >
              <Copy className="w-4 h-4" /> {t("copyKeyButton")}
            </button>
            <button type="button" onClick={() => setNewKeyModal(null)} className="w-full mt-2 px-4 py-2 rounded-xl text-sm text-[var(--text-tertiary)] hover:text-[var(--text-primary)] border border-[var(--border-medium)]">
              {t("savedConfirm")}
            </button>
          </div>
        </div>
      )}

      {revokeId && (
        <ConfirmDialog
          open
          title={t("revokeConfirmTitle")}
          message={t("revokeConfirmMessage")}
          confirmLabel={t("revokeConfirmLabel")}
          variant="danger"
          onConfirm={() => {
            onRevoke(revokeId);
            setRevokeId(null);
          }}
          onClose={() => setRevokeId(null)}
        />
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
  const t = useTranslations("developer");
  const tCommon = useTranslations("common");
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
      <div className="flex justify-end gap-2">
        <a
          href="/app/developer/webhooks"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-[var(--border-medium)] text-[var(--text-secondary)] text-sm font-medium hover:text-[var(--text-primary)] hover:border-[var(--border-default)]"
        >
          {t("manageWebhooks")}
        </a>
        <button
          type="button"
          onClick={() => setAddModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--accent-primary)] text-[var(--text-on-accent)] font-semibold text-sm hover:opacity-90"
        >
          <Plus className="w-4 h-4" /> {t("addWebhook")}
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
                {expandedId === wh.id ? <ChevronDown className="w-4 h-4 text-[var(--text-secondary)] shrink-0" /> : <ChevronRight className="w-4 h-4 text-[var(--text-secondary)] shrink-0" />}
                <div className="min-w-0">
                  <p className="font-mono text-sm text-[var(--text-secondary)] truncate">{truncateUrl(wh.url)}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {wh.events.map((ev) => (
                      <span key={ev} className="px-2 py-0.5 rounded text-[10px] bg-[var(--bg-card)] text-[var(--text-tertiary)]">{ev}</span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className={`text-xs font-medium ${wh.lastDeliveryStatus === 200 ? "text-[var(--accent-primary)]" : "text-[var(--accent-danger,#ef4444)]"}`}>{wh.lastDeliveryStatus}</span>
                <span className="text-xs text-[var(--text-secondary)]">{formatRelative(wh.lastDeliveryAt, t)}</span>
                <span className="text-xs text-[var(--accent-primary)]">{t("active")}</span>
              </div>
            </button>
            {expandedId === wh.id && (
              <div className="border-t border-[var(--border-default)] p-4 bg-[var(--bg-card)]">
                <p className="text-xs font-medium text-[var(--text-secondary)] mb-3">{t("recentDeliveries")}</p>
                <div className="space-y-2">
                  {wh.deliveries.slice(0, 5).map((d) => (
                    <div key={d.id} className="flex items-center justify-between gap-2 py-2 border-b border-[var(--border-default)]/80 last:border-0">
                      <div>
                        <span className="text-xs text-[var(--text-tertiary)]">{d.eventType}</span>
                        <span className="text-[10px] text-[var(--text-tertiary)] ml-2">{formatRelative(d.timestamp, t)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-mono ${d.statusCode === 200 ? "text-[var(--accent-primary)]" : "text-[var(--accent-danger,#ef4444)]"}`}>{d.statusCode}</span>
                        <span className="text-[10px] text-[var(--text-secondary)]">{d.responseTimeMs}ms</span>
                        <button
                          type="button"
                          onClick={() => setPayloadModal(d.payload)}
                          className="text-xs text-[var(--text-tertiary)] hover:text-[var(--text-primary)] underline"
                        >
                          {t("viewPayload")}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--overlay)] overflow-y-auto" onClick={(e) => e.target === e.currentTarget && setAddModal(false)}>
          <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-2xl w-full max-w-md p-6 my-8" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">{t("addWebhookTitle")}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[var(--text-tertiary)] mb-1.5">{t("urlLabel")}</label>
                <input
                  type="url"
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  placeholder={t("urlPlaceholder")}
                  className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-medium)] text-[var(--text-primary)] font-mono text-sm placeholder:text-[var(--text-secondary)] focus:outline-none focus:border-[var(--border-medium)]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--text-tertiary)] mb-1.5">{t("secretAutoGenerated")}</label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 px-3 py-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border-medium)] text-xs text-[var(--text-tertiary)] font-mono truncate">{newSecret}</code>
                  <button type="button" onClick={() => copyToClipboard(newSecret, () => {})} className="px-2 py-2 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)] focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/40 focus-visible:outline-none transition" aria-label={t("copy")}><Copy className="w-4 h-4" /></button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--text-tertiary)] mb-2">{t("eventsLabel")}</label>
                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                  {availableEvents.map((ev) => (
                    <label key={ev} className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={newEvents.includes(ev)} onChange={() => toggleEvent(ev)} className="rounded border-[var(--border-default)] text-[var(--text-primary)]" />
                      <span className="text-xs text-[var(--text-tertiary)] font-mono">{ev}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button type="button" onClick={() => setAddModal(false)} className="px-4 py-2 rounded-xl text-sm text-[var(--text-tertiary)] border border-[var(--border-medium)]">{t("cancel")}</button>
              <button type="button" onClick={handleAddSubmit} disabled={!newUrl.trim()} className="px-4 py-2 rounded-xl text-sm font-semibold bg-[var(--accent-primary)] text-[var(--text-on-accent)] hover:opacity-90 disabled:opacity-50">{tCommon("save")}</button>
            </div>
          </div>
        </div>
      )}

      {payloadModal !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--overlay)]" onClick={(e) => e.target === e.currentTarget && setPayloadModal(null)}>
          <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-[var(--border-default)]">
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">{t("payload")}</h3>
              <button type="button" onClick={() => setPayloadModal(null)} className="p-2 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--text-primary)] focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/40 focus-visible:outline-none transition" aria-label={t("close")}><X className="w-4 h-4" /></button>
            </div>
            <pre className="p-4 overflow-auto text-xs font-mono text-[var(--text-secondary)] bg-[var(--bg-inset)] flex-1 whitespace-pre-wrap break-words">
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
  const t = useTranslations("developer");
  const tCommon = useTranslations("common");

  const filtered = events.filter((e) => {
    if (kindFilter !== "all" && e.kind !== kindFilter) return false;
    if (statusFilter !== "all" && e.status !== statusFilter) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <span className="text-xs text-[var(--text-secondary)] self-center mr-2">{t("eventTypeLabel")}</span>
        {(["all", "api_call", "webhook_delivery"] as const).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => onKindFilter(k === "all" ? "all" : k)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
              kindFilter === k
                ? "bg-[var(--bg-inset)] text-[var(--text-primary)]"
                : "bg-[var(--bg-card)]/50 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
            }`}
          >
            {k === "all" ? tCommon("all") : k === "api_call" ? t("apiCall") : t("webhookDelivery")}
          </button>
        ))}
        <span className="text-xs text-[var(--text-secondary)] self-center ml-4 mr-2">{t("statusLabel")}</span>
        {(["all", "success", "failed"] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onStatusFilter(s === "all" ? "all" : s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
              statusFilter === s
                ? "bg-[var(--bg-inset)] text-[var(--text-primary)]"
                : "bg-[var(--bg-card)]/50 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
            }`}
          >
            {s === "all" ? tCommon("all") : s === "success" ? t("success") : t("failed")}
          </button>
        ))}
      </div>

      <div className="hidden md:block rounded-xl border border-[var(--border-default)] overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-[var(--bg-card)]/80 border-b border-[var(--border-default)]">
            <tr>
              <th className="py-3 px-4 font-medium text-[var(--text-tertiary)]">{t("time")}</th>
              <th className="py-3 px-4 font-medium text-[var(--text-tertiary)]">{t("event")}</th>
              <th className="py-3 px-4 font-medium text-[var(--text-tertiary)]">{t("endpointUrl")}</th>
              <th className="py-3 px-4 font-medium text-[var(--text-tertiary)]">{t("status")}</th>
              <th className="py-3 px-4 font-medium text-[var(--text-tertiary)]">{t("responseTime")}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => (
              <tr key={row.id} className="border-b border-[var(--border-default)]/80 hover:bg-[var(--bg-card)]">
                <td className="py-3 px-4 text-[var(--text-secondary)] text-xs">{formatRelative(row.timestamp, t)}</td>
                <td className="py-3 px-4 text-[var(--text-secondary)]">{row.kind === "api_call" ? t("apiCall") : t("webhookDelivery")}</td>
                <td className="py-3 px-4 font-mono text-xs text-[var(--text-tertiary)]">
                  {row.kind === "api_call" ? `${row.method} ${row.endpoint}` : row.webhookUrl}
                </td>
                <td className="py-3 px-4">
                  <span className={`font-mono text-xs ${row.statusCode >= 200 && row.statusCode < 300 ? "text-[var(--accent-primary)]" : "text-[var(--accent-danger,#ef4444)]"}`}>{row.statusCode}</span>
                </td>
                <td className="py-3 px-4 text-[var(--text-secondary)] text-xs">{row.responseTimeMs}ms</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="md:hidden space-y-2">
        {filtered.map((row) => (
          <div key={row.id} className="p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border-default)]">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-[var(--text-secondary)]">{formatRelative(row.timestamp, t)}</span>
              <span className={`font-mono text-xs ${row.statusCode >= 200 && row.statusCode < 300 ? "text-[var(--accent-primary)]" : "text-[var(--accent-danger,#ef4444)]"}`}>{row.statusCode}</span>
            </div>
            <p className="text-sm text-[var(--text-secondary)]">{row.kind === "api_call" ? t("apiCall") : t("webhookDelivery")}</p>
            <p className="font-mono text-xs text-[var(--text-secondary)] truncate">{row.kind === "api_call" ? `${row.method} ${row.endpoint}` : row.webhookUrl}</p>
            <p className="text-[10px] text-[var(--text-tertiary)] mt-1">{row.responseTimeMs}ms</p>
          </div>
        ))}
      </div>
    </div>
  );
}

const TAB_IDS: { id: TabId; labelKey: string; icon: typeof Key }[] = [
  { id: "keys", labelKey: "tabs.apiKeys", icon: Key },
  { id: "webhooks", labelKey: "tabs.webhooks", icon: Webhook },
  { id: "events", labelKey: "tabs.eventLog", icon: ListOrdered },
];

export default function DeveloperPage() {
  const t = useTranslations("developer");
  const [tab, setTab] = useState<TabId>("keys");
  const tabs = TAB_IDS.map((tabDef) => ({ ...tabDef, label: t(tabDef.labelKey) }));
  const [keys, setKeys] = useState<ApiKeyRow[]>([]);
  const [webhooks, setWebhooks] = useState<WebhookRow[]>([]);
  const eventLog: EventLogRow[] = [];
  const [toast, setToast] = useState("");
  const [eventKindFilter, setEventKindFilter] = useState<EventLogKind | "all">("all");
  const [eventStatusFilter, setEventStatusFilter] = useState<EventLogStatus | "all">("all");

  useEffect(() => {
    document.title = t("pageTitle");
  }, [t]);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    const t = setTimeout(() => setToast(""), 2000);
    return () => clearTimeout(t);
  }, []);

  const handleCopyKey = useCallback(() => {
    showToast(t("copiedToClipboard"));
  }, [showToast, t]);

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
        fullKey: (() => { const b = new Uint8Array(24); crypto.getRandomValues(b); return `sk_live_${Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("")}`; })(),
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
        secret: (() => { const b = new Uint8Array(20); crypto.getRandomValues(b); return `whsec_${Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("")}`; })(),
        events,
        status: "active",
        lastDeliveryAt: new Date().toISOString(),
        lastDeliveryStatus: 200,
        deliveries: [],
      },
    ]);
  }, []);

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <div className="p-4 md:p-6 lg:p-8">
        <Breadcrumbs items={[{ label: "Home", href: "/app" }, { label: "Developer" }]} />
        <h1 className="text-xl md:text-2xl font-bold tracking-[-0.025em] text-[var(--text-primary)] mb-2">{t("heading")}</h1>
        <p className="text-sm text-[var(--text-secondary)] mb-6">
          {t("pageSubtitle")}{" "}
          <a href="/docs#integrations" className="text-[var(--accent-primary)] hover:underline">{t("docsIntegrations")}</a>.
        </p>

        <div className="flex border-b border-[var(--border-default)] mb-6">
          {tabs.map((tabDef) => (
            <button
              key={tabDef.id}
              type="button"
              onClick={() => setTab(tabDef.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
                tab === tabDef.id ? "border-[var(--accent-primary)] text-[var(--text-primary)]" : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-secondary)]"
              }`}
            >
              <tabDef.icon className="w-4 h-4" />
              {tabDef.label}
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
        <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-[60] px-4 py-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-medium)] text-[var(--text-primary)] text-sm font-medium shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
