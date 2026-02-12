"use client";

interface EmptyStateProps {
  icon?: "pulse" | "watch";
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon = "pulse", title, subtitle, action, className = "" }: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-xl border py-10 px-6 text-center ${className}`}
      style={{
        background: "var(--card)",
        borderColor: "var(--border)",
        borderWidth: "1px",
      }}
    >
      <span
        className="mb-3 inline-block h-3 w-3 rounded-full animate-pulse"
        style={{ background: icon === "watch" ? "var(--meaning-amber)" : "var(--meaning-green)" }}
        aria-hidden
      />
      <p className="font-medium" style={{ color: "var(--text-primary)" }}>
        {title}
      </p>
      {subtitle && (
        <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
          {subtitle}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
