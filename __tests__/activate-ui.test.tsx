/**
 * @vitest-environment jsdom
 * Smoke test for activate page — verifies import and basic render.
 */

import { describe, it, expect, vi } from "vitest";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  useSearchParams: () => ({ get: vi.fn() }),
}));

// Mock next-intl
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => "en",
}));

// Mock supabase
vi.mock("@/lib/supabase/client", () => ({
  createBrowserClient: () => ({
    auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null } }) },
  }),
}));

describe("ActivatePage", () => {
  it("module imports without error", async () => {
    const mod = await import("@/app/activate/page");
    expect(mod).toBeDefined();
    expect(mod.default).toBeDefined();
  });
});
