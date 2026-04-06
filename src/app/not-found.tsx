import Link from "next/link";
import { ROUTES } from "@/lib/constants";

export const metadata = {
  title: "Page not found",
  robots: { index: false },
};

export default function NotFound() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <h1 className="text-6xl font-bold text-white mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-white mb-4">Page not found</h2>
        <p className="text-zinc-400 mb-8">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>

        <div className="flex flex-col gap-3">
          <Link
            href="/"
            className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-white text-black font-semibold hover:bg-zinc-100 transition-colors"
          >
            Back to homepage
          </Link>
          <Link
            href={ROUTES.APP_HOME}
            className="inline-flex items-center justify-center px-6 py-3 rounded-xl border border-zinc-700 text-zinc-300 font-medium hover:bg-zinc-900/50 transition-colors"
          >
            Open app
          </Link>
        </div>
      </div>
    </div>
  );
}
