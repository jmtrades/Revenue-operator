export default function Loading() {
  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-6xl mx-auto space-y-6 animate-pulse">
      <div className="h-4 w-32 rounded bg-[var(--bg-surface)]" />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="h-8 w-48 rounded-lg bg-[var(--bg-surface)]" />
        <div className="h-10 w-36 rounded-xl bg-[var(--bg-surface)]" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-20 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)]" />
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-52 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)]" />
        ))}
      </div>
    </div>
  );
}
