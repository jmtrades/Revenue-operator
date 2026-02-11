import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 font-sans flex flex-col items-center justify-center px-6">
      <main className="max-w-lg text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-stone-50">
          Revenue Operator
        </h1>
        <p className="mt-4 text-lg text-stone-400">
          Fully automatic lead follow-up and recovery. It watches conversations and advances deals for you.
        </p>
        <ul className="mt-6 text-left space-y-2 text-stone-300">
          <li>• Replies instantly to every lead</li>
          <li>• Follows up until they answer</li>
          <li>• Recovers ghosted prospects</li>
        </ul>
        <Link
          href="/dashboard"
          className="mt-8 inline-block px-6 py-3 rounded-lg bg-amber-600 hover:bg-amber-500 font-medium text-stone-950 transition-colors"
        >
          Get started
        </Link>
        <p className="mt-6 text-stone-500 text-sm">
          Starter £299/mo · Growth £799/mo · Scale £1,999/mo
        </p>
      </main>
    </div>
  );
}
