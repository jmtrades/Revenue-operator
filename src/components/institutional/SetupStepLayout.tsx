"use client";

/**
 * Wrapper for setup steps. Consistent spacing and max width.
 */
export function SetupStepLayout({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="max-w-[1100px] mx-auto px-6 sm:px-8 py-24">
      <h1 className="font-headline mb-2" style={{ fontSize: "32px", color: "var(--text-primary)" }}>
        {title}
      </h1>
      {description && (
        <p className="text-sm mb-12" style={{ color: "var(--text-muted)", lineHeight: 1.6 }}>
          {description}
        </p>
      )}
      {children}
    </div>
  );
}
