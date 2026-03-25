/**
 * App-level loading UI — shown while app route segments load.
 * MUST be synchronous so the Suspense fallback renders instantly.
 */
export default function AppLoading() {
  return (
    <div
      className="min-h-[40vh] flex flex-col items-center justify-center p-8 animate-pulse bg-[var(--bg-base)]"
      aria-busy="true"
      aria-label="Loading…"
    >
      <div className="h-2 w-32 rounded-full mb-4 opacity-60 bg-[var(--border-default)]" />
      <div className="h-3 w-48 rounded opacity-40 bg-[var(--border-default)]" />
    </div>
  );
}
