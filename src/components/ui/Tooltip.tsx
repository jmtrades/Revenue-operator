"use client";

import type { ReactNode } from "react";
import { useState, useRef, useEffect, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/cn";

type TooltipSide = "top" | "bottom" | "left" | "right";

interface TooltipProps {
  content: string;
  side?: TooltipSide;
  children: ReactNode;
}

/* Module-level: track when last tooltip closed for group delay skip */
let lastTooltipCloseTime = 0;
const GROUP_WINDOW = 400; // ms — skip delay if another tooltip was open recently

const easeOutExpo = [0.23, 1, 0.32, 1] as const;

export function Tooltip({ content, side = "top", children }: TooltipProps) {
  const [open, setOpen] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cleanup = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  useEffect(() => cleanup, [cleanup]);

  const show = () => {
    cleanup();
    const elapsed = Date.now() - lastTooltipCloseTime;
    const delay = elapsed < GROUP_WINDOW ? 0 : 200;
    timeoutRef.current = setTimeout(() => setOpen(true), delay);
  };

  const hide = () => {
    cleanup();
    lastTooltipCloseTime = Date.now();
    setOpen(false);
  };

  const positionClasses: Record<TooltipSide, string> = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
  };

  /* Determine if we're in the group window (skip animation too) */
  const isInstant = Date.now() - lastTooltipCloseTime < GROUP_WINDOW;

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: side === "top" ? 4 : side === "bottom" ? -4 : 0, x: side === "left" ? 4 : side === "right" ? -4 : 0 }}
            animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={
              isInstant
                ? { duration: 0 }
                : { duration: 0.125, ease: easeOutExpo }
            }
            className={cn(
              "pointer-events-none absolute z-50 whitespace-nowrap rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--bg-elevated)] px-2.5 py-1 text-[11px] font-medium text-[var(--text-primary)] shadow-[var(--shadow-md)]",
              positionClasses[side],
            )}
            role="tooltip"
          >
            {content}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

