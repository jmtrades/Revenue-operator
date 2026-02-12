/** Scoped per workspace so we do not show onboarding again after completion. */
const LIVE_SEEN_PREFIX = "liveSeen_";
const LEGACY_PREFIX = "revenue_live_workspace_";
const LEGACY_GLOBAL = "revenue_live_completed";

export function isLiveCompleted(workspaceId: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (workspaceId && localStorage.getItem(`${LIVE_SEEN_PREFIX}${workspaceId}`) === "1") return true;
    if (workspaceId && localStorage.getItem(`${LEGACY_PREFIX}${workspaceId}`) === "1") return true;
    if (localStorage.getItem(LEGACY_GLOBAL) === "1") return true;
    return false;
  } catch {
    return false;
  }
}

export function setLiveCompleted(workspaceId: string): void {
  if (typeof window === "undefined") return;
  try {
    if (workspaceId) localStorage.setItem(`${LIVE_SEEN_PREFIX}${workspaceId}`, "1");
  } catch {
    // ignore
  }
}

const VALUE_SEEN_PREFIX = "valueSeen_";

export function isValueCompleted(workspaceId: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return workspaceId ? localStorage.getItem(`${VALUE_SEEN_PREFIX}${workspaceId}`) === "1" : false;
  } catch {
    return false;
  }
}

export function setValueCompleted(workspaceId: string): void {
  if (typeof window === "undefined") return;
  try {
    if (workspaceId) localStorage.setItem(`${VALUE_SEEN_PREFIX}${workspaceId}`, "1");
  } catch {
    // ignore
  }
}
