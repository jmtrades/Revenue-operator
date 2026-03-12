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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
          onClick={onClose}
        >
          <motion.div
            {...scaleIn}
            className={cn(
              "w-full rounded-2xl border border-[var(--border-default)] bg-[var(--bg-elevated)] shadow-2xl",
              "max-md:fixed max-md:inset-0 max-md:rounded-none max-md:max-h-none max-md:flex max-md:flex-col",
              maxWidth,
            )}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-center justify-between gap-3 border-b border-[var(--border-default)] px-5 py-4 shrink-0">
              {title && (
                <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                  {title}
                </h2>
              )}
              <button
                type="button"
                onClick={onClose}
                className="ml-auto min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg p-1.5 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/50"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="px-5 py-4 overflow-y-auto flex-1 min-h-0">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

