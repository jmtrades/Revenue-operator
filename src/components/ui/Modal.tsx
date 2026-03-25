"use client";

import type { ReactNode } from "react";
import { useEffect, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";

type ModalSize = "sm" | "md" | "lg";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  size?: ModalSize;
  children: ReactNode;
}

const easeOutExpo = [0.23, 1, 0.32, 1] as const;

export function Modal({ open, onClose, title, size = "md", children }: ModalProps) {
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

  const maxWidth =
    size === "sm" ? "max-w-sm" : size === "lg" ? "max-w-2xl" : "max-w-lg";

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          {/* Overlay — separate animation, faster exit */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="absolute inset-0 bg-[var(--overlay)] backdrop-blur-[6px]"
            onClick={onClose}
          />

          {/* Dialog — scale from center (correct for modals per Emil) */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.2, ease: easeOutExpo }}
            className={cn(
              "relative w-full rounded-[var(--radius-xl)] border border-[var(--border-default)] bg-[var(--bg-surface)] shadow-[var(--shadow-xl)]",
              "max-md:fixed max-md:inset-x-0 max-md:bottom-0 max-md:top-auto max-md:rounded-b-none max-md:rounded-t-[var(--radius-2xl)] max-md:max-w-none max-md:max-h-[85vh]",
              maxWidth,
            )}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? "modal-title" : undefined}
          >
            <div className="flex items-center justify-between gap-3 border-b border-[var(--border-default)] px-6 py-4 shrink-0">
              {title && (
                <h2 id="modal-title" className="text-[15px] font-semibold text-[var(--text-primary)] tracking-tight">
                  {title}
                </h2>
              )}
              <button
                type="button"
                onClick={onClose}
                className="ml-auto -mr-1 flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-tertiary)] transition-[background-color,color] duration-[var(--duration-fast)] ease-[var(--ease-out-expo)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] active:scale-[0.95] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/40"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="px-6 py-5 overflow-y-auto flex-1 min-h-0 max-md:max-h-[calc(85vh-57px)]">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

