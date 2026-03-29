"use client";

import { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import { fetchWorkspaceMeCached, getWorkspaceMeSnapshotSync, invalidateWorkspaceMeCache } from "@/lib/client/workspace-me";

const LOCAL_STORAGE_KEY = "revenue_last_workspace_id";

interface Workspace {
  id: string;
  name: string;
  created_at?: string;
}

interface WorkspaceContextValue {
  workspaceId: string;
  workspaceName: string;
  workspaces: Workspace[];
  loading: boolean;
  error: string | null;
  setWorkspaceId: (id: string) => void;
  loadWorkspaces: () => Promise<void>;
  retry: () => void;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

function getUrlWorkspaceId(): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get("workspace_id");
}

function getSavedWorkspaceId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(LOCAL_STORAGE_KEY);
  } catch {
    return null;
  }
}

function persistWorkspaceId(id: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, id);
  } catch {
    // ignore
  }
}

export function WorkspaceProvider({
  children,
  initialWorkspaceId = "",
  initialWorkspaceName = "",
}: {
  children: React.ReactNode;
  initialWorkspaceId?: string;
  initialWorkspaceName?: string;
}) {
  const [workspaceId, setWorkspaceIdState] = useState(initialWorkspaceId || "");
  const [workspaceName, setWorkspaceName] = useState(initialWorkspaceName || "");
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const initialRun = useRef(true);

  useEffect(() => {
    const snapshot = getWorkspaceMeSnapshotSync() as { id?: string | null; name?: string | null } | null;
    const savedId = getSavedWorkspaceId();
    const id = snapshot?.id?.trim() || savedId || "";
    const name = snapshot?.name?.trim() || "";
    if (id) setWorkspaceIdState((prev) => prev || id);
    if (name) setWorkspaceName((prev) => prev || name);
  }, []);

  const FETCH_TIMEOUT_MS = 12_000;

  const loadWorkspaces = useCallback(async () => {
    setLoading(true);
    setError(null);

    // Try to load from cache first to show optimistic UI
    try {
      const cached = localStorage.getItem("rt_workspaces_cache");
      if (cached) {
        const cachedList = JSON.parse(cached) as Workspace[];
        setWorkspaces(cachedList);
      }
    } catch {
      // ignore cache errors
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    const guardId = setTimeout(() => {
      setLoading((prev) => {
        if (prev) setError("Request timed out. Check your connection.");
        return false;
      });
    }, FETCH_TIMEOUT_MS + 2000);
    try {
      const res = await fetch("/api/workspaces", { signal: controller.signal, credentials: "include" });
      clearTimeout(timeoutId);
      clearTimeout(guardId);
      if (res.status === 401) {
        window.location.href = "/sign-in";
        return;
      }
      const data = await res.json().catch(() => ({}));
      const list: Workspace[] = Array.isArray(data.workspaces) ? data.workspaces : [];
      setWorkspaces(list);

      // Cache the workspace list
      try {
        localStorage.setItem("rt_workspaces_cache", JSON.stringify(list));
      } catch {
        // ignore cache errors
      }

      const urlWid = getUrlWorkspaceId();
      const savedWid = getSavedWorkspaceId();
      const candidate = urlWid || workspaceId || savedWid;

      if (list.length === 0) {
        setWorkspaceIdState("");
        setWorkspaceName("");
        return;
      }

      const match = candidate && list.some((w) => w.id === candidate)
        ? list.find((w) => w.id === candidate)!
        : list[0];

      if (match) {
        setWorkspaceIdState(match.id);
        setWorkspaceName(match.name ?? "");
        persistWorkspaceId(match.id);
      }
    } catch (e) {
      clearTimeout(timeoutId);
      clearTimeout(guardId);
      if (e instanceof Error && e.name === "AbortError") {
        setError("Request timed out. Check your connection.");
      } else {
        setError(e instanceof Error ? e.message : "Connection issue");
      }
      setWorkspaces([]);
      setWorkspaceIdState("");
      setWorkspaceName("");
    } finally {
      clearTimeout(guardId);
      setLoading(false);
    }
  }, [workspaceId]);

  const setWorkspaceId = useCallback((id: string) => {
    setWorkspaceIdState(id);
    const ws = workspaces.find((w) => w.id === id);
    setWorkspaceName(ws?.name ?? "");
    persistWorkspaceId(id);
    // Invalidate cached workspace data when workspace changes
    invalidateWorkspaceMeCache();
  }, [workspaces]);

  const retry = useCallback(() => {
    loadWorkspaces();
  }, [loadWorkspaces]);

  useEffect(() => {
    if (initialRun.current) {
      initialRun.current = false;
      fetchWorkspaceMeCached()
        .then((data) => {
          const snapshot = data as { id?: string | null; name?: string | null } | null;
          const nextId = snapshot?.id?.trim();
          const nextName = snapshot?.name?.trim();
          if (nextId) {
            setWorkspaceIdState((current) => current || nextId);
            persistWorkspaceId(nextId);
          }
          if (nextName) setWorkspaceName(nextName);
        })
        .catch(() => {
          // ignore priming errors and rely on the workspace list request
        });
      loadWorkspaces();
    }
  }, [loadWorkspaces]);

  useEffect(() => {
    if (workspaceId && workspaces.length > 0) {
      const ws = workspaces.find((w) => w.id === workspaceId);
      if (ws) setWorkspaceName(ws.name ?? "");
    }
  }, [workspaceId, workspaces]);

  return (
    <WorkspaceContext.Provider
      value={{
        workspaceId,
        workspaceName,
        workspaces,
        loading,
        error,
        setWorkspaceId,
        loadWorkspaces,
        retry,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace must be used within WorkspaceProvider");
  return ctx;
}

/**
 * Safe variant that returns null instead of throwing when used outside the
 * provider (e.g. during SSR / hydration race conditions).
 */
export function useWorkspaceSafe(): WorkspaceContextValue | null {
  return useContext(WorkspaceContext);
}
