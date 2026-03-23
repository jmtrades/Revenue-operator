"use client";

import type { ReactNode, KeyboardEvent } from "react";
import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { slideInRight } from "@/lib/animations";
import { cn } from "@/lib/cn";

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

export function Sheet({ open, onClose, title, children }: SheetProps) {
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

  return (
    <AnimatePresence>
      {open && (
        <>
          <div
            className="fixed inset-0 z-40 bg-[var(--overlay)]"
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.aside
            {...slideInRight}
            className={cn(
              "fixed right-0 top-0 z-50 h-full w-full md:w-[480px] border-l border-[var(--border-default)] bg-[var(--bg-surface)] shadow-[var(--shadow-xl)]",
            )}
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-center justify-between gap-3 border-b border-[var(--border-default)] px-6 py-4 shrink-0">
              {title && (
                <h2 className="text-sm font-semibold text-[var(--text-primary)] tracking-tight">
                  {title}
                </h2>
              )}
              <button
                type="button"
                onClick={onClose}
                className="ml-auto w-8 h-8 flex items-center justify-center rounded-[var(--radius-btn)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/50"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="h-[calc(100%-57px)] overflow-y-auto px-6 py-5">
              {children}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

