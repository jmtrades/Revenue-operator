export default function Loading() {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] p-6 space-y-6">
      {/* Back button & breadcrumbs */}
      <div className="h-6 bg-[var(--bg-hover)] rounded w-48 animate-pulse" />

      {/* Contact Header */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-lg p-6">
        <div className="flex gap-6 items-start">
          {/* Avatar placeholder */}
          <div className="w-24 h-24 bg-[var(--bg-hover)] rounded-full animate-pulse shrink-0" />

          <div className="flex-1 space-y-4">
            {/* Name skeleton */}
            <div className="space-y-2">
              <div className="h-8 bg-[var(--bg-hover)] rounded w-48 animate-pulse" />
              <div className="h-4 bg-[var(--bg-hover)] rounded w-64 animate-pulse" />
            </div>

            {/* Contact Info Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="space-y-2">
                  <div className="h-3 bg-[var(--bg-hover)] rounded w-16 animate-pulse" />
                  <div className="h-4 bg-[var(--bg-hover)] rounded w-24 animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs skeleton */}
      <div className="flex gap-4 border-b border-[var(--border-default)]">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-10 bg-[var(--bg-hover)] rounded w-24 animate-pulse" />
        ))}
      </div>

      {/* Activity Timeline */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-lg p-6 space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex gap-4 pb-4 border-b border-[var(--border-default)] last:border-0">
            <div className="w-10 h-10 bg-[var(--bg-hover)] rounded-lg shrink-0 animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-[var(--bg-hover)] rounded w-32 animate-pulse" />
              <div className="h-4 bg-[var(--bg-hover)] rounded w-48 animate-pulse" />
              <div className="h-3 bg-[var(--bg-hover)] rounded w-20 animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
