"use client";

type WorkspaceMeResponse = Record<string, unknown> | null;

const CACHE_TTL_MS = 120_000; // 2 min — reduces /api/workspace/me calls; in-flight dedup still applies
const STORAGE_KEY = "rt_workspace_me_snapshot";

let cachedValue: WorkspaceMeResponse = null;
let cachedAt = 0;
let inFlight: Promise<WorkspaceMeResponse> | null = null;

function readStoredWorkspaceMe(): WorkspaceMeResponse {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as WorkspaceMeResponse) : null;
  } catch {
    return null;
  }
}

function persistWorkspaceMe(data: WorkspaceMeResponse) {
  if (typeof window === "undefined") return;
  try {
    if (data == null) {
      window.localStorage.removeItem(STORAGE_KEY);
      return;
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // ignore persistence errors
  }
}

export async function fetchWorkspaceMeCached(options?: { force?: boolean }): Promise<WorkspaceMeResponse> {
  const force = options?.force === true;
  const now = Date.now();

  if (!cachedValue) {
    cachedValue = readStoredWorkspaceMe();
  }

  if (!force && cachedAt > 0 && now - cachedAt < CACHE_TTL_MS) {
    return cachedValue;
  }

  if (!force && inFlight) {
    return inFlight;
  }

  inFlight = fetch("/api/workspace/me", {
    credentials: "include",
    cache: "no-store",
    headers: { "Cache-Control": "no-store" },
  })
    .then((res) => (res.ok ? (res.json() as Promise<WorkspaceMeResponse>) : null))
    .then((data) => {
      cachedValue = data;
      cachedAt = Date.now();
      persistWorkspaceMe(data);
      return data;
    })
    .catch(() => cachedValue ?? readStoredWorkspaceMe())
    .finally(() => {
      inFlight = null;
    });

  return inFlight;
}

export function primeWorkspaceMeCache(data: WorkspaceMeResponse) {
  cachedValue = data;
  cachedAt = Date.now();
  persistWorkspaceMe(data);
}

export function getWorkspaceMeSnapshotSync(): WorkspaceMeResponse {
  if (!cachedValue) {
    cachedValue = readStoredWorkspaceMe();
  }
  return cachedValue;
}

export function invalidateWorkspaceMeCache() {
  cachedAt = 0;
  cachedValue = null;
  inFlight = null;
  persistWorkspaceMe(null);
}
