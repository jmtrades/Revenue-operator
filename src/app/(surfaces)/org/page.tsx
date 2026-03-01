"use client";

import { useEffect, useState } from "react";
import { useWorkspace } from "@/components/WorkspaceContext";

interface OrgSections {
  current_operation: string[];
  recent_prevented_issues: string[];
  ongoing_dependencies: string[];
  if_disabled: string[];
}

export default function OrgPage() {
  const { workspaceId } = useWorkspace();
  const [identity, setIdentity] = useState<string | null>(null);
  const [sections, setSections] = useState<OrgSections | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!workspaceId) {
      setSections(null);
      setIdentity(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    Promise.all([
      fetch(`/api/system/identity?workspace_id=${encodeURIComponent(workspaceId)}`, {
        credentials: "include",
      }),
      fetch(`/api/org/sections?workspace_id=${encodeURIComponent(workspaceId)}`, {
        credentials: "include",
      }),
    ])
      .then(async ([resId, resSec]) => {
        if (!resSec.ok) throw new Error("Sections failed");
        const [dataId, dataSec] = await Promise.all([resId.json(), resSec.json()]);
        setIdentity((dataId as { label?: string })?.label ?? null);
        setSections(dataSec as OrgSections);
      })
      .catch((e) => setError(e?.message ?? "Failed to load"))
      .finally(() => setLoading(false));
  }, [workspaceId]);

  if (!workspaceId) {
    return (
      <p className="text-[18px] text-[#78716c]">Select a workspace to view the org surface.</p>
    );
  }

  if (loading) {
    return <p className="text-[18px]" style={{ color: "var(--text-tertiary)" }}>One moment…</p>;
  }

  if (error) {
    return <p className="text-[18px] text-[#78716c]">{error}</p>;
  }

  return (
    <article className="space-y-12">
      {identity && (
        <p className="text-[21px] font-normal leading-snug text-[#1c1917]">{identity}</p>
      )}

      <section>
        <h2 className="text-[13px] font-medium uppercase tracking-wide text-[#78716c] mb-4">
          Current operation
        </h2>
        <ul className="space-y-2">
          {sections?.current_operation?.length
            ? sections.current_operation.map((s, i) => (
                <li key={i} className="text-[18px] leading-relaxed text-[#1c1917]">
                  {s}
                </li>
              ))
            : [
                <li key={0} className="text-[18px] leading-relaxed text-[#1c1917]">
                  No active operation summary.
                </li>,
              ]}
        </ul>
      </section>

      <section className="border-t border-[#e7e5e4] pt-8">
        <h2 className="text-[13px] font-medium uppercase tracking-wide text-[#78716c] mb-4">
          Recent prevented issues
        </h2>
        <ul className="space-y-2">
          {sections?.recent_prevented_issues?.length ? (
            sections.recent_prevented_issues.map((s, i) => (
              <li key={i} className="text-[18px] leading-relaxed text-[#44403c]">
                {s}
              </li>
            ))
          ) : (
            <li className="text-[18px] leading-relaxed text-[#78716c]">None recorded.</li>
          )}
        </ul>
      </section>

      <section className="border-t border-[#e7e5e4] pt-8">
        <h2 className="text-[13px] font-medium uppercase tracking-wide text-[#78716c] mb-4">
          Ongoing dependencies
        </h2>
        <ul className="space-y-2">
          {sections?.ongoing_dependencies?.length ? (
            sections.ongoing_dependencies.map((s, i) => (
              <li key={i} className="text-[18px] leading-relaxed text-[#44403c]">
                {s}
              </li>
            ))
          ) : (
            <li className="text-[18px] leading-relaxed text-[#78716c]">None.</li>
          )}
        </ul>
      </section>

      <section className="border-t border-[#e7e5e4] pt-8">
        <h2 className="text-[13px] font-medium uppercase tracking-wide text-[#78716c] mb-4">
          If disabled
        </h2>
        <ul className="space-y-2">
          {sections?.if_disabled?.length ? (
            sections.if_disabled.map((s, i) => (
              <li key={i} className="text-[18px] leading-relaxed text-[#44403c]">
                {s}
              </li>
            ))
          ) : (
            <li className="text-[18px] leading-relaxed text-[#78716c]">Nothing listed.</li>
          )}
        </ul>
      </section>
    </article>
  );
}
