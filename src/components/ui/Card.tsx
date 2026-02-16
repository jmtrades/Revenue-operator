"use client";

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export function Card({ children, className = "" }: CardProps) {
  return (
    <div
      className={`rounded-2xl border p-6 ${className}`}
      style={{
        background: "var(--card)",
        borderColor: "var(--border)",
        borderWidth: "1px",
        boxShadow: "var(--shadow-sm)",
        borderRadius: "var(--radius-container)",
      }}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`mb-4 text-sm font-medium ${className}`} style={{ color: "var(--text-secondary)" }}>
      {children}
    </div>
  );
}

export function CardBody({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={className}>{children}</div>;
}
