import { describe, it, expect } from "vitest";
import { fetchJson } from "../scripts/self-check-helper";

function makeFakeResponse(body: string, ok: boolean, status: number) {
  let readCount = 0;
  const res = {
    ok,
    status,
    async text() {
      readCount += 1;
      return body;
    },
    getReadCount() {
      return readCount;
    },
  } as unknown as Response & { getReadCount(): number };
  return res;
}

describe("self-check helper fetchJson", () => {
  it("parses JSON body once and returns json + raw", async () => {
    const fake = makeFakeResponse('{"ok":true}', true, 200);
    const result = await fetchJson(fake);
    if (!("json" in result)) {
      throw new Error("expected json in result");
    }
    expect((result as { json: unknown }).json).toEqual({ ok: true });
    expect((result as { raw: string }).raw).toBe('{"ok":true}');
    expect((fake as Response & { getReadCount(): number }).getReadCount()).toBe(1);
  });

  it("returns raw fallback when body is not JSON", async () => {
    const fake = makeFakeResponse("not-json", false, 500);
    const result = await fetchJson(fake);
    expect((result as { status: number }).status).toBe(500);
    expect((result as { ok: boolean }).ok).toBe(false);
    expect((result as { raw: string }).raw).toBe("not-json");
    expect((fake as Response & { getReadCount(): number }).getReadCount()).toBe(1);
  });
});


