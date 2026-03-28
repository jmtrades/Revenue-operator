export default function Loading() {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] p-6 space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <div className="h-6 bg-[var(--bg-hover)] rounded w-48 animate-pulse" />
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[var(--bg-hover)] rounded-lg animate-pulse" />
          <div className="h-8 bg-[var(--bg-hover)] rounded w-64 animate-pulse" />
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="h-4 bg-[var(--bg-hover)] rounded w-24 animate-pulse" />
              <div className="w-5 h-5 bg-[var(--bg-hover)] rounded animate-pulse" />
            </div>
            <div className="space-y-2">
              <div className="h-6 bg-[var(--bg-hover)] rounded w-28 animate-pulse" />
              <div className="h-3 bg-[var(--bg-hover)] rounded w-32 animate-pulse" />
            </div>
          </div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1, 2].map((i) => (
          <div key={i} className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-lg p-6">
            <div className="h-6 bg-[var(--bg-hover)] rounded w-32 mb-6 animate-pulse" />
            <div className="w-full h-64 bg-[var(--bg-hover)] rounded animate-pulse" />
          </div>
        ))}
      </div>

      {/* Table/List Section */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-lg p-6 space-y-4">
        <div className="h-6 bg-[var(--bg-hover)] rounded w-32 animate-pulse" />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center justify-between h-12 bg-[var(--bg-hover)] rounded-lg animate-pulse px-4" />
          ))}
        </div>
      </div>
    </div>
  );
}
