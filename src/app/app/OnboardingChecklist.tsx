"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const ITEMS: { key: string; label: string; href: string }[] = [
  { key: "business", label: "Business info added", href: "/app/onboarding" },
  { key: "agent", label: "AI agent created", href: "/app/agents" },
  { key: "services", label: "Services configured", href: "/app/onboarding" },
  { key: "phone", label: "Phone number connected", href: "/app/settings/phone" },
  { key: "test_call", label: "First test call", href: "/app/onboarding" },
  { key: "first_call", label: "First real call", href: "/app/activity" },
  { key: "calendar", label: "Calendar connected", href: "/app/settings/integrations" },
  { key: "team", label: "Team member invited", href: "/app/settings/team" },
];

function getProgress(): { completed: number; done: Set<string> } {
  if (typeof window === "undefined") return { completed: 0, done: new Set() };
  try {
    const raw = localStorage.getItem("rt_onboarding_checklist");
    const done = raw ? new Set(JSON.parse(raw) as string[]) : new Set(["business", "agent", "services", "test_call"]);
    return { completed: done.size, done };
  } catch {
    return { completed: 4, done: new Set(["business", "agent", "services", "test_call"]) };
  }
}

export function OnboardingChecklist() {
  const [progress, setProgress] = useState({ completed: 0, done: new Set<string>() });

  useEffect(() => {
    const id = setTimeout(() => setProgress(getProgress()), 0);
    return () => clearTimeout(id);
  }, []);

  const total = ITEMS.length;
  const pct = total ? Math.round((progress.completed / total) * 100) : 0;

  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-800/30 p-2">
      <p className="text-[10px] font-medium text-zinc-400 mb-1.5">
        {progress.completed}/{total} complete
      </p>
      <div className="h-1 rounded-full bg-zinc-700 overflow-hidden mb-2">
        <div
          className="h-full rounded-full bg-green-500/80 transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
      <ul className="space-y-1">
        {ITEMS.slice(0, 4).map((item) => (
          <li key={item.key} className="flex items-center gap-1.5 text-[10px]">
            <span className={progress.done.has(item.key) ? "text-green-500" : "text-zinc-500"}>
              {progress.done.has(item.key) ? "✅" : "○"}
            </span>
            <Link href={item.href} className="text-zinc-400 hover:text-white truncate">
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
      {progress.completed < total && (
        <p className="text-[9px] text-zinc-500 mt-1">Finish setup for the best experience</p>
      )}
    </div>
  );
}
