export default function Loading() {
  return (
    <div className="p-4 md:p-8 max-w-[800px] mx-auto animate-pulse space-y-6">
      <div className="h-8 w-48 rounded-lg bg-[var(--bg-hover)]" />
      <div className="h-2 w-full rounded bg-[var(--bg-hover)]" />
      <div className="space-y-4">
        <div className="h-12 rounded-xl bg-[var(--bg-hover)]" />
        <div className="h-12 rounded-xl bg-[var(--bg-hover)]" />
        <div className="h-24 rounded-xl bg-[var(--bg-hover)]" />
      </div>
    </div>
  );
}
