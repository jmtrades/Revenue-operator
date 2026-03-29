export default function Loading() {
  return (
    <div className="p-4 md:p-8 max-w-[1200px] mx-auto space-y-8 animate-pulse">
      {/* Breadcrumbs skeleton */}
      <div className="h-4 w-40 rounded bg-[var(--bg-surface)]" />

      {/* Header skeleton */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="h-8 w-72 rounded-lg bg-[var(--bg-surface)]" />
          <div className="h-4 w-56 rounded bg-[var(--bg-surface)]" />
        </div>
        <div className="h-10 w-32 rounded-xl bg-[var(--bg-surface)]" />
      </div>

      {/* Revenue recovered card skeleton */}
      <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-6 space-y-4">
        <div className="h-5 w-48 rounded bg-[var(--bg-inset)]" />
        <div className="h-10 w-36 rounded-lg bg-[var(--bg-inset)]" />
        <div className="h-3 w-64 rounded bg-[var(--bg-inset)]" />
      </div>

      {/* Quick stats row skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-5 space-y-3">
            <div className="h-4 w-20 rounded bg-[var(--bg-inset)]" />
            <div className="h-7 w-16 rounded bg-[var(--bg-inset)]" />
          </div>
        ))}
      </div>

      {/* Activity cards skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2].map((i) => (
          <div key={i} className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-6 space-y-4">
            <div className="h-5 w-40 rounded bg-[var(--bg-inset)]" />
            <div className="space-y-2">
              <div className="h-3 w-full rounded bg-[var(--bg-inset)]" />
              <div className="h-3 w-3/4 rounded bg-[var(--bg-inset)]" />
              <div className="h-3 w-5/6 rounded bg-[var(--bg-inset)]" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
