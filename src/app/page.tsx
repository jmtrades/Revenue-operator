import Link from "next/link";
import { Hero } from "@/components/sections/Hero";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <nav className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
        <Link
          href="/"
          className="flex items-center gap-2"
        >
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
            <span className="text-black font-bold text-sm">RT</span>
          </div>
          <span className="font-semibold text-lg">Recall Touch</span>
        </Link>
        <div className="flex items-center gap-4">
          <Link
            href="/sign-in"
            className="text-sm text-zinc-400 hover:text-white transition"
          >
            Sign in
          </Link>
          <Link
            href="/activate"
            className="text-sm bg-white text-black px-4 py-2 rounded-lg font-medium hover:bg-zinc-200 transition"
          >
            Start free →
          </Link>
        </div>
      </nav>
      <main id="main">
        <Hero />
      </main>
    </div>
  );
}
