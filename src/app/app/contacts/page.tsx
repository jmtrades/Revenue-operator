"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useDebounce } from "@/hooks/useDebounce";
import { useWorkspace } from "@/components/WorkspaceContext";
import Link from "next/link";
import { safeGetItem, safeSetItem, safeRemoveItem } from "@/lib/client/safe-storage";
import { Download, Upload, Building2, Cloud, Database, TrendingUp, Layers, Users as UsersIcon, Building } from "lucide-react";
import { Pagination } from "@/components/ui/Pagination";
import { EmptyState } from "@/components/ui/EmptyState";
import { Users } from "lucide-react";

type ContactType = "lead" | "customer" | "vip";

type HistoryEntry = {
  date: string;
  type: "inbound" | "outbound";
  duration: string;
  summary: string;
};

type Contact = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  type: ContactType;
  score?: number;
  notes?: string;
  tags?: string[];
  lastContact: string;
  history?: HistoryEntry[];
  source?: string;
  channel?: string;
};

type TabId = "all" | "leads" | "customers" | "vip";
type SortId = "newest" | "score" | "name";

const STORAGE_KEY = "rt_contacts";

function loadContacts(): Contact[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = safeGetItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Contact[];
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error("Failed to parse contacts from localStorage:", e);
    toast.error("Failed to load saved contacts");
    safeRemoveItem(STORAGE_KEY);
    return [];
  }
}

function saveContacts(next: Contact[]) {
  if (typeof window === "undefined") return;
  safeSetItem(STORAGE_KEY, JSON.stringify(next));
}

/**
 * Map database lead row to Contact UI type
 */
function mapLeadToContact(lead: {
  id: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  state?: string | null;
  last_activity_at?: string | null;
  created_at?: string | null;
  metadata?: Record<string, unknown> | null;
  source?: string | null;
  channel?: string | null;
}): Contact | null {
  const name = (lead.name ?? "").trim();
  const parts = name.split(/\s+/, 2);
  const firstName = parts[0] ?? "";
  const lastName = parts[1] ?? "";
  const phone = (lead.phone ?? "").trim();

  if (!firstName && !lastName) return null;
  if (!phone && !lead.email) return null;

  const stateMap: Record<string, ContactType> = {
    new: "lead",
    contacted: "lead",
    qualified: "lead",
    appointment_set: "customer",
    won: "customer",
    lost: "vip",
  };
  const type = stateMap[(lead.state ?? "").toLowerCase()] ?? "lead";
  const lastContact = lead.last_activity_at ?? lead.created_at ?? new Date().toISOString();

  // Extract source — check lead.source, lead.channel, and metadata.source
  const source = lead.source ?? lead.channel ?? (lead.metadata?.source as string | undefined) ?? undefined;

  return {
    id: lead.id,
    firstName,
    lastName,
    phone,
    email: (lead.email ?? "").trim() || undefined,
    type,
    tags: [],
    lastContact,
    source,
    channel: lead.channel ?? undefined,
  };
}

const CRM_SOURCE_META: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
  hubspot: { label: "HubSpot", icon: Building2, color: "text-orange-400" },
  salesforce: { label: "Salesforce", icon: Cloud, color: "text-blue-400" },
  zoho_crm: { label: "Zoho", icon: Database, color: "text-red-400" },
  pipedrive: { label: "Pipedrive", icon: TrendingUp, color: "text-green-400" },
  gohighlevel: { label: "GHL", icon: Layers, color: "text-purple-400" },
  google_contacts: { label: "Google", icon: UsersIcon, color: "text-sky-400" },
  microsoft_365: { label: "Microsoft", icon: Building, color: "text-cyan-400" },
  airtable: { label: "Airtable", icon: Database, color: "text-yellow-400" },
};

function getSourceBadge(source: string | undefined, t: (key: string) => string) {
  if (!source) return null;
  // Check if source starts with "crm_" (e.g., "crm_hubspot")
  const crmKey = source.startsWith("crm_") ? source.slice(4) : source;
  const meta = CRM_SOURCE_META[crmKey];
  if (meta) {
    const Icon = meta.icon;
    return (
      <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-[var(--bg-inset)]/60 ${meta.color}`}>
        <Icon className="w-2.5 h-2.5" />
        {meta.label}
      </span>
    );
  }
  // Generic sources
  if (source === "demo_call" || source === "website_hero") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-[var(--bg-inset)]/60 text-emerald-400">
        {t("source.demo")}
      </span>
    );
  }
  if (source === "csv_import" || source === "import") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-[var(--bg-inset)]/60 text-violet-400">
        <Upload className="w-2.5 h-2.5" />
        {t("source.import")}
      </span>
    );
  }
  return null;
}

function getInitials(first: string, last: string) {
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
}

function formatLastContact(iso: string, t: (k: string, p?: { count?: number }) => string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return t("lastContactUnknown");
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return t("lastContactToday");
  if (diffDays === 1) return t("lastContactYesterday");
  return t("lastContactDaysAgo", { count: diffDays });
}

function avatarColorFromName(name: string) {
  const palette = ["bg-[var(--bg-inset)]", "bg-[var(--bg-hover)]", "bg-[var(--bg-elevated)]", "bg-[var(--bg-wash)]"];
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0;
  }
  const index = Math.abs(hash) % palette.length;
  return palette[index];
}

function typeStyles(type: ContactType) {
  if (type === "lead") return "border-l-4 border-[var(--border-default)]";
  if (type === "customer") return "border-l-4 border-green-500";
  return "border-l-4 border-amber-500";
}

function typeBadgeStyles(type: ContactType) {
  if (type === "lead") return "bg-[var(--bg-inset)]/60 text-blue-400";
  if (type === "customer") return "bg-[var(--bg-inset)]/60 text-green-400";
  return "bg-[var(--bg-inset)]/60 text-amber-400";
}

export default function AppContactsPage() {
  const t = useTranslations("contacts");
  const tCommon = useTranslations("common");
  const { workspaceId, loading: wsLoading } = useWorkspace();

  const [contacts, setContacts] = useState<Contact[]>(() =>
    typeof window === "undefined" ? [] : loadContacts(),
  );
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [tab, setTab] = useState<TabId>("all");
  const [sort, setSort] = useState<SortId>("newest");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const [formFirstName, setFormFirstName] = useState("");
  const [formLastName, setFormLastName] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formType, setFormType] = useState<ContactType>("lead");
  const [formNotes, setFormNotes] = useState("");
  const [formTagInput, setFormTagInput] = useState("");
  const [formTags, setFormTags] = useState<string[]>([]);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [page, setPage] = useState(1);
  const CONTACTS_PAGE_SIZE = 20;

  useEffect(() => {
    document.title = t("pageTitle");
    return () => {
      document.title = "";
    };
  }, [t]);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 2500);
    return () => window.clearTimeout(id);
  }, [toast]);

  // Load contacts from API when workspace is ready
  useEffect(() => {
    if (!workspaceId || wsLoading) return;

    const loadFromApi = async () => {
      setLoading(true);
      setApiError(null);
      try {
        const res = await fetch(`/api/contacts?workspace_id=${encodeURIComponent(workspaceId)}`, {
          credentials: "include",
        });

        if (!res.ok) {
          if (res.status === 401) {
            setApiError(t("errors.unauthorized"));
          } else {
            setApiError(t("errors.loadFailed"));
          }
          return;
        }

        const data = (await res.json()) as { contacts?: unknown[] };
        const contactList = Array.isArray(data.contacts) ? data.contacts : [];

        const mapped = contactList
          .map((lead: unknown) =>
            mapLeadToContact(
              lead as {
                id: string;
                name?: string | null;
                email?: string | null;
                phone?: string | null;
                state?: string | null;
                last_activity_at?: string | null;
                created_at?: string | null;
                tags?: string[] | null;
                metadata?: Record<string, unknown> | null;
              }
            )
          )
          .filter((c): c is Contact => c !== null);

        setContacts(mapped);
        saveContacts(mapped);
      } catch (err) {
        console.error("[contacts] API error:", err);
        setApiError(t("connectionError"));
      } finally {
        setLoading(false);
      }
    };

    loadFromApi();
  }, [workspaceId, wsLoading]);

  const filtered = useMemo(() => {
    const term = debouncedSearch.trim().toLowerCase();
    let list = contacts.filter((c) => {
      const name = `${c.firstName} ${c.lastName}`.toLowerCase();
      const phone = c.phone.toLowerCase();
      const email = (c.email ?? "").toLowerCase();
      const matchesSearch = !term || name.includes(term) || phone.includes(term) || email.includes(term);
      if (!matchesSearch) return false;
      if (tab === "leads") return c.type === "lead";
      if (tab === "customers") return c.type === "customer";
      if (tab === "vip") return c.type === "vip";
      return true;
    });

    list = list.slice().sort((a, b) => {
      if (sort === "name") {
        const an = `${a.firstName} ${a.lastName}`.toLowerCase();
        const bn = `${b.firstName} ${b.lastName}`.toLowerCase();
        return an.localeCompare(bn);
      }
      if (sort === "score") {
        const as = a.score ?? 0;
        const bs = b.score ?? 0;
        return bs - as;
      }
      const ad = new Date(a.lastContact).getTime();
      const bd = new Date(b.lastContact).getTime();
      return bd - ad;
    });

    return list;
  }, [contacts, debouncedSearch, tab, sort]);

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [debouncedSearch, tab, sort]);

  const totalContactPages = Math.ceil(filtered.length / CONTACTS_PAGE_SIZE);
  const pageSafe = Math.max(1, Math.min(page, totalContactPages || 1));
  const pagedContacts = filtered.slice((pageSafe - 1) * CONTACTS_PAGE_SIZE, pageSafe * CONTACTS_PAGE_SIZE);

  const count = contacts.length;
  const selected = selectedId ? contacts.find((c) => c.id === selectedId) ?? null : null;

  const resetForm = () => {
    setFormFirstName("");
    setFormLastName("");
    setFormPhone("");
    setFormEmail("");
    setFormType("lead");
    setFormNotes("");
    setFormTagInput("");
    setFormTags([]);
    setFormErrors({});
  };

  const handleAddTag = () => {
    const tag = formTagInput.trim();
    if (!tag) return;
    if (!formTags.includes(tag)) {
      setFormTags((prev) => [...prev, tag]);
    }
    setFormTagInput("");
  };

  const handleSaveContact = async () => {
    const errors: Record<string, string> = {};
    if (!formFirstName.trim()) errors.firstName = t("errors.firstNameRequired");
    if (!formLastName.trim()) errors.lastName = t("errors.lastNameRequired");
    if (!formPhone.trim()) errors.phone = t("errors.phoneRequired");
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;

    if (!workspaceId) {
      setToast(t("toast.workspaceNotLoaded"));
      return;
    }

    setCreating(true);
    try {
      const fullName = `${formFirstName.trim()} ${formLastName.trim()}`;

      const res = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          workspace_id: workspaceId,
          name: fullName,
          phone: formPhone.trim(),
          email: formEmail.trim() || undefined,
          company: formNotes.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        setToast(
          (errData as Record<string, unknown>).error as string || "Failed to save contact. Please try again."
        );
        return;
      }

      const newLead = (await res.json()) as {
        id: string;
        name?: string | null;
        email?: string | null;
        phone?: string | null;
        state?: string | null;
        last_activity_at?: string | null;
        created_at?: string | null;
        tags?: string[] | null;
        metadata?: Record<string, unknown> | null;
      };

      const mapped = mapLeadToContact(newLead);
      if (!mapped) {
        setToast(t("toast.contactSaveDisplayFailed"));
        resetForm();
        setShowAdd(false);
        return;
      }

      const next = [mapped, ...contacts];
      setContacts(next);
      saveContacts(next);
      setToast(t("toast.added"));
      setShowAdd(false);
      resetForm();
    } catch (err) {
      console.error("[contacts] save error:", err);
      setToast(t("toast.networkError"));
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="relative max-w-5xl mx-auto p-4 md:p-6">
      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(16px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .contact-item {
          animation: fadeInUp 300ms cubic-bezier(0.23, 1, 0.32, 1) both;
        }
      `}</style>
      <div className="flex items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-lg md:text-xl font-semibold text-[var(--text-primary)] flex items-center gap-2">
            {t("title")}
            <span className="text-xs font-normal text-[var(--text-secondary)]">· {t("savedCount", { count })}</span>
          </h1>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            {t("subtitle")}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            resetForm();
            setShowAdd(true);
          }}
          className="hidden sm:inline-flex items-center gap-1.5 bg-[var(--accent-primary)] text-[var(--text-on-accent)] font-semibold rounded-xl px-4 py-2 text-sm hover:opacity-90 disabled:opacity-50 transition-[opacity,transform] duration-160 active:scale-[0.97]"
          disabled={wsLoading || !workspaceId}
        >
          {t("addContactCta")}
        </button>
      </div>

      {apiError && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-red-900/20 border border-red-900/30 text-sm text-red-200">
          {apiError}
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center gap-3 mb-4">
        <div className="flex-1 flex items-center gap-2">
          <input
            type="search"
            placeholder={t("searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 px-4 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--border-medium)] focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-[var(--text-secondary)]">{t("sortLabel")}</span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortId)}
            className="px-3 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-xs text-[var(--text-secondary)] focus:outline-none"
          >
            <option value="newest">{t("sort.newest")}</option>
            <option value="score">{t("sort.score")}</option>
            <option value="name">{t("sort.name")}</option>
          </select>
        </div>
        <button
          type="button"
          onClick={async () => {
            try {
              setExporting(true);
              const res = await fetch("/api/contacts/export", { credentials: "include" });
              if (!res.ok) {
                setToast(t("exportError"));
                return;
              }
              const blob = await res.blob();
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = "contacts.csv";
              document.body.appendChild(a);
              a.click();
              a.remove();
              URL.revokeObjectURL(url);
            } catch {
              setToast(t("exportError"));
            } finally {
              setExporting(false);
            }
          }}
          className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-default)] px-3 py-2 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-input)] disabled:opacity-50"
          disabled={exporting || loading}
        >
          <Download className="w-3.5 h-3.5" />
          {exporting ? t("exporting") : t("exportCta")}
        </button>
      </div>

      <div className="flex gap-2 mb-4 overflow-x-auto pb-1" aria-label={t("filtersAria")}>
        {(["all", "leads", "customers", "vip"] as const).map((tabId) => (
          <button
            key={tabId}
            type="button"
            onClick={() => setTab(tabId)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap capitalize ${
              tab === tabId ? "bg-[var(--bg-inset)] text-[var(--text-primary)]" : "bg-[var(--bg-input)] border border-[var(--border-default)] text-[var(--text-tertiary)]"
            }`}
          >
            {t(`tabs.${tabId}`)}
          </button>
        ))}
      </div>

      {loading && (
        <div className="text-center py-8">
          <p className="text-sm text-[var(--text-secondary)]">Loading contacts...</p>
        </div>
      )}

      {!loading && filtered.length > 0 ? (
        <button
          type="button"
          onClick={() => {
            resetForm();
            setShowAdd(true);
          }}
          className="sm:hidden mb-3 w-full bg-[var(--accent-primary)] text-[var(--text-on-accent)] font-semibold rounded-xl px-4 py-2 text-sm hover:opacity-90 disabled:opacity-50 transition-[opacity,transform] duration-160 active:scale-[0.97]"
          disabled={!workspaceId}
        >
          {t("addContactCta")}
        </button>
      ) : null}

      {!loading && filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title={t("empty.title")}
          description={t("empty.subtitle")}
          primaryAction={{ label: t("empty.importCsv"), href: "/app/leads" }}
        />
      ) : (
        !loading && (
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1.2fr)] gap-4 lg:gap-6 items-start">
            <ul className="space-y-3">
              {pagedContacts.map((c, idx) => {
                const fullName = `${c.firstName} ${c.lastName}`;
                return (
                  <li key={c.id} className="contact-item" style={{ animationDelay: `${idx * 30}ms` }}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(c.id)}
                      className={`w-full text-left flex items-center gap-4 p-4 rounded-2xl border bg-[var(--bg-card)] ${
                        typeStyles(c.type)
                      } border-[var(--border-default)] hover:bg-[var(--bg-input)] transition-[background-color,transform] duration-160 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/30 ${selectedId === c.id ? "ring-1 ring-[var(--border-medium)]" : ""}`}
                    >
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold text-[var(--text-primary)] shrink-0 ring-1 ring-[var(--border-default)] ${avatarColorFromName(
                          fullName
                        )}`}
                      >
                        {getInitials(c.firstName, c.lastName)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-medium text-[var(--text-primary)] truncate">{fullName}</p>
                          <span
                            className={`text-[10px] font-medium px-2 py-0.5 rounded-full capitalize ${typeBadgeStyles(
                              c.type
                            )}`}
                          >
                            {t(`form.type.${c.type}`)}
                          </span>
                          {getSourceBadge(c.source, t)}
                        </div>
                        <p className="text-xs text-[var(--text-tertiary)] truncate">
                          {c.phone}
                          {c.email ? ` · ${c.email}` : ""}
                        </p>
                        <p className="text-[11px] text-[var(--text-secondary)] mt-1">
                          {formatLastContact(c.lastContact, t)}
                        </p>
                      </div>
                      {typeof c.score === "number" && (
                        <div className="w-12 h-12 rounded-full border border-[var(--border-medium)] flex items-center justify-center text-xs font-semibold text-[var(--text-primary)] shrink-0">
                          {c.score}
                        </div>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>

            <aside className="hidden lg:block">
              {selected ? (
                <ContactDetail contact={selected} />
              ) : (
                <div className="rounded-2xl border border-dashed border-[var(--border-default)] bg-[var(--bg-input)]/40 p-6 text-sm text-[var(--text-secondary)]">
                  {t("empty.detail")}
                </div>
              )}
            </aside>
          </div>
        )
      )}

      <Pagination
        currentPage={pageSafe}
        totalPages={totalContactPages}
        onPageChange={setPage}
        label={t("contacts.pageOf")}
        prevLabel={t("contacts.prevPage")}
        nextLabel={t("contacts.nextPage")}
      />

      <p className="mt-6">
        <Link href="/app/activity" className="text-sm text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors">
          ← {tCommon("activity")}
        </Link>
      </p>

      {toast && (
        <div className="fixed bottom-4 right-4 z-40 px-4 py-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border-medium)] text-sm text-[var(--text-primary)] shadow-lg">
          {toast}
        </div>
      )}

      {showAdd && (
        <div
          className="fixed inset-0 z-40 bg-black/60 flex justify-end"
          role="dialog"
          aria-modal="true"
          onClick={() => setShowAdd(false)}
        >
          <div
            className="w-full max-w-xs sm:max-w-sm h-full bg-[var(--bg-surface)] border-l border-[var(--border-default)] p-5 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold text-[var(--text-primary)]">{t("drawer.title")}</h2>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">{t("drawer.subtitle")}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowAdd(false)}
                className="text-xs text-[var(--text-tertiary)] hover:text-[var(--text-primary)] disabled:opacity-50"
                aria-label={tCommon("close")}
                disabled={creating}
              >
                {tCommon("close")}
              </button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-[11px] text-[var(--text-secondary)] mb-1">{t("form.firstNameLabel")}</label>
                  <input
                    type="text"
                    value={formFirstName}
                    onChange={(e) => setFormFirstName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--border-medium)] focus:outline-none disabled:opacity-50"
                    placeholder={t("form.firstNamePlaceholder")}
                    disabled={creating}
                  />
                  {formErrors.firstName && (
                    <p className="mt-1 text-[11px] text-[var(--accent-red)]" role="alert">{formErrors.firstName}</p>
                  )}
                </div>
                <div className="flex-1">
                  <label className="block text-[11px] text-[var(--text-secondary)] mb-1">{t("form.lastNameLabel")}</label>
                  <input
                    type="text"
                    value={formLastName}
                    onChange={(e) => setFormLastName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--border-medium)] focus:outline-none disabled:opacity-50"
                    placeholder={t("form.lastNamePlaceholder")}
                    disabled={creating}
                  />
                  {formErrors.lastName && (
                    <p className="mt-1 text-[11px] text-[var(--accent-red)]" role="alert">{formErrors.lastName}</p>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-[11px] text-[var(--text-secondary)] mb-1">{t("form.phoneLabel")}</label>
                <input
                  type="tel"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--border-medium)] focus:outline-none disabled:opacity-50"
                  placeholder={t("form.phonePlaceholder")}
                  disabled={creating}
                />
                {formErrors.phone && (
                  <p className="mt-1 text-[11px] text-[var(--accent-red)]" role="alert">{formErrors.phone}</p>
                )}
              </div>
              <div>
                <label className="block text-[11px] text-[var(--text-secondary)] mb-1">{t("form.emailLabel")}</label>
                <input
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--border-medium)] focus:outline-none disabled:opacity-50"
                  placeholder={t("form.emailPlaceholder")}
                  disabled={creating}
                />
              </div>
              <div>
                <label className="block text-[11px] text-[var(--text-secondary)] mb-1">{t("form.typeLabel")}</label>
                <select
                  value={formType}
                  onChange={(e) => setFormType(e.target.value as ContactType)}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-sm text-[var(--text-primary)] focus:outline-none disabled:opacity-50"
                  disabled={creating}
                >
                  <option value="lead">{t("form.type.lead")}</option>
                  <option value="customer">{t("form.type.customer")}</option>
                  <option value="vip">{t("form.type.vip")}</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] text-[var(--text-secondary)] mb-1">{t("form.tagsLabel")}</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={formTagInput}
                    onChange={(e) => setFormTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddTag();
                      }
                    }}
                    className="flex-1 px-3 py-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--border-medium)] focus:outline-none disabled:opacity-50"
                    placeholder={t("form.tagsPlaceholder")}
                    disabled={creating}
                  />
                  <button
                    type="button"
                    onClick={handleAddTag}
                    className="px-3 py-2 rounded-xl border border-[var(--border-medium)] text-xs text-[var(--text-secondary)] hover:border-[var(--border-medium)] disabled:opacity-50"
                    disabled={creating}
                  >
                    {t("form.addTag")}
                  </button>
                </div>
                {formTags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {formTags.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => setFormTags((prev) => prev.filter((t) => t !== tag))}
                        className="text-[11px] px-2 py-0.5 rounded-full bg-[var(--bg-inset)] text-[var(--text-primary)] disabled:opacity-50"
                        disabled={creating}
                      >
                        {tag} <span className="text-[var(--text-secondary)]">×</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-[11px] text-[var(--text-secondary)] mb-1">{t("form.notesLabel")}</label>
                <textarea
                  rows={3}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:border-[var(--border-medium)] focus:outline-none resize-none disabled:opacity-50"
                  placeholder={t("form.notesPlaceholder")}
                  disabled={creating}
                />
              </div>
            </div>
            <div className="pt-4 mt-2 border-t border-[var(--border-default)] flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setShowAdd(false)}
                className="px-4 py-2 rounded-xl border border-[var(--border-medium)] text-sm text-[var(--text-secondary)] hover:border-[var(--border-medium)] disabled:opacity-50"
                disabled={creating}
              >
                {tCommon("cancel")}
              </button>
              <button
                type="button"
                onClick={handleSaveContact}
                className="px-4 py-2 rounded-xl bg-[var(--accent-primary)] text-[var(--text-on-accent)] text-sm font-semibold hover:opacity-90 disabled:opacity-50"
                disabled={creating}
              >
                {creating ? "Saving..." : t("form.saveContact")}
              </button>
            </div>
          </div>
        </div>
      )}

      {selected && (
        <div
          className="lg:hidden fixed inset-0 z-30 bg-black/60 flex justify-end"
          role="dialog"
          aria-modal="true"
          onClick={() => setSelectedId(null)}
        >
          <div
            className="w-full max-w-sm h-full bg-[var(--bg-surface)] border-l border-[var(--border-default)] p-5 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <ContactDetail contact={selected} />
          </div>
        </div>
      )}
    </div>
  );
}

function ContactDetail({ contact }: { contact: Contact }) {
  const t = useTranslations("contacts");
  const fullName = `${contact.firstName} ${contact.lastName}`;
  return (
    <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-input)]/60 p-5 text-sm text-[var(--text-primary)]">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">{fullName}</h2>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">{t(`form.type.${contact.type}`)}</p>
        </div>
        {typeof contact.score === "number" && (
          <div className="w-10 h-10 rounded-full border border-[var(--border-medium)] flex items-center justify-center text-xs font-semibold text-[var(--text-primary)]">
            {contact.score}
          </div>
        )}
      </div>
      <div className="space-y-2 mb-4">
        <p className="text-xs text-[var(--text-tertiary)]">{formatLastContact(contact.lastContact, t)}</p>
        <div className="flex flex-wrap gap-2 text-xs">
          <a
            href={`tel:${encodeURIComponent(contact.phone)}`}
            className="px-2 py-1 rounded-lg border border-[var(--border-medium)] text-[var(--text-primary)] hover:border-[var(--border-medium)]"
          >
            {t("callPhone", { phone: contact.phone })}
          </a>
          {contact.email && (
            <a
              href={`mailto:${encodeURIComponent(contact.email)}`}
              className="px-2 py-1 rounded-lg border border-[var(--border-medium)] text-[var(--text-primary)] hover:border-[var(--border-medium)]"
            >
              {t("email")}
            </a>
          )}
        </div>
        {contact.tags && contact.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-1">
            {contact.tags.map((tag) => (
              <span
                key={tag}
                className="text-[11px] px-2 py-0.5 rounded-full bg-[var(--bg-inset)] text-[var(--text-primary)]"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
      {contact.notes && (
        <div className="mb-4">
          <h3 className="text-xs font-semibold text-[var(--text-secondary)] mb-1.5">Notes</h3>
          <p className="text-xs text-[var(--text-tertiary)] whitespace-pre-line">{contact.notes}</p>
        </div>
      )}
      <div>
        <h3 className="text-xs font-semibold text-[var(--text-secondary)] mb-2">{t("callHistory")}</h3>
        {contact.history && contact.history.length > 0 ? (
          <ul className="space-y-3">
            {contact.history.map((h) => (
              <li key={`${h.date}-${h.summary}`} className="flex gap-3">
                <div className="pt-1">
                  <div className="w-1 h-1 rounded-full bg-[var(--text-tertiary)]" />
                </div>
                <div>
                  <p className="text-[11px] text-[var(--text-secondary)]">
                    {new Date(h.date).toLocaleString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}{" "}
                    · {h.type === "inbound" ? t("inbound") : t("outbound")} · {h.duration}
                  </p>
                  <p className="text-xs text-[var(--text-primary)]">{h.summary}</p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-[var(--text-secondary)]">{t("empty.noCallsForContact")}</p>
        )}
      </div>
    </div>
  );
}
