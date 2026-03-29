export default function Loading() {
  return (
    <div className="p-4 md:p-8 max-w-[1200px] mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-[var(--bg-hover)] skeleton-shimmer" />
          <div className="h-8 w-48 rounded-lg bg-[var(--bg-hover)] skeleton-shimmer" />
        </div>
        <div className="h-8 w-24 rounded-lg bg-[var(--bg-hover)] skeleton-shimmer" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="h-10 rounded-lg bg-[var(--bg-hover)] skeleton-shimmer" />
        <div className="h-10 rounded-lg bg-[var(--bg-hover)] skeleton-shimmer" />
        <div className="h-10 rounded-lg bg-[var(--bg-hover)] skeleton-shimmer" />
        <div className="h-10 rounded-lg bg-[var(--bg-hover)] skeleton-shimmer" />
      </div>
      <div className="space-y-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-24 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-default)] skeleton-shimmer" />
        ))}
      </div>
    </div>
  );
}
