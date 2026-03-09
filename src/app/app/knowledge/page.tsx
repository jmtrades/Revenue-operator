"use client";

import { useEffect, useMemo, useState } from "react";
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
import type {
  KnowledgeEntry,
  KnowledgeGap,
  KnowledgeType,
  KnowledgeStatus,
} from "@/lib/mock/knowledge";

const TYPE_OPTIONS: { value: KnowledgeType; label: string }[] = [
  { value: "FAQ", label: "FAQ" },
  { value: "Document", label: "Document" },
  { value: "Website", label: "Website URL" },
  { value: "Custom", label: "Custom" },
];

const STATUS_OPTIONS: { value: KnowledgeStatus; label: string }[] = [
  { value: "Active", label: "Active" },
  { value: "Draft", label: "Draft" },
  { value: "Processing", label: "Processing" },
];

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
      title: title.trim() || "Untitled",
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
            {isNew ? "Add entry" : "Edit entry"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-[var(--bg-input)]"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Entry title"
              className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-medium)] text-white placeholder:text-zinc-500 focus:border-[var(--border-medium)] focus:outline-none text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as KnowledgeType)}
              className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-medium)] text-white focus:border-[var(--border-medium)] focus:outline-none text-sm"
            >
              {TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {type === "FAQ" && (
            <>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Question</label>
                <input
                  type="text"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="e.g. What are your hours?"
                  className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-medium)] text-white placeholder:text-zinc-500 focus:border-[var(--border-medium)] focus:outline-none text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Answer</label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={4}
                  placeholder="Answer text…"
                  className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-medium)] text-white placeholder:text-zinc-500 focus:border-[var(--border-medium)] focus:outline-none text-sm resize-none"
                />
              </div>
            </>
          )}

          {type === "Document" && (
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Upload file</label>
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
                    <p className="text-sm text-zinc-400 mb-2">Drag and drop or click to upload</p>
                    <button
                      type="button"
                      onClick={handleMockUpload}
                      className="text-sm font-medium text-white bg-zinc-700 hover:bg-zinc-600 px-4 py-2 rounded-lg"
                    >
                      Choose file
                    </button>
                  </>
                )}
                {uploadState === "uploading" && (
                  <p className="text-sm text-zinc-400">Uploading…</p>
                )}
                {uploadState === "done" && (
                  <p className="text-sm text-emerald-400">Indexed: {fileName}</p>
                )}
              </div>
            </div>
          )}

          {type === "Website" && (
            <>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">URL</label>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://..."
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
                  {websiteFetchState === "idle" && "Fetch"}
                  {websiteFetchState === "fetching" && "Indexing…"}
                  {websiteFetchState === "done" && `Indexed ${websitePages} pages`}
                </button>
              </div>
            </>
          )}

          {type === "Custom" && (
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Content</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={8}
                placeholder="Freeform text…"
                className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-medium)] text-white placeholder:text-zinc-500 focus:border-[var(--border-medium)] focus:outline-none text-sm resize-none"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Status</label>
            <div className="flex gap-2">
              {(["Active", "Draft"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatus(s)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
                    status === s
                      ? "bg-white text-black border-white"
                      : "bg-[var(--bg-input)] border-[var(--border-medium)] text-zinc-300 hover:border-[var(--border-medium)]"
                  }`}
                >
                  {s}
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
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2.5 rounded-xl text-sm font-semibold bg-white text-black hover:bg-zinc-200"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

const PAGE_TITLE = "Knowledge — Recall Touch";

export default function KnowledgePage() {
  useEffect(() => {
    document.title = PAGE_TITLE;
    return () => { document.title = ""; };
  }, []);

  const [entries, setEntries] = useState<KnowledgeEntry[]>([]);
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
            <h1 className="text-xl md:text-2xl font-semibold text-white">Knowledge Base</h1>
            <p className="text-sm text-zinc-500 mt-0.5">{entries.length} entries</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            <div className="relative flex-1 sm:min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search entries…"
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border-default)] text-white placeholder:text-zinc-500 focus:border-[var(--border-medium)] focus:outline-none text-sm"
              />
            </div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as KnowledgeType | "all")}
              className="px-3 py-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border-default)] text-zinc-300 text-sm focus:border-[var(--border-medium)] focus:outline-none"
            >
              <option value="all">All types</option>
              {TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as KnowledgeStatus | "all")}
              className="px-3 py-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border-default)] text-zinc-300 text-sm focus:border-[var(--border-medium)] focus:outline-none"
            >
              <option value="all">All statuses</option>
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => openAddModal()}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-black font-semibold text-sm hover:bg-zinc-200"
              >
                <Plus className="w-4 h-4" />
                Add Entry
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
                Import from URL
              </button>
            </div>
          </div>
        </div>

        {showImport && (
          <div className="mb-6 rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)] p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <p className="text-sm font-medium text-white">
                  Turn your website into call-ready knowledge
                </p>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Paste a public FAQ, services, or pricing page. We&apos;ll
                  suggest Q&A pairs you can add.
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="url"
                value={importUrl}
                onChange={(e) => setImportUrl(e.target.value)}
                placeholder="https://yourbusiness.com/faq"
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
                        data?.error ??
                          "Could not import this URL. Check that it is public and try again.",
                      );
                      return;
                    }
                    setImportedEntries(data.entries);
                  } catch {
                    setImportError(
                      "Something went wrong importing this URL. Try again in a moment.",
                    );
                  } finally {
                    setImporting(false);
                  }
                }}
                className="px-4 py-2.5 rounded-xl bg-white text-black text-sm font-semibold disabled:opacity-60 hover:bg-zinc-200"
              >
                {importing ? "Importing…" : "Import"}
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
                  Click a suggestion to add it to your knowledge.
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
                <p className="text-sm font-medium text-white mb-1">No entries found</p>
                <p className="text-xs text-zinc-500 mb-4">Try adjusting your filters.</p>
                <button
                  type="button"
                  onClick={() => openAddModal()}
                  className="text-sm font-medium text-white hover:underline"
                >
                  Add your first entry
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
                      {entry.type}
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
                      {entry.status}
                    </span>
                    <span className="text-[10px] text-zinc-500">{entry.wordCount} words</span>
                    <span className="text-[10px] text-zinc-500">
                      Used {entry.usageCount} times in calls
                    </span>
                  </div>
                  {entry.gapFlag && (
                    <div className="flex items-center gap-2 mt-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/30">
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                      <span className="text-xs text-amber-200">Callers need more info on this</span>
                    </div>
                  )}
                  <p className="text-[11px] text-zinc-500 mt-2">Updated {formatDate(entry.lastUpdated)}</p>
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
                Knowledge Gaps
              </h3>
              <p className="text-xs text-zinc-400 mb-3">
                Callers asked about these topics but your content is limited or missing.
              </p>
              <ul className="space-y-2">
                {knowledgeGaps.map((gap) => (
                  <li key={gap.id} className="flex items-center justify-between gap-2">
                    <span className="text-sm text-zinc-300">
                      {gap.topic} <span className="text-zinc-500">(asked {gap.askCount} times)</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => openAddModal(gap.topic)}
                      className="shrink-0 text-xs font-medium text-amber-300 hover:text-amber-200"
                    >
                      Create entry →
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Most Referenced */}
            <div className="rounded-xl bg-[var(--bg-card)] border border-[var(--border-default)] p-4">
              <h3 className="text-sm font-semibold text-white mb-3">Most Referenced</h3>
              <p className="text-xs text-zinc-500 mb-3">Top 5 entries used by your agent in calls.</p>
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
