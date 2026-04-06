"use client";

import { useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { RecoveryProfile } from "@/lib/recovery-profile";

interface ProfileOption {
  id: RecoveryProfile;
  name: string;
  description: string;
  industries: string;
  followUpDelay: string;
  maxAttempts: number;
  escalation: string;
}

const PROFILES: ProfileOption[] = [
  {
    id: "conservative",
    name: "Conservative",
    description: "Gentle follow-up. Wait longer between touches.",
    industries: "Professional services, healthcare",
    followUpDelay: "18h after stalled",
    maxAttempts: 2,
    escalation: "Slow escalation",
  },
  {
    id: "standard",
    name: "Standard",
    description: "Balanced persistence. Consistent without aggression.",
    industries: "Most businesses",
    followUpDelay: "12h after stalled",
    maxAttempts: 3,
    escalation: "Moderate escalation",
  },
  {
    id: "assertive",
    name: "Assertive",
    description: "Persistent outreach. Frequent follow-ups.",
    industries: "High-volume sales",
    followUpDelay: "6h after stalled",
    maxAttempts: 4,
    escalation: "Fast escalation",
  },
];

export function RecoveryProfileSelector() {
  const [current, setCurrent] = useState<RecoveryProfile>("standard");
  const [saving, setSaving] = useState(false);

  const handleSelect = async (profile: RecoveryProfile) => {
    if (saving || profile === current) return;
    setSaving(true);
    try {
      const res = await fetch("/api/workspace/settings", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recovery_profile: profile }),
      });
      if (!res.ok) throw new Error("Failed to update profile");
      setCurrent(profile);
      toast.success("Recovery profile updated");
    } catch {
      toast.error("Failed to update recovery profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">Recovery Profile</h3>
        <p className="text-xs text-[var(--text-tertiary)] mt-1">
          Choose how aggressively your agent follows up on missed calls and lost leads.
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {PROFILES.map((profile) => (
          <button
            key={profile.id}
            onClick={() => void handleSelect(profile.id)}
            disabled={saving}
            className={`rounded-2xl border-2 p-4 text-left transition-all duration-200 ${
              current === profile.id
                ? "border-emerald-500/60 bg-emerald-500/10 shadow-lg shadow-emerald-500/20"
                : "border-[var(--border-default)] bg-[var(--bg-surface)] hover:border-[var(--border-medium)]"
            } ${saving ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <h4 className="text-sm font-semibold text-[var(--text-primary)]">{profile.name}</h4>
                <p className="text-xs text-[var(--text-secondary)] mt-1">{profile.description}</p>
              </div>
              {current === profile.id && (
                <div className="flex-shrink-0 h-5 w-5 rounded-full bg-emerald-500 flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" />
                </div>
              )}
            </div>
            <div className="space-y-2 text-xs text-[var(--text-tertiary)]">
              <div className="flex items-center justify-between">
                <span>Best for:</span>
                <span className="text-[var(--text-secondary)]">{profile.industries}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Follow-up:</span>
                <span className="text-[var(--text-secondary)]">{profile.followUpDelay}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Max attempts:</span>
                <span className="text-[var(--text-secondary)]">{profile.maxAttempts}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Escalation:</span>
                <span className="text-[var(--text-secondary)]">{profile.escalation}</span>
              </div>
            </div>
            {saving && current === profile.id && (
              <div className="mt-3 flex items-center justify-center">
                <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
