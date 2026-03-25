"use client";

import { useRef } from "react";
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
  const tabsContainerRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, currentIndex: number) => {
    let nextIndex = currentIndex;

    if (e.key === "ArrowLeft") {
      e.preventDefault();
      nextIndex = currentIndex > 0 ? currentIndex - 1 : tabs.length - 1;
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      nextIndex = currentIndex < tabs.length - 1 ? currentIndex + 1 : 0;
    }

    if (nextIndex !== currentIndex) {
      onChange(tabs[nextIndex].id);
      // Focus the button after change
      setTimeout(() => {
        const buttons = tabsContainerRef.current?.querySelectorAll("button");
        buttons?.[nextIndex]?.focus();
      }, 0);
    }
  };

  return (
    <div
      ref={tabsContainerRef}
      className={cn("relative flex items-center gap-1 border-b border-[var(--border-default)]", className)}
      role="tablist"
    >
      {tabs.map((tab, index) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            className={cn(
              "relative px-3 py-2.5 text-[13px] font-medium transition-[color,background-color] duration-[var(--duration-fast)] ease-[var(--ease-out-expo)] rounded-t-[var(--radius-btn)] select-none active:scale-[0.97]",
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

