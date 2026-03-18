export type DbSingleQuery = {
  maybeSingle?: () => unknown;
  single?: () => unknown;
  limit?: (n: number) => unknown;
};

type DbDataResponse = { data?: unknown };

function extractData(res: unknown): unknown | null {
  if (!res || typeof res !== "object") return null;
  if (!("data" in res)) return null;
  return (res as DbDataResponse).data ?? null;
}

export async function fetchSingleRow(query: DbSingleQuery): Promise<unknown | null> {
  try {
    if (typeof query.maybeSingle === "function") {
      return extractData(await query.maybeSingle());
    }
    if (typeof query.single === "function") {
      return extractData(await query.single());
    }
    if (typeof query.limit === "function") {
      const data = extractData(await query.limit(1));
      return Array.isArray(data) ? (data[0] ?? null) : null;
    }
    return null;
  } catch {
    return null;
  }
}

