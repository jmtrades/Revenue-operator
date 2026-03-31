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
import { useWorkspace } from "@/components/WorkspaceContext";
import { EmptyState } from "@/components/ui/EmptyState";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
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
  const [websitePages, setWebsitePages] = useState(0);

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

  const handleUpload = async (file: File) => {
    setUploadState("uploading");
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/knowledge/upload", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      const data = (await res.json().catch(() => null)) as { ok?: boolean; fileName?: string; error?: string } | null;

      if (!res.ok) {
        setUploadState("idle");
        toast.error(t("toast.uploadFailed"));
        return;
      }

      setUploadState("done");
      setFileName(data?.fileName ?? "uploaded-document.pdf");
      toast.success(t("toast.uploadSuccess"));
    } catch (error) {
      setUploadState("idle");
      toast.error(t("toast.uploadError"));
    }
  };

  const handleWebsiteFetch = async () => {
    if (!url.trim()) {
      toast.error(t("toast.enterUrl"));
      return;
    }
    setWebsiteFetchState("fetching");
    try {
      const res = await fetch("/api/knowledge/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(t("toast.fetchFailed"));
        setWebsiteFetchState("idle");
        return;
      }
      const data = await res.json().catch(() => ({}));
      setWebsiteFetchState("done");
      setWebsitePages((data as { pages?: number }).pages ?? 0);
      toast.success(t("toast.websiteIndexed"));
    } catch {
      toast.error(t("toast.fetchError"));
      setWebsiteFetchState("idle");
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4 bg-[var(--overlay)]"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="bg-[var(--bg-card)] border border-[var(--border-default)] w-full max-w-2xl h-[90vh] md:h-auto md:max-h-[85vh] overflow-hidden flex flex-col md:rounded-2xl rounded-t-2xl border-0 border-t border-[var(--border-default)] md:border"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-[var(--border-default)]">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">
            {isNew ? t("modal.addEntry") : t("modal.editEntry")}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-input)]"
            aria-label={t("closeModal")}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-[var(--text-tertiary)] mb-1.5">{tCommon("title")}</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("modal.titlePlaceholder")}
              className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-medium)] text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:border-[var(--border-medium)] focus:outline-none text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-tertiary)] mb-1.5">{t("modal.type")}</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as KnowledgeType)}
              className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-medium)] text-[var(--text-primary)] focus:border-[var(--border-medium)] focus:outline-none text-sm"
            >
              {getTypeOptions().map((o) => (
                <option key={o.value} value={o.value}>{t(`types.${o.value}`)}</option>
              ))}
            </select>
          </div>

          {type === "FAQ" && (
            <>
              <div>
                <label className="block text-xs font-medium text-[var(--text-tertiary)] mb-1.5">{t("modal.question")}</label>
                <input
                  type="text"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder={t("modal.questionPlaceholder")}
                  className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-medium)] text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:border-[var(--border-medium)] focus:outline-none text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--text-tertiary)] mb-1.5">{t("modal.answer")}</label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={4}
                  placeholder={t("answerPlaceholder")}
                  className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-medium)] text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:border-[var(--border-medium)] focus:outline-none text-sm resize-none"
                />
              </div>
            </>
          )}

          {type === "Document" && (
            <div>
              <label className="block text-xs font-medium text-[var(--text-tertiary)] mb-1.5">{t("modal.uploadFile")}</label>
              <div
                className="border-2 border-dashed border-[var(--border-medium)] rounded-xl p-8 text-center hover:border-[var(--border-medium)] transition-colors"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const file = e.dataTransfer.files[0];
                  if (file) handleUpload(file);
                }}
              >
                {uploadState === "idle" && (
                  <>
                    <Upload className="w-10 h-10 text-[var(--text-secondary)] mx-auto mb-2" />
                    <p className="text-sm text-[var(--text-tertiary)] mb-2">{t("modal.uploadHint")}</p>
                    <label className="inline-block">
                      <input
                        type="file"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleUpload(file);
                        }}
                        className="sr-only"
                        accept=".pdf,.doc,.docx,.txt"
                      />
                      <button
                        type="button"
                        className="text-sm font-medium text-[var(--text-primary)] bg-[var(--bg-inset)] hover:bg-[var(--bg-inset)] px-4 py-2 rounded-lg"
                      >
                        {t("modal.chooseFile")}
                      </button>
                    </label>
                  </>
                )}
                {uploadState === "uploading" && (
                  <p className="text-sm text-[var(--text-tertiary)]">{tForms("uploading")}</p>
                )}
                {uploadState === "done" && (
                  <p className="text-sm text-[var(--accent-primary)]">{t("modal.indexedFile", { fileName })}</p>
                )}
              </div>
            </div>
          )}

        {type === "Website" && (
            <>
              <div>
              <label className="block text-xs font-medium text-[var(--text-tertiary)] mb-1.5">{tCommon("url")}</label>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder={t("urlPlaceholder")}
                  className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-medium)] text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:border-[var(--border-medium)] focus:outline-none text-sm"
                />
              </div>
              <div>
                <button
                  type="button"
                  onClick={handleWebsiteFetch}
                  disabled={websiteFetchState === "fetching"}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--bg-input)] border border-[var(--border-medium)] text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--bg-inset)] disabled:opacity-50"
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
              <label className="block text-xs font-medium text-[var(--text-tertiary)] mb-1.5">{t("modal.content")}</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={8}
                placeholder={t("modal.contentPlaceholder")}
                className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-medium)] text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:border-[var(--border-medium)] focus:outline-none text-sm resize-none"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-[var(--text-tertiary)] mb-1.5">{t("modal.status")}</label>
            <div className="flex gap-2">
              {(getStatusOptions().filter((o) => o.value !== "Processing") as { value: "Active" | "Draft" }[]).map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setStatus(s.value)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
                    status === s.value
                      ? "bg-[var(--accent-primary)] text-[var(--text-on-accent)] border-[var(--accent-primary)]"
                      : "bg-[var(--bg-input)] border-[var(--border-medium)] text-[var(--text-secondary)] hover:border-[var(--border-medium)]"
                  }`}
                >
                  {t(`status.${(s.value ?? "").toLowerCase()}`)}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 p-4 border-t border-[var(--border-default)]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-sm font-medium text-[var(--text-secondary)] border border-[var(--border-medium)] hover:bg-[var(--bg-input)]"
          >
            {tCommon("cancel")}
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2.5 rounded-xl text-sm font-semibold bg-[var(--accent-primary)] text-[var(--text-on-accent)] hover:opacity-90"
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
  const { workspaceId } = useWorkspace();
  useEffect(() => {
    document.title = t("pageTitle");
    return () => { document.title = ""; };
  }, [t]);

  const [entries, setEntries] = useState<KnowledgeEntry[]>([]);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(ADD_FROM_CALL_KEY);
      if (!raw) return;
      let data: { summary?: string; callId?: string };
      try {
        data = JSON.parse(raw) as { summary?: string; callId?: string };
      } catch {
        try {
          sessionStorage.removeItem(ADD_FROM_CALL_KEY);
        } catch {
          /* ignore */
        }
        return;
      }
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
        toast.error(t("errors.testFailed"));
        return;
      }
      if (data.error) {
        toast.error(t("errors.testFailed"));
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
          ((e.question ?? "").toLowerCase().includes(q))
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

  if (!workspaceId) {
    return (
      <div className="p-4 md:p-6 max-w-4xl mx-auto">
        <EmptyState
          title="No workspace"
          description="Select or create a workspace to manage knowledge."
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(16px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .knowledge-entry {
          animation: fadeInUp 300ms cubic-bezier(0.23, 1, 0.32, 1) both;
        }
      `}</style>
      <div className="p-4 md:p-6 lg:p-8">
        <Breadcrumbs items={[{ label: "Home", href: "/app" }, { label: "Knowledge base" }]} />
        {/* Top bar */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
          <div>
            <h1 className="text-xl md:text-2xl font-bold tracking-[-0.025em] text-[var(--text-primary)]">{t("heading")}</h1>
            <p className="text-sm text-[var(--text-secondary)] mt-0.5">
              {entries.length} {entries.length === 1 ? tCommon("item") : tCommon("items")}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            <div className="relative flex-1 sm:min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("searchPlaceholder")}
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border-default)] text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:border-[var(--border-medium)] focus:outline-none text-sm"
              />
            </div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as KnowledgeType | "all")}
              className="px-3 py-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border-default)] text-[var(--text-secondary)] text-sm focus:border-[var(--border-medium)] focus:outline-none"
            >
              <option value="all">{t("allTypes")}</option>
              {getTypeOptions().map((o) => (
                <option key={o.value} value={o.value}>{t(`types.${o.value}`)}</option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as KnowledgeStatus | "all")}
              className="px-3 py-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border-default)] text-[var(--text-secondary)] text-sm focus:border-[var(--border-medium)] focus:outline-none"
            >
              <option value="all">{t("allStatuses")}</option>
              {getStatusOptions().map((o) => (
                <option key={o.value} value={o.value}>{t(`status.${(o.value ?? "").toLowerCase()}`)}</option>
              ))}
            </select>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => openAddModal()}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--accent-primary)] text-[var(--text-on-accent)] font-semibold text-sm hover:opacity-90 transition-[opacity,transform] duration-160 active:scale-[0.97]"
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
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[var(--border-default)] text-sm text-[var(--text-primary)] hover:bg-[var(--bg-card)]"
              >
                <Globe className="w-4 h-4" />
                {t("importUrl")}
              </button>
              <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[var(--border-default)] text-sm text-[var(--text-primary)] hover:bg-[var(--bg-card)] cursor-pointer">
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
                <p className="text-sm font-medium text-[var(--text-primary)]">
                  {t("importHeading")}
                </p>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
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
                className="flex-1 px-3 py-2.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-default)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:border-[var(--border-medium)]"
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
                className="px-4 py-2.5 rounded-xl bg-[var(--accent-primary)] text-[var(--text-on-accent)] text-sm font-semibold disabled:opacity-60 hover:opacity-90"
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
                <p className="text-xs text-[var(--text-secondary)]">
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
                      className="w-full text-left rounded-lg border border-[var(--border-default)] bg-[var(--bg-input)] px-3 py-2 text-xs text-[var(--text-primary)] hover:border-[var(--border-medium)]"
                    >
                      <p className="font-semibold mb-1 line-clamp-1">
                        {entry.question}
                      </p>
                      <p className="text-[11px] text-[var(--text-tertiary)] line-clamp-2">
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
                <BookOpen className="w-12 h-12 text-[var(--text-tertiary)] mx-auto mb-3" aria-hidden />
                <p className="text-sm font-medium text-[var(--text-primary)] mb-1">{t("noEntries", { defaultValue: "No knowledge entries yet" })}</p>
                <p className="text-xs text-[var(--text-secondary)] mb-6">{t("noEntriesHint", { defaultValue: "Your operator's knowledge base. Add FAQs, business info, and service details so the brain can answer questions accurately." })}</p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <button
                    type="button"
                    onClick={() => {
                      // Add 5-10 starter FAQ entries
                      const starterFaqs = [
                        {
                          id: `kb-starter-${Date.now()}-1`,
                          title: "What are your hours?",
                          type: "FAQ" as const,
                          status: "Active" as const,
                          content: "We're open Monday through Friday from 9:00 AM to 5:00 PM.",
                          wordCount: 16,
                          lastUpdated: new Date().toISOString(),
                          usageCount: 0,
                          gapFlag: false,
                          question: "What are your hours?",
                        },
                        {
                          id: `kb-starter-${Date.now()}-2`,
                          title: "How do I schedule an appointment?",
                          type: "FAQ" as const,
                          status: "Active" as const,
                          content: "I can help book that for you right now. What day works best?",
                          wordCount: 13,
                          lastUpdated: new Date().toISOString(),
                          usageCount: 0,
                          gapFlag: false,
                          question: "How do I schedule an appointment?",
                        },
                        {
                          id: `kb-starter-${Date.now()}-3`,
                          title: "What services do you offer?",
                          type: "FAQ" as const,
                          status: "Active" as const,
                          content: "We offer a full range of services. Can I help you with something specific?",
                          wordCount: 14,
                          lastUpdated: new Date().toISOString(),
                          usageCount: 0,
                          gapFlag: false,
                          question: "What services do you offer?",
                        },
                        {
                          id: `kb-starter-${Date.now()}-4`,
                          title: "What's your pricing?",
                          type: "FAQ" as const,
                          status: "Active" as const,
                          content: "That depends on what you need. We can take your details and have someone follow up with exact pricing.",
                          wordCount: 18,
                          lastUpdated: new Date().toISOString(),
                          usageCount: 0,
                          gapFlag: false,
                          question: "What's your pricing?",
                        },
                        {
                          id: `kb-starter-${Date.now()}-5`,
                          title: "How do I contact support?",
                          type: "FAQ" as const,
                          status: "Active" as const,
                          content: "You can reach our support team through this chat, or I can have someone call you back.",
                          wordCount: 15,
                          lastUpdated: new Date().toISOString(),
                          usageCount: 0,
                          gapFlag: false,
                          question: "How do I contact support?",
                        },
                        {
                          id: `kb-starter-${Date.now()}-6`,
                          title: "What's your return policy?",
                          type: "FAQ" as const,
                          status: "Active" as const,
                          content: "I'll capture your question and have the team get back to you with our return policy details.",
                          wordCount: 15,
                          lastUpdated: new Date().toISOString(),
                          usageCount: 0,
                          gapFlag: false,
                          question: "What's your return policy?",
                        },
                        {
                          id: `kb-starter-${Date.now()}-7`,
                          title: "How long until I hear back?",
                          type: "FAQ" as const,
                          status: "Active" as const,
                          content: "Our team typically responds within 24 hours. I'll make sure your message gets to the right person.",
                          wordCount: 16,
                          lastUpdated: new Date().toISOString(),
                          usageCount: 0,
                          gapFlag: false,
                          question: "How long until I hear back?",
                        },
                        {
                          id: `kb-starter-${Date.now()}-8`,
                          title: "Can I reschedule my appointment?",
                          type: "FAQ" as const,
                          status: "Active" as const,
                          content: "Of course! Just let me know and I can help you reschedule or cancel if needed.",
                          wordCount: 13,
                          lastUpdated: new Date().toISOString(),
                          usageCount: 0,
                          gapFlag: false,
                          question: "Can I reschedule my appointment?",
                        },
                      ];
                      setEntries(starterFaqs);
                    }}
                    className="px-4 py-2 rounded-xl bg-[var(--accent-primary)] text-[var(--text-on-accent)] text-sm font-semibold hover:opacity-90"
                  >
                    {t("quickStartButton") || "Quick start: Add common Q&As"}
                  </button>
                  <button
                    type="button"
                    onClick={() => openAddModal()}
                    className="px-4 py-2 rounded-xl border border-[var(--border-default)] text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
                  >
                    {t("addFirst")}
                  </button>
                </div>
                <div className="mt-8 p-4 rounded-xl border border-[var(--border-default)] bg-[var(--bg-card)]">
                  <p className="text-sm font-medium text-[var(--text-primary)] mb-2">Suggested knowledge to add</p>
                  <p className="text-xs text-[var(--text-secondary)] mb-3">Help your AI operator answer caller questions accurately by adding:</p>
                  <ul className="space-y-1.5 text-xs text-[var(--text-secondary)]">
                    <li className="flex items-start gap-2"><span className="text-[var(--accent-primary)] mt-0.5">•</span>Business hours, location, and contact details</li>
                    <li className="flex items-start gap-2"><span className="text-[var(--accent-primary)] mt-0.5">•</span>Services offered and pricing information</li>
                    <li className="flex items-start gap-2"><span className="text-[var(--accent-primary)] mt-0.5">•</span>Common customer questions and answers (FAQs)</li>
                    <li className="flex items-start gap-2"><span className="text-[var(--accent-primary)] mt-0.5">•</span>Booking policies, cancellation rules, and availability</li>
                    <li className="flex items-start gap-2"><span className="text-[var(--accent-primary)] mt-0.5">•</span>Special offers, promotions, or seasonal information</li>
                  </ul>
                </div>
              </div>
            ) : filtered.map((entry, idx) => {
              const TypeIcon = typeIcon(entry.type);
              return (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => openEditModal(entry)}
                  className="knowledge-entry text-left p-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border-default)] hover:border-[var(--border-medium)] transition-[border-color,transform] duration-160 active:scale-[0.98]"
                  style={{ animationDelay: `${idx * 30}ms` }}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-medium text-[var(--text-primary)] truncate flex-1">{entry.title}</h3>
                    <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-[var(--bg-input)] text-[var(--text-tertiary)]">
                      <TypeIcon className="w-3 h-3" />
                      {t(`types.${entry.type}`)}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium ${
                        entry.status === "Active"
                          ? "bg-[var(--accent-primary)]/20 text-[var(--accent-primary)]"
                          : entry.status === "Processing"
                            ? "bg-[var(--accent-warning,#f59e0b)]/20 text-[var(--accent-warning,#f59e0b)]"
                            : "bg-[var(--bg-inset)] text-[var(--text-tertiary)]"
                      }`}
                    >
                      {t(`status.${(entry.status ?? "").toLowerCase()}`)}
                    </span>
                    <span className="text-[10px] text-[var(--text-secondary)]">{t("wordCount", { count: entry.wordCount })}</span>
                    <span className="text-[10px] text-[var(--text-secondary)]">
                      {t("usageCount", { count: entry.usageCount })}
                    </span>
                  </div>
                  {entry.gapFlag && (
                    <div className="flex items-center gap-2 mt-2 p-2 rounded-lg bg-[var(--accent-warning,#f59e0b)]/10 border border-[var(--accent-warning,#f59e0b)]/30">
                      <AlertTriangle className="w-4 h-4 text-[var(--accent-warning,#f59e0b)] shrink-0" />
                      <span className="text-xs text-[var(--accent-warning,#f59e0b)]/80">{t("gapFlag")}</span>
                    </div>
                  )}
                  <p className="text-[11px] text-[var(--text-secondary)] mt-2">{t("updatedAt", { date: formatDate(entry.lastUpdated) })}</p>
                </button>
              );
            })}
          </div>

          {/* Insights sidebar */}
          <div className="space-y-6 lg:order-2">
            {/* Knowledge Gaps — prominent */}
            <div className="rounded-xl bg-[var(--accent-warning,#f59e0b)]/5 border border-[var(--accent-warning,#f59e0b)]/20 p-4">
              <h3 className="text-sm font-semibold text-[var(--accent-warning,#f59e0b)]/80 flex items-center gap-2 mb-3">
                <AlertTriangle className="w-4 h-4" />
                {t("gapsHeading")}
              </h3>
              <p className="text-xs text-[var(--text-tertiary)] mb-3">
                {t("gapsDescription")}
              </p>
              <ul className="space-y-2">
                {knowledgeGaps.map((gap) => (
                  <li key={gap.id} className="flex items-center justify-between gap-2">
                    <span className="text-sm text-[var(--text-secondary)]">
                      {gap.topic} <span className="text-[var(--text-secondary)]">({gap.askCount}×)</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => openAddModal(gap.topic)}
                      className="shrink-0 text-xs font-medium text-[var(--accent-warning,#f59e0b)] hover:text-[var(--accent-warning,#f59e0b)]/80"
                    >
                      {t("addEntry")} →
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Most Referenced */}
            <div className="rounded-xl bg-[var(--bg-card)] border border-[var(--border-default)] p-4">
              <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">{t("mostReferenced")}</h3>
              <p className="text-xs text-[var(--text-secondary)] mb-3">{t("mostReferencedDescription")}</p>
              <div className="space-y-3">
                {mostReferenced.map((entry) => (
                  <div key={entry.id}>
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-xs text-[var(--text-secondary)] truncate">{entry.title}</span>
                      <span className="text-[10px] text-[var(--text-secondary)]">{entry.usageCount}×</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-[var(--bg-input)] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[var(--accent-primary)]/60"
                        style={{ width: `${(entry.usageCount / maxUsage) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-2xl p-6 mt-8">
          <h3 className="text-sm font-medium text-[var(--text-primary)] mb-3">
            {t("testHeading")}
          </h3>
          <p className="text-xs text-[var(--text-tertiary)] mb-4">
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
              className="flex-1 bg-[var(--bg-input)] border border-[var(--border-default)] rounded-xl px-4 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/50"
            />
            <button
              type="button"
              onClick={() => void handleTestKnowledge()}
              disabled={!testQuestion.trim() || testingKnowledge}
              className="bg-[var(--accent-primary)] text-[var(--text-primary)] px-5 py-2.5 rounded-xl text-sm font-medium hover:opacity-90 disabled:opacity-40 transition-[opacity,transform] duration-160 active:scale-[0.97]"
            >
              {testingKnowledge ? tForms("loading") : t("testButton")}
            </button>
          </div>
          {testAnswer && (
            <div className="mt-4 bg-[var(--bg-input)] border border-[var(--border-default)] rounded-xl p-4">
              <p className="text-xs text-[var(--text-tertiary)] mb-1">{t("testAnswerLabel")}</p>
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
