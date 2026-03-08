import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-black">
      <div className="max-w-md w-full text-center">
        <p className="text-6xl font-bold mb-2 text-white">404</p>
        <h1 className="text-xl font-semibold text-white mb-3">Page not found</h1>
        <p className="text-sm text-zinc-400 mb-6">This page doesn’t exist.</p>
        <div className="flex gap-3 justify-center flex-wrap">
          <Link
            href="/"
            className="px-6 py-3 rounded-xl text-sm font-semibold bg-white text-black hover:bg-zinc-100 transition"
          >
            Go home
          </Link>
          <Link
            href="/contact"
            className="px-6 py-3 rounded-xl text-sm font-medium border border-zinc-700 text-zinc-300 hover:text-white transition"
          >
            Contact
          </Link>
        </div>
      </div>
    </div>
  );
}
