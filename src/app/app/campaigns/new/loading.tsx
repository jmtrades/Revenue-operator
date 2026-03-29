export default function Loading() {
  return (
    <div className="p-4 md:p-8 max-w-[800px] mx-auto space-y-6">
      <div className="h-8 w-48 rounded-lg skeleton-shimmer" />
      <div className="h-2 w-full rounded skeleton-shimmer" />
      <div className="space-y-4">
        <div className="h-12 rounded-xl skeleton-shimmer" />
        <div className="h-12 rounded-xl skeleton-shimmer" />
        <div className="h-24 rounded-xl skeleton-shimmer" />
      </div>
    </div>
  );
}
