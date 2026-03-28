import Link from "next/link";

export const metadata = {
  title: "Page not found",
  robots: { index: false },
};

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <h1 className="text-6xl font-bold text-white mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-gray-100 mb-4">Page not found</h2>
        <p className="text-gray-400 mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>

        <div className="flex flex-col gap-3">
          <Link
            href="/"
            className="inline-flex items-center justify-center px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
          >
            Back to homepage
          </Link>
          <Link
            href="/app/dashboard"
            className="inline-flex items-center justify-center px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-gray-100 font-medium rounded-lg transition-colors border border-slate-700"
          >
            Go to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
