/**
 * No freeform AI enforcement. Fail build if outbound message path uses AI-generated text.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");

describe("No freeform AI in outbound path", () => {
  it("speech-governance compiler does not pass LLM output as message body", () => {
    const compiler = readFileSync(path.join(ROOT, "src/lib/speech-governance/compiler.ts"), "utf-8");
    expect(compiler).not.toMatch(/rendered_text\s*=\s*.*\.content/);
    expect(compiler).toContain("renderTemplate(template.body");
  });

  it("delivery provider receives content from compiler only", () => {
    const provider = readFileSync(path.join(ROOT, "src/lib/delivery/provider.ts"), "utf-8");
    expect(provider).not.toContain("openai");
    expect(provider).not.toContain("choices[0]");
  });

  it("execution-plan build uses compileGovernedMessage not raw AI", () => {
    const build = readFileSync(path.join(ROOT, "src/lib/execution-plan/build.ts"), "utf-8");
    expect(build).toMatch(/compileGovernedMessage|compileResult|speech-governance/);
  });
});
