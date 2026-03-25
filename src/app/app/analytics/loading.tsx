export default function Loading() {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="w-8 h-8 border-2 border-[var(--border-default)] border-t-[var(--accent-primary)] rounded-full animate-spin" />
    </div>
  );
}

