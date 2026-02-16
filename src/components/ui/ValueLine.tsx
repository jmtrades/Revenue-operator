"use client";

interface ValueLineProps {
  value: React.ReactNode;
  label: string;
  className?: string;
  accent?: "green" | "amber" | "blue" | "neutral";
}

export function ValueLine({ value, label, className = "", accent = "neutral" }: ValueLineProps) {
  const valueColor =
    accent === "green"
      ? "var(--meaning-green)"
      : accent === "amber"
        ? "var(--meaning-amber)"
        : accent === "blue"
          ? "var(--meaning-blue)"
          : "var(--text-primary)";
  return (
    <div className={`text-center ${className}`}>
      <p className="text-2xl font-semibold tabular-nums" style={{ color: valueColor }}>
        {value}
      </p>
      <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
        {label}
      </p>
    </div>
  );
}
