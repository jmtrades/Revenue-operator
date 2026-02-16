"use client";

interface LoadingStateProps {
  message?: string;
  submessage?: string;
  className?: string;
}

export function LoadingState({ message = "In progress.", submessage, className = "" }: LoadingStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-xl border py-12 px-6 text-center ${className}`}
      style={{
        background: "var(--card)",
        borderColor: "var(--border)",
        borderWidth: "1px",
      }}
    >
      <span
        className="mb-3 inline-block h-3 w-3 rounded-full"
        style={{ background: "var(--text-muted)" }}
        aria-hidden
      />
      <p className="font-medium" style={{ color: "var(--text-primary)" }}>
        {message}
      </p>
      {submessage && (
        <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
          {submessage}
        </p>
      )}
    </div>
  );
}

export function LoadingScreen({ message = "In progress." }: { message?: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center" style={{ background: "var(--background)" }}>
      <div className="text-center">
        <span
          className="mb-3 inline-block h-3 w-3 rounded-full"
          style={{ background: "var(--text-muted)" }}
          aria-hidden
        />
        <p className="text-lg font-medium" style={{ color: "var(--text-primary)" }}>
          {message}
        </p>
      </div>
    </div>
  );
}
