"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useWorkspace } from "@/components/WorkspaceContext";
import { Shell } from "@/components/Shell";

interface PolicyRow {
  id: string;
  domain_type: string;
  jurisdiction: string;
  channel: string;
  intent_type: string;
  approval_mode: string;
  template_id: string | null;
}

export default function PoliciesPage() {
  const { workspaceId } = useWorkspace();
  const [policies, setPolicies] = useState<PolicyRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!workspaceId) {
      setPolicies([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    fetch(`/api/enterprise/policies?workspace_id=${encodeURIComponent(workspaceId)}`)
      .then((r) => r.json())
      .then((d) => (d.ok && Array.isArray(d.policies) ? setPolicies(d.policies) : []))
      .finally(() => setLoading(false));
  }, [workspaceId]);

  if (!workspaceId) {
    return (
      <Shell>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>Select a workspace.</p>
      </Shell>
    );
  }

  if (loading) {
    return (
      <Shell>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>Preparing…</p>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="space-y-6">
        <h1 className="text-lg font-medium" style={{ color: "var(--text-primary)" }}>Policies</h1>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          Message policies by domain, jurisdiction, channel, and intent. Edit to set template, approval mode, disclaimers, and phrases.
        </p>
        {policies.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>No policies for this workspace.</p>
        ) : (
          <ul className="space-y-2">
            {policies.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/dashboard/policies/${p.id}?workspace_id=${encodeURIComponent(workspaceId)}`}
                  className="block py-2 text-sm border-b"
                  style={{ borderColor: "var(--border)", color: "var(--text-primary)" }}
                >
                  {p.domain_type} · {p.jurisdiction} · {p.channel} · {p.intent_type} · {p.approval_mode}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Shell>
  );
}
