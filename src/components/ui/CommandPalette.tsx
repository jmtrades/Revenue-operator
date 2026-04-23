"use client";

import type { ComponentType, KeyboardEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Search,
  LayoutList,
  Bot,
  PhoneCall,
  Users,
  Settings,
  Mail,
  BarChart3,
  Brain,
  BookOpen,
  CalendarDays,
  RotateCcw,
  UserCircle2,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { scaleIn } from "@/lib/animations";
import { cn } from "@/lib/cn";

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

type CommandSection = "Pages" | "Actions" | "Leads" | "Agents" | "Contacts";

type CommandItem = {
  id: string;
  label: string;
  sublabel?: string | null;
  icon: ComponentType<{ className?: string }>;
  href?: string;
  action?: () => void;
  section: CommandSection;
};

type SearchHit = {
  kind: "lead" | "agent" | "contact";
  id: string;
  label: string;
  sublabel?: string | null;
  href: string;
};

const STATIC_ITEM_KEYS: Array<{ id: string; labelKey: string; icon: ComponentType<{ className?: string }>; href?: string; section: "Pages" | "Actions" }> = [
  // Note: labels not in i18n yet fall back to the key via useTranslations; extend messages
  // with these keys to localize. Static coverage is intentionally broad so operators can
  // reach any page with two keystrokes.
  { id: "page-dashboard", labelKey: "page.dashboard", icon: LayoutList, href: "/app/dashboard", section: "Pages" },
  { id: "page-agents", labelKey: "page.agents", icon: Bot, href: "/app/agents", section: "Pages" },
  { id: "page-calls", labelKey: "page.calls", icon: PhoneCall, href: "/app/calls", section: "Pages" },
  { id: "page-leads", labelKey: "page.leads", icon: Users, href: "/app/leads", section: "Pages" },
  { id: "page-campaigns", labelKey: "page.campaigns", icon: Mail, href: "/app/campaigns", section: "Pages" },
  { id: "page-follow-ups", labelKey: "page.followUps", icon: CalendarDays, href: "/app/follow-ups", section: "Pages" },
  { id: "page-inbox", labelKey: "page.inbox", icon: Mail, href: "/app/inbox", section: "Pages" },
  { id: "page-appointments", labelKey: "page.appointments", icon: CalendarDays, href: "/app/appointments", section: "Pages" },
  { id: "page-analytics", labelKey: "page.analytics", icon: BarChart3, href: "/app/analytics", section: "Pages" },
  { id: "page-reactivation", labelKey: "page.reactivation", icon: RotateCcw, href: "/app/cold-leads", section: "Pages" },
  { id: "page-call-intelligence", labelKey: "page.callIntelligence", icon: Brain, href: "/app/call-intelligence", section: "Pages" },
  { id: "page-knowledge", labelKey: "page.knowledge", icon: BookOpen, href: "/app/knowledge", section: "Pages" },
  { id: "page-team", labelKey: "page.team", icon: Users, href: "/app/team", section: "Pages" },
  { id: "page-settings", labelKey: "page.settings", icon: Settings, href: "/app/settings", section: "Pages" },
  { id: "action-new-lead", labelKey: "action.newLead", icon: Users, href: "/app/leads?new=1", section: "Actions" },
  { id: "action-new-agent", labelKey: "action.newAgent", icon: Bot, href: "/app/agents/new", section: "Actions" },
  { id: "action-new-campaign", labelKey: "action.newCampaign", icon: Mail, href: "/app/campaigns?new=1", section: "Actions" },
  { id: "action-test-agent", labelKey: "action.testAgent", icon: Bot, href: "/app/agents?test=1", section: "Actions" },
];

const KIND_ICON: Record<SearchHit["kind"], ComponentType<{ className?: string }>> = {
  lead: Users,
  agent: Bot,
  contact: UserCircle2,
};

const KIND_SECTION: Record<SearchHit["kind"], CommandSection> = {
  lead: "Leads",
  agent: "Agents",
  contact: "Contacts",
};

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const router = useRouter();
  const t = useTranslations("commandPalette");
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [remoteHits, setRemoteHits] = useState<SearchHit[]>([]);
  const [searching, setSearching] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const staticItems = useMemo<CommandItem[]>(() =>
    STATIC_ITEM_KEYS.map(({ id, labelKey, icon, href, section }) => ({
      id,
      label: t(labelKey),
      icon,
      href,
      section,
    })),
    [t]
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent | KeyboardEventInit) => {
      if ("key" in e && e.key === "Escape") onClose();
    };
    window.addEventListener(
      "keydown",
      onKey as (e: KeyboardEvent | KeyboardEventInit) => void,
    );
    return () =>
      window.removeEventListener(
        "keydown",
        onKey as (e: KeyboardEvent | KeyboardEventInit) => void,
      );
  }, [open, onClose]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIndex(0);
      setRemoteHits([]);
    } else {
      // Cancel any in-flight search when the palette closes.
      abortRef.current?.abort();
      abortRef.current = null;
    }
  }, [open]);

  // Debounced dynamic search: hits /api/search for leads / agents / contacts.
  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (q.length < 2) {
      setRemoteHits([]);
      setSearching(false);
      return;
    }
    // Cancel previous request — only latest query result should apply.
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setSearching(true);

    const handle = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, {
          signal: controller.signal,
          credentials: "same-origin",
        });
        if (!res.ok) {
          setRemoteHits([]);
          return;
        }
        const data = (await res.json()) as { hits?: SearchHit[] };
        if (!controller.signal.aborted) {
          setRemoteHits(Array.isArray(data.hits) ? data.hits : []);
        }
      } catch {
        // Aborts and network errors collapse to "no results" — fail-soft UX.
        if (!controller.signal.aborted) setRemoteHits([]);
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    }, 160);

    return () => {
      window.clearTimeout(handle);
      controller.abort();
    };
  }, [query, open]);

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    const dynamicItems: CommandItem[] = remoteHits.map((hit) => ({
      id: `${hit.kind}-${hit.id}`,
      label: hit.label,
      sublabel: hit.sublabel ?? null,
      icon: KIND_ICON[hit.kind],
      href: hit.href,
      section: KIND_SECTION[hit.kind],
    }));
    if (!q) return staticItems;
    const filteredStatic = staticItems.filter((item) =>
      item.label.toLowerCase().includes(q),
    );
    // Remote hits come first — they're the highest-signal match for a typed query.
    return [...dynamicItems, ...filteredStatic];
  }, [query, staticItems, remoteHits]);

  // Preserve section display order — dynamic matches surface first so they're
  // immediately reachable with Enter.
  const SECTION_ORDER: CommandSection[] = ["Leads", "Agents", "Contacts", "Pages", "Actions"];
  const grouped = useMemo(() => {
    const bySection: Record<CommandSection, CommandItem[]> = {
      Leads: [],
      Agents: [],
      Contacts: [],
      Pages: [],
      Actions: [],
    };
    for (const item of items) {
      bySection[item.section].push(item);
    }
    return bySection;
  }, [items]);

  const flatItems = items;

  const handleSelect = (item: CommandItem) => {
    if (item.action) item.action();
    if (item.href) router.push(item.href);
    onClose();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % flatItems.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + flatItems.length) % flatItems.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = flatItems[activeIndex];
      if (item) handleSelect(item);
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-[var(--overlay)] backdrop-blur-sm pt-24 px-4"
          onClick={onClose}
        >
          <motion.div
            {...scaleIn}
            className="w-full max-w-lg max-w-[calc(100vw-2rem)] rounded-2xl border border-[var(--border-default)] bg-[var(--bg-elevated)] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={handleKeyDown}
            role="dialog"
            aria-modal="true"
            aria-label={t("title")}
          >
            <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-[var(--border-default)]">
              <div className="flex items-center gap-2 flex-1">
                <Search className="h-4 w-4 text-[var(--text-tertiary)]" />
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t("placeholder")}
                  className="h-8 flex-1 bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]"
                  role="combobox"
                  aria-expanded={items.length > 0}
                  aria-haspopup="listbox"
                  aria-controls="command-palette-list"
                />
              </div>
              <div className="hidden md:flex items-center gap-1 text-[10px] text-[var(--text-tertiary)]">
                <span className="px-1.5 py-0.5 rounded bg-[var(--bg-inset)] border border-[var(--border-default)]">
                  ⌘K
                </span>
                <span className="px-1.5 py-0.5 rounded bg-[var(--bg-inset)] border border-[var(--border-default)]">
                  ⌘/
                </span>
                <span className="px-1.5 py-0.5 rounded bg-[var(--bg-inset)] border border-[var(--border-default)]">
                  Esc
                </span>
              </div>
            </div>
            <div
              id="command-palette-list"
              role="listbox"
              className="max-h-80 overflow-y-auto py-2 text-sm"
            >
              {SECTION_ORDER.map((section) => {
                const sectionItems = grouped[section];
                if (!sectionItems || sectionItems.length === 0) return null;
                return (
                  <div key={section}>
                    <p className="px-4 pt-2 pb-1 text-[10px] font-medium uppercase tracking-[0.12em] text-[var(--text-tertiary)]">
                      {t(`section.${section}`)}
                    </p>
                    {sectionItems.map((item) => {
                      const index = flatItems.findIndex((x) => x.id === item.id);
                      const active = index === activeIndex;
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onMouseEnter={() => setActiveIndex(index)}
                          onClick={() => handleSelect(item)}
                          className={cn(
                            "flex w-full items-center gap-2 px-4 py-2 text-left",
                            active
                              ? "bg-[var(--bg-hover)] text-[var(--text-primary)]"
                              : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]",
                          )}
                        >
                          <Icon className="h-4 w-4 shrink-0" />
                          <span className="min-w-0 flex-1 flex flex-col">
                            <span className="truncate">{item.label}</span>
                            {item.sublabel && (
                              <span className="truncate text-[11px] text-[var(--text-tertiary)]">
                                {item.sublabel}
                              </span>
                            )}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                );
              })}
              {flatItems.length === 0 && (
                <p className="px-4 py-3 text-xs text-[var(--text-tertiary)]">
                  {searching ? t("searching") : t("noMatches")}
                </p>
              )}
            </div>
            <div className="border-t border-[var(--border-default)] px-4 py-2 flex items-center justify-between text-[10px] text-[var(--text-tertiary)]">
              <div className="flex items-center gap-2">
                <span className="px-1.5 py-0.5 rounded bg-[var(--bg-inset)] border border-[var(--border-default)]">
                  ⌘K
                </span>
                <span>{t("title")}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <span className="px-1.5 py-0.5 rounded bg-[var(--bg-inset)] border border-[var(--border-default)]">
                    ⌘/
                  </span>
                  <span>{t("showShortcuts")}</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="px-1.5 py-0.5 rounded bg-[var(--bg-inset)] border border-[var(--border-default)]">
                    Esc
                  </span>
                  <span>{t("close")}</span>
                </span>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

