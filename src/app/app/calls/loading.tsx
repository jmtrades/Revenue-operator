export default function Loading() {
  return (
    <div className="p-4 md:p-8 max-w-[1200px] mx-auto space-y-6 animate-pulse">
      <div className="h-4 w-32 rounded bg-[var(--bg-surface)]" />
      <div className="flex items-center justify-between">
        <div className="h-8 w-40 rounded-lg bg-[var(--bg-surface)]" />
        <div className="flex gap-2">
          <div className="h-10 w-24 rounded-xl bg-[var(--bg-surface)]" />
          <div className="h-10 w-24 rounded-xl bg-[var(--bg-surface)]" />
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-20 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)]" />
        ))}
      </div>
      <div className="space-y-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-20 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)]" />
        ))}
      </div>
    </div>
  );
}
