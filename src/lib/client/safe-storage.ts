const MAX_ITEM_SIZE = 500_000; // 500KB per item
const STORAGE_PREFIX = "rt_";

export function safeSetItem(key: string, value: string): boolean {
  try {
    if (value.length > MAX_ITEM_SIZE) {
      console.warn(`Storage item ${key} exceeds ${MAX_ITEM_SIZE} chars, skipping`);
      return false;
    }
    localStorage.setItem(key, value);
    return true;
  } catch (e) {
    // QuotaExceededError — try to free space
    console.warn("localStorage quota exceeded, clearing old snapshots");
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k?.startsWith(STORAGE_PREFIX) && k !== key) keysToRemove.push(k);
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
      localStorage.setItem(key, value);
      return true;
    } catch {
      return false;
    }
  }
}

export function safeGetItem(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function safeRemoveItem(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}
