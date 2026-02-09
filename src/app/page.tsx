import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 font-sans flex flex-col items-center justify-center px-6">
      <main className="max-w-2xl text-center">
        <h1 className="text-4xl font-semibold tracking-tight text-stone-50">
          Revenue Operator
        </h1>
        <p className="mt-4 text-lg text-stone-400">
          A deterministic revenue workflow engine with AI assistance. Rules
          control state—AI handles perception and wording only.
        </p>
        <div className="mt-10 flex gap-4 justify-center">
          <Link
            href="/dashboard"
            className="px-6 py-3 rounded-lg bg-amber-600 hover:bg-amber-500 font-medium text-stone-950 transition-colors"
          >
            Dashboard
          </Link>
          <Link
            href="/dashboard/settings"
            className="px-6 py-3 rounded-lg border border-stone-600 hover:bg-stone-800 font-medium transition-colors"
          >
            Settings
          </Link>
        </div>
        <div className="mt-16 grid gap-6 sm:grid-cols-2 text-left">
          <div className="p-5 rounded-xl bg-stone-900/80 border border-stone-800">
            <h2 className="font-medium text-stone-200">Webhook</h2>
            <p className="mt-1 text-sm text-stone-500">
              POST /api/webhooks/inbound to ingest leads and trigger responses
            </p>
          </div>
          <div className="p-5 rounded-xl bg-stone-900/80 border border-stone-800">
            <h2 className="font-medium text-stone-200">Revenue Report</h2>
            <p className="mt-1 text-sm text-stone-500">
              GET /api/revenue?workspace_id=... for metrics
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
