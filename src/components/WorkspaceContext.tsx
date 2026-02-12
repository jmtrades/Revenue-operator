"use client";

import { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";

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

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [workspaceId, setWorkspaceIdState] = useState("");
  const [workspaceName, setWorkspaceName] = useState("");
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const initialRun = useRef(true);

  const loadWorkspaces = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/workspaces");
      const data = await res.json();
      const list: Workspace[] = Array.isArray(data.workspaces) ? data.workspaces : [];
      setWorkspaces(list);

      const urlWid = getUrlWorkspaceId();
      const savedWid = getSavedWorkspaceId();
      const candidate = urlWid || savedWid;

      if (list.length === 0) {
        setWorkspaceIdState("");
        setWorkspaceName("");
        return;
      }

      const match = candidate && list.some((w) => w.id === candidate)
        ? list.find((w) => w.id === candidate)!
        : list[0];
      setWorkspaceIdState(match.id);
      setWorkspaceName(match.name ?? "");
      persistWorkspaceId(match.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Connection issue");
      setWorkspaces([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const setWorkspaceId = useCallback((id: string) => {
    setWorkspaceIdState(id);
    const ws = workspaces.find((w) => w.id === id);
    setWorkspaceName(ws?.name ?? "");
    persistWorkspaceId(id);
  }, [workspaces]);

  const retry = useCallback(() => {
    loadWorkspaces();
  }, [loadWorkspaces]);

  useEffect(() => {
    if (initialRun.current) {
      initialRun.current = false;
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
