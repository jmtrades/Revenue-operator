"use client";

import type { ReactNode } from "react";
import { useState, useRef, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/cn";

type TooltipSide = "top" | "bottom" | "left" | "right";

interface TooltipProps {
  content: string;
  side?: TooltipSide;
  children: ReactNode;
}

export function Tooltip({ content, side = "top", children }: TooltipProps) {
  const [open, setOpen] = useState(false);
  const [delayTimeout, setDelayTimeout] = useState<number | null>(null);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    return () => {
      if (delayTimeout) window.clearTimeout(delayTimeout);
    };
  }, [delayTimeout]);

  const show = () => {
    const id = window.setTimeout(() => setOpen(true), 200);
    setDelayTimeout(id);
  };

  const hide = () => {
    if (delayTimeout) window.clearTimeout(delayTimeout);
    setOpen(false);
  };

  const positionClasses: Record<TooltipSide, string> = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
  };

  return (
    <div
      ref={ref}
      className="relative inline-flex"
      onMouseEnter={show}
      onMouseLeave={hide}
    >
      {children}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0, transition: { duration: 0.15, ease: "easeOut" as const } }}
            exit={{ opacity: 0, y: 4, transition: { duration: 0.1, ease: "easeOut" as const } }}
            className={cn(
              "pointer-events-none absolute z-50 whitespace-nowrap rounded-[var(--radius-btn)] border border-[var(--border-default)] bg-[var(--bg-elevated)] px-2.5 py-1 text-[11px] font-medium text-[var(--text-primary)] shadow-[var(--shadow-md)]",
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

