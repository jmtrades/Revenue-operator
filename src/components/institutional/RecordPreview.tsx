"use client";

/**
 * Styled preview of public record. Authority look. Copy button.
 */
export function RecordPreview({
  onCopy,
}: {
  onCopy?: () => void;
}) {
  return (
    <div
      className="rounded-[12px] border p-8 text-center"
      style={{ background: "var(--surface-card)", borderColor: "var(--border)" }}
    >
      <p
        className="text-[13px] font-medium uppercase tracking-[0.08em] mb-2"
        style={{ color: "var(--text-muted)" }}
      >
        Institutional record
      </p>
      <h2 className="font-headline mb-4" style={{ fontSize: "22px", color: "var(--text-primary)" }}>
        Governed commercial record
      </h2>
      <p className="text-sm mb-4" style={{ color: "var(--text-secondary)", lineHeight: 1.6 }}>
        Verified under declared jurisdiction.
      </p>
      <p className="text-sm mb-6" style={{ color: "var(--text-muted)", lineHeight: 1.6 }}>
        This record may be forwarded without modification.
      </p>
      {onCopy && (
        <button
          type="button"
          onClick={onCopy}
          className="btn-primary"
        >
          Copy record
        </button>
      )}
    </div>
  );
}
