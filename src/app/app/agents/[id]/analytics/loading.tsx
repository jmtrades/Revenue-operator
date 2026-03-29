export default function Loading() {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] p-6 space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <div className="h-6 bg-[var(--bg-hover)] rounded w-48 skeleton-shimmer" />
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[var(--bg-hover)] rounded-lg skeleton-shimmer" />
          <div className="h-8 bg-[var(--bg-hover)] rounded w-64 skeleton-shimmer" />
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="h-4 bg-[var(--bg-hover)] rounded w-24 skeleton-shimmer" />
              <div className="w-5 h-5 bg-[var(--bg-hover)] rounded skeleton-shimmer" />
            </div>
            <div className="space-y-2">
              <div className="h-6 bg-[var(--bg-hover)] rounded w-28 skeleton-shimmer" />
              <div className="h-3 bg-[var(--bg-hover)] rounded w-32 skeleton-shimmer" />
            </div>
          </div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1, 2].map((i) => (
          <div key={i} className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-lg p-6">
            <div className="h-6 bg-[var(--bg-hover)] rounded w-32 mb-6 skeleton-shimmer" />
            <div className="w-full h-64 bg-[var(--bg-hover)] rounded skeleton-shimmer" />
          </div>
        ))}
      </div>

      {/* Table/List Section */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-lg p-6 space-y-4">
        <div className="h-6 bg-[var(--bg-hover)] rounded w-32 skeleton-shimmer" />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center justify-between h-12 bg-[var(--bg-hover)] rounded-lg skeleton-shimmer px-4" />
          ))}
        </div>
      </div>
    </div>
  );
}
