"use client";

import { useState } from "react";

export default function SettingsPage() {
  const [workspaceId, setWorkspaceId] = useState("");
  const [riskLevel, setRiskLevel] = useState<"safe" | "balanced" | "aggressive">("balanced");
  const [saved, setSaved] = useState(false);

  const save = async () => {
    if (!workspaceId) return;
    const res = await fetch(`/api/workspaces/${workspaceId}/settings`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ risk_level: riskLevel }),
    });
    setSaved(res.ok);
  };

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 p-8 max-w-xl mx-auto">
      <h1 className="text-2xl font-semibold mb-6">Settings</h1>
      <div className="space-y-4">
        <div>
          <label className="block text-sm text-stone-400 mb-1">Workspace ID</label>
          <input
            type="text"
            value={workspaceId}
            onChange={(e) => setWorkspaceId(e.target.value)}
            className="w-full px-3 py-2 rounded bg-stone-900 border border-stone-700"
          />
        </div>
        <div>
          <label className="block text-sm text-stone-400 mb-1">Risk Level</label>
          <select
            value={riskLevel}
            onChange={(e) => setRiskLevel(e.target.value as typeof riskLevel)}
            className="w-full px-3 py-2 rounded bg-stone-900 border border-stone-700"
          >
            <option value="safe">Safe – conservative fallbacks</option>
            <option value="balanced">Balanced</option>
            <option value="aggressive">Aggressive</option>
          </select>
        </div>
        <button
          onClick={save}
          className="px-4 py-2 rounded bg-amber-600 hover:bg-amber-500 text-stone-950 font-medium"
        >
          Save
        </button>
        {saved && <p className="text-green-400 text-sm">Saved</p>}
      </div>
    </div>
  );
}
