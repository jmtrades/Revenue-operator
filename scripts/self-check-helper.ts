/**
 * Self-check helper: read a Response body exactly once.
 * If JSON parseable → return { ok, status, json, raw }.
 * Otherwise → return { ok, status, raw }.
 * Never calls res.text() more than once.
 */

export async function fetchJson(res: Response): Promise<
  | { ok: boolean; status: number; json: unknown; raw: string }
  | { ok: boolean; status: number; raw: string }
> {
  const raw = await res.text();
  let parsed: unknown = null;
  if (raw) {
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = null;
    }
  }

  if (parsed !== null) {
    return { ok: res.ok, status: res.status, json: parsed, raw };
  }

  return { ok: res.ok, status: res.status, raw };
}

