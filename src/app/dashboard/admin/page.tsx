"use client";

import { useEffect, useState } from "react";

interface DLQJob {
  id: string;
  job_type: string;
  payload: unknown;
  error: string | null;
  created_at: string;
}

export default function AdminDLQPage() {
  const [jobs, setJobs] = useState<DLQJob[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchJobs = async () => {
    const res = await fetch("/api/admin/dlq");
    const data = await res.json();
    setJobs(data.jobs ?? []);
    setLoading(false);
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const redrive = async (jobId: string) => {
    await fetch("/api/admin/dlq", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ job_id: jobId }),
    });
    fetchJobs();
  };

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 p-8">
      <h1 className="text-2xl font-semibold mb-6">Dead Letter Queue</h1>
      {loading ? (
        <p className="text-stone-400">Loading…</p>
      ) : (
        <div className="space-y-4">
          {jobs.length === 0 && <p className="text-stone-500">No failed jobs</p>}
          {jobs.map((j) => (
            <div key={j.id} className="p-4 rounded-lg bg-stone-900 border border-stone-800">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-mono text-sm">{j.job_type}</p>
                  <p className="text-xs text-stone-500">{j.id}</p>
                  {j.error && <p className="text-red-400 text-sm mt-1">{j.error}</p>}
                </div>
                <button
                  onClick={() => redrive(j.id)}
                  className="px-3 py-1 rounded bg-amber-600 hover:bg-amber-500 text-sm font-medium text-stone-950"
                >
                  Re-drive
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
