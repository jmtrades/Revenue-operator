export default function DashboardLoading() {
  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: "var(--bg-primary)" }}
    >
      <div className="flex flex-col items-center gap-3">
        <div
          className="w-8 h-8 rounded-full border-2 animate-spin"
          style={{
            borderColor: "var(--border-default)",
            borderTopColor: "var(--accent-primary)",
          }}
        />
        <p
          className="text-sm"
          style={{ color: "var(--text-tertiary)" }}
        >
          Loading…
        </p>
      </div>
    </div>
  );
}
