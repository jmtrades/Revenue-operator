/**
 * Single canonical pipeline enforcement.
 * Fail build if: compileGovernedMessage or createActionIntent used outside allowed locations;
 * any route calls delivery provider; any route constructs outbound message text manually.
 */

import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");
const SRC = path.join(ROOT, "src");

function* walkTs(dir: string, prefix = ""): Generator<string> {
  const entries = readdirSync(path.join(dir, prefix), { withFileTypes: true });
  for (const e of entries) {
    const rel = prefix ? `${prefix}/${e.name}` : e.name;
    if (e.isDirectory()) {
      if (e.name === "node_modules" || e.name === ".next") continue;
      yield* walkTs(dir, rel);
    } else if (e.name.endsWith(".ts") && !e.name.endsWith(".test.ts") && !e.name.endsWith(".spec.ts")) {
      yield rel;
    }
  }
}

const ALLOWED_COMPILE_GOVERNED_MESSAGE = [
  "lib/execution-plan/build.ts",
  "app/api/message/preview/route.ts",
  "app/api/enterprise/message-preview/route.ts",
  "lib/speech-governance/compiler.ts",
  "lib/speech-governance/index.ts",
];

const ALLOWED_CREATE_ACTION_INTENT = [
  "lib/execution-plan/emit.ts",
  "app/api/enterprise/approvals/approve/route.ts",
  "app/api/connectors/voice/outcome/route.ts",
  "app/api/operational/action-intents/complete/route.ts",
  "app/api/ops/actions/check-in-email/route.ts",
  "app/api/cron/action-intent-watchdog/route.ts",
  "app/api/cron/self-healing/route.ts",
  "app/api/cron/hosted-executor/route.ts",
  "lib/action-intents/emit.ts",
  "lib/action-intents/index.ts",
];

describe("Single canonical pipeline enforcement", () => {
  it("compileGovernedMessage is only in execution-plan/build and message preview routes (or compiler/index)", () => {
    const violators: string[] = [];
    for (const rel of walkTs(SRC, "")) {
      const full = path.join(SRC, rel);
      const normalized = rel.replace(/\\/g, "/");
      const allowed = ALLOWED_COMPILE_GOVERNED_MESSAGE.some((a) => normalized.includes(a));
      if (allowed) continue;
      try {
        const content = readFileSync(full, "utf-8");
        if (content.includes("compileGovernedMessage")) violators.push(normalized);
      } catch {
        // skip
      }
    }
    expect(violators).toEqual([]);
  });

  it("createActionIntent is only used in execution-plan/emit, enterprise approvals, voice outcome, action-intents/complete, action-intents", () => {
    const violators: string[] = [];
    for (const rel of walkTs(SRC, "")) {
      const full = path.join(SRC, rel);
      const normalized = rel.replace(/\\/g, "/");
      const allowed = ALLOWED_CREATE_ACTION_INTENT.some((a) => normalized.includes(a));
      if (allowed) continue;
      try {
        const content = readFileSync(full, "utf-8");
        if (content.includes("createActionIntent(")) violators.push(normalized);
      } catch {
        // skip
      }
    }
    expect(violators).toEqual([]);
  });

  it("no API route calls delivery sendOutbound or sendViaTwilio", () => {
    const violators: string[] = [];
    const allowed = ["app/api/messages/send/route.ts"];
    for (const rel of walkTs(SRC, "")) {
      if (!rel.includes("app/api") || !rel.endsWith("route.ts")) continue;
      if (allowed.some((a) => rel.endsWith(a) || rel.includes(a))) continue;
      const full = path.join(SRC, rel);
      const content = readFileSync(full, "utf-8");
      if (content.includes("sendOutbound") || content.includes("sendViaTwilio")) violators.push(rel);
    }
    expect(violators).toEqual([]);
  });

  it("no route constructs outbound message text manually (template-only)", () => {
    const violators: string[] = [];
    for (const rel of walkTs(SRC, "")) {
      if (!rel.includes("app/api") || !rel.endsWith("route.ts")) continue;
      const full = path.join(SRC, rel);
      const content = readFileSync(full, "utf-8");
      const hasDirectSend = content.includes("Body:") && content.includes("To:") && content.includes("fetch(");
      if (hasDirectSend && !rel.includes("webhook") && !rel.includes("ingest")) violators.push(rel);
    }
    expect(violators).toEqual([]);
  });
});
