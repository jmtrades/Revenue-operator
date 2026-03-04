"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

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

const DEMO_CONTACTS: Contact[] = [
  { id: "c-demo-1", firstName: "Mike", lastName: "Johnson", phone: "(503) 555-0101", type: "lead", score: 85, lastContact: new Date().toISOString(), tags: ["plumbing"] },
  { id: "c-demo-2", firstName: "Sarah", lastName: "Chen", phone: "(503) 555-0102", type: "customer", lastContact: new Date(Date.now() - 86400000).toISOString() },
  { id: "c-demo-3", firstName: "James", lastName: "Wilson", phone: "(503) 555-0103", type: "lead", score: 72, lastContact: new Date(Date.now() - 172800000).toISOString() },
  { id: "c-demo-4", firstName: "Lisa", lastName: "Park", phone: "(503) 555-0104", type: "lead", lastContact: new Date().toISOString() },
];

function loadContacts(): Contact[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEMO_CONTACTS;
    const parsed = JSON.parse(raw) as Contact[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEMO_CONTACTS;
  } catch {
    return DEMO_CONTACTS;
  }
}

function saveContacts(next: Contact[]) {
  try {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
}

function getInitials(first: string, last: string) {
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
}

function formatLastContact(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Last contact: unknown";
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return "Last contact: today";
  if (diffDays === 1) return "Last contact: yesterday";
  return `Last contact: ${diffDays} days ago`;
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
  if (type === "lead") return "border-l-4 border-blue-500";
  if (type === "customer") return "border-l-4 border-green-500";
  return "border-l-4 border-amber-500";
}

function typeBadgeStyles(type: ContactType) {
  if (type === "lead") return "bg-blue-500/15 text-blue-400";
  if (type === "customer") return "bg-green-500/15 text-green-400";
  return "bg-amber-500/15 text-amber-400";
}

function typeLabel(type: ContactType) {
  if (type === "lead") return "Lead";
  if (type === "customer") return "Customer";
  return "VIP";
}

export default function AppContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>(() =>
    typeof window === "undefined" ? [] : loadContacts(),
  );
  const [search, setSearch] = useState("");
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
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 2500);
    return () => window.clearTimeout(id);
  }, [toast]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
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
  }, [contacts, search, tab, sort]);

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
    if (!formFirstName.trim()) errors.firstName = "First name is required";
    if (!formLastName.trim()) errors.lastName = "Last name is required";
    if (!formPhone.trim()) errors.phone = "Phone is required";
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
          summary: "Added manually from dashboard.",
        },
      ],
    };

    const next = [newContact, ...contacts];
    setContacts(next);
    saveContacts(next);
    setToast("Contact added");
    setShowAdd(false);
    resetForm();
  };

  return (
    <div className="relative max-w-5xl mx-auto p-4 md:p-6">
      <div className="flex items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-lg md:text-xl font-semibold text-white flex items-center gap-2">
            Contacts
            <span className="text-xs font-normal text-zinc-500">· {count} saved</span>
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            Every caller your AI speaks to, in one place.
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
          + Add Contact
        </button>
      </div>

      <div className="flex flex-col md:flex-row md:items-center gap-3 mb-4">
        <div className="flex-1 flex items-center gap-2">
          <input
            type="search"
            placeholder="Search by name, phone, or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-white placeholder:text-zinc-600 focus:border-zinc-600 focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-500">Sort</span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortId)}
            className="px-3 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 focus:outline-none"
          >
            <option value="newest">Newest</option>
            <option value="score">Score</option>
            <option value="name">Name</option>
          </select>
        </div>
      </div>

      <div className="flex gap-2 mb-4 overflow-x-auto pb-1" aria-label="Contact filters">
        {(["all", "leads", "customers", "vip"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap capitalize ${
              tab === t ? "bg-zinc-800 text-white" : "bg-zinc-900 border border-zinc-800 text-zinc-400"
            }`}
          >
            {t === "all" ? "All" : t.charAt(0).toUpperCase() + t.slice(1)}
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
        + Add Contact
      </button>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 py-12 px-6 text-center">
          <p className="text-sm text-zinc-400 mb-2">No contacts yet.</p>
          <p className="text-xs text-zinc-500">
            Your AI adds contacts from every call. Manual contacts appear here too.
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
                    className={`w-full text-left flex items-center gap-4 p-4 rounded-2xl border bg-zinc-900/50 ${
                      typeStyles(c.type)
                    } border-zinc-800 hover:bg-zinc-900 transition-colors ${selectedId === c.id ? "ring-1 ring-zinc-600" : ""}`}
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
                          {typeLabel(c.type)}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400 truncate">
                        {c.phone}
                        {c.email ? ` · ${c.email}` : ""}
                      </p>
                      <p className="text-[11px] text-zinc-500 mt-1">
                        {formatLastContact(c.lastContact)}
                      </p>
                    </div>
                    {typeof c.score === "number" && (
                      <div className="w-12 h-12 rounded-full border border-zinc-700 flex items-center justify-center text-xs font-semibold text-zinc-200 shrink-0">
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
              <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/40 p-6 text-sm text-zinc-500">
                Select a contact to see call history and notes.
              </div>
            )}
          </aside>
        </div>
      )}

      <p className="mt-6">
        <Link href="/app/activity" className="text-sm text-zinc-400 hover:text-white transition-colors">
          ← Activity
        </Link>
      </p>

      {toast && (
        <div className="fixed bottom-4 right-4 z-40 px-4 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-sm text-zinc-100 shadow-lg">
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
            className="w-full max-w-xs sm:max-w-sm h-full bg-black border-l border-zinc-800 p-5 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold text-white">Add contact</h2>
                <p className="text-xs text-zinc-500 mt-0.5">Your AI will use this on future calls.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowAdd(false)}
                className="text-xs text-zinc-400 hover:text-white"
                aria-label="Close"
              >
                Close
              </button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-[11px] text-zinc-500 mb-1">First name*</label>
                  <input
                    type="text"
                    value={formFirstName}
                    onChange={(e) => setFormFirstName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-white placeholder:text-zinc-600 focus:border-zinc-600 focus:outline-none"
                    placeholder="Mike"
                  />
                  {formErrors.firstName && (
                    <p className="mt-1 text-[11px] text-red-500">{formErrors.firstName}</p>
                  )}
                </div>
                <div className="flex-1">
                  <label className="block text-[11px] text-zinc-500 mb-1">Last name*</label>
                  <input
                    type="text"
                    value={formLastName}
                    onChange={(e) => setFormLastName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-white placeholder:text-zinc-600 focus:border-zinc-600 focus:outline-none"
                    placeholder="Johnson"
                  />
                  {formErrors.lastName && (
                    <p className="mt-1 text-[11px] text-red-500">{formErrors.lastName}</p>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-[11px] text-zinc-500 mb-1">Phone*</label>
                <input
                  type="tel"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-white placeholder:text-zinc-600 focus:border-zinc-600 focus:outline-none"
                  placeholder="(503) 555-0199"
                />
                {formErrors.phone && (
                  <p className="mt-1 text-[11px] text-red-500">{formErrors.phone}</p>
                )}
              </div>
              <div>
                <label className="block text-[11px] text-zinc-500 mb-1">Email</label>
                <input
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-white placeholder:text-zinc-600 focus:border-zinc-600 focus:outline-none"
                  placeholder="name@email.com"
                />
              </div>
              <div>
                <label className="block text-[11px] text-zinc-500 mb-1">Type</label>
                <select
                  value={formType}
                  onChange={(e) => setFormType(e.target.value as ContactType)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-zinc-200 focus:outline-none"
                >
                  <option value="lead">Lead</option>
                  <option value="customer">Customer</option>
                  <option value="vip">VIP</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] text-zinc-500 mb-1">Tags</label>
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
                    className="flex-1 px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-white placeholder:text-zinc-600 focus:border-zinc-600 focus:outline-none"
                    placeholder="Type and press Enter"
                  />
                  <button
                    type="button"
                    onClick={handleAddTag}
                    className="px-3 py-2 rounded-xl border border-zinc-700 text-xs text-zinc-300 hover:border-zinc-500"
                  >
                    Add
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
                <label className="block text-[11px] text-zinc-500 mb-1">Notes</label>
                <textarea
                  rows={3}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-white placeholder:text-zinc-600 focus:border-zinc-600 focus:outline-none resize-none"
                  placeholder="What matters for this contact…"
                />
              </div>
            </div>
            <div className="pt-4 mt-2 border-t border-zinc-800 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setShowAdd(false)}
                className="px-4 py-2 rounded-xl border border-zinc-700 text-sm text-zinc-300 hover:border-zinc-500"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveContact}
                className="px-4 py-2 rounded-xl bg-white text-black text-sm font-semibold hover:bg-zinc-100"
              >
                Save Contact
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
            className="w-full max-w-sm h-full bg-black border-l border-zinc-800 p-5 overflow-y-auto"
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
  const fullName = `${contact.firstName} ${contact.lastName}`;
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 text-sm text-zinc-200">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="text-sm font-semibold text-white">{fullName}</h2>
          <p className="text-xs text-zinc-500 mt-0.5">{typeLabel(contact.type)}</p>
        </div>
        {typeof contact.score === "number" && (
          <div className="w-10 h-10 rounded-full border border-zinc-700 flex items-center justify-center text-xs font-semibold text-zinc-200">
            {contact.score}
          </div>
        )}
      </div>
      <div className="space-y-2 mb-4">
        <p className="text-xs text-zinc-400">{formatLastContact(contact.lastContact)}</p>
        <div className="flex flex-wrap gap-2 text-xs">
          <a
            href={`tel:${encodeURIComponent(contact.phone)}`}
            className="px-2 py-1 rounded-lg border border-zinc-700 text-zinc-200 hover:border-zinc-500"
          >
            Call {contact.phone}
          </a>
          {contact.email && (
            <a
              href={`mailto:${encodeURIComponent(contact.email)}`}
              className="px-2 py-1 rounded-lg border border-zinc-700 text-zinc-200 hover:border-zinc-500"
            >
              Email
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
        <h3 className="text-xs font-semibold text-zinc-300 mb-2">Call history</h3>
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
                    · {h.type === "inbound" ? "Inbound" : "Outbound"} · {h.duration}
                  </p>
                  <p className="text-xs text-zinc-200">{h.summary}</p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-zinc-500">No calls logged yet for this contact.</p>
        )}
      </div>
    </div>
  );
}

