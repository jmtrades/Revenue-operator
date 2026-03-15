"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useWorkspace } from "@/components/WorkspaceContext";

interface LifeSections {
  what_is_being_tracked: string[];
  what_was_handled: string[];
  what_required_no_action: string[];
}

export default function LifePage() {
  const t = useTranslations("life");
  const { workspaceId } = useWorkspace();
  const [identity, setIdentity] = useState<string | null>(null);
  const [sections, setSections] = useState<LifeSections | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refLabel, setRefLabel] = useState("");
  const [refCategory, setRefCategory] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<"ok" | "err" | null>(null);

  const load = useCallback(() => {
    if (!workspaceId) return;
    setLoading(true);
    Promise.all([
      fetch(`/api/system/identity?workspace_id=${encodeURIComponent(workspaceId)}`, {
        credentials: "include",
      }),
      fetch(`/api/life/sections?workspace_id=${encodeURIComponent(workspaceId)}`, {
        credentials: "include",
      }),
    ])
      .then(async ([resId, resSec]) => {
        if (!resSec.ok) throw new Error("Sections failed");
        const [dataId, dataSec] = await Promise.all([resId.json(), resSec.json()]);
        setIdentity((dataId as { label?: string })?.label ?? null);
        setSections(dataSec as LifeSections);
      })
      .catch((e) => setError(e?.message ?? "Failed to load"))
      .finally(() => setLoading(false));
  }, [workspaceId]);

  useEffect(() => {
    if (!workspaceId) {
      const id = setTimeout(() => {
        setSections(null);
        setIdentity(null);
        setLoading(false);
      }, 0);
      return () => clearTimeout(id);
    }
    const tid = setTimeout(() => {
      setError(null);
      load();
    }, 0);
    return () => clearTimeout(tid);
  }, [workspaceId, load]);

  const addReference = useCallback(() => {
    if (!workspaceId || !refLabel.trim() || submitting) return;
    setSubmitting(true);
    setSubmitResult(null);
    fetch("/api/life/reference", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workspace_id: workspaceId,
        label: refLabel.trim(),
        ...(refCategory.trim() && { category: refCategory.trim() }),
      }),
    })
      .then((res) => {
        if (res.ok) {
          setSubmitResult("ok");
          setRefLabel("");
          setRefCategory("");
          load();
        } else setSubmitResult("err");
      })
      .catch(() => setSubmitResult("err"))
      .finally(() => setSubmitting(false));
  }, [workspaceId, refLabel, refCategory, submitting, load]);

  if (!workspaceId) {
    return (
      <p className="text-[18px] text-[#78716c]">Select a workspace to view the life surface.</p>
    );
  }

  if (loading && !sections) {
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
          {t("whatIsBeingTracked")}
        </h2>
        <ul className="space-y-2">
          {sections?.what_is_being_tracked?.map((s, i) => (
            <li key={i} className="text-[18px] leading-relaxed text-[#1c1917]">
              {s}
            </li>
          )) ?? <li className="text-[18px] text-[#78716c]">—</li>}
        </ul>
        <div className="mt-6 flex flex-col gap-2 max-w-md">
          <input
            type="text"
            placeholder={t("refLabelPlaceholder")}
            value={refLabel}
            onChange={(e) => setRefLabel(e.target.value)}
            className="rounded border border-[#e7e5e4] px-3 py-2 text-[16px] text-[#1c1917] placeholder-[#a8a29e]"
          />
          <input
            type="text"
            placeholder={t("refCategoryPlaceholder")}
            value={refCategory}
            onChange={(e) => setRefCategory(e.target.value)}
            className="rounded border border-[#e7e5e4] px-3 py-2 text-[16px] text-[#1c1917] placeholder-[#a8a29e]"
          />
          <button
            type="button"
            onClick={addReference}
            disabled={!refLabel.trim() || submitting}
            className="text-[15px] rounded border border-[#d6d3d1] py-2 px-3 text-[#44403c] hover:bg-[#f5f5f4] disabled:opacity-50"
          >
            {submitting ? t("adding") : t("addReference")}
          </button>
        </div>
        {submitResult === "ok" && (
          <p className="mt-2 text-[15px] text-[#78716c]">{t("referenceAdded")}</p>
        )}
        {submitResult === "err" && (
          <p className="mt-2 text-[15px] text-[#78716c]">{t("failedToAdd")}</p>
        )}
      </section>

      <section className="border-t border-[#e7e5e4] pt-8">
        <h2 className="text-[13px] font-medium uppercase tracking-wide text-[#78716c] mb-4">
          {t("whatWasHandled")}
        </h2>
        <ul className="space-y-2">
          {sections?.what_was_handled?.length ? (
            sections.what_was_handled.map((s, i) => (
              <li key={i} className="text-[18px] leading-relaxed text-[#44403c]">
                {s}
              </li>
            ))
          ) : (
            <li className="text-[18px] leading-relaxed text-[#78716c]">{t("nothingRecordedYet")}</li>
          )}
        </ul>
      </section>

      <section className="border-t border-[#e7e5e4] pt-8">
        <h2 className="text-[13px] font-medium uppercase tracking-wide text-[#78716c] mb-4">
          {t("whatRequiredNoAction")}
        </h2>
        <ul className="space-y-2">
          {sections?.what_required_no_action?.map((s, i) => (
            <li key={i} className="text-[18px] leading-relaxed text-[#44403c]">
              {s}
            </li>
          )) ?? <li className="text-[18px] text-[#78716c]">—</li>}
        </ul>
      </section>
    </article>
  );
}
