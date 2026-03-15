"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  Search,
  Plus,
  AlertTriangle,
  BookOpen,
  FileText,
  Globe,
  HelpCircle,
  Type,
  X,
  Upload,
  ExternalLink,
} from "lucide-react";
type KnowledgeType = "FAQ" | "Document" | "Website" | "Custom";
type KnowledgeStatus = "Active" | "Draft" | "Processing";

interface KnowledgeEntry {
  id: string;
  title: string;
  type: KnowledgeType;
  content: string;
  wordCount: number;
  lastUpdated: string;
  status: KnowledgeStatus;
  usageCount: number;
  gapFlag: boolean;
  question?: string;
  url?: string;
  fileName?: string;
}

interface KnowledgeGap {
  id: string;
  topic: string;
  askCount: number;
}

function getTypeOptions(): { value: KnowledgeType }[] {
  return [
    { value: "FAQ" },
    { value: "Document" },
    { value: "Website" },
    { value: "Custom" },
  ];
}

function getStatusOptions(): { value: KnowledgeStatus }[] {
  return [
    { value: "Active" },
    { value: "Draft" },
    { value: "Processing" },
  ];
}

function typeIcon(type: KnowledgeType) {
  switch (type) {
    case "FAQ":
      return HelpCircle;
    case "Document":
      return FileText;
    case "Website":
      return Globe;
    default:
      return Type;
  }
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function KnowledgeModal({
  entry,
  onSave,
  onClose,
}: {
  entry: KnowledgeEntry | null;
  onSave: (data: Partial<KnowledgeEntry> & { title: string; type: KnowledgeType; status: KnowledgeStatus }) => void;
  onClose: () => void;
}) {
  const t = useTranslations("knowledge");
  const tCommon = useTranslations("common");
  const tForms = useTranslations("forms.state");
  const isNew = !entry?.id;
  const [title, setTitle] = useState(entry?.title ?? "");
  const [type, setType] = useState<KnowledgeType>(entry?.type ?? "FAQ");
  const [status, setStatus] = useState<KnowledgeStatus>(entry?.status ?? "Draft");
  const [question, setQuestion] = useState(entry?.question ?? "");
  const [content, setContent] = useState(entry?.content ?? "");
  const [url, setUrl] = useState(entry?.url ?? "");
  const [fileName, setFileName] = useState(entry?.fileName ?? "");
  const [uploadState, setUploadState] = useState<"idle" | "uploading" | "done">("idle");
  const [websiteFetchState, setWebsiteFetchState] = useState<"idle" | "fetching" | "done">("idle");
  const [websitePages, setWebsitePages] = useState(entry?.type === "Website" ? 12 : 0);

  const handleSave = () => {
    const wordCount = content.trim().split(/\s+/).filter(Boolean).length;
    onSave({
      id: entry?.id,
      title: title.trim() || t("defaultTitle"),
      type,
      status,
      content: content.trim(),
      wordCount,
      lastUpdated: new Date().toISOString(),
      question: type === "FAQ" ? question.trim() : undefined,
      url: type === "Website" ? url.trim() : undefined,
      fileName: type === "Document" ? fileName || "document.pdf" : undefined,
      usageCount: entry?.usageCount ?? 0,
      gapFlag: entry?.gapFlag ?? false,
    });
    onClose();
  };

  const handleMockUpload = () => {
    setUploadState("uploading");
    setTimeout(() => {
      setUploadState("done");
      setFileName("uploaded-document.pdf");
    }, 1200);
  };

  const handleMockFetch = () => {
    setWebsiteFetchState("fetching");
    setTimeout(() => {
      setWebsiteFetchState("done");
      setWebsitePages(12);
    }, 1500);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4 bg-black/70"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="bg-[var(--bg-card)] border border-[var(--border-default)] w-full max-w-2xl h-[90vh] md:h-auto md:max-h-[85vh] overflow-hidden flex flex-col md:rounded-2xl rounded-t-2xl border-0 border-t border-[var(--border-default)] md:border"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-[var(--border-default)]">
          <h2 className="text-lg font-semibold text-white">
            {isNew ? t("modal.addEntry") : t("modal.editEntry")}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-[var(--bg-input)]"
            aria-label={t("closeModal")}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">{tCommon("title")}</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("modal.titlePlaceholder")}
              className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-medium)] text-white placeholder:text-zinc-500 focus:border-[var(--border-medium)] focus:outline-none text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">{t("modal.type")}</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as KnowledgeType)}
              className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-medium)] text-white focus:border-[var(--border-medium)] focus:outline-none text-sm"
            >
              {getTypeOptions().map((o) => (
                <option key={o.value} value={o.value}>{t(`types.${o.value}`)}</option>
              ))}
            </select>
          </div>

          {type === "FAQ" && (
            <>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">{t("modal.question")}</label>
                <input
                  type="text"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder={t("modal.questionPlaceholder")}
                  className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-medium)] text-white placeholder:text-zinc-500 focus:border-[var(--border-medium)] focus:outline-none text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">{t("modal.answer")}</label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={4}
                  placeholder={t("answerPlaceholder")}
                  className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-medium)] text-white placeholder:text-zinc-500 focus:border-[var(--border-medium)] focus:outline-none text-sm resize-none"
                />
              </div>
            </>
          )}

          {type === "Document" && (
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">{t("modal.uploadFile")}</label>
              <div
                className="border-2 border-dashed border-[var(--border-medium)] rounded-xl p-8 text-center hover:border-[var(--border-medium)] transition-colors"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  handleMockUpload();
                }}
              >
                {uploadState === "idle" && (
                  <>
                    <Upload className="w-10 h-10 text-zinc-500 mx-auto mb-2" />
                    <p className="text-sm text-zinc-400 mb-2">{t("modal.uploadHint")}</p>
                    <button
                      type="button"
                      onClick={handleMockUpload}
                      className="text-sm font-medium text-white bg-zinc-700 hover:bg-zinc-600 px-4 py-2 rounded-lg"
                    >
                      {t("modal.chooseFile")}
                    </button>
                  </>
                )}
                {uploadState === "uploading" && (
                  <p className="text-sm text-zinc-400">{tForms("uploading")}</p>
                )}
                {uploadState === "done" && (
                  <p className="text-sm text-emerald-400">{t("modal.indexedFile", { fileName })}</p>
                )}
              </div>
            </div>
          )}

        {type === "Website" && (
            <>
              <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">{tCommon("url")}</label>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder={t("urlPlaceholder")}
                  className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-medium)] text-white placeholder:text-zinc-500 focus:border-[var(--border-medium)] focus:outline-none text-sm"
                />
              </div>
              <div>
                <button
                  type="button"
                  onClick={handleMockFetch}
                  disabled={websiteFetchState === "fetching"}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border-medium)] text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
                >
                  <ExternalLink className="w-4 h-4" />
                  {websiteFetchState === "idle" && t("modal.fetch")}
                  {websiteFetchState === "fetching" && t("modal.indexing")}
                  {websiteFetchState === "done" && t("modal.indexedPages", { count: websitePages })}
                </button>
              </div>
            </>
          )}

          {type === "Custom" && (
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">{t("modal.content")}</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={8}
                placeholder={t("modal.contentPlaceholder")}
                className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-medium)] text-white placeholder:text-zinc-500 focus:border-[var(--border-medium)] focus:outline-none text-sm resize-none"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">{t("modal.status")}</label>
            <div className="flex gap-2">
              {(getStatusOptions().filter((o) => o.value !== "Processing") as { value: "Active" | "Draft" }[]).map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setStatus(s.value)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
                    status === s.value
                      ? "bg-white text-black border-white"
                      : "bg-[var(--bg-input)] border-[var(--border-medium)] text-zinc-300 hover:border-[var(--border-medium)]"
                  }`}
                >
                  {t(`status.${s.value.toLowerCase()}`)}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 p-4 border-t border-[var(--border-default)]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-sm font-medium text-zinc-300 border border-[var(--border-medium)] hover:bg-[var(--bg-input)]"
          >
            {tCommon("cancel")}
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2.5 rounded-xl text-sm font-semibold bg-white text-black hover:bg-zinc-200"
          >
            {tCommon("save")}
          </button>
        </div>
      </div>
    </div>
  );
}

const ADD_FROM_CALL_KEY = "rt_add_to_knowledge";

export default function KnowledgePage() {
  const t = useTranslations("knowledge");
  const tToast = useTranslations("toast");
  const tCommon = useTranslations("common");
  const tForms = useTranslations("forms.state");
  useEffect(() => {
    document.title = t("pageTitle");
    return () => { document.title = ""; };
  }, [t]);

  const [entries, setEntries] = useState<KnowledgeEntry[]>([]);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(ADD_FROM_CALL_KEY);
      if (!raw) return;
      const data = JSON.parse(raw) as { summary?: string; callId?: string };
      sessionStorage.removeItem(ADD_FROM_CALL_KEY);
      const summary = (data.summary ?? "").trim();
      if (!summary) return;
      const title = summary.slice(0, 60) + (summary.length > 60 ? "…" : "");
      setEntries((prev) => [
        ...prev,
        {
          id: `kb-call-${Date.now()}`,
          title: title || t("fromCall"),
          type: "FAQ",
          status: "Draft",
          content: summary,
          wordCount: summary.split(/\s+/).filter(Boolean).length,
          lastUpdated: new Date().toISOString(),
          usageCount: 0,
          gapFlag: false,
          question: title,
          url: undefined,
          fileName: data.callId ? `Call ${data.callId.slice(0, 8)}` : undefined,
        },
      ]);
      toast.success(t("toast.callSummaryDraftAdded"));
    } catch {
      // ignore
    }
  }, [t]);
  const [knowledgeGaps] = useState<KnowledgeGap[]>([]);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<KnowledgeType | "all">("all");
  const [statusFilter, setStatusFilter] = useState<KnowledgeStatus | "all">("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<KnowledgeEntry | null>(null);
  const [createFromGapTopic, setCreateFromGapTopic] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [importUrl, setImportUrl] = useState("");
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importedEntries, setImportedEntries] = useState<
    Array<{ question: string; answer: string }>
  >([]);
  const [testQuestion, setTestQuestion] = useState("");
  const [testAnswer, setTestAnswer] = useState("");
  const [testingKnowledge, setTestingKnowledge] = useState(false);

  const handleTestKnowledge = async () => {
    const question = testQuestion.trim();
    if (!question || testingKnowledge) return;
    setTestingKnowledge(true);
    setTestAnswer("");
    try {
      const res = await fetch("/api/agent/test-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          messages: [
            {
              role: "user",
              text: question,
            },
          ],
        }),
      });
      const data = (await res.json().catch(() => null)) as
        | { response?: string; error?: string }
        | null;
      if (!res.ok || !data) {
        toast.error(data?.error ?? t("errors.testFailed"));
        return;
      }
      if (data.error) {
        toast.error(data.error);
        return;
      }
      setTestAnswer((data.response ?? "").trim() || t("errors.noResponse"));
    } catch {
      toast.error(tToast("error.generic"));
    } finally {
      setTestingKnowledge(false);
    }
  };

  const filtered = useMemo(() => {
    let list = entries;
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          e.content.toLowerCase().includes(q) ||
          (e.question?.toLowerCase().includes(q))
      );
    }
    if (typeFilter !== "all") list = list.filter((e) => e.type === typeFilter);
    if (statusFilter !== "all") list = list.filter((e) => e.status === statusFilter);
    return list;
  }, [entries, search, typeFilter, statusFilter]);

  const mostReferenced = useMemo(() => {
    return [...entries]
      .sort((a, b) => b.usageCount - a.usageCount)
      .filter((e) => e.usageCount > 0)
      .slice(0, 5);
  }, [entries]);

  const maxUsage = Math.max(...mostReferenced.map((e) => e.usageCount), 1);

  const handleSave = (data: Partial<KnowledgeEntry> & { title: string; type: KnowledgeType; status: KnowledgeStatus }) => {
    if (data.id) {
      setEntries((prev) =>
        prev.map((e) =>
          e.id === data.id
            ? {
                ...e,
                title: data.title,
                type: data.type,
                status: data.status,
                content: data.content ?? e.content,
                wordCount: data.wordCount ?? e.wordCount,
                lastUpdated: data.lastUpdated ?? e.lastUpdated,
                question: data.question,
                url: data.url,
                fileName: data.fileName,
              }
            : e
        )
      );
    } else {
      setEntries((prev) => [
        ...prev,
        {
          id: `kb-${Date.now()}`,
          title: data.title,
          type: data.type,
          status: data.status,
          content: data.content ?? "",
          wordCount: data.wordCount ?? 0,
          lastUpdated: data.lastUpdated ?? new Date().toISOString(),
          usageCount: 0,
          gapFlag: false,
          question: data.question,
          url: data.url,
          fileName: data.fileName,
        },
      ]);
    }
    setEditingEntry(null);
    setCreateFromGapTopic(null);
  };

  const openAddModal = (topic?: string) => {
    setCreateFromGapTopic(topic ?? null);
    setEditingEntry(
      topic
        ? {
            id: "",
            title: topic,
            type: "Custom",
            content: "",
            wordCount: 0,
            lastUpdated: "",
            status: "Draft",
            usageCount: 0,
            gapFlag: false,
          }
        : null
    );
    setModalOpen(true);
  };

  const openEditModal = (entry: KnowledgeEntry) => {
    setCreateFromGapTopic(null);
    setEditingEntry(entry);
    setModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="p-4 md:p-6 lg:p-8">
        {/* Top bar */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
          <div>
            <h1 className="text-xl md:text-2xl font-semibold text-white">{t("heading")}</h1>
            <p className="text-sm text-zinc-500 mt-0.5">
              {entries.length} {entries.length === 1 ? tCommon("item") : tCommon("items")}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            <div className="relative flex-1 sm:min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("searchPlaceholder")}
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border-default)] text-white placeholder:text-zinc-500 focus:border-[var(--border-medium)] focus:outline-none text-sm"
              />
            </div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as KnowledgeType | "all")}
              className="px-3 py-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border-default)] text-zinc-300 text-sm focus:border-[var(--border-medium)] focus:outline-none"
            >
              <option value="all">{t("allTypes")}</option>
              {getTypeOptions().map((o) => (
                <option key={o.value} value={o.value}>{t(`types.${o.value}`)}</option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as KnowledgeStatus | "all")}
              className="px-3 py-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border-default)] text-zinc-300 text-sm focus:border-[var(--border-medium)] focus:outline-none"
            >
              <option value="all">{t("allStatuses")}</option>
              {getStatusOptions().map((o) => (
                <option key={o.value} value={o.value}>{t(`status.${o.value.toLowerCase()}`)}</option>
              ))}
            </select>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => openAddModal()}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-black font-semibold text-sm hover:bg-zinc-200"
              >
                <Plus className="w-4 h-4" />
                {t("addEntry")}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowImport((prev) => !prev);
                  setImportError(null);
                }}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[var(--border-default)] text-sm text-zinc-200 hover:bg-[var(--bg-card)]"
              >
                <Globe className="w-4 h-4" />
                {t("importUrl")}
              </button>
              <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[var(--border-default)] text-sm text-zinc-200 hover:bg-[var(--bg-card)] cursor-pointer">
                <Upload className="w-4 h-4" />
                {t("bulkUpload")}
                <input
                  type="file"
                  accept=".csv"
                  className="sr-only"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = () => {
                      const text = String(reader.result ?? "");
                      const lines = text.split(/\r?\n/).filter((l) => l.trim());
                      if (lines.length < 2) return;
                      const header = lines[0].toLowerCase();
                      const cols = header.includes("question") && header.includes("answer")
                        ? { q: header.split(",").map((c) => c.trim()).indexOf("question"), a: header.split(",").map((c) => c.trim()).indexOf("answer") }
                        : { q: 0, a: 1 };
                      const parseRow = (row: string) => {
                        const out: string[] = [];
                        let inQuotes = false;
                        let cell = "";
                        for (let i = 0; i < row.length; i++) {
                          if (row[i] === '"') { inQuotes = !inQuotes; continue; }
                          if (!inQuotes && row[i] === ",") { out.push(cell.trim()); cell = ""; continue; }
                          cell += row[i];
                        }
                        out.push(cell.trim());
                        return out;
                      };
                      for (let i = 1; i < lines.length; i++) {
                        const cells = parseRow(lines[i]);
                        const question = cells[cols.q] ?? "";
                        const answer = cells[cols.a] ?? "";
                        if (question && answer) {
                          setEntries((prev) => [
                            ...prev,
                            {
                              id: `kb-csv-${Date.now()}-${i}`,
                              title: question.slice(0, 80),
                              type: "FAQ",
                              status: "Draft",
                              content: answer,
                              wordCount: answer.split(/\s+/).filter(Boolean).length,
                              lastUpdated: new Date().toISOString(),
                              usageCount: 0,
                              gapFlag: false,
                              question,
                              url: "",
                              fileName: file.name,
                            },
                          ]);
                        }
                      }
                    };
                    reader.readAsText(file);
                    e.target.value = "";
                  }}
                />
              </label>
            </div>
          </div>
        </div>

        {showImport && (
          <div className="mb-6 rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <p className="text-sm font-medium text-white">
                  {t("importHeading")}
                </p>
                <p className="text-xs text-zinc-500 mt-0.5">
                  {t("importDescription")}
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="url"
                value={importUrl}
                onChange={(e) => setImportUrl(e.target.value)}
                placeholder={t("importUrlPlaceholder")}
                className="flex-1 px-3 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-[var(--border-medium)]"
              />
              <button
                type="button"
                disabled={importing || !importUrl.trim()}
                onClick={async () => {
                  if (!importUrl.trim() || importing) return;
                  setImportError(null);
                  setImportedEntries([]);
                  setImporting(true);
                  try {
                    const res = await fetch("/api/knowledge/import-url", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      credentials: "include",
                      body: JSON.stringify({ url: importUrl.trim() }),
                    });
                    const data = (await res
                      .json()
                      .catch(() => null)) as
                      | { entries?: Array<{ question: string; answer: string }>; error?: string }
                      | null;
                    if (!res.ok || !data?.entries) {
                      setImportError(
                        data?.error ?? t("importErrorNotPublic"),
                      );
                      return;
                    }
                    setImportedEntries(data.entries);
                  } catch {
                    setImportError(t("importErrorGeneric"));
                  } finally {
                    setImporting(false);
                  }
                }}
                className="px-4 py-2.5 rounded-xl bg-white text-black text-sm font-semibold disabled:opacity-60 hover:bg-zinc-200"
              >
                {importing ? t("importButtonLoading") : t("importButton")}
              </button>
            </div>
            {importError && (
              <p className="text-xs text-[var(--accent-red)]" role="alert">
                {importError}
              </p>
            )}
            {importedEntries.length > 0 && (
              <div className="mt-3 space-y-2">
                <p className="text-xs text-zinc-500">
                  {t("importSuggestionHint")}
                </p>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {importedEntries.map((entry, idx) => (
                    <button
                      key={`${entry.question}-${idx}`}
                      type="button"
                      onClick={() => {
                        setEntries((prev) => [
                          ...prev,
                          {
                            id: `kb-url-${Date.now()}-${idx}`,
                            title: entry.question,
                            type: "FAQ",
                            status: "Draft",
                            content: entry.answer,
                            wordCount: entry.answer.split(/\s+/).filter(Boolean)
                              .length,
                            lastUpdated: new Date().toISOString(),
                            usageCount: 0,
                            gapFlag: false,
                            question: entry.question,
                            url: importUrl.trim(),
                            fileName: undefined,
                          },
                        ]);
                      }}
                      className="w-full text-left rounded-lg border border-[var(--border-default)] bg-[var(--bg-input)] px-3 py-2 text-xs text-zinc-200 hover:border-[var(--border-medium)]"
                    >
                      <p className="font-semibold mb-1 line-clamp-1">
                        {entry.question}
                      </p>
                      <p className="text-[11px] text-zinc-400 line-clamp-2">
                        {entry.answer}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="grid lg:grid-cols-[1fr_320px] gap-8">
          {/* Card grid */}
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.length === 0 ? (
              <div className="col-span-full py-12 text-center rounded-xl bg-[var(--bg-card)]/30 border border-[var(--border-default)]">
                <BookOpen className="w-12 h-12 text-zinc-600 mx-auto mb-3" aria-hidden />
                <p className="text-sm font-medium text-white mb-1">{t("noEntries")}</p>
                <p className="text-xs text-zinc-500 mb-4">{t("noEntriesHint")}</p>
                <button
                  type="button"
                  onClick={() => openAddModal()}
                  className="text-sm font-medium text-white hover:underline"
                >
                  {t("addFirst")}
                </button>
              </div>
            ) : filtered.map((entry) => {
              const TypeIcon = typeIcon(entry.type);
              return (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => openEditModal(entry)}
                  className="text-left p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border-default)] hover:border-[var(--border-medium)] transition-colors"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-medium text-white truncate flex-1">{entry.title}</h3>
                    <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-[var(--bg-input)] text-zinc-400">
                      <TypeIcon className="w-3 h-3" />
                      {t(`types.${entry.type}`)}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium ${
                        entry.status === "Active"
                          ? "bg-emerald-500/20 text-emerald-300"
                          : entry.status === "Processing"
                            ? "bg-amber-500/20 text-amber-300"
                            : "bg-zinc-700 text-zinc-400"
                      }`}
                    >
                      {t(`status.${entry.status.toLowerCase()}`)}
                    </span>
                    <span className="text-[10px] text-zinc-500">{t("wordCount", { count: entry.wordCount })}</span>
                    <span className="text-[10px] text-zinc-500">
                      {t("usageCount", { count: entry.usageCount })}
                    </span>
                  </div>
                  {entry.gapFlag && (
                    <div className="flex items-center gap-2 mt-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/30">
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                      <span className="text-xs text-amber-200">{t("gapFlag")}</span>
                    </div>
                  )}
                  <p className="text-[11px] text-zinc-500 mt-2">{t("updatedAt", { date: formatDate(entry.lastUpdated) })}</p>
                </button>
              );
            })}
          </div>

          {/* Insights sidebar */}
          <div className="space-y-6 lg:order-2">
            {/* Knowledge Gaps — prominent */}
            <div className="rounded-xl bg-amber-500/5 border border-amber-500/20 p-4">
              <h3 className="text-sm font-semibold text-amber-200 flex items-center gap-2 mb-3">
                <AlertTriangle className="w-4 h-4" />
                {t("gapsHeading")}
              </h3>
              <p className="text-xs text-zinc-400 mb-3">
                {t("gapsDescription")}
              </p>
              <ul className="space-y-2">
                {knowledgeGaps.map((gap) => (
                  <li key={gap.id} className="flex items-center justify-between gap-2">
                    <span className="text-sm text-zinc-300">
                      {gap.topic} <span className="text-zinc-500">({gap.askCount}×)</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => openAddModal(gap.topic)}
                      className="shrink-0 text-xs font-medium text-amber-300 hover:text-amber-200"
                    >
                      {t("addEntry")} →
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Most Referenced */}
            <div className="rounded-xl bg-[var(--bg-card)] border border-[var(--border-default)] p-4">
              <h3 className="text-sm font-semibold text-white mb-3">{t("mostReferenced")}</h3>
              <p className="text-xs text-zinc-500 mb-3">{t("mostReferencedDescription")}</p>
              <div className="space-y-3">
                {mostReferenced.map((entry) => (
                  <div key={entry.id}>
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-xs text-zinc-300 truncate">{entry.title}</span>
                      <span className="text-[10px] text-zinc-500">{entry.usageCount}×</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-[var(--bg-input)] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-emerald-500/60"
                        style={{ width: `${(entry.usageCount / maxUsage) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-[var(--bg-surface)] border border-white/[0.06] rounded-2xl p-6 mt-8">
          <h3 className="text-sm font-medium text-[var(--text-primary)] mb-3">
            {t("testHeading")}
          </h3>
          <p className="text-xs text-zinc-400 mb-4">
            {t("testDescription")}
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              value={testQuestion}
              onChange={(e) => setTestQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (
                  e.key === "Enter" &&
                  !testingKnowledge &&
                  testQuestion.trim()
                ) {
                  e.preventDefault();
                  void handleTestKnowledge();
                }
              }}
              placeholder={t("testPlaceholder")}
              className="flex-1 bg-[var(--bg-input)] border border-white/[0.06] rounded-xl px-4 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/50"
            />
            <button
              type="button"
              onClick={() => void handleTestKnowledge()}
              disabled={!testQuestion.trim() || testingKnowledge}
              className="bg-[var(--accent-primary)] text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:opacity-90 disabled:opacity-40 transition-all duration-200"
            >
              {testingKnowledge ? tForms("loading") : t("testButton")}
            </button>
          </div>
          {testAnswer && (
            <div className="mt-4 bg-[var(--bg-input)] border border-white/[0.06] rounded-xl p-4">
              <p className="text-xs text-zinc-400 mb-1">{t("testAnswerLabel")}</p>
              <p className="text-sm text-[var(--text-primary)] leading-relaxed">{testAnswer}</p>
            </div>
          )}
        </div>
      </div>

      {modalOpen && (
        <KnowledgeModal
          entry={editingEntry ?? (createFromGapTopic ? { id: "", title: createFromGapTopic, type: "Custom", content: "", wordCount: 0, lastUpdated: "", status: "Draft", usageCount: 0, gapFlag: false } : null)}
          onSave={handleSave}
          onClose={() => {
            setModalOpen(false);
            setEditingEntry(null);
            setCreateFromGapTopic(null);
          }}
        />
      )}
    </div>
  );
}
