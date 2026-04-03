"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useWorkspaceSafe } from "@/components/WorkspaceContext";
import {
  ShieldBan,
  Plus,
  Trash2,
  Search,
  Phone,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";

interface DNCEntry {
  id: string;
  phone_number: string;
  reason: string;
  source: string;
  notes: string | null;
  added_by: string;
  created_at: string;
}

const REASON_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  manual: { bg: "rgba(59,130,246,0.1)", text: "rgb(59,130,246)", label: "Manual" },
  customer_request: { bg: "rgba(139,92,246,0.1)", text: "rgb(139,92,246)", label: "Customer Request" },
  legal: { bg: "rgba(239,68,68,0.1)", text: "rgb(239,68,68)", label: "Legal" },
  carrier_block: { bg: "rgba(245,158,11,0.1)", text: "rgb(245,158,11)", label: "Carrier Block" },
};

function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return phone;
}

export function DNCManagementCard() {
  const ws = useWorkspaceSafe();
  const workspaceId = ws?.workspaceId ?? "";
  const [entries, setEntries] = useState<DNCEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [adding, setAdding] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [newPhone, setNewPhone] = useState("");
  const [newReason, setNewReason] = useState("manual");
  const [newNotes, setNewNotes] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const PAGE_SIZE = 10;

  const fetchEntries = useCallback(async (q = "", offset = 0) => {
    if (!workspaceId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        workspace_id: workspaceId,
        offset: String(offset),
        limit: String(PAGE_SIZE),
      });
      if (q) params.set("q", q);
      const res = await fetch(`/api/dnc?${params}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      const json = await res.json();
      setEntries(json.entries ?? []);
      setTotal(json.total ?? 0);
    } catch {
      setEntries([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    fetchEntries("", 0);
  }, [fetchEntries]);

  const handleSearch = (val: string) => {
    setSearch(val);
    setPage(0);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchEntries(val, 0);
    }, 300);
  };

  const handleAdd = async () => {
    if (!newPhone.trim() || !workspaceId) return;
    setAdding(true);
    try {
      const res = await fetch("/api/dnc", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspace_id: workspaceId,
          phone_number: newPhone.trim(),
          reason: newReason,
          notes: newNotes.trim() || undefined,
        }),
      });
      if (res.ok || res.status === 409) {
        setNewPhone("");
        setNewNotes("");
        setShowForm(false);
        fetchEntries(search, page * PAGE_SIZE);
      }
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      await fetch(`/api/dnc?id=${id}`, { method: "DELETE", credentials: "include" });
      fetchEntries(search, page * PAGE_SIZE);
    } finally {
      setDeleting(null);
      setDeleteConfirm(null);
    }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="dash-section p-5 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ShieldBan className="w-4 h-4 text-red-500" />
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">
            Do Not Call List
          </h2>
          {total > 0 && (
            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-red-500/10 text-red-500">
              {total}
            </span>
          )}
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--accent-primary)] hover:underline"
        >
          <Plus className="w-3.5 h-3.5" />
          Add number
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="mb-4 p-4 rounded-xl border border-[var(--border-default)] bg-[var(--bg-hover)] space-y-3">
          <div className="flex gap-2">
            <div className="flex-1">
              <input
                type="tel"
                placeholder="Phone number (e.g. +18001234567)"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-primary)] placeholder:text-[var(--text-disabled)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/30 focus:border-[var(--accent-primary)]"
              />
            </div>
            <select
              value={newReason}
              onChange={(e) => setNewReason(e.target.value)}
              className="px-3 py-2 text-sm rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/30"
            >
              <option value="manual">Manual</option>
              <option value="customer_request">Customer Request</option>
              <option value="legal">Legal</option>
              <option value="carrier_block">Carrier Block</option>
            </select>
          </div>
          <input
            type="text"
            placeholder="Notes (optional)"
            value={newNotes}
            onChange={(e) => setNewNotes(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-primary)] placeholder:text-[var(--text-disabled)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/30 focus:border-[var(--accent-primary)]"
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowForm(false)}
              className="px-3 py-1.5 text-xs rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAdd}
              disabled={adding || !newPhone.trim()}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium rounded-lg bg-red-500 text-white hover:bg-red-600 disabled:opacity-50 transition-colors"
            >
              {adding && <Loader2 className="w-3 h-3 animate-spin" />}
              Add to DNC
            </button>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-disabled)]" />
        <input
          type="text"
          placeholder="Search phone numbers..."
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-primary)] placeholder:text-[var(--text-disabled)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/30 focus:border-[var(--accent-primary)]"
        />
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-14 rounded-lg bg-[var(--bg-hover)] skeleton-shimmer" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <div className="py-8 text-center">
          <ShieldBan className="w-8 h-8 mx-auto text-[var(--text-disabled)] mb-2" />
          <p className="text-sm text-[var(--text-secondary)]">
            {search ? "No numbers match your search" : "No numbers on the DNC list"}
          </p>
          <p className="text-xs text-[var(--text-tertiary)] mt-1">
            Numbers added here will be excluded from all outbound campaigns
          </p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {entries.map((entry) => {
            const rc = REASON_COLORS[entry.reason] ?? REASON_COLORS.manual;
            return (
              <div
                key={entry.id}
                className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-[var(--bg-hover)] transition-colors group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Phone className="w-4 h-4 text-[var(--text-disabled)] shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[var(--text-primary)] font-mono">
                      {formatPhone(entry.phone_number)}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span
                        className="text-[10px] font-medium px-1.5 py-0.5 rounded"
                        style={{ background: rc.bg, color: rc.text }}
                      >
                        {rc.label}
                      </span>
                      {entry.notes && (
                        <span className="text-[11px] text-[var(--text-tertiary)] truncate max-w-[200px]">
                          {entry.notes}
                        </span>
                      )}
                      <span className="text-[11px] text-[var(--text-disabled)]">
                        {new Date(entry.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {deleteConfirm === entry.id ? (
                    <>
                      <button
                        onClick={() => handleDelete(entry.id)}
                        disabled={deleting === entry.id}
                        className="px-2 py-1 text-[11px] font-medium rounded bg-red-500 text-white hover:bg-red-600 disabled:opacity-50"
                      >
                        {deleting === entry.id ? "..." : "Confirm"}
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(null)}
                        className="px-2 py-1 text-[11px] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirm(entry.id)}
                      className="p-1.5 rounded-lg hover:bg-red-500/10 text-[var(--text-disabled)] hover:text-red-500 transition-colors"
                      title="Remove from DNC"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-[var(--border-default)]">
          <span className="text-xs text-[var(--text-tertiary)]">
            {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total}
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => { setPage(p => p - 1); fetchEntries(search, (page - 1) * PAGE_SIZE); }}
              disabled={page === 0}
              className="p-1.5 rounded-lg hover:bg-[var(--bg-hover)] disabled:opacity-30 text-[var(--text-secondary)]"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => { setPage(p => p + 1); fetchEntries(search, (page + 1) * PAGE_SIZE); }}
              disabled={page >= totalPages - 1}
              className="p-1.5 rounded-lg hover:bg-[var(--bg-hover)] disabled:opacity-30 text-[var(--text-secondary)]"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
