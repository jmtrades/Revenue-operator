"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";

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

  useEffect(() => {
    if (!open) return;
    cancelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--overlay)]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-desc"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-[var(--radius-xl)] border border-[var(--border-default)] bg-[var(--bg-surface)] shadow-[var(--shadow-xl)] p-6 space-y-3"
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
            className="rounded-[var(--radius-btn)] border border-[var(--border-default)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:border-[var(--border-hover)] transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/50"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={
              variant === "danger"
                ? "rounded-[var(--radius-btn)] px-4 py-2 text-sm font-semibold bg-[var(--accent-danger)] text-white hover:bg-red-500 shadow-[0_1px_2px_rgba(0,0,0,0.12)] transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400/50"
                : "rounded-[var(--radius-btn)] bg-[var(--accent-primary)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--accent-primary-hover)] shadow-[0_1px_2px_rgba(0,0,0,0.12)] transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)]/50"
            }
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
