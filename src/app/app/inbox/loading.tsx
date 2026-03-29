export default function Loading() {
  return (
    <div className="p-4 md:p-8 max-w-[1200px] mx-auto space-y-6 animate-pulse">
      <div className="h-4 w-32 rounded bg-[var(--bg-surface)]" />
      <div className="flex items-center justify-between">
        <div className="h-8 w-40 rounded-lg bg-[var(--bg-surface)]" />
        <div className="h-10 w-28 rounded-xl bg-[var(--bg-surface)]" />
      </div>
      <div className="h-10 rounded-lg bg-[var(--bg-surface)]" />
      <div className="space-y-2">
        {[1, 2, 3, 4, 5, 6, 7].map((i) => (
          <div key={i} className="h-20 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)]" />
        ))}
      </div>
    </div>
  );
}
