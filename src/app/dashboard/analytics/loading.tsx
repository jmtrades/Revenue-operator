export default function AnalyticsLoading() {
  return (
    <div className="p-8 max-w-4xl space-y-6 animate-pulse">
      <div className="h-8 w-48 rounded" style={{ background: "var(--border-default)" }} />
      <div className="rounded-xl border p-6 space-y-4" style={{ borderColor: "var(--border-default)", background: "var(--bg-surface)" }}>
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-lg" style={{ background: "var(--bg-elevated)" }} />
          ))}
        </div>
        <div className="h-4 w-64 rounded" style={{ background: "var(--border-default)" }} />
      </div>
    </div>
  );
}
