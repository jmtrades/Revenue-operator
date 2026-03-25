"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/cn";

export interface TabDefinition {
  id: string;
  label: string;
}

interface TabsProps {
  tabs: TabDefinition[];
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
}

export function Tabs({ tabs, activeTab, onChange, className }: TabsProps) {
  return (
    <div
      className={cn("relative flex items-center gap-1 border-b border-[var(--border-default)]", className)}
      role="tablist"
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={cn(
              "relative px-3 py-2.5 text-[13px] font-medium transition-colors duration-150 rounded-t-[var(--radius-btn)] select-none",
              isActive
                ? "text-[var(--text-primary)]"
                : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]/50",
            )}
          >
            {tab.label}
            {isActive && (
              <motion.div
                layoutId="tab-underline"
                className="absolute inset-x-0 -bottom-px h-[2px] rounded-full bg-[var(--accent-primary)]"
                transition={{ type: "spring", stiffness: 500, damping: 35 }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}

