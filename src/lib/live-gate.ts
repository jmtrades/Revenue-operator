const STORAGE_KEY = "revenue_live_completed";
const WORKSPACE_PREFIX = "revenue_live_workspace_";

export function isLiveCompleted(workspaceId: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    const global = localStorage.getItem(STORAGE_KEY);
    const workspace = workspaceId ? localStorage.getItem(`${WORKSPACE_PREFIX}${workspaceId}`) : null;
    return global === "1" || workspace === "1";
  } catch {
    return false;
  }
}

export function setLiveCompleted(workspaceId: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, "1");
    if (workspaceId) localStorage.setItem(`${WORKSPACE_PREFIX}${workspaceId}`, "1");
  } catch {
    // ignore
  }
}
