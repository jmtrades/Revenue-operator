"use client";

import { useEffect, useState } from "react";
import { useWorkspace } from "@/components/WorkspaceContext";
import { Shell } from "@/components/Shell";

interface TemplateRow {
  id: string;
  template_id: string;
  channel: string;
  intent_type: string;
  body: string;
  max_chars: number;
}

export default function TemplatesPage() {
  const { workspaceId } = useWorkspace();
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!workspaceId) {
      setTemplates([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    fetch(`/api/enterprise/message-templates?workspace_id=${encodeURIComponent(workspaceId)}`)
      .then((r) => r.json())
      .then((d) => (d.ok && Array.isArray(d.templates) ? setTemplates(d.templates) : []))
      .catch(() => setTemplates([]))
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
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>One moment…</p>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="space-y-6">
        <h1 className="text-lg font-medium" style={{ color: "var(--text-primary)" }}>Templates</h1>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          Workspace message templates. Use slots like {`{{name}}`}. Body length caps per channel. No forbidden language.
        </p>
        {templates.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>No templates for this workspace.</p>
        ) : (
          <ul className="space-y-4">
            {templates.map((t) => (
              <li key={t.id} className="border-b pb-4" style={{ borderColor: "var(--border)" }}>
                <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{t.template_id} · {t.channel} · {t.intent_type}</p>
                <p className="text-sm mt-1 break-words" style={{ color: "var(--text-secondary)" }}>{t.body}</p>
                <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Max {t.max_chars} chars</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Shell>
  );
}
