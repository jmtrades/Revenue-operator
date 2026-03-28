export default function Loading() {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] p-6 space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[var(--bg-hover)] rounded-lg animate-pulse" />
          <div className="flex-1">
            <div className="h-6 bg-[var(--bg-hover)] rounded-lg w-64 animate-pulse" />
          </div>
        </div>
        <div className="h-10 bg-[var(--bg-hover)] rounded-lg w-48 animate-pulse" />
      </div>

      {/* Call Recording Player Skeleton */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-lg p-6 space-y-4">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-[var(--bg-hover)] rounded-full animate-pulse" />
          <div className="flex-1">
            <div className="h-2 bg-[var(--bg-hover)] rounded-full w-full animate-pulse" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-4 bg-[var(--bg-hover)] rounded w-12 animate-pulse" />
          <div className="h-4 bg-[var(--bg-hover)] rounded w-12 animate-pulse" />
        </div>
      </div>

      {/* Metadata Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-lg p-4 space-y-2">
            <div className="h-4 bg-[var(--bg-hover)] rounded w-20 animate-pulse" />
            <div className="h-5 bg-[var(--bg-hover)] rounded w-32 animate-pulse" />
          </div>
        ))}
      </div>

      {/* Timeline */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-lg p-6">
        <div className="h-6 bg-[var(--bg-hover)] rounded w-32 mb-6 animate-pulse" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-4 pb-4 border-b border-[var(--border-default)] last:border-0">
              <div className="w-3 h-3 bg-[var(--bg-hover)] rounded-full mt-1 shrink-0 animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-[var(--bg-hover)] rounded w-48 animate-pulse" />
                <div className="h-4 bg-[var(--bg-hover)] rounded w-64 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
