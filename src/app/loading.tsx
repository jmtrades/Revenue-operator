/**
 * Global loading UI — shown while a route segment is loading.
 * Keeps layout visible; avoids blank screen (v13 zero-loading rule).
 */
export default function Loading() {
  return (
    <div
      className="min-h-[40vh] flex flex-col items-center justify-center p-8 animate-pulse"
      style={{ background: "var(--bg-primary)", color: "var(--text-tertiary)" }}
      aria-busy="true"
      aria-label="Loading"
    >
      <div className="h-2 w-32 rounded-full mb-4 opacity-60" style={{ background: "var(--border-default)" }} />
      <div className="h-3 w-48 rounded opacity-40" style={{ background: "var(--border-default)" }} />
    </div>
  );
}
