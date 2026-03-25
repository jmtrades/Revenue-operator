"use client";

import { Suspense, useCallback, useState } from "react";
import { useSearchParams } from "next/navigation";

function SettlementContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [status, setStatus] = useState<"idle" | "loading" | "unavailable" | "redirect" | null>(null);

  const open = useCallback(async () => {
    if (!token || status === "loading") return;
    setStatus("loading");
    try {
      const res = await fetch("/api/public/settlement/open", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (data?.ok && typeof data.url === "string") {
        setStatus("redirect");
        window.location.href = data.url;
        return;
      }
      setStatus("unavailable");
    } catch {
      setStatus("unavailable");
    }
  }, [token, status]);

  if (!token) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-stone-950 p-6">
        <p className="text-stone-400">Settlement</p>
      </main>
    );
  }

  if (status === "unavailable") {
    return (
      <main className="min-h-screen flex items-center justify-center bg-stone-950 p-6">
        <p className="text-stone-400">Unavailable</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-stone-950 p-6">
      <h1 className="text-stone-300 text-lg font-medium mb-2">Settlement</h1>
      <p className="text-stone-500 text-sm mb-6">Settlement authorization</p>
      <button
        type="button"
        onClick={open}
        disabled={status === "loading" || status === "redirect"}
        className="rounded border border-stone-600 bg-stone-800 text-stone-200 px-4 py-2 text-sm disabled:opacity-50"
      >
        Open
      </button>
    </main>
  );
}

export default function SettlementPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen flex items-center justify-center bg-stone-950 p-6">
          <p className="text-stone-400">Settlement</p>
        </main>
      }
    >
      <SettlementContent />
    </Suspense>
  );
}
