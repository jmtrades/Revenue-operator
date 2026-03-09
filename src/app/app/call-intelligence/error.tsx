"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] p-8">
      <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center mb-4">
        <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <h2 className="text-lg font-semibold text-white/90 mb-2">Something went wrong</h2>
      <p className="text-sm text-white/50 text-center max-w-sm mb-6">
        {error?.message || "An unexpected error occurred."}
      </p>
      <button onClick={reset} className="px-5 py-2.5 bg-white text-gray-900 font-semibold rounded-lg text-sm hover:bg-gray-100">
        Try again
      </button>
    </div>
  );
}
