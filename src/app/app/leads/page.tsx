"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Users, Search, Filter, X, Plus } from "lucide-react";
import { toast } from "sonner";
import { useWorkspace } from "@/components/WorkspaceContext";
import { getWorkspaceMeSnapshotSync } from "@/lib/client/workspace-me";
import { Tabs } from "@/components/ui/Tabs";
import { Sheet } from "@/components/ui/Sheet";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { getClientOrNull } from "@/lib/supabase/client";
import { useDebounce } from "@/hooks/useDebounce";
import { safeGetItem, safeSetItem, safeRemoveItem } from "@/lib/client/safe-storage";
import { useRouter, useSearchParams } from "next/navigation";
import { LeadsList } from "./components/LeadsList";
import { LeadsKanban } from "./components/LeadsKanban";
import { LeadDetail } from "./components/LeadDetail";

interface ApiLead {
  id: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  state: string;
  last_activity_at: string;
  opt_out?: boolean | null;
  deal_id?: string | null;
  value_cents?: number | null;
  metadata?: { source?: string; service_requested?: string; notes?: string; score?: number } | null;
}

export type LeadView = {
  id: string;
  name: string;
  phone: string;
  email: string;
  source: LeadSource;
  status: LeadStatus;
  score: number | null;
  service: string;
  createdAt: string;
  lastContactAt: string;
  assignedAgent: string;
  notes: string;
  linkedCallId?: string;
  timeline: { at: string; label: string }[];
};

type ViewMode = "table" | "board";
type ScoreBucket = "all" | "high" | "medium" | "low";

type LeadStatus = "New" | "Contacted" | "Qualified" | "Appointment Set" | "Won" | "Lost";
type LeadSource = "Inbound Call" | "Outbound Outreach" | "Website" | "Referral";

const STATUS_ORDER: LeadStatus[] = [
  "New",
  "Contacted",
  "Qualified",
  "Appointment Set",
  "Won",
  "Lost",
];

const SCORE_COLORS: Record<ScoreBucket, string> = {
  high: "bg-[var(--accent-primary)]/15 text-[var(--accent-primary)] border-[var(--accent-primary)]/40",
  medium: "bg-[var(--accent-warning,#f59e0b)]/15 text-[var(--accent-warning,#f59e0b)] border-[var(--accent-warning,#f59e0b)]/40",
  low: "bg-[var(--accent-danger,#ef4444)]/15 text-[var(--accent-danger,#ef4444)] border-[var(--accent-danger,#ef4444)]/40",
  all: "bg-[var(--bg-card)] text-[var(--text-secondary)] border-[var(--border-medium)]",
};

function scoreBucket(score: number | null): ScoreBucket {
  if (score === null) return "low";
  if (score >= 70) return "high";
  if (score >= 40) return "medium";
  return "low";
}

const SOURCE_TO_LABEL: Record<string, LeadSource> = {
  inbound_call: "Inbound Call",
  outbound: "Outbound Outreach",
  website: "Website",
  referral: "Referral",
  csv_import: "Website",
  api: "Outbound Outreach",
  other: "Inbound Call",
};

function _getStatusDisplay(
  status: LeadStatus,
  t: (key: string) => string
): string {
  const map: Record<LeadStatus, string> = {
    "New": t("leads.status.new"),
    "Contacted": t("leads.status.contacted"),
    "Qualified": t("leads.status.qualified"),
    "Appointment Set": t("leads.status.appointmentSet"),
    "Won": t("leads.status.won"),
    "Lost": t("leads.status.lost"),
  };
  return map[status] ?? status;
}

function _getSourceDisplay(
  source: LeadSource,
  t: (key: string) => string
): string {
  const map: Record<LeadSource, string> = {
    "Inbound Call": t("leads.sources.inboundCall"),
    "Outbound Outreach": t("leads.sources.outbound"),
    "Website": t("leads.sources.website"),
    "Referral": t("leads.sources.referral"),
  };
  return map[source] ?? source;
}

function mapApiLeadToView(
  l: ApiLead,
  index: number,
  t: (key: string) => string,
  agentsById?: Map<string, { id: string; name?: string | null }>,
): LeadView {
  const name = l.name?.trim() || l.company?.trim() || t("leads.defaultName");
  const status: LeadStatus =
    (l.state === "new" && "New") ||
    (l.state === "contacted" && "Contacted") ||
    (l.state === "qualified" && "Qualified") ||
    (l.state === "appointment_set" && "Appointment Set") ||
    (l.state === "won" && "Won") ||
    (l.state === "lost" && "Lost") ||
    "New";
  const meta = l.metadata;
  const source: LeadSource = meta?.source ? (SOURCE_TO_LABEL[meta.source] ?? "Inbound Call") : "Inbound Call";
  const score = typeof meta?.score === "number" ? meta.score : null;
  const service = meta?.service_requested?.trim() || l.company || t("leads.defaultService");
  const createdAt = l.last_activity_at;
  const lastContactAt = l.last_activity_at;
  const assignedAgentId = (l as { assigned_agent_id?: string | null } | null)?.assigned_agent_id ?? null;
  const assignedAgentName =
    assignedAgentId && agentsById ? agentsById.get(assignedAgentId)?.name?.trim() || "" : "";
  const notes =
    meta?.notes?.trim() ||
    (l.company && l.value_cents ? `${l.company} with potential value ~$${Math.round((l.value_cents ?? 0) / 100).toLocaleString()}.` : t("leads.defaultDescription"));
  const timeline = [
    { at: createdAt, label: t("leads.timeline.created") },
    { at: createdAt, label: t("leads.timeline.addedToPipeline") },
  ];
  return {
    id: l.id,
    name,
    phone: (l.phone ?? "").toString().trim(),
    email: l.email ?? "",
    source,
    status,
    score,
    service,
    createdAt,
    lastContactAt,
    assignedAgent: assignedAgentName,
    notes,
    linkedCallId: undefined,
    timeline,
  };
}

type SortKey = "newest" | "score" | "recent-contact";

const LEADS_SNAPSHOT_PREFIX = "rt_leads_snapshot:";
const SNAPSHOT_MAX_AGE_MS = 5 * 60 * 1000; // 5 minutes

interface SnapshotEnvelope<T> {
  ts: number;
  data: T;
}

function readLeadsSnapshot(workspaceId: string): LeadView[] {
  if (typeof window === "undefined" || !workspaceId) return [];
  const key = `${LEADS_SNAPSHOT_PREFIX}${workspaceId}`;
  try {
    const raw = safeGetItem(key);
    if (!raw) return [];
    const envelope = JSON.parse(raw) as SnapshotEnvelope<LeadView[]> | LeadView[];
    // Handle legacy format (plain array) — treat as expired
    if (Array.isArray(envelope)) {
      safeRemoveItem(key);
      return [];
    }
    if (Date.now() - envelope.ts > SNAPSHOT_MAX_AGE_MS) {
      safeRemoveItem(key);
      return [];
    }
    return Array.isArray(envelope.data) ? envelope.data : [];
  } catch {
    safeRemoveItem(key);
    return [];
  }
}

function persistLeadsSnapshot(workspaceId: string, leads: LeadView[]) {
  if (typeof window === "undefined" || !workspaceId) return;
  const envelope: SnapshotEnvelope<LeadView[]> = { ts: Date.now(), data: leads };
  safeSetItem(`${LEADS_SNAPSHOT_PREFIX}${workspaceId}`, JSON.stringify(envelope));
}

export default function LeadsPage() {
  const t = useTranslations();
  const tToast = useTranslations("toast");
  const { workspaceId } = useWorkspace();
  const router = useRouter();
  const searchParams = useSearchParams();
  const workspaceSnapshot = getWorkspaceMeSnapshotSync() as { id?: string | null } | null;
  const snapshotWorkspaceId =
    workspaceId || workspaceSnapshot?.id?.trim() || "default";
  const initialLeads = readLeadsSnapshot(snapshotWorkspaceId);
  const [agents, setAgents] = useState<Array<{ id: string; name?: string | null }>>([]);
  const [loading, setLoading] = useState(initialLeads.length === 0);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [view, setView] = useState<ViewMode>("table");
  const [statusFilter, setStatusFilter] = useState<LeadStatus[]>([]);
  const [sourceFilter, setSourceFilter] = useState<LeadSource[]>([]);
  const [scoreFilter, setScoreFilter] = useState<ScoreBucket>("all");
  const [sort, setSort] = useState<SortKey>("score"); // Default to brain priority
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [drawerLead, setDrawerLead] = useState<LeadView | null>(null);
  const [drawerCalls, setDrawerCalls] = useState<Array<{ id: string; call_started_at?: string; outcome?: string }>>([]);
  const [drawerCallsLoading, setDrawerCallsLoading] = useState(false);
  const [leads, setLeads] = useState<LeadView[]>(initialLeads);
  const [addLeadOpen, setAddLeadOpen] = useState(false);
  const [addLeadForm, setAddLeadForm] = useState({
    name: "",
    phone: "",
    email: "",
    company: "",
    service_requested: "",
    source: "website",
    status: "New" as LeadStatus,
    notes: "",
  });
  const [addLeadSaving, setAddLeadSaving] = useState(false);
  const [addLeadError, setAddLeadError] = useState<string | null>(null);
  const [csvPreviewRows, setCsvPreviewRows] = useState<Array<{ name: string; phone: string; email?: string; service_requested?: string; notes?: string }>>([]);
  const [csvImporting, setCsvImporting] = useState(false);
  const [outboundCalling, setOutboundCalling] = useState(false);
  const [outboundCallType, setOutboundCallType] = useState<string>("");

  useEffect(() => {
    document.title = t("leads.pageTitle");
    return () => { document.title = ""; };
  }, [t]);

  // Deep-link support for empty-state CTAs:
  // - ?add=1 opens the manual add-lead modal
  // - ?import=1 opens the same modal and surfaces the CSV upload UI
  useEffect(() => {
    const add = searchParams.get("add");
    const imp = searchParams.get("import");

    if (add === "1" || imp === "1") {
      setAddLeadOpen(true);

      // Remove query params so closing the modal doesn't immediately re-open it.
      try {
        const url = new URL(window.location.href);
        url.searchParams.delete("add");
        url.searchParams.delete("import");
        router.replace(`${url.pathname}${url.search}`, { scroll: false });
      } catch {
        // If URL manipulation fails, the modal still opens.
      }
    }
  }, [searchParams, router]);

  useEffect(() => {
    if (!workspaceId) return;
    let cancelled = false;
    fetch(`/api/agents?workspace_id=${encodeURIComponent(workspaceId)}`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { agents?: Array<{ id: string; name?: string | null }> } | null) => {
        if (cancelled) return;
        setAgents(Array.isArray(data?.agents) ? data!.agents : []);
      })
      .catch(() => {
        if (!cancelled) setAgents([]);
      });
    return () => {
      cancelled = true;
    };
  }, [workspaceId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (addLeadOpen) setAddLeadOpen(false);
      else if (drawerLead) setDrawerLead(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [addLeadOpen, drawerLead]);

  useEffect(() => {
    if (!workspaceId) return;
    let cancelled = false;
    fetch(`/api/leads?workspace_id=${encodeURIComponent(workspaceId)}`, {
      credentials: "include",
    })
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load leads");
        return r.json();
      })
      .then((data: { leads?: ApiLead[] }) => {
        if (cancelled) return;
        const apiLeads = data.leads ?? [];
        const agentsById =
          agents.length > 0
            ? new Map<string, { id: string; name?: string | null }>(agents.map((a) => [a.id, a]))
            : undefined;
        const mapped = apiLeads.map((l, i) => mapApiLeadToView(l, i, t, agentsById));
        setError(null);
        setLeads(mapped);
        persistLeadsSnapshot(workspaceId, mapped);
      })
      .catch(() => {
        if (!cancelled) setError(t("leads.errors.loadFailed"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [workspaceId, t, agents]);

  useEffect(() => {
    const client = getClientOrNull();
    if (!client) return;
    const channel = client
      .channel("leads-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "leads" },
        (payload: { eventType: "INSERT" | "UPDATE" | "DELETE"; new?: ApiLead; old?: { id: string } }) => {
          const p = payload;
          if (p.eventType === "INSERT" && p.new) {
            setLeads((prev) => {
              const mapped = mapApiLeadToView(p.new as ApiLead, prev.length, t);
              return [mapped, ...prev];
            });
            const name = p.new.name || p.new.email || t("leads.unknownLead");
            toast.info(t("leads.toast.newLead", { name }));
          } else if (p.eventType === "UPDATE" && p.new) {
            setLeads((prev) => {
              const updated = mapApiLeadToView(p.new as ApiLead, 0, t);
              return prev.map((l) => (l.id === updated.id ? { ...l, ...updated } : l));
            });
          } else if (p.eventType === "DELETE" && p.old) {
            setLeads((prev) => prev.filter((l) => l.id !== p.old!.id));
          }
        },
      )
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  }, [t]);

  // Poll for updates every 30 seconds (fallback for realtime; skip if drawer is open with unsaved edits)
  useEffect(() => {
    if (!workspaceId || drawerLead) return;
    const interval = setInterval(() => {
      fetch(`/api/leads?workspace_id=${encodeURIComponent(workspaceId)}`, {
        credentials: "include",
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((data: { leads?: ApiLead[] } | null) => {
          if (!data?.leads) return;
          const apiLeads = data.leads;
          const agentsById =
            agents.length > 0
              ? new Map<string, { id: string; name?: string | null }>(agents.map((a) => [a.id, a]))
              : undefined;
          const mapped = apiLeads.map((l, i) => mapApiLeadToView(l, i, t, agentsById));
          setLeads(mapped);
          persistLeadsSnapshot(workspaceId, mapped);
        })
        .catch(() => {
          // Silent fail on polling errors
        });
    }, 30000); // Poll every 30 seconds

    return () => clearInterval(interval);
  }, [workspaceId, drawerLead, agents, t]);

  const totalCount = leads.length;

  const filteredLeads = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    let list = [...leads];
    if (q) {
      list = list.filter((l) => {
        return (
          l.name.toLowerCase().includes(q) ||
          l.phone.toLowerCase().includes(q) ||
          l.email.toLowerCase().includes(q)
        );
      });
    }
    if (statusFilter.length > 0) {
      list = list.filter((l) => statusFilter.includes(l.status));
    }
    if (sourceFilter.length > 0) {
      list = list.filter((l) => sourceFilter.includes(l.source));
    }
    if (scoreFilter !== "all") {
      list = list.filter((l) => scoreBucket(l.score) === scoreFilter);
    }

    list.sort((a, b) => {
      if (sort === "score") {
        return (b.score ?? -1) - (a.score ?? -1);
      }
      if (sort === "recent-contact") {
        return new Date(b.lastContactAt).getTime() - new Date(a.lastContactAt).getTime();
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return list;
  }, [leads, debouncedSearch, sort, sourceFilter, scoreFilter, statusFilter]);

  const groupedByStatus = useMemo(() => {
    const map = new Map<LeadStatus, LeadView[]>();
    STATUS_ORDER.forEach((s) => map.set(s, []));
    filteredLeads.forEach((lead) => {
      const arr = map.get(lead.status);
      if (arr) arr.push(lead);
    });
    return map;
  }, [filteredLeads]);

  const toggleStatusFilter = (status: LeadStatus) => {
    setStatusFilter((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]
    );
  };

  const toggleSourceFilter = (source: LeadSource) => {
    setSourceFilter((prev) =>
      prev.includes(source) ? prev.filter((s) => s !== source) : [...prev, source]
    );
  };

  const toggleAllSelected = (checked: boolean) => {
    if (!checked) {
      setSelectedIds(new Set());
      return;
    }
    setSelectedIds(new Set(filteredLeads.map((l) => l.id)));
  };

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const bulkChangeStatus = (nextStatus: LeadStatus) => {
    if (selectedIds.size === 0) return;
    setLeads((prev) =>
      prev.map((l) => (selectedIds.has(l.id) ? { ...l, status: nextStatus } : l))
    );
    if (drawerLead && selectedIds.has(drawerLead.id)) {
      setDrawerLead({ ...drawerLead, status: nextStatus });
    }
    selectedIds.forEach((leadId) => persistLeadStatus(leadId, nextStatus));
  };

  const bulkAssignAgent = (agent: string) => {
    if (!agent || selectedIds.size === 0) return;
    setLeads((prev) =>
      prev.map((l) => (selectedIds.has(l.id) ? { ...l, assignedAgent: agent } : l))
    );
    // Persist agent assignment to backend for each selected lead
    selectedIds.forEach((leadId) => {
      fetch(`/api/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ assigned_agent: agent }),
      }).catch(() => { /* non-blocking */ });
    });
  };

  const moveLeadStatus = (leadId: string, newStatus: LeadStatus) => {
    setLeads((prev) =>
      prev.map((l) => (l.id === leadId ? { ...l, status: newStatus } : l))
    );
    if (drawerLead?.id === leadId) {
      setDrawerLead({ ...drawerLead, status: newStatus });
    }
    persistLeadStatus(leadId, newStatus);
  };

  const openDrawer = (lead: LeadView) => {
    setDrawerLead(lead);
    setDrawerCalls([]);
    setDrawerCallsLoading(true);
    fetch(`/api/leads/${lead.id}/calls`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { calls?: Array<{ id: string; call_started_at?: string; outcome?: string }> } | null) => {
        setDrawerCalls(Array.isArray(data?.calls) ? data.calls : []);
      })
      .catch(() => setDrawerCalls([]))
      .finally(() => setDrawerCallsLoading(false));
  };

  const closeDrawer = () => {
    setDrawerLead(null);
    setDrawerCalls([]);
  };

  const scoreBadgeClass = (score: number | null): string => {
    const bucket = scoreBucket(score);
    return SCORE_COLORS[bucket];
  };

  const refetchLeads = () => {
    if (!workspaceId) return;
    fetch(`/api/leads?workspace_id=${encodeURIComponent(workspaceId)}`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { leads?: ApiLead[] }) => {
        const apiLeads = data?.leads ?? [];
        const agentsById =
          agents.length > 0
            ? new Map<string, { id: string; name?: string | null }>(agents.map((a) => [a.id, a]))
            : undefined;
        const mapped = apiLeads.map((l, i) => mapApiLeadToView(l, i, t, agentsById));
        setLeads(mapped);
        persistLeadsSnapshot(workspaceId, mapped);
      })
      .catch((e: unknown) => { console.warn("[page] failed:", e instanceof Error ? e.message : String(e)); });
  };

  const persistLeadStatus = (leadId: string, status: LeadStatus) => {
    fetch(`/api/leads/${leadId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ state: status }),
    }).catch((err) => {
      // silenced
    });
  };

  const handleAddLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addLeadForm.name.trim() || !addLeadForm.phone.trim() || addLeadSaving) {
      if (!addLeadForm.name.trim()) setAddLeadError(t("leads.errors.nameRequired"));
      else if (!addLeadForm.phone.trim()) setAddLeadError(t("leads.errors.phoneRequired"));
      return;
    }
    if (!workspaceId) {
      setAddLeadError(t("leads.errors.workspaceMissing"));
      return;
    }
    setAddLeadError(null);
    setAddLeadSaving(true);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: addLeadForm.name.trim(),
          phone: addLeadForm.phone.trim(),
          email: addLeadForm.email.trim() || undefined,
          company: addLeadForm.company.trim() || undefined,
          service_requested: addLeadForm.service_requested.trim() || undefined,
          source: addLeadForm.source,
          status: addLeadForm.status.replace(/\s+/g, "_").toLowerCase(),
          notes: addLeadForm.notes.trim() || undefined,
        }),
      });
      const data = (await res.json().catch(() => null)) as {
        id?: string;
        error?: string;
      } | null;
      if (!res.ok) {
        setAddLeadError(t("leads.errors.addFailed"));
        toast.error(t("leads.errors.addFailed"));
        return;
      }
      refetchLeads();
      setAddLeadOpen(false);
      setAddLeadForm({
        name: "",
        phone: "",
        email: "",
        company: "",
        service_requested: "",
        source: "website",
        status: "New",
        notes: "",
      });
      toast.success(t("leads.toast.added"));
    } catch {
      setAddLeadError(t("leads.errors.addFailed"));
      toast.error(tToast("error.generic"));
    } finally {
      setAddLeadSaving(false);
    }
  };

  const handleHaveAICall = async () => {
    if (!drawerLead?.id || outboundCalling) return;
    setOutboundCalling(true);
    try {
      const body: { lead_id: string; campaign_type?: string } = { lead_id: drawerLead.id };
      if (outboundCallType && outboundCallType !== "default") body.campaign_type = outboundCallType;
      const res = await fetch("/api/outbound/call", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
      if (res.ok && data?.ok) {
        toast.success(t("leads.toast.callStarted"));
        closeDrawer();
      } else {
        toast.error(t("leads.toast.callFailed"));
      }
    } catch {
      toast.error(t("leads.toast.callFailed"));
    } finally {
      setOutboundCalling(false);
    }
  };

  const sources: LeadSource[] = ["Inbound Call", "Outbound Outreach", "Website", "Referral"];
  const sourceLabel = (s: LeadSource): string => {
    if (s === "Inbound Call") return t("leads.sources.inboundCall");
    if (s === "Website") return t("leads.sources.website");
    if (s === "Referral") return t("leads.sources.referral");
    if (s === "Outbound Outreach") return t("leads.sources.outbound");
    return t("leads.sources.other");
  };

  return (
    <div>
      <div className="p-6 md:p-8 max-w-6xl mx-auto">
        <Breadcrumbs items={[{ label: "Dashboard", href: "/app" }, { label: "Leads" }]} />
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-6">
          <div>
            <h1 className="text-xl md:text-2xl font-bold tracking-[-0.025em] text-[var(--text-primary)] flex items-center gap-2">
              <Users className="w-5 h-5 text-[var(--text-tertiary)]" />
              {t("leads.heading")}
            </h1>
            <p className="text-[13px] text-[var(--text-secondary)] mt-1.5 leading-relaxed">
              {t("leads.description")}
            </p>
            {error && (
              <div className="mt-3 flex items-center gap-2">
                <p className="text-sm text-[var(--accent-danger,#ef4444)]">{error}</p>
                <button onClick={() => { setError(null); setLoading(true); refetchLeads(); }} className="mt-0 px-3 py-1.5 rounded-lg text-xs font-medium" style={{ background: "var(--accent-primary)", color: "var(--text-on-accent)" }}>
                  Try Again
                </button>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => { setAddLeadOpen(true); setAddLeadError(null); }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--accent-primary)] text-[var(--text-on-accent)] text-xs font-semibold px-4 py-2 hover:opacity-90"
            >
              <Plus className="w-4 h-4" />
              {t("leads.addLead")}
            </button>
            <span className="inline-flex items-center rounded-full border border-[var(--border-default)] bg-[var(--bg-card)] px-3 py-1 text-xs text-[var(--text-secondary)]">
              <span className="font-semibold text-[var(--text-primary)]">{t("leads.total", { count: totalCount })}</span>
            </span>
            <button
              type="button"
              onClick={async () => {
                if (!workspaceId) return;
                try {
                  const res = await fetch(
                    `/api/leads/export?workspace_id=${encodeURIComponent(
                      workspaceId,
                    )}`,
                    { credentials: "include" },
                  );
                  if (!res.ok) {
                    toast.error(t("leads.toast.exportFailed"));
                    return;
                  }
                  const blob = await res.blob();
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `revenue-operator-leads-${new Date()
                    .toISOString()
                    .slice(0, 10)}.csv`;
                  document.body.appendChild(a);
                  a.click();
                  a.remove();
                  URL.revokeObjectURL(url);
                  toast.success(t("leads.toast.exportSuccess"));
                } catch {
                  toast.error(t("leads.toast.exportFailed"));
                }
              }}
              className="hidden md:inline-flex items-center rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] px-3 py-1.5 text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-input)]"
            >
              {t("leads.exportCsv")}
            </button>
            <div className="hidden md:block">
              <Tabs
                tabs={[{ id: "table", label: t("leads.viewTable") }, { id: "board", label: t("leads.viewBoard") }]}
                activeTab={view}
                onChange={(id) => setView(id as ViewMode)}
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row md:items-center gap-3 mb-4">
          <div className="flex-1 min-w-[200px]">
            <Input
              type="search"
              icon={Search}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("leads.searchPlaceholder")}
              className="rounded-xl"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1 text-[var(--text-secondary)]">
              <Filter className="w-3 h-3" />
              {t("leads.filters")}
            </span>
            <div className="flex flex-wrap gap-1">
              {STATUS_ORDER.map((status) => {
                const active = statusFilter.includes(status);
                return (
                  <button
                    key={status}
                    type="button"
                    onClick={() => toggleStatusFilter(status)}
                    className={`px-2.5 py-1 rounded-full border text-[11px] ${
                      active
                        ? "border-[var(--accent-primary)] bg-[var(--accent-primary)] text-[var(--text-on-accent)]"
                        : "border-[var(--border-medium)] text-[var(--text-secondary)] hover:border-[var(--border-medium)]"
                    }`}
                  >
                    {t(`leads.board.columns.${status === "Appointment Set" ? "appointment" : status.toLowerCase()}`)}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:gap-3">
          <form
            className="flex-1 flex flex-col sm:flex-row gap-2"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!workspaceId) return;
              const name = addLeadForm.name.trim();
              const phone = addLeadForm.phone.trim();
              const email = addLeadForm.email.trim();
              if (!name || !phone) {
                setAddLeadError(
                  !name ? t("leads.errors.nameRequired") : t("leads.errors.phoneRequired"),
                );
                return;
              }
              if (addLeadSaving) return;
              setAddLeadError(null);
              setAddLeadSaving(true);
              try {
                const res = await fetch("/api/leads", {
                  method: "POST",
                  credentials: "include",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    name,
                    phone,
                    email: email || undefined,
                    source: "website",
                    status: "New",
                  }),
                });
                const data = (await res.json().catch(() => null)) as {
                  error?: string;
                } | null;
                if (!res.ok) {
                  setAddLeadError(data?.error ?? t("leads.errors.addFailed"));
                  return;
                }
                refetchLeads();
                setAddLeadForm((prev) => ({
                  ...prev,
                  name: "",
                  phone: "",
                  email: "",
                }));
              } catch {
                setAddLeadError(t("leads.errors.addFailed"));
              } finally {
                setAddLeadSaving(false);
              }
            }}
          >
            <input
              type="text"
              value={addLeadForm.name}
              onChange={(e) =>
                setAddLeadForm((prev) => ({ ...prev, name: e.target.value }))
              }
              placeholder={t("leads.inlineNamePlaceholder")}
              className="flex-1 px-3 py-2 text-xs rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:border-[var(--border-medium)]"
            />
            <input
              type="tel"
              value={addLeadForm.phone}
              onChange={(e) =>
                setAddLeadForm((prev) => ({ ...prev, phone: e.target.value }))
              }
              placeholder={t("leads.inlinePhonePlaceholder")}
              className="flex-1 px-3 py-2 text-xs rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:border-[var(--border-medium)]"
            />
            <input
              type="email"
              value={addLeadForm.email}
              onChange={(e) =>
                setAddLeadForm((prev) => ({ ...prev, email: e.target.value }))
              }
              placeholder={t("leads.inlineEmailPlaceholder")}
              className="flex-1 px-3 py-2 text-xs rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:border-[var(--border-medium)]"
            />
            <button
              type="submit"
              disabled={
                addLeadSaving ||
                !addLeadForm.name.trim() ||
                !addLeadForm.phone.trim()
              }
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-[var(--accent-primary)] text-[var(--text-on-accent)] hover:opacity-90 disabled:opacity-50"
            >
              {t("leads.inlineAdd")}
            </button>
          </form>
          {addLeadError && (
            <p className="text-[11px] text-[var(--accent-red)]" role="alert">
              {addLeadError}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-4 text-xs">
          {sources.map((source) => {
            const active = sourceFilter.includes(source);
            return (
              <button
                key={source}
                type="button"
                onClick={() => toggleSourceFilter(source)}
                className={`px-2.5 py-1 rounded-full border ${
                  active
                    ? "border-[var(--accent-primary)] bg-[var(--accent-primary)] text-[var(--text-on-accent)]"
                    : "border-[var(--border-medium)] text-[var(--text-secondary)] hover:border-[var(--border-medium)]"
                }`}
              >
                {sourceLabel(source)}
              </button>
            );
          })}
          <div className="flex items-center gap-1 ml-auto">
            <select
              value={scoreFilter}
              onChange={(e) => setScoreFilter(e.target.value as ScoreBucket)}
              className="text-xs rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] px-2.5 py-1 text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-medium)]"
            >
              <option value="all">{t("leads.scoreFilter.all")}</option>
              <option value="high">{t("leads.scoreFilter.high")}</option>
              <option value="medium">{t("leads.scoreFilter.medium")}</option>
              <option value="low">{t("leads.scoreFilter.low")}</option>
            </select>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="text-xs rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] px-2.5 py-1 text-[var(--text-primary)] focus:outline-none focus:border-[var(--border-medium)]"
            >
              <option value="score">AI priority</option>
              <option value="newest">{t("leads.sortOptions.newest")}</option>
              <option value="recent-contact">{t("leads.sortOptions.recentContact")}</option>
            </select>
          </div>
        </div>

        {selectedIds.size > 0 && (
          <div className="mb-3 flex flex-wrap items-center gap-2 text-xs rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] px-3 py-2">
            <span className="text-[var(--text-tertiary)]">
              {t("leads.selectedCount", { count: selectedIds.size })}
            </span>
            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              className="inline-flex items-center gap-1 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
            >
              <X className="w-3 h-3" />
              {t("leads.clear")}
            </button>
            <span className="h-4 w-px bg-[var(--bg-card)]" />
            <span className="text-[var(--text-secondary)]">{t("leads.changeStatus")}</span>
            {STATUS_ORDER.map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => bulkChangeStatus(status)}
                className="px-2 py-1 rounded-full border border-[var(--border-default)] text-[11px] text-[var(--text-secondary)] hover:border-[var(--border-medium)]"
              >
                {t(`leads.board.columns.${status === "Appointment Set" ? "appointment" : status.toLowerCase()}`)}
              </button>
            ))}
            <span className="h-4 w-px bg-[var(--bg-card)]" />
            <span className="text-[var(--text-secondary)]">{t("leads.assign")}</span>
            {agents.map((agent) => (
              <button
                key={agent.id}
                type="button"
                onClick={() => bulkAssignAgent(agent.name || "")}
                className="px-2 py-1 rounded-full border border-[var(--border-default)] text-[11px] text-[var(--text-secondary)] hover:border-[var(--border-medium)]"
              >
                {agent.name || t("leads.unknownAgent")}
              </button>
            ))}
          </div>
        )}

        {/* Table + mobile list */}
        <div className={view === "board" ? "hidden md:block" : ""}>
          <LeadsList
            loading={loading}
            error={error}
            filteredLeads={filteredLeads}
            selectedIds={selectedIds}
            toggleAllSelected={toggleAllSelected}
            toggleSelected={toggleSelected}
            openDrawer={openDrawer}
          />
        </div>

        {/* Board view (desktop only) */}
        {view === "board" && (
          <div className="hidden md:block mt-6">
            <LeadsKanban
              groupedByStatus={groupedByStatus}
              onMoveLead={moveLeadStatus}
              onOpenLead={openDrawer}
            />
          </div>
        )}
        </div>

      {/* Add lead modal */}
      <Modal
        open={addLeadOpen}
        onClose={() => { setAddLeadOpen(false); setAddLeadError(null); setCsvPreviewRows([]); }}
        title={t("leads.modal.title")}
        size="md"
      >
        <form onSubmit={handleAddLeadSubmit} className="space-y-4">
              {addLeadError && (
                <p className="text-sm text-[var(--accent-red)]" role="alert">{addLeadError}</p>
              )}
              <div>
                <label className="block text-xs font-medium text-[var(--text-tertiary)] mb-1">{t("leads.modal.nameLabel")}</label>
                <input
                  type="text"
                  required
                  value={addLeadForm.name}
                  onChange={(e) => setAddLeadForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder={t("leads.modal.namePlaceholder")}
                  className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] text-sm focus:border-[var(--border-medium)] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--text-tertiary)] mb-1">{t("leads.modal.phoneLabel")}</label>
                <input
                  type="tel"
                  required
                  value={addLeadForm.phone}
                  onChange={(e) => setAddLeadForm((prev) => ({ ...prev, phone: e.target.value }))}
                  placeholder={t("leads.modal.phonePlaceholder")}
                  className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] text-sm focus:border-[var(--border-medium)] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--text-tertiary)] mb-1">{t("leads.modal.emailLabel")}</label>
                <input
                  type="email"
                  value={addLeadForm.email}
                  onChange={(e) => setAddLeadForm((prev) => ({ ...prev, email: e.target.value }))}
                  placeholder={t("leads.modal.emailPlaceholder")}
                  className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] text-sm focus:border-[var(--border-medium)] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--text-tertiary)] mb-1">{t("leads.modal.companyLabel")}</label>
                <input
                  type="text"
                  value={addLeadForm.company}
                  onChange={(e) => setAddLeadForm((prev) => ({ ...prev, company: e.target.value }))}
                  placeholder={t("leads.modal.companyPlaceholder")}
                  className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] text-sm focus:border-[var(--border-medium)] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--text-tertiary)] mb-1">{t("leads.modal.needLabel")}</label>
                <input
                  type="text"
                  value={addLeadForm.service_requested}
                  onChange={(e) => setAddLeadForm((prev) => ({ ...prev, service_requested: e.target.value }))}
                  placeholder={t("leads.modal.needPlaceholder")}
                  className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] text-sm focus:border-[var(--border-medium)] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--text-tertiary)] mb-1">{t("leads.modal.sourceLabel")}</label>
                <div className="flex flex-wrap gap-3 mt-1">
                  {(["website", "referral", "inbound_call", "other"] as const).map((src) => (
                    <label key={src} className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)] cursor-pointer">
                      <input
                        type="radio"
                        name="source"
                        checked={addLeadForm.source === src}
                        onChange={() => setAddLeadForm((prev) => ({ ...prev, source: src }))}
                        className="rounded-full border-[var(--border-medium)] bg-[var(--bg-input)] text-[var(--text-primary)]"
                      />
                      {src === "inbound_call" ? t("leads.sources.inboundCall") : src === "website" ? t("leads.sources.website") : src === "referral" ? t("leads.sources.referral") : t("leads.sources.other")}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--text-tertiary)] mb-1">{t("leads.modal.statusLabel")}</label>
                <select
                  value={addLeadForm.status}
                  onChange={(e) => setAddLeadForm((prev) => ({ ...prev, status: e.target.value as LeadStatus }))}
                  className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-[var(--text-primary)] text-sm focus:border-[var(--border-medium)] focus:outline-none"
                >
                  {STATUS_ORDER.map((s) => (
                    <option key={s} value={s}>{t(`leads.board.columns.${s === "Appointment Set" ? "appointment" : s.toLowerCase()}`)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--text-tertiary)] mb-1">{t("leads.modal.notesLabel")}</label>
                <textarea
                  value={addLeadForm.notes}
                  onChange={(e) => setAddLeadForm((prev) => ({ ...prev, notes: e.target.value }))}
                  placeholder={t("leads.modal.notesPlaceholder")}
                  rows={2}
                  className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] text-sm focus:border-[var(--border-medium)] focus:outline-none resize-none"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => { setAddLeadOpen(false); setAddLeadError(null); setCsvPreviewRows([]); }}
                  className="flex-1 py-2.5 rounded-xl border border-[var(--border-medium)] text-[var(--text-secondary)] text-sm font-medium hover:border-[var(--border-medium)]"
                >
                  {t("leads.modal.cancel")}
                </button>
                <button
                  type="submit"
                  disabled={addLeadSaving || !addLeadForm.name.trim() || !addLeadForm.phone.trim()}
                  className="flex-1 py-2.5 rounded-xl bg-[var(--accent-primary)] text-[var(--text-on-accent)] text-sm font-semibold hover:opacity-90 disabled:opacity-50"
                >
                  {addLeadSaving ? t("leads.modal.saving") : t("leads.modal.save")}
                </button>
              </div>
            </form>
            {csvPreviewRows.length > 0 ? (
              <div className="mt-6 pt-4 border-t border-[var(--border-default)]">
                <p className="text-sm font-medium text-[var(--text-primary)] mb-1">{t("leads.csvPreview", { count: csvPreviewRows.length })}</p>
                <p className="text-[11px] text-[var(--text-secondary)] mb-2">{t("leads.csvPreviewLabel")}</p>
                <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] p-2 max-h-32 overflow-y-auto text-xs text-[var(--text-secondary)]">
                  {csvPreviewRows.slice(0, 5).map((r, i) => (
                    <div key={i} className="py-1 border-b border-[var(--border-default)] last:border-0">
                      {r.name} · {r.phone}
                      {r.email ? ` · ${r.email}` : ""}
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setCsvPreviewRows([])}
                    className="px-3 py-2 rounded-xl border border-[var(--border-medium)] text-[var(--text-secondary)] text-xs"
                  >
                    {t("leads.csvCancel")}
                  </button>
                  <button
                    type="button"
                    disabled={csvImporting}
                    onClick={async () => {
                      setCsvImporting(true);
                      try {
                        const res = await fetch("/api/leads/import", {
                          method: "POST",
                          credentials: "include",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ leads: csvPreviewRows }),
                        });
                        const data = (await res.json().catch(() => null)) as { imported?: number; error?: string } | null;
                        if (res.ok && typeof data?.imported === "number") {
                          refetchLeads();
                          setCsvPreviewRows([]);
                          setAddLeadOpen(false);
                          toast.success(
                            t("leads.toast.importSuccess", { count: data.imported }),
                          );
                        } else {
                          toast.error(t("leads.toast.importFailed"));
                        }
                      } catch {
                        toast.error(t("leads.toast.importFailed"));
                      } finally {
                        setCsvImporting(false);
                      }
                    }}
                    className="flex-1 py-2 rounded-xl bg-[var(--accent-primary)] text-[var(--text-on-accent)] text-xs font-semibold hover:opacity-90 disabled:opacity-50"
                  >
                    {csvImporting ? t("leads.csvImporting") : t("leads.csvImportAll", { count: csvPreviewRows.length })}
                  </button>
                </div>
              </div>
            ) : (
            <div className="mt-6 pt-4 border-t border-[var(--border-default)]">
              <p className="text-xs text-[var(--text-secondary)] mb-2">{t("leads.csvOr")}</p>
              <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer">
                <span className="text-base text-[var(--text-tertiary)]">+</span>
                {t("leads.importFromCsv")}
                <input
                  type="file"
                  accept=".csv"
                  className="sr-only"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = () => {
                      const text = String(reader.result ?? "");
                      const lines = text.split(/\r?\n/).filter((l) => l.trim());
                      const header = (lines[0] ?? "").toLowerCase();
                      const parts = header.split(",").map((p) => p.trim());
                      const nameIdx = parts.findIndex((p) => p === "name" || p === "full name") >= 0 ? parts.findIndex((p) => p === "name" || p === "full name") : 0;
                      const phoneIdx = parts.findIndex((p) => p === "phone" || p === "phone number") >= 0 ? parts.findIndex((p) => p === "phone" || p === "phone number") : 1;
                      const emailIdx = parts.findIndex((p) => p === "email");
                      const notesIdx = parts.findIndex((p) => p === "notes" || p === "service" || p === "service_requested");
                      const toObj = (line: string) => {
                        const cells = line.split(",").map((c) => c.trim().replace(/^["']|["']$/g, ""));
                        return {
                          name: cells[nameIdx] ?? "",
                          phone: (cells[phoneIdx] ?? "").replace(/\D/g, "").length >= 10 ? cells[phoneIdx] ?? "" : "",
                          email: emailIdx >= 0 ? cells[emailIdx] ?? "" : "",
                          service_requested: notesIdx >= 0 ? cells[notesIdx] ?? "" : "",
                          notes: notesIdx >= 0 ? cells[notesIdx] ?? "" : "",
                        };
                      };
                      const parsed = lines.slice(1).map(toObj).filter((r) => r.name && r.phone);
                        if (parsed.length === 0) {
                          toast.error(t("leads.errors.csvNoValidRows"));
                          return;
                        }
                      setCsvPreviewRows(parsed);
                    };
                    reader.readAsText(file);
                    e.target.value = "";
                  }}
                />
              </label>
              <p className="text-[11px] text-[var(--text-secondary)] mt-1">{t("leads.csvUploadHint")}</p>
            </div>
            )}
      </Modal>

      {/* Lead detail sheet */}
      <Sheet
        open={!!drawerLead}
        onClose={closeDrawer}
        title={drawerLead ? t("leads.drawerTitle", { name: drawerLead.name }) : t("leads.drawerTitleFallback")}
      >
        {drawerLead && (
          <LeadDetail
            lead={drawerLead}
            calls={drawerCalls}
            callsLoading={drawerCallsLoading}
            scoreBadgeClass={scoreBadgeClass}
            onStatusChange={(leadId, status) => moveLeadStatus(leadId, status)}
            onNotesBlur={(leadId, notes) => {
              setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, notes } : l)));
              setDrawerLead((prev) => (prev?.id === leadId ? { ...prev, notes } : prev));
            }}
            onArchive={(leadId) => {
              setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, status: "Lost" as LeadStatus } : l)));
              if (drawerLead?.id === leadId) setDrawerLead({ ...drawerLead, status: "Lost" });
              persistLeadStatus(leadId, "Lost");
            }}
            outboundCallType={outboundCallType}
            setOutboundCallType={setOutboundCallType}
            onHaveAICall={() => void handleHaveAICall()}
            outboundCalling={outboundCalling}
          />
        )}
      </Sheet>

    </div>
  );
}

