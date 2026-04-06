import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fetchJsonWithBackoff } from "@/lib/client/fetch-with-backoff";

describe("fetchJsonWithBackoff", () => {
  beforeEach(() => {
    vi.spyOn(global, "setTimeout").mockImplementation((fn: Parameters<typeof setTimeout>[0]) => {
      if (typeof fn === "function") fn();
      return 0 as unknown as ReturnType<typeof setTimeout>;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns JSON on first success", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => ({ hello: "world" }),
      }),
    );

    const result = await fetchJsonWithBackoff<{ hello: string }>("/test");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.hello).toBe("world");
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("does not retry 401", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
        headers: new Headers(),
        text: async () => "",
      }),
    );

    const result = await fetchJsonWithBackoff("/test", { maxAttempts: 4 });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(401);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("retries 429 then succeeds", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: "Too Many",
        headers: new Headers({ "Retry-After": "0" }),
        text: async () => "slow down",
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => ({ ok: true }),
      });

    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchJsonWithBackoff<{ ok: boolean }>("/test", { maxAttempts: 4 });
    expect(result.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
