'use client';
import { AlertTriangle } from 'lucide-react';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
      <div className="w-12 h-12 rounded-2xl bg-[#FF4D4D]/10 flex items-center justify-center">
        <AlertTriangle className="w-6 h-6 text-[#FF4D4D]" />
      </div>
      <h2 className="text-lg font-semibold text-[#EDEDEF]">Something went wrong</h2>
      <p className="text-sm text-[#8B8B8D] max-w-md text-center">{error.message || 'An unexpected error occurred.'}</p>
      <button
        type="button"
        onClick={reset}
        className="bg-[#4F8CFF] text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-[#4F8CFF]/90 transition-all duration-200"
      >
        Try again
      </button>
    </div>
  );
}

