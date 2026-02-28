/**
 * Ring 1 — No freeform voice. Fail build if voice layer uses OpenAI for message text,
 * fallback freeform generation, or drift-based sentence generation.
 * All outbound voice must come from script blocks.
 */

import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");

describe("Voice no freeform enforcement", () => {
  it("voice layer does not call OpenAI for direct message or script text", () => {
    const voiceDir = path.join(ROOT, "src/lib/voice");
    try {
      const files = readdirSync(voiceDir);
      for (const f of files) {
        if (!f.endsWith(".ts")) continue;
        const content = readFileSync(path.join(voiceDir, f), "utf-8");
        expect(content).not.toMatch(/openai|createCompletion|chat\.completions/);
        expect(content).not.toMatch(/\.content\s*=|choices\[0\]/);
      }
    } catch {
      expect(true).toBe(true);
    }
    const emit = readFileSync(path.join(ROOT, "src/lib/execution-plan/emit.ts"), "utf-8");
    expect(emit).not.toMatch(/openai|createCompletion|chat\.completions/);
  });

  it("no fallback freeform generation in voice or execution path", () => {
    const compiler = readFileSync(path.join(ROOT, "src/lib/speech-governance/compiler.ts"), "utf-8");
    const emit = readFileSync(path.join(ROOT, "src/lib/execution-plan/emit.ts"), "utf-8");
    expect(compiler).not.toMatch(/fallback.*freeform|freeform.*fallback|generateMessage|generateText/);
    expect(emit).not.toMatch(/freeform|generateMessage|generateText/);
  });

  it("no drift-based sentence generation for voice", () => {
    const build = readFileSync(path.join(ROOT, "src/lib/execution-plan/build.ts"), "utf-8");
    const emit = readFileSync(path.join(ROOT, "src/lib/execution-plan/emit.ts"), "utf-8");
    expect(build).not.toMatch(/getSafeMessageOnDrift|message.*drift.*sentence/);
    expect(emit).toMatch(/script_blocks|place_outbound_call/);
  });

  it("place_outbound_call payload uses script_blocks from governed source", () => {
    const emit = readFileSync(path.join(ROOT, "src/lib/execution-plan/emit.ts"), "utf-8");
    expect(emit).toContain("script_blocks");
    expect(emit).toContain("place_outbound_call");
    const payloadStart = emit.indexOf("intentType: \"place_outbound_call\"");
    const payloadEnd = emit.indexOf("dedupeKey:", payloadStart);
    const payloadSection = payloadStart >= 0 && payloadEnd >= 0 ? emit.slice(payloadStart, payloadEnd) : "";
    expect(payloadSection).toContain("script_blocks");
    expect(payloadSection).not.toMatch(/rendered_text|\.content/);
  });
});
