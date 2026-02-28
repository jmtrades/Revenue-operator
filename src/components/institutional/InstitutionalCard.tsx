"use client";

/**
 * Reusable card for institutional surfaces. Consistent padding and border.
 */
export function InstitutionalCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-[16px] border ${className}`}
      style={{
        background: "linear-gradient(180deg, #121214 0%, #101012 100%)",
        borderColor: "var(--card-border, var(--border))",
        padding: "var(--card-padding, 32px)",
      }}
    >
      {children}
    </div>
  );
}
