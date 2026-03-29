"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { RECALL_VOICES } from "@/lib/constants/recall-voices";

interface AbTest {
  id: string;
  name: string;
  voice_a: string;
  voice_b: string;
  traffic_split: number;
  status: "running" | "paused" | "completed";
  winner?: string | null;
  start_date?: string;
  end_date?: string;
  created_at: string;
  calls_a?: number;
  calls_b?: number;
  avg_duration_a?: number;
  avg_duration_b?: number;
  conversion_a?: number;
  conversion_b?: number;
}

function getVoiceName(voiceId: string): string {
  return RECALL_VOICES.find((v) => v.id === voiceId)?.name ?? voiceId;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function AbTestingPage() {
  const t = useTranslations("voiceAbTesting");
  const searchParams = useSearchParams();
  const workspaceId = searchParams.get("workspace_id") ?? "";
  const [tests, setTests] = useState<AbTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  // Create form state
  const [newName, setNewName] = useState("");
  const [newVoiceA, setNewVoiceA] = useState("");
  const [newVoiceB, setNewVoiceB] = useState("");
  const [newSplit, setNewSplit] = useState(50);
  const [newDays, setNewDays] = useState(7);
  const [creating, setCreating] = useState(false);

  const fetchTests = useCallback(async () => {
    if (!workspaceId) return;
    try {
      const res = await fetch(`/api/voice/ab-tests?workspace_id=${workspaceId}`);
      const data = await res.json();
      setTests(data.tests ?? []);
    } catch {
      // silenced
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    fetchTests();
  }, [fetchTests]);

  async function handleCreate() {
    if (!newName.trim() || !newVoiceA || !newVoiceB || newVoiceA === newVoiceB) return;
    setCreating(true);
    try {
      const startDate = new Date().toISOString();
      const endDate = new Date(Date.now() + newDays * 86400000).toISOString();
      const res = await fetch(`/api/voice/ab-tests?workspace_id=${workspaceId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          voice_a: newVoiceA,
          voice_b: newVoiceB,
          traffic_split: newSplit / 100,
          start_date: startDate,
          end_date: endDate,
        }),
      });
      if (res.ok) {
        setShowCreate(false);
        setNewName("");
        setNewVoiceA("");
        setNewVoiceB("");
        setNewSplit(50);
        setNewDays(7);
        await fetchTests();
      }
    } catch {
      // silenced
    } finally {
      setCreating(false);
    }
  }

  async function handleAction(testId: string, action: "pause" | "resume" | "complete", winner?: string) {
    try {
      const body: Record<string, unknown> = {};
      if (action === "pause") body.status = "paused";
      if (action === "resume") body.status = "running";
      if (action === "complete") {
        body.status = "completed";
        if (winner) body.winner = winner;
      }
      await fetch(`/api/voice/ab-tests?workspace_id=${workspaceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: testId, ...body }),
      });
      await fetchTests();
    } catch {
      // silenced
    }
  }

  const runningTests = tests.filter((t) => t.status === "running");
  const pastTests = tests.filter((t) => t.status !== "running");

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold tracking-[-0.025em] text-[var(--text-primary)]">{t("title", { defaultValue: "Voice A/B Testing" })}</h1>
          <p className="text-[13px] text-[var(--text-secondary)] mt-1.5 leading-relaxed">
            {t("subtitle", { defaultValue: "Test different voices to find which one converts best for your business." })}
          </p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="px-4 py-2 text-sm font-medium rounded-lg bg-[var(--accent-primary)] text-[var(--text-on-accent)] hover:opacity-90 transition-opacity"
        >
          {showCreate ? t("cancel", { defaultValue: "Cancel" }) : t("newTest", { defaultValue: "New Test" })}
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="mb-6 p-5 rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)]">
          <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-4">{t("createTest", { defaultValue: "Create A/B Test" })}</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">{t("form.testName", { defaultValue: "Test Name" })}</label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Warm vs Professional Voice"
                className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--border-default)] bg-[var(--bg-inset)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">{t("form.voiceA", { defaultValue: "Voice A (Control)" })}</label>
                <select
                  value={newVoiceA}
                  onChange={(e) => setNewVoiceA(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--border-default)] bg-[var(--bg-inset)] text-[var(--text-primary)]"
                >
                  <option value="">Select voice...</option>
                  {RECALL_VOICES.map((v) => (
                    <option key={v.id} value={v.id}>{v.name} — {v.accent}, {v.gender}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">{t("form.voiceB", { defaultValue: "Voice B (Variant)" })}</label>
                <select
                  value={newVoiceB}
                  onChange={(e) => setNewVoiceB(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--border-default)] bg-[var(--bg-inset)] text-[var(--text-primary)]"
                >
                  <option value="">Select voice...</option>
                  {RECALL_VOICES.map((v) => (
                    <option key={v.id} value={v.id}>{v.name} — {v.accent}, {v.gender}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  {t("form.trafficSplit", { defaultValue: "Traffic Split" })} — {newSplit}% {t("form.voiceAShort", { defaultValue: "Voice A" })} / {100 - newSplit}% {t("form.voiceBShort", { defaultValue: "Voice B" })}
                </label>
                <input
                  type="range"
                  min={10}
                  max={90}
                  step={5}
                  value={newSplit}
                  onChange={(e) => setNewSplit(Number(e.target.value))}
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">{t("form.duration", { defaultValue: "Duration (days)" })}</label>
                <select
                  value={newDays}
                  onChange={(e) => setNewDays(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--border-default)] bg-[var(--bg-inset)] text-[var(--text-primary)]"
                >
                  <option value={3}>3 days</option>
                  <option value={7}>7 days</option>
                  <option value={14}>14 days</option>
                  <option value={30}>30 days</option>
                </select>
              </div>
            </div>
            <button
              onClick={handleCreate}
              disabled={creating || !newName.trim() || !newVoiceA || !newVoiceB || newVoiceA === newVoiceB}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-[var(--accent-primary)] text-white hover:opacity-90 transition-opacity disabled:opacity-40"
            >
              {creating ? "Creating..." : "Start Test"}
            </button>
            {newVoiceA && newVoiceB && newVoiceA === newVoiceB && (
              <p className="text-xs text-[var(--accent-danger)]">Voice A and Voice B must be different.</p>
            )}
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="text-center py-12 text-sm text-[var(--text-tertiary)]">Loading tests...</div>
      )}

      {/* Running tests */}
      {!loading && runningTests.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Running Tests</h2>
          <div className="space-y-4">
            {runningTests.map((test) => (
              <div key={test.id} className="p-5 rounded-xl border border-[var(--accent-primary)]/20 bg-[var(--bg-card)]">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-sm font-medium text-[var(--text-primary)]">{test.name}</h3>
                    <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
                      Started {formatDate(test.created_at)}
                      {test.end_date && ` · Ends ${formatDate(test.end_date)}`}
                    </p>
                  </div>
                  <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]">
                    Running
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="p-3 rounded-lg bg-[var(--bg-inset)]">
                    <p className="text-xs text-[var(--text-tertiary)] mb-1">Voice A (Control) — {Math.round((test.traffic_split ?? 0.5) * 100)}%</p>
                    <p className="text-sm font-medium text-[var(--text-primary)]">{getVoiceName(test.voice_a)}</p>
                    {test.calls_a != null && (
                      <p className="text-xs text-[var(--text-tertiary)] mt-1">
                        {test.calls_a} calls
                        {test.conversion_a != null && ` · ${(test.conversion_a * 100).toFixed(1)}% conversion`}
                      </p>
                    )}
                  </div>
                  <div className="p-3 rounded-lg bg-[var(--bg-inset)]">
                    <p className="text-xs text-[var(--text-tertiary)] mb-1">Voice B (Variant) — {100 - Math.round((test.traffic_split ?? 0.5) * 100)}%</p>
                    <p className="text-sm font-medium text-[var(--text-primary)]">{getVoiceName(test.voice_b)}</p>
                    {test.calls_b != null && (
                      <p className="text-xs text-[var(--text-tertiary)] mt-1">
                        {test.calls_b} calls
                        {test.conversion_b != null && ` · ${(test.conversion_b * 100).toFixed(1)}% conversion`}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleAction(test.id, "pause")}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg border border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--bg-inset)] transition-colors"
                  >
                    Pause
                  </button>
                  <button
                    onClick={() => handleAction(test.id, "complete", test.voice_a)}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg border border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--bg-inset)] transition-colors"
                  >
                    Pick Voice A
                  </button>
                  <button
                    onClick={() => handleAction(test.id, "complete", test.voice_b)}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg border border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--bg-inset)] transition-colors"
                  >
                    Pick Voice B
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Past tests */}
      {!loading && pastTests.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-3">
            {runningTests.length > 0 ? "Past Tests" : "Tests"}
          </h2>
          <div className="space-y-3">
            {pastTests.map((test) => (
              <div key={test.id} className="p-4 rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)]">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-[var(--text-primary)]">{test.name}</h3>
                    <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
                      {getVoiceName(test.voice_a)} vs {getVoiceName(test.voice_b)}
                      {test.winner && ` · Winner: ${getVoiceName(test.winner)}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                      test.status === "completed"
                        ? "bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]"
                        : "bg-[var(--accent-warning)]/10 text-[var(--accent-warning)]"
                    }`}>
                      {test.status === "completed" ? "Completed" : "Paused"}
                    </span>
                    {test.status === "paused" && (
                      <button
                        onClick={() => handleAction(test.id, "resume")}
                        className="px-3 py-1 text-xs font-medium rounded-lg border border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--bg-inset)]"
                      >
                        Resume
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && tests.length === 0 && !showCreate && (
        <div className="text-center py-16">
          <div className="w-12 h-12 rounded-full bg-[var(--bg-inset)] flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-[var(--text-tertiary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h3 className="text-sm font-medium text-[var(--text-primary)] mb-1">No A/B tests yet</h3>
          <p className="text-xs text-[var(--text-tertiary)] max-w-sm mx-auto">
            Test different voices to see which one your callers respond to best. Create your first test to get started.
          </p>
        </div>
      )}
    </div>
  );
}
