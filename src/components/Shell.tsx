"use client";

/**
 * Page shell: max width + stable gutters. No metrics, no dashboards.
 */

interface ShellProps {
  children: React.ReactNode;
  className?: string;
  /** Max width: "md" (2xl), "lg" (1100px), or "institutional" (720px) */
  size?: "md" | "lg" | "institutional";
}

export function Shell({ children, className = "", size = "lg" }: ShellProps) {
  const maxW = size === "md" ? "max-w-2xl" : size === "institutional" ? "max-w-[720px]" : "max-w-[1100px]";
  return (
    <div
      className={`mx-auto w-full px-6 sm:px-8 py-12 sm:py-16 ${maxW} ${className}`}
      style={{ color: "var(--text-primary)" }}
    >
      {children}
    </div>
  );
}
