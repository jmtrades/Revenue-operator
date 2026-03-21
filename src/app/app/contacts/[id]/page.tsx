"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useWorkspace } from "@/components/WorkspaceContext";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { EmptyState } from "@/components/ui/EmptyState";
import { Timeline, type TimelineItem } from "@/components/ui/Timeline";
import { cn } from "@/lib/cn";
import {
  ArrowLeft,
  PhoneCall,
  MessageSquare,
  CalendarClock,
  RefreshCw,
  Megaphone,
  Phone,
  Mail,
  BadgeDollarSign,
  Tag,
} from "lucide-react";

type Contact = {
  id: string;
  workspace_id: string;
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  company?: string | null;
  state?: string | null;
  created_at?: string | null;
  last_activity_at?: string | null;
  total_revenue_attributed?: number | null;
  tags?: string[] | null;
  opt_out?: boolean | null;
};

type TimelineEvent = {
  id: string;
  type: "call" | "message" | "booking" | "workflow" | "campaign";
  created_at: string;
  direction?: string | null;
  channel?: string | null;
  status?: string | null;
  content?: string | null;
  summary?: string | null;
  outcome?: string | null;
  duration_seconds?: number | null;
  scheduled_at?: string | null;
  service_type?: string | null;
  estimated_value?: number | null;
  attribution_source?: string | null;
  current_step?: number | null;
};

function formatTs(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, { year: "numeric", month: "short", day: "2-digit", hour: "numeric", minute: "2-digit" });
}

function formatMoney(value: number) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

function durationLabel(seconds?: number | null) {
  const s = Math.max(0, Number(seconds ?? 0));
  const m = Math.floor(s / 60);
  const r = s % 60;
  if (!m) return `${r}s`;
  return `${m}m ${r}s`;
}

export default function ContactDetailPage() {
  const t = useTranslations("contacts.detail");
  const tCommon = useTranslations("common");
  const params = useParams<{ id: string }>();
  const { workspaceId } = useWorkspace();

  const id = String(params?.id ?? "");

  const [contact, setContact] = useState<Contact | null>(null);
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      setLoading(true);
      setError(null);
    });

    const url = `/api/contacts/${encodeURIComponent(id)}`;
    fetch(url, { credentials: "include" })
      .then(async (r) => {
        if (!r.ok) throw new Error(await r.text());
        return (await r.json()) as Contact;
      })
      .then((c) => setContact(c))
      .catch(() => setContact(null));

    fetch(`/api/contacts/${encodeURIComponent(id)}/timeline?limit=80`, { credentials: "include" })
      .then(async (r) => {
        if (!r.ok) throw new Error(await r.text());
        return (await r.json()) as { events?: TimelineEvent[] };
      })
      .then((d) => setEvents(Array.isArray(d.events) ? d.events : []))
      .catch(() => setError(t("loadFailed")))
      .finally(() => setLoading(false));
    return () => {
      active = false;
    };
  }, [id, t]);

  const breadcrumbs = useMemo(
    () => [
      { label: tCommon("dashboard"), href: "/app/dashboard" },
      { label: tCommon("contacts"), href: "/app/contacts" },
      { label: contact?.name?.trim() || t("contact"), href: `/app/contacts/${encodeURIComponent(id)}` },
    ],
    [contact?.name, id, t, tCommon],
  );

  const timelineItems: TimelineItem[] = useMemo(() => {
    return (events ?? []).map((e) => {
      const base = {
        id: `${e.type}:${e.id}`,
        timestamp: formatTs(e.created_at),
      };

      if (e.type === "call") {
        return {
          ...base,
          icon: <PhoneCall className="h-4 w-4" />,
          iconColor: "var(--status-blue)",
          title: t("timeline.callTitle", { direction: e.direction ?? "call" }),
          description: [e.outcome ? t("timeline.outcome", { outcome: String(e.outcome) }) : null, e.duration_seconds ? t("timeline.duration", { duration: durationLabel(e.duration_seconds) }) : null]
            .filter(Boolean)
            .join(" · "),
        };
      }
      if (e.type === "message") {
        return {
          ...base,
          icon: <MessageSquare className="h-4 w-4" />,
          iconColor: "var(--status-green)",
          title: t("timeline.messageTitle", { channel: e.channel ?? "message" }),
          description: (e.content ?? "").slice(0, 140) || undefined,
        };
      }
      if (e.type === "booking") {
        const value = typeof e.estimated_value === "number" ? formatMoney(e.estimated_value) : null;
        const when = e.scheduled_at ? formatTs(e.scheduled_at) : null;
        return {
          ...base,
          icon: <CalendarClock className="h-4 w-4" />,
          iconColor: "var(--status-amber)",
          title: t("timeline.bookingTitle"),
          description: [e.service_type ?? null, when ? t("timeline.scheduledFor", { when }) : null, e.status ?? null, value ? t("timeline.estimatedValue", { value }) : null]
            .filter(Boolean)
            .join(" · "),
        };
      }
      if (e.type === "workflow") {
        return {
          ...base,
          icon: <RefreshCw className="h-4 w-4" />,
          iconColor: "var(--status-purple)",
          title: t("timeline.workflowTitle"),
          description: [e.status ?? null, e.current_step != null ? t("timeline.step", { step: e.current_step }) : null].filter(Boolean).join(" · "),
        };
      }
      return {
        ...base,
        icon: <Megaphone className="h-4 w-4" />,
        iconColor: "var(--text-tertiary)",
        title: t("timeline.campaignTitle"),
        description: [e.status ?? null, e.current_step != null ? t("timeline.step", { step: e.current_step }) : null].filter(Boolean).join(" · "),
      };
    });
  }, [events, t]);

  const phone = (contact?.phone ?? "").trim();
  const email = (contact?.email ?? "").trim();
  const tags = Array.isArray(contact?.tags) ? contact?.tags : [];
  const revenue = typeof contact?.total_revenue_attributed === "number" ? contact?.total_revenue_attributed : null;

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6">
      <div className="flex items-start justify-between gap-3 mb-5">
        <div className="min-w-0">
          <Breadcrumbs items={breadcrumbs} />
          <div className="mt-2 flex items-center gap-3">
            <Link
              href="/app/contacts"
              className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              <ArrowLeft className="h-4 w-4" />
              {t("back")}
            </Link>
          </div>
          <h1 className="mt-3 text-xl md:text-2xl font-semibold text-[var(--text-primary)] truncate">
            {contact?.name?.trim() || t("contact")}
          </h1>
          {contact?.company && (
            <p className="mt-1 text-sm text-[var(--text-secondary)]">{contact.company}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-4 lg:gap-6 items-start">
        <main className="min-w-0">
          {loading ? (
            <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-6 text-sm text-[var(--text-secondary)]">
              {t("loading")}
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-6 text-sm text-[var(--text-secondary)]">
              {error}
            </div>
          ) : timelineItems.length === 0 ? (
            <EmptyState
              icon="watch"
              title={t("empty.title")}
              description={t("empty.description")}
              primaryAction={{ label: t("empty.backToContacts"), href: "/app/contacts" }}
            />
          ) : (
            <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-6">
              <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-4">
                {t("timeline.heading")}
              </h2>
              <Timeline items={timelineItems} />
            </div>
          )}
        </main>

        <aside className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-card)] p-6">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">
            {t("sidebar.heading")}
          </h2>
          <div className="mt-4 space-y-3 text-sm">
            <div className="flex items-center gap-2 text-[var(--text-secondary)]">
              <Phone className="h-4 w-4" />
              <span className="truncate">{phone || t("sidebar.noPhone")}</span>
            </div>
            <div className="flex items-center gap-2 text-[var(--text-secondary)]">
              <Mail className="h-4 w-4" />
              <span className="truncate">{email || t("sidebar.noEmail")}</span>
            </div>
            <div className="flex items-center gap-2 text-[var(--text-secondary)]">
              <BadgeDollarSign className="h-4 w-4" />
              <span className={cn(revenue ? "text-[var(--success)] font-semibold" : "")}>
                {revenue ? formatMoney(revenue) : t("sidebar.noRevenue")}
              </span>
            </div>
            <div className="flex items-start gap-2 text-[var(--text-secondary)]">
              <Tag className="h-4 w-4 mt-0.5" />
              {tags.length ? (
                <div className="flex flex-wrap gap-1.5">
                  {tags.slice(0, 10).map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center rounded-full border border-[var(--border-default)] bg-[var(--bg-input)] px-2 py-0.5 text-[11px] text-[var(--text-secondary)]"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              ) : (
                <span>{t("sidebar.noTags")}</span>
              )}
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2">
            <a
              href={phone ? `tel:${encodeURIComponent(phone)}` : undefined}
              className={cn(
                "inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold",
                phone
                  ? "bg-[var(--accent-primary)] text-[var(--text-on-accent)] hover:opacity-90"
                  : "bg-[var(--bg-input)] text-[var(--text-tertiary)] cursor-not-allowed",
              )}
              aria-disabled={!phone}
            >
              {t("sidebar.call")}
            </a>
            <Link
              href="/app/inbox"
              className="inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold border border-[var(--border-default)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
            >
              {t("sidebar.inbox")}
            </Link>
          </div>

          {workspaceId ? (
            <p className="mt-3 text-[11px] text-[var(--text-tertiary)]">
              {t("sidebar.workspaceNote")}
            </p>
          ) : null}
        </aside>
      </div>
    </div>
  );
}

