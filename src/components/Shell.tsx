"use client";

/**
 * Page shell: max width + stable gutters. No metrics, no dashboards.
 */

interface ShellProps {
  children: React.ReactNode;
  className?: string;
  /** Max width: "md" (2xl) or "lg" (3xl) */
  size?: "md" | "lg";
}

export function Shell({ children, className = "", size = "lg" }: ShellProps) {
  const maxW = size === "md" ? "max-w-2xl" : "max-w-3xl";
  return (
    <div
      className={`mx-auto w-full px-8 py-12 sm:px-12 sm:py-16 ${maxW} ${className}`}
      style={{ color: "var(--text-primary)" }}
    >
      {children}
    </div>
  );
}
