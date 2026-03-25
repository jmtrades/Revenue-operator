"use client";

import type { ReactNode, KeyboardEvent } from "react";
import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { scaleIn } from "@/lib/animations";
import { cn } from "@/lib/cn";

type ModalSize = "sm" | "md" | "lg";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  size?: ModalSize;
  children: ReactNode;
}

export function Modal({ open, onClose, title, size = "md", children }: ModalProps) {
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

  const maxWidth =
    size === "sm" ? "max-w-sm" : size === "lg" ? "max-w-2xl" : "max-w-lg";

  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--overlay)] backdrop-blur-sm px-4"
          onClick={onClose}
        >
          <motion.div
            {...scaleIn}
            className={cn(
              "w-full rounded-[var(--radius-xl)] border border-[var(--border-default)] bg-[var(--bg-surface)] shadow-[var(--shadow-xl)]",
              "max-md:fixed max-md:inset-0 max-md:rounded-none max-md:max-h-none max-md:flex max-md:flex-col",
              maxWidth,
            )}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-center justify-between gap-3 border-b border-[var(--border-default)] px-6 py-4 shrink-0">
              {title && (
                <h2 className="text-[15px] font-semibold text-[var(--text-primary)] tracking-tight">
                  {title}
                </h2>
              )}
              <button
                type="button"
                onClick={onClose}
                className="ml-auto w-8 h-8 flex items-center justify-center rounded-lg text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/40 focus-visible:ring-offset-2"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="px-6 py-5 overflow-y-auto flex-1 min-h-0">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

