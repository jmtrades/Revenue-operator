"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useWorkspace } from "@/components/WorkspaceContext";
import { PageHeader, EmptyState } from "@/components/ui";
import { ContactsListSkeleton } from "@/components/ui/ContactsListSkeleton";
import { fetchWithFallback } from "@/lib/reliability/fetch-with-fallback";

interface Contact {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  company: string | null;
  state: string;
  last_activity_at: string | null;
  created_at?: string;
}

export default function ContactsPage() {
  const { workspaceId } = useWorkspace();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const load = () => {
    if (!workspaceId) return;
    setLoading(true);
    setError(null);
    fetchWithFallback<{ contacts: Contact[] }>(
      `/api/contacts?workspace_id=${encodeURIComponent(workspaceId)}`,
      { credentials: "include" }
    )
      .then((res) => {
        if (res.data?.contacts) setContacts(res.data.contacts);
        else setContacts([]);
        if (res.error) setError(res.error);
      })
      .catch(() => setError("Could not load contacts."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!workspaceId) {
      setContacts([]);
      setLoading(false);
      setError(null);
      return;
    }
    load();
  }, [workspaceId]);

  const filtered = search.trim()
    ? contacts.filter(
        (c) =>
          (c.name ?? "").toLowerCase().includes(search.toLowerCase()) ||
          (c.email ?? "").toLowerCase().includes(search.toLowerCase()) ||
          (c.company ?? "").toLowerCase().includes(search.toLowerCase()) ||
          (c.phone ?? "").includes(search)
      )
    : contacts;

  if (!workspaceId) {
    return (
      <div className="p-8 max-w-4xl">
        <PageHeader title="Contacts" subtitle="Leads and contacts." />
        <EmptyState icon="watch" title="Select a context." subtitle="Contacts appear here." />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl">
      <PageHeader title="Contacts" subtitle="Search and filter by lead or company." />
      <div className="mb-4">
        <input
          type="search"
          placeholder="Search by name, email, company…"
          className="w-full max-w-md px-3 py-2 rounded-lg border text-sm"
          style={{ borderColor: "var(--border)", background: "var(--surface-card)", color: "var(--text-primary)" }}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      {loading ? (
        <ContactsListSkeleton />
      ) : error ? (
        <div className="rounded-lg border py-12 px-6 text-center" style={{ borderColor: "var(--border)" }}>
          <p className="text-sm mb-3" style={{ color: "var(--text-secondary)" }}>{error}</p>
          <button type="button" onClick={load} className="text-sm font-medium px-4 py-2 rounded-lg" style={{ background: "var(--accent-primary-subtle)", color: "var(--accent-primary)" }}>Retry</button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border py-12 px-6 text-center" style={{ borderColor: "var(--border)" }}>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>No contacts yet. They appear when you have conversations or import leads.</p>
          <Link href="/dashboard/record" className="inline-block mt-4 text-sm" style={{ color: "var(--accent)" }}>Record</Link>
        </div>
      ) : (
        <ul className="rounded-lg border overflow-hidden" style={{ borderColor: "var(--border)", background: "var(--surface-card)" }}>
          {filtered.map((c) => (
            <li key={c.id} className="border-b last:border-b-0 flex items-center justify-between gap-2" style={{ borderColor: "var(--border)" }}>
              <Link
                href={`/dashboard/record/lead/${c.id}`}
                className="flex-1 min-w-0 px-4 py-3 hover:opacity-90"
                style={{ color: "var(--text-primary)" }}
              >
                <p className="text-sm font-medium">{c.name || c.email || c.company || "—"}</p>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{c.state} · {c.company || "—"}</p>
              </Link>
              {c.phone && (
                <Link
                  href={`/dashboard/messages?lead=${c.id}`}
                  className="px-3 py-2 text-xs font-medium rounded-lg border shrink-0"
                  style={{ borderColor: "var(--border)", color: "var(--accent-primary)" }}
                >
                  Message
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
