/**
 * Dashboard segment loading — skeleton while child route loads.
 */
export default function DashboardLoading() {
  return (
    <div
      className="flex-1 p-6 md:p-8 skeleton-shimmer"
      style={{ background: "var(--bg-primary)" }}
      aria-busy="true"
    >
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="h-8 w-48 rounded" style={{ background: "var(--border-default)" }} />
        <div className="h-4 w-full max-w-xl rounded opacity-80" style={{ background: "var(--border-default)" }} />
        <div className="h-4 w-full max-w-lg rounded opacity-60" style={{ background: "var(--border-default)" }} />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 rounded-lg" style={{ background: "var(--bg-elevated)" }} />
          ))}
        </div>
      </div>
    </div>
  );
}
