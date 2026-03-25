"use client";

import { useEffect, useRef, useCallback } from "react";
import { useTranslations } from "next-intl";
import { AnimatePresence, motion } from "framer-motion";

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "default";
  onConfirm: () => void;
  onClose: () => void;
}

const easeOutExpo = [0.23, 1, 0.32, 1] as const;

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  variant = "default",
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  const t = useTranslations("common");
  const cancelRef = useRef<HTMLButtonElement>(null);
  const confirmText = confirmLabel ?? t("confirm");
  const cancelText = cancelLabel ?? t("cancel");

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); },
    [onClose],
  );

  useEffect(() => {
    if (!open) return;
    cancelRef.current?.focus();
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 bg-[var(--overlay)] backdrop-blur-[4px]"
            onClick={onClose}
          />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.2, ease: easeOutExpo }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-dialog-title"
            aria-describedby="confirm-dialog-desc"
            className="relative w-full max-w-sm rounded-[var(--radius-xl)] border border-[var(--border-default)] bg-[var(--bg-surface)] shadow-[var(--shadow-xl)] p-6 space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="confirm-dialog-title" className="text-sm font-semibold text-[var(--text-primary)] tracking-tight">
              {title}
            </h2>
            <p id="confirm-dialog-desc" className="text-[13px] text-[var(--text-secondary)] leading-relaxed">
              {message}
            </p>
            <div className="flex justify-end gap-2 pt-3">
              <button
                ref={cancelRef}
                type="button"
                onClick={onClose}
                className="rounded-[var(--radius-btn)] border border-[var(--border-default)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)] transition-[background-color,border-color,transform] duration-[var(--duration-fast)] ease-[var(--ease-out-expo)] hover:bg-[var(--bg-hover)] hover:border-[var(--border-hover)] active:scale-[0.97] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/40"
              >
                {cancelText}
              </button>
              <button
                type="button"
                onClick={() => { onConfirm(); onClose(); }}
                className={
                  variant === "danger"
                    ? "rounded-[var(--radius-btn)] px-4 py-2 text-sm font-semibold bg-[var(--accent-danger)] text-white shadow-[var(--shadow-sm)] transition-[background-color,transform] duration-[var(--duration-fast)] ease-[var(--ease-out-expo)] hover:bg-red-500 active:scale-[0.97] focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400/50"
                    : "rounded-[var(--radius-btn)] bg-[var(--accent-primary)] px-4 py-2 text-sm font-semibold text-white shadow-[var(--shadow-sm)] transition-[background-color,transform] duration-[var(--duration-fast)] ease-[var(--ease-out-expo)] hover:bg-[var(--accent-primary-hover)] active:scale-[0.97] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/50"
                }
              >
                {confirmText}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
