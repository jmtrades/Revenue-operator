"use client";

import type { ReactNode } from "react";
import { useEffect, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

const easeDrawer = [0.32, 0.72, 0, 1] as const;

export function Sheet({ open, onClose, title, children }: SheetProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); },
    [onClose],
  );

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, handleKeyDown]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Overlay — fades faster on exit */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-[var(--overlay)] backdrop-blur-[3px]"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Sheet panel — drawer easing */}
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.35, ease: easeDrawer }}
            className="fixed right-0 top-0 z-50 h-full w-full md:w-[480px] border-l border-[var(--border-default)] bg-[var(--bg-surface)] shadow-[var(--shadow-xl)]"
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? "sheet-title" : undefined}
          >
            <div className="flex items-center justify-between gap-3 border-b border-[var(--border-default)] px-6 py-4 shrink-0">
              {title && (
                <h2 id="sheet-title" className="text-sm font-semibold text-[var(--text-primary)] tracking-tight">
                  {title}
                </h2>
              )}
              <button
                type="button"
                onClick={onClose}
                className="ml-auto -mr-1 flex h-8 w-8 items-center justify-center rounded-[var(--radius-btn)] text-[var(--text-tertiary)] transition-[background-color,color] duration-[var(--duration-fast)] ease-[var(--ease-out-expo)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] active:scale-[0.95] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/40"
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

