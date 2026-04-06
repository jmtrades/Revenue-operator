/**
 * Ensures high-traffic UI namespaces define required keys in the default (en) catalog.
 * Extend CRITICAL_PATHS as you add t("x.y") calls that must never ship as raw keys.
 */
import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

const CRITICAL_PATHS = [
  "campaigns.noWorkspace.title",
  "campaigns.noWorkspace.description",
  "analytics.noWorkspaceTitle",
  "analytics.noWorkspaceDescription",
  "integrations.hub.eventDealWon",
  "flowBuilder.toast.needsConnection",
  "flowBuilder.toast.savedDraft",
  "demoVoice.consentRequired",
  "demoVoice.consentLabel",
  "demoVoice.trustLine",
  "settings.integrations.removeMappingTitle",
] as const;

function getByPath(obj: unknown, dotPath: string): unknown {
  return dotPath.split(".").reduce<unknown>((acc, key) => {
    if (acc == null || typeof acc !== "object") return undefined;
    return (acc as Record<string, unknown>)[key];
  }, obj);
}

describe("i18n en.json critical keys", () => {
  it("defines all CRITICAL_PATHS as non-empty strings", () => {
    const enPath = path.resolve(__dirname, "../src/i18n/messages/en.json");
    const raw = readFileSync(enPath, "utf8");
    const messages = JSON.parse(raw) as unknown;

    for (const p of CRITICAL_PATHS) {
      const v = getByPath(messages, p);
      expect(v, `Missing or invalid: ${p}`).toBeTypeOf("string");
      expect((v as string).trim().length, p).toBeGreaterThan(0);
    }
  });
});
