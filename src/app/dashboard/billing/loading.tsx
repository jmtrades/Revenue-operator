export default function BillingLoading() {
  return (
    <div className="p-6 max-w-lg space-y-4 skeleton-shimmer">
      <div className="h-8 w-40 rounded" style={{ background: "var(--border-default)" }} />
      <div className="rounded-xl border p-4 space-y-3" style={{ borderColor: "var(--border-default)", background: "var(--bg-surface)" }}>
        <div className="h-4 w-24 rounded" style={{ background: "var(--border-default)" }} />
        <div className="h-3 w-full rounded" style={{ background: "var(--border-default)" }} />
        <div className="h-3 w-full max-w-[85%] rounded" style={{ background: "var(--border-default)" }} />
      </div>
    </div>
  );
}
