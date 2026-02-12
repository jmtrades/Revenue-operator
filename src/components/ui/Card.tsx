"use client";

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export function Card({ children, className = "" }: CardProps) {
  return (
    <div
      className={`rounded-xl border p-5 ${className}`}
      style={{
        background: "var(--card)",
        borderColor: "var(--border)",
        borderWidth: "1px",
        boxShadow: "var(--shadow-sm)",
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
