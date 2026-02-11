"use client";

import { createContext, useContext, useState, useCallback, useEffect } from "react";

interface Workspace {
  id: string;
  name: string;
}

interface WorkspaceContextValue {
  workspaceId: string;
  workspaceName: string;
  workspaces: Workspace[];
  setWorkspaceId: (id: string) => void;
  loadWorkspaces: () => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [workspaceId, setWorkspaceIdState] = useState("");
  const [workspaceName, setWorkspaceName] = useState("");
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);

  const loadWorkspaces = useCallback(async () => {
    const res = await fetch("/api/workspaces");
    const data = await res.json();
    const list = data.workspaces ?? [];
    setWorkspaces(list);

    const urlWid = typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("workspace_id")
      : null;
    const saved = typeof window !== "undefined" ? sessionStorage.getItem("revenue_workspace_id") : null;
    const candidate = urlWid ?? saved;

    if (candidate && list.some((w: Workspace) => w.id === candidate)) {
      setWorkspaceIdState(candidate);
      setWorkspaceName(list.find((w: Workspace) => w.id === candidate)?.name ?? "");
      if (typeof window !== "undefined") sessionStorage.setItem("revenue_workspace_id", candidate);
    } else if (list.length > 0 && !workspaceId) {
      setWorkspaceIdState(list[0].id);
      setWorkspaceName(list[0].name);
    }
  }, []);

  const setWorkspaceId = useCallback((id: string) => {
    setWorkspaceIdState(id);
    const ws = workspaces.find((w) => w.id === id);
    setWorkspaceName(ws?.name ?? "");
    if (typeof window !== "undefined") sessionStorage.setItem("revenue_workspace_id", id);
  }, [workspaces]);

  useEffect(() => {
    loadWorkspaces();
  }, [loadWorkspaces]);

  useEffect(() => {
    if (workspaceId && workspaces.length) {
      const ws = workspaces.find((w) => w.id === workspaceId);
      setWorkspaceName(ws?.name ?? "");
    }
  }, [workspaceId, workspaces]);

  return (
    <WorkspaceContext.Provider
      value={{ workspaceId, workspaceName, workspaces, setWorkspaceId, loadWorkspaces }}
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
