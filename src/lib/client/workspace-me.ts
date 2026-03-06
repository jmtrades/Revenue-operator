"use client";

type WorkspaceMeResponse = Record<string, unknown> | null;

const CACHE_TTL_MS = 60_000;

let cachedValue: WorkspaceMeResponse = null;
let cachedAt = 0;
let inFlight: Promise<WorkspaceMeResponse> | null = null;

export async function fetchWorkspaceMeCached(options?: { force?: boolean }): Promise<WorkspaceMeResponse> {
  const force = options?.force === true;
  const now = Date.now();

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
      return data;
    })
    .catch(() => cachedValue)
    .finally(() => {
      inFlight = null;
    });

  return inFlight;
}

export function primeWorkspaceMeCache(data: WorkspaceMeResponse) {
  cachedValue = data;
  cachedAt = Date.now();
}

export function invalidateWorkspaceMeCache() {
  cachedAt = 0;
  cachedValue = null;
  inFlight = null;
}
