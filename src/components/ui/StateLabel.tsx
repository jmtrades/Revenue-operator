"use client";

type StateLabelVariant = "green" | "amber" | "red" | "blue" | "neutral";

const variantStyles: Record<StateLabelVariant, { bg: string; text: string }> = {
  green: { bg: "rgba(46, 204, 113, 0.15)", text: "var(--meaning-green)" },
  amber: { bg: "rgba(243, 156, 18, 0.15)", text: "var(--meaning-amber)" },
  red: { bg: "rgba(231, 76, 60, 0.15)", text: "var(--meaning-red)" },
  blue: { bg: "rgba(77, 163, 255, 0.15)", text: "var(--meaning-blue)" },
  neutral: { bg: "var(--surface)", text: "var(--text-secondary)" },
};

interface StateLabelProps {
  children: React.ReactNode;
  variant?: StateLabelVariant;
  className?: string;
}

export function StateLabel({ children, variant = "neutral", className = "" }: StateLabelProps) {
  const style = variantStyles[variant];
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${className}`}
      style={{ backgroundColor: style.bg, color: style.text }}
    >
      {children}
    </span>
  );
}
