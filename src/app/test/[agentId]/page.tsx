"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AgentTestPanel } from "@/app/app/agents/AgentTestPanel";

type AgentSummary = {
  id: string;
  name: string;
  greeting?: string | null;
};

export default function PublicAgentTestPage({
  params,
}: {
  params: Promise<{ agentId: string }>;
}) {
  const searchParams = useSearchParams();
  const [agent, setAgent] = useState<AgentSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const resolvedParams = await params;
        const agentId = resolvedParams.agentId;
        const res = await fetch(
          `/api/agents/public/${encodeURIComponent(agentId)}`,
          {
            signal: controller.signal,
          },
        );
        if (!res.ok) {
          setError("This test link is not available.");
          return;
        }
        const data = (await res.json()) as {
          id?: string;
          name?: string;
          greeting?: string | null;
        };
        if (!data.id || !data.name) {
          setError("This agent could not be loaded.");
          return;
        }
        setAgent({
          id: data.id,
          name: data.name,
          greeting: data.greeting ?? undefined,
        });
      } catch (e) {
        if (controller.signal.aborted) return;
        const message =
          e instanceof Error ? e.message : "Something went wrong loading this agent.";
        setError(message);
      } finally {
        setLoading(false);
      }
    };
    void load();
    return () => controller.abort();
  }, [params, searchParams]);

  return (
    <main className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-3xl space-y-6">
        <header className="space-y-1">
          <h1 className="text-lg font-semibold">
            Test this agent in your browser
          </h1>
          <p className="text-xs text-[var(--text-tertiary)]">
            This sandbox lets your team try the agent&apos;s call behavior without
            logging in.
          </p>
        </header>
        <section className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-inset)] p-4">
          {loading && (
            <p className="text-xs text-[var(--text-tertiary)]">Loading agent configuration…</p>
          )}
          {error && !loading && (
            <p className="text-xs text-red-400" role="alert">
              {error}
            </p>
          )}
          {agent && !loading && !error && (
            <AgentTestPanel
              agent={{
                id: agent.id,
                name: agent.name,
                greeting: agent.greeting,
              }}
              workspace={{}}
              onTested={() => {
                // no-op; public tests don&apos;t drive setup state
              }}
            />
          )}
        </section>
      </div>
    </main>
  );
}

