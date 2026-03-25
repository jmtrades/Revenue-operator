"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  /** Label for "Page X of Y" — provide translated string with {page} and {total} placeholders */
  label?: string;
  className?: string;
}

/**
 * Reusable pagination component with prev/next buttons and page indicator.
 * Matches the existing design system using CSS custom properties.
 */
export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  label,
  className = "",
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const safePage = Math.max(1, Math.min(currentPage, totalPages));
  const displayLabel = label
    ? label.replace("{page}", String(safePage)).replace("{total}", String(totalPages))
    : `Page ${safePage} / ${totalPages}`;

  return (
    <div
      className={`flex items-center justify-center gap-3 py-4 ${className}`}
    >
      <button
        disabled={safePage <= 1}
        onClick={() => onPageChange(safePage - 1)}
        className="p-2 rounded-lg border transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        style={{
          borderColor: "var(--border-default)",
          background: "var(--bg-surface)",
          color: "var(--text-secondary)",
        }}
        aria-label="Previous page"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      <span
        className="text-sm font-medium tabular-nums min-w-[100px] text-center"
        style={{ color: "var(--text-secondary)" }}
      >
        {displayLabel}
      </span>
      <button
        disabled={safePage >= totalPages}
        onClick={() => onPageChange(safePage + 1)}
        className="p-2 rounded-lg border transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        style={{
          borderColor: "var(--border-default)",
          background: "var(--bg-surface)",
          color: "var(--text-secondary)",
        }}
        aria-label="Next page"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}
