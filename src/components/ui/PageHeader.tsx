"use client";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}

export function PageHeader({ title, subtitle, right }: PageHeaderProps) {
  return (
    <header className="mb-8 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight" style={{ color: "var(--text-primary)" }}>
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1 text-base" style={{ color: "var(--text-secondary)" }}>
            {subtitle}
          </p>
        )}
      </div>
      {right && <div className="mt-4 sm:mt-0 shrink-0">{right}</div>}
    </header>
  );
}
