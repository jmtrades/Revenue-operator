"use client";

import type { ComponentType, KeyboardEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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

const STATIC_ITEMS: CommandItem[] = [
  { id: "page-dashboard", label: "Dashboard", icon: LayoutList, href: "/app/activity", section: "Pages" },
  { id: "page-agents", label: "Agents", icon: Bot, href: "/app/agents", section: "Pages" },
  { id: "page-calls", label: "Calls", icon: PhoneCall, href: "/app/calls", section: "Pages" },
  { id: "page-leads", label: "Leads", icon: Users, href: "/app/leads", section: "Pages" },
  { id: "page-campaigns", label: "Campaigns", icon: Mail, href: "/app/campaigns", section: "Pages" },
  { id: "page-inbox", label: "Inbox", icon: Mail, href: "/app/inbox", section: "Pages" },
  { id: "page-appointments", label: "Appointments", icon: CalendarDays, href: "/app/appointments", section: "Pages" },
  { id: "page-analytics", label: "Analytics", icon: BarChart3, href: "/app/analytics", section: "Pages" },
  { id: "page-call-intelligence", label: "Call Intelligence", icon: Brain, href: "/app/call-intelligence", section: "Pages" },
  { id: "page-knowledge", label: "Knowledge", icon: BookOpen, href: "/app/knowledge", section: "Pages" },
  { id: "page-team", label: "Team", icon: Users, href: "/app/team", section: "Pages" },
  { id: "page-settings", label: "Settings", icon: Settings, href: "/app/settings", section: "Pages" },
  {
    id: "action-new-lead",
    label: "Create lead",
    icon: Users,
    href: "/app/leads?new=1",
    section: "Actions",
  },
  {
    id: "action-new-agent",
    label: "Create agent",
    icon: Bot,
    href: "/app/agents?new=1",
    section: "Actions",
  },
  {
    id: "action-new-campaign",
    label: "Create campaign",
    icon: Mail,
    href: "/app/campaigns?new=1",
    section: "Actions",
  },
  {
    id: "action-test-agent",
    label: "Test agent",
    icon: Bot,
    href: "/app/agents?test=1",
    section: "Actions",
  },
];

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

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
    if (!q) return STATIC_ITEMS;
    return STATIC_ITEMS.filter((item) =>
      item.label.toLowerCase().includes(q),
    );
  }, [query]);

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
            aria-label="Quick search"
          >
            <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--border-default)]">
              <Search className="h-4 w-4 text-[var(--text-tertiary)]" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search pages and actions…"
                className="h-8 flex-1 bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none"
                role="combobox"
                aria-expanded={items.length > 0}
                aria-haspopup="listbox"
                aria-controls="command-palette-list"
              />
            </div>
            <div
              id="command-palette-list"
              role="listbox"
              className="max-h-80 overflow-y-auto py-2 text-sm"
            >
              {Object.entries(grouped).map(([section, sectionItems]) => (
                <div key={section}>
                  <p className="px-4 pt-2 pb-1 text-[10px] font-medium uppercase tracking-[0.12em] text-[var(--text-tertiary)]">
                    {section}
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
                  No matches.
                </p>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

