"use client";

import { useEffect, useState } from "react";
import { useWorkspace } from "@/components/WorkspaceContext";

interface SoloSections {
  client_state: string[];
  awaiting_actions: string[];
  what_progressed: string[];
  what_would_stall: string[];
}

export default function SoloPage() {
  const { workspaceId } = useWorkspace();
  const [identity, setIdentity] = useState<string | null>(null);
  const [sections, setSections] = useState<SoloSections | null>(null);
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
      fetch(`/api/solo/sections?workspace_id=${encodeURIComponent(workspaceId)}`, {
        credentials: "include",
      }),
    ])
      .then(async ([resId, resSec]) => {
        if (!resSec.ok) throw new Error("Sections failed");
        const [dataId, dataSec] = await Promise.all([resId.json(), resSec.json()]);
        setIdentity((dataId as { label?: string })?.label ?? null);
        setSections(dataSec as SoloSections);
      })
      .catch((e) => setError(e?.message ?? "Failed to load"))
      .finally(() => setLoading(false));
  }, [workspaceId]);

  if (!workspaceId) {
    return (
      <p className="text-[18px] text-[#78716c]">Select a workspace to view the solo surface.</p>
    );
  }

  if (loading) {
    return <p className="text-[18px] text-[#78716c]">Preparing…</p>;
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
          Client state
        </h2>
        <ul className="space-y-2">
          {sections?.client_state?.length ? (
            sections.client_state.map((s, i) => (
              <li key={i} className="text-[18px] leading-relaxed text-[#1c1917]">
                {s}
              </li>
            ))
          ) : (
            <li className="text-[18px] leading-relaxed text-[#78716c]">—</li>
          )}
        </ul>
      </section>

      <section className="border-t border-[#e7e5e4] pt-8">
        <h2 className="text-[13px] font-medium uppercase tracking-wide text-[#78716c] mb-4">
          Awaiting actions
        </h2>
        <ul className="space-y-2">
          {sections?.awaiting_actions?.map((s, i) => (
            <li key={i} className="text-[18px] leading-relaxed text-[#44403c]">
              {s}
            </li>
          )) ?? <li className="text-[18px] leading-relaxed text-[#78716c]">—</li>}
        </ul>
      </section>

      <section className="border-t border-[#e7e5e4] pt-8">
        <h2 className="text-[13px] font-medium uppercase tracking-wide text-[#78716c] mb-4">
          What progressed
        </h2>
        <ul className="space-y-2">
          {sections?.what_progressed?.length ? (
            sections.what_progressed.map((s, i) => (
              <li key={i} className="text-[18px] leading-relaxed text-[#44403c]">
                {s}
              </li>
            ))
          ) : (
            <li className="text-[18px] leading-relaxed text-[#78716c]">—</li>
          )}
        </ul>
      </section>

      <section className="border-t border-[#e7e5e4] pt-8">
        <h2 className="text-[13px] font-medium uppercase tracking-wide text-[#78716c] mb-4">
          What would stall
        </h2>
        <ul className="space-y-2">
          {sections?.what_would_stall?.length ? (
            sections.what_would_stall.map((s, i) => (
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
