/**
 * Safe workspace utilities - never crash, always return status
 */

export interface Workspace {
  id: string;
  name: string;
  created_at?: string;
}

export interface SafeWorkspaceResult {
  status: "loading" | "ready" | "missing" | "error";
  workspaces: Workspace[];
  error?: string;
}

export async function getWorkspacesSafe(): Promise<SafeWorkspaceResult> {
  try {
    const res = await fetch("/api/workspaces", {
      credentials: "include",
      cache: "no-store",
    });

    if (!res.ok) {
      return { status: "error", workspaces: [], error: `HTTP ${res.status}` };
    }

    const data = await res.json();
    const workspaces: Workspace[] = Array.isArray(data.workspaces) ? data.workspaces : [];

    if (workspaces.length === 0) {
      return { status: "missing", workspaces: [] };
    }

    return { status: "ready", workspaces };
  } catch (error) {
    return {
      status: "error",
      workspaces: [],
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
