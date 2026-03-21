"use client";

import type { ComponentType, KeyboardEvent } from "react";
import { useEffect, useMemo, useState } from "react";
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
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { scaleIn } from "@/lib/animations";
import { cn } from "@/lib/cn";

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

type CommandItem = {
  id: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  href?: string;
  action?: () => void;
  section: "Pages" | "Actions";
};

const STATIC_ITEM_KEYS: Array<{ id: string; labelKey: string; icon: ComponentType<{ className?: string }>; href?: string; section: "Pages" | "Actions" }> = [
  { id: "page-dashboard", labelKey: "page.dashboard", icon: LayoutList, href: "/app/activity", section: "Pages" },
  { id: "page-agents", labelKey: "page.agents", icon: Bot, href: "/app/agents", section: "Pages" },
  { id: "page-calls", labelKey: "page.calls", icon: PhoneCall, href: "/app/calls", section: "Pages" },
  { id: "page-leads", labelKey: "page.leads", icon: Users, href: "/app/leads", section: "Pages" },
  { id: "page-campaigns", labelKey: "page.campaigns", icon: Mail, href: "/app/campaigns", section: "Pages" },
  { id: "page-inbox", labelKey: "page.inbox", icon: Mail, href: "/app/inbox", section: "Pages" },
  { id: "page-appointments", labelKey: "page.appointments", icon: CalendarDays, href: "/app/appointments", section: "Pages" },
  { id: "page-analytics", labelKey: "page.analytics", icon: BarChart3, href: "/app/analytics", section: "Pages" },
  { id: "page-call-intelligence", labelKey: "page.callIntelligence", icon: Brain, href: "/app/call-intelligence", section: "Pages" },
  { id: "page-knowledge", labelKey: "page.knowledge", icon: BookOpen, href: "/app/knowledge", section: "Pages" },
  { id: "page-team", labelKey: "page.team", icon: Users, href: "/app/team", section: "Pages" },
  { id: "page-settings", labelKey: "page.settings", icon: Settings, href: "/app/settings", section: "Pages" },
  { id: "action-new-lead", labelKey: "action.newLead", icon: Users, href: "/app/leads?new=1", section: "Actions" },
  { id: "action-new-agent", labelKey: "action.newAgent", icon: Bot, href: "/app/agents/new", section: "Actions" },
  { id: "action-new-campaign", labelKey: "action.newCampaign", icon: Mail, href: "/app/campaigns?new=1", section: "Actions" },
  { id: "action-test-agent", labelKey: "action.testAgent", icon: Bot, href: "/app/agents?test=1", section: "Actions" },
];

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const router = useRouter();
  const t = useTranslations("commandPalette");
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

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
    }
  }, [open]);

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return staticItems;
    return staticItems.filter((item) =>
      item.label.toLowerCase().includes(q),
    );
  }, [query, staticItems]);

  const grouped = useMemo(() => {
    const bySection: Record<string, CommandItem[]> = {};
    for (const item of items) {
      if (!bySection[item.section]) bySection[item.section] = [];
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
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm pt-24 px-4"
          onClick={onClose}
        >
          <motion.div
            {...scaleIn}
            className="w-full max-w-lg rounded-2xl border border-[var(--border-default)] bg-[var(--bg-elevated)] shadow-2xl"
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
                  className="h-8 flex-1 bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none"
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
              {Object.entries(grouped).map(([section, sectionItems]) => (
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
                        <span className="truncate">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              ))}
              {flatItems.length === 0 && (
                <p className="px-4 py-3 text-xs text-[var(--text-tertiary)]">
                  {t("noMatches")}
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

