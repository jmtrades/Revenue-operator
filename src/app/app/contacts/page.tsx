"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useDebounce } from "@/hooks/useDebounce";
import Link from "next/link";
import { safeGetItem, safeSetItem, safeRemoveItem } from "@/lib/client/safe-storage";

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
  } catch {
    safeRemoveItem(STORAGE_KEY);
    return [];
  }
}

function saveContacts(next: Contact[]) {
  if (typeof window === "undefined") return;
  safeSetItem(STORAGE_KEY, JSON.stringify(next));
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
  const palette = ["bg-zinc-700", "bg-zinc-600", "bg-zinc-500", "bg-zinc-800"];
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0;
  }
  const index = Math.abs(hash) % palette.length;
  return palette[index];
}

function typeStyles(type: ContactType) {
  if (type === "lead") return "border-l-4 border-zinc-500";
  if (type === "customer") return "border-l-4 border-green-500";
  return "border-l-4 border-amber-500";
}

function typeBadgeStyles(type: ContactType) {
  if (type === "lead") return "bg-zinc-800/60 text-blue-400";
  if (type === "customer") return "bg-zinc-800/60 text-green-400";
  return "bg-zinc-800/60 text-amber-400";
}

export default function AppContactsPage() {
  const t = useTranslations("contacts");
  const tCommon = useTranslations("common");
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

  const [formFirstName, setFormFirstName] = useState("");
  const [formLastName, setFormLastName] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formType, setFormType] = useState<ContactType>("lead");
  const [formNotes, setFormNotes] = useState("");
  const [formTagInput, setFormTagInput] = useState("");
  const [formTags, setFormTags] = useState<string[]>([]);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

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
    const t = formTagInput.trim();
    if (!t) return;
    if (!formTags.includes(t)) {
      setFormTags((prev) => [...prev, t]);
    }
    setFormTagInput("");
  };

  const handleSaveContact = () => {
    const errors: Record<string, string> = {};
    if (!formFirstName.trim()) errors.firstName = t("errors.firstNameRequired");
    if (!formLastName.trim()) errors.lastName = t("errors.lastNameRequired");
    if (!formPhone.trim()) errors.phone = t("errors.phoneRequired");
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;

    const nowIso = new Date().toISOString();
    const newContact: Contact = {
      id: `c-${Date.now()}`,
      firstName: formFirstName.trim(),
      lastName: formLastName.trim(),
      phone: formPhone.trim(),
      email: formEmail.trim() || undefined,
      type: formType,
      notes: formNotes.trim() || undefined,
      tags: formTags,
      lastContact: nowIso,
      history: [
        {
          date: nowIso,
          type: "inbound",
          duration: "0:00",
          summary: t("addedManually"),
        },
      ],
    };

    const next = [newContact, ...contacts];
    setContacts(next);
    saveContacts(next);
    setToast(t("toast.added"));
    setShowAdd(false);
    resetForm();
  };

  return (
    <div className="relative max-w-5xl mx-auto p-4 md:p-6">
      <div className="flex items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-lg md:text-xl font-semibold text-white flex items-center gap-2">
            {t("title")}
            <span className="text-xs font-normal text-zinc-500">· {t("savedCount", { count })}</span>
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            {t("subtitle")}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            resetForm();
            setShowAdd(true);
          }}
          className="hidden sm:inline-flex items-center gap-1.5 bg-white text-black font-semibold rounded-xl px-4 py-2 text-sm hover:bg-zinc-100"
        >
          {t("addContactCta")}
        </button>
      </div>

      <div className="flex flex-col md:flex-row md:items-center gap-3 mb-4">
        <div className="flex-1 flex items-center gap-2">
          <input
            type="search"
            placeholder={t("searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 px-4 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-sm text-white placeholder:text-zinc-600 focus:border-[var(--border-medium)] focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-500">{t("sortLabel")}</span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortId)}
            className="px-3 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-xs text-zinc-300 focus:outline-none"
          >
            <option value="newest">{t("sort.newest")}</option>
            <option value="score">{t("sort.score")}</option>
            <option value="name">{t("sort.name")}</option>
          </select>
        </div>
      </div>

      <div className="flex gap-2 mb-4 overflow-x-auto pb-1" aria-label={t("filtersAria")}>
        {(["all", "leads", "customers", "vip"] as const).map((tabId) => (
          <button
            key={tabId}
            type="button"
            onClick={() => setTab(tabId)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap capitalize ${
              tab === tabId ? "bg-zinc-800 text-white" : "bg-[var(--bg-input)] border border-[var(--border-default)] text-zinc-400"
            }`}
          >
            {t(`tabs.${tabId}`)}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={() => {
          resetForm();
          setShowAdd(true);
        }}
        className="sm:hidden mb-3 w-full bg-white text-black font-semibold rounded-xl px-4 py-2 text-sm hover:bg-zinc-100"
      >
        {t("addContactCta")}
      </button>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] py-12 px-6 text-center">
          <p className="text-sm text-zinc-400 mb-2">{t("empty.title")}</p>
          <p className="text-xs text-zinc-500">
            {t("empty.subtitle")}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1.2fr)] gap-4 lg:gap-6 items-start">
          <ul className="space-y-3">
            {filtered.map((c) => {
              const fullName = `${c.firstName} ${c.lastName}`;
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(c.id)}
                    className={`w-full text-left flex items-center gap-4 p-4 rounded-2xl border bg-[var(--bg-card)] ${
                      typeStyles(c.type)
                    } border-[var(--border-default)] hover:bg-[var(--bg-input)] transition-colors ${selectedId === c.id ? "ring-1 ring-[var(--border-medium)]" : ""}`}
                  >
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold text-white shrink-0 ${avatarColorFromName(
                        fullName
                      )}`}
                    >
                      {getInitials(c.firstName, c.lastName)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-medium text-white truncate">{fullName}</p>
                        <span
                          className={`text-[10px] font-medium px-2 py-0.5 rounded-full capitalize ${typeBadgeStyles(
                            c.type
                          )}`}
                        >
                          {t(`form.type.${c.type}`)}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400 truncate">
                        {c.phone}
                        {c.email ? ` · ${c.email}` : ""}
                      </p>
                      <p className="text-[11px] text-zinc-500 mt-1">
                        {formatLastContact(c.lastContact, t)}
                      </p>
                    </div>
                    {typeof c.score === "number" && (
                      <div className="w-12 h-12 rounded-full border border-[var(--border-medium)] flex items-center justify-center text-xs font-semibold text-zinc-200 shrink-0">
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
              <div className="rounded-2xl border border-dashed border-[var(--border-default)] bg-[var(--bg-input)]/40 p-6 text-sm text-zinc-500">
                {t("empty.detail")}
              </div>
            )}
          </aside>
        </div>
      )}

      <p className="mt-6">
        <Link href="/app/activity" className="text-sm text-zinc-400 hover:text-white transition-colors">
          ← {tCommon("activity")}
        </Link>
      </p>

      {toast && (
        <div className="fixed bottom-4 right-4 z-40 px-4 py-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border-medium)] text-sm text-zinc-100 shadow-lg">
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
            className="w-full max-w-xs sm:max-w-sm h-full bg-black border-l border-[var(--border-default)] p-5 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold text-white">{t("drawer.title")}</h2>
                <p className="text-xs text-zinc-500 mt-0.5">{t("drawer.subtitle")}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowAdd(false)}
                className="text-xs text-zinc-400 hover:text-white"
                aria-label={tCommon("close")}
              >
                {tCommon("close")}
              </button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-[11px] text-zinc-500 mb-1">{t("form.firstNameLabel")}</label>
                  <input
                    type="text"
                    value={formFirstName}
                    onChange={(e) => setFormFirstName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-sm text-white placeholder:text-zinc-600 focus:border-[var(--border-medium)] focus:outline-none"
                    placeholder={t("form.firstNamePlaceholder")}
                  />
                  {formErrors.firstName && (
                    <p className="mt-1 text-[11px] text-[var(--accent-red)]" role="alert">{formErrors.firstName}</p>
                  )}
                </div>
                <div className="flex-1">
                  <label className="block text-[11px] text-zinc-500 mb-1">{t("form.lastNameLabel")}</label>
                  <input
                    type="text"
                    value={formLastName}
                    onChange={(e) => setFormLastName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-sm text-white placeholder:text-zinc-600 focus:border-[var(--border-medium)] focus:outline-none"
                    placeholder={t("form.lastNamePlaceholder")}
                  />
                  {formErrors.lastName && (
                    <p className="mt-1 text-[11px] text-[var(--accent-red)]" role="alert">{formErrors.lastName}</p>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-[11px] text-zinc-500 mb-1">{t("form.phoneLabel")}</label>
                <input
                  type="tel"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-sm text-white placeholder:text-zinc-600 focus:border-[var(--border-medium)] focus:outline-none"
                  placeholder={t("form.phonePlaceholder")}
                />
                {formErrors.phone && (
                  <p className="mt-1 text-[11px] text-[var(--accent-red)]" role="alert">{formErrors.phone}</p>
                )}
              </div>
              <div>
                <label className="block text-[11px] text-zinc-500 mb-1">{t("form.emailLabel")}</label>
                <input
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-sm text-white placeholder:text-zinc-600 focus:border-[var(--border-medium)] focus:outline-none"
                  placeholder={t("form.emailPlaceholder")}
                />
              </div>
              <div>
                <label className="block text-[11px] text-zinc-500 mb-1">{t("form.typeLabel")}</label>
                <select
                  value={formType}
                  onChange={(e) => setFormType(e.target.value as ContactType)}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-sm text-zinc-200 focus:outline-none"
                >
                  <option value="lead">{t("form.type.lead")}</option>
                  <option value="customer">{t("form.type.customer")}</option>
                  <option value="vip">{t("form.type.vip")}</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] text-zinc-500 mb-1">{t("form.tagsLabel")}</label>
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
                    className="flex-1 px-3 py-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-sm text-white placeholder:text-zinc-600 focus:border-[var(--border-medium)] focus:outline-none"
                    placeholder={t("form.tagsPlaceholder")}
                  />
                  <button
                    type="button"
                    onClick={handleAddTag}
                    className="px-3 py-2 rounded-xl border border-[var(--border-medium)] text-xs text-zinc-300 hover:border-[var(--border-medium)]"
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
                        className="text-[11px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-200"
                      >
                        {tag} <span className="text-zinc-500">×</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-[11px] text-zinc-500 mb-1">{t("form.notesLabel")}</label>
                <textarea
                  rows={3}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-sm text-white placeholder:text-zinc-600 focus:border-[var(--border-medium)] focus:outline-none resize-none"
                  placeholder={t("form.notesPlaceholder")}
                />
              </div>
            </div>
            <div className="pt-4 mt-2 border-t border-[var(--border-default)] flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setShowAdd(false)}
                className="px-4 py-2 rounded-xl border border-[var(--border-medium)] text-sm text-zinc-300 hover:border-[var(--border-medium)]"
              >
                {tCommon("cancel")}
              </button>
              <button
                type="button"
                onClick={handleSaveContact}
                className="px-4 py-2 rounded-xl bg-white text-black text-sm font-semibold hover:bg-zinc-100"
              >
                {t("form.saveContact")}
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
            className="w-full max-w-sm h-full bg-black border-l border-[var(--border-default)] p-5 overflow-y-auto"
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
    <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-input)]/60 p-5 text-sm text-zinc-200">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="text-sm font-semibold text-white">{fullName}</h2>
          <p className="text-xs text-zinc-500 mt-0.5">{t(`form.type.${contact.type}`)}</p>
        </div>
        {typeof contact.score === "number" && (
          <div className="w-10 h-10 rounded-full border border-[var(--border-medium)] flex items-center justify-center text-xs font-semibold text-zinc-200">
            {contact.score}
          </div>
        )}
      </div>
      <div className="space-y-2 mb-4">
        <p className="text-xs text-zinc-400">{formatLastContact(contact.lastContact, t)}</p>
        <div className="flex flex-wrap gap-2 text-xs">
          <a
            href={`tel:${encodeURIComponent(contact.phone)}`}
            className="px-2 py-1 rounded-lg border border-[var(--border-medium)] text-zinc-200 hover:border-[var(--border-medium)]"
          >
            {t("callPhone", { phone: contact.phone })}
          </a>
          {contact.email && (
            <a
              href={`mailto:${encodeURIComponent(contact.email)}`}
              className="px-2 py-1 rounded-lg border border-[var(--border-medium)] text-zinc-200 hover:border-[var(--border-medium)]"
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
                className="text-[11px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-200"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
      {contact.notes && (
        <div className="mb-4">
          <h3 className="text-xs font-semibold text-zinc-300 mb-1.5">Notes</h3>
          <p className="text-xs text-zinc-400 whitespace-pre-line">{contact.notes}</p>
        </div>
      )}
      <div>
        <h3 className="text-xs font-semibold text-zinc-300 mb-2">{t("callHistory")}</h3>
        {contact.history && contact.history.length > 0 ? (
          <ul className="space-y-3">
            {contact.history.map((h) => (
              <li key={`${h.date}-${h.summary}`} className="flex gap-3">
                <div className="pt-1">
                  <div className="w-1 h-1 rounded-full bg-zinc-500" />
                </div>
                <div>
                  <p className="text-[11px] text-zinc-500">
                    {new Date(h.date).toLocaleString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}{" "}
                    · {h.type === "inbound" ? t("inbound") : t("outbound")} · {h.duration}
                  </p>
                  <p className="text-xs text-zinc-200">{h.summary}</p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-zinc-500">{t("empty.noCallsForContact")}</p>
        )}
      </div>
    </div>
  );
}

