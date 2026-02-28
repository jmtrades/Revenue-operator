"use client";

/**
 * Small uppercase label above a main heading. Institutional.
 */
export function AuthorityHeader({
  label,
  title,
  className = "",
}: {
  label: string;
  title: string;
  className?: string;
}) {
  return (
    <header className={className}>
      <p
        className="text-[13px] font-medium uppercase mb-2"
        style={{ color: "var(--text-muted)", letterSpacing: "0.12em" }}
      >
        {label}
      </p>
      <h1 className="font-headline" style={{ color: "var(--text-primary)", fontSize: "clamp(2rem, 4vw, 48px)" }}>
        {title}
      </h1>
    </header>
  );
}
