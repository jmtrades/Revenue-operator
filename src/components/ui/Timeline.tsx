"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { staggerContainer, staggerItem } from "@/lib/animations";
import { cn } from "@/lib/cn";

export interface TimelineItem {
  id: string;
  timestamp: string;
  icon?: ReactNode;
  iconColor?: string;
  title: string;
  description?: string;
  badge?: ReactNode;
}

interface TimelineProps {
  items: TimelineItem[];
  className?: string;
}

export function Timeline({ items, className }: TimelineProps) {
  return (
    <motion.ul
      className={cn("relative space-y-3 pl-4", className)}
      variants={staggerContainer}
      initial="initial"
      animate="animate"
    >
      <div className="absolute left-1 top-0 bottom-0 w-px bg-[var(--border-default)]" aria-hidden="true" />
      {items.map((item) => (
        <motion.li
          key={item.id}
          variants={staggerItem}
          className="relative flex items-start gap-3"
        >
          <div className="relative mt-1.5">
            <div
              className="h-2.5 w-2.5 rounded-full border border-black/40"
              style={{ backgroundColor: item.iconColor ?? "var(--accent-primary)" }}
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <p className="truncate text-sm font-medium text-[var(--text-primary)]">
                {item.title}
              </p>
              {item.badge}
            </div>
            {item.description && (
              <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
                {item.description}
              </p>
            )}
            <p className="mt-0.5 text-[11px] text-[var(--text-tertiary)]">
              {item.timestamp}
            </p>
          </div>
        </motion.li>
      ))}
    </motion.ul>
  );
}

