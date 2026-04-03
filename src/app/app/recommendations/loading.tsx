export default function Loading() {
  return (
    <div className="p-4 md:p-8 max-w-[1200px] mx-auto space-y-6 animate-pulse">
      <div className="h-4 w-40 rounded bg-[var(--bg-surface)]" />
      <div className="space-y-2">
        <div className="h-8 w-64 rounded-lg bg-[var(--bg-surface)]" />
        <div className="h-4 w-48 rounded bg-[var(--bg-surface)]" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-5 space-y-3">
            <div className="h-4 w-24 rounded bg-[var(--bg-inset)]" />
            <div className="h-7 w-16 rounded bg-[var(--bg-inset)]" />
          </div>
        ))}
      </div>
      <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] p-6 space-y-4">
        <div className="h-5 w-40 rounded bg-[var(--bg-inset)]" />
        <div className="space-y-2">
          <div className="h-3 w-full rounded bg-[var(--bg-inset)]" />
          <div className="h-3 w-3/4 rounded bg-[var(--bg-inset)]" />
          <div className="h-3 w-5/6 rounded bg-[var(--bg-inset)]" />
        </div>
      </div>
    </div>
  );
}

