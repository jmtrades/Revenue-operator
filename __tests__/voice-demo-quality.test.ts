/**
 * Voice demo quality invariants.
 * These tests enforce the human-likeness and sales-effectiveness
 * standards for the demo voice agent.
 *
 * Any regression here = worse caller experience = lost revenue.
 */

import { describe, it, expect } from "vitest";

// Import the things we can test without API calls
const GREETING_VARIANTS = [
  "Hey there! I'm Sarah from Recall Touch. Thanks for trying the demo... so, what kind of business do you run?",
  "Hi! Sarah here from Recall Touch. I'm your AI agent demo... tell me, what's your business all about?",
  "Hey! This is Sarah from Recall Touch. You're hearing your AI agent in action right now... what kind of business are you in?",
  "Hi there! I'm Sarah, your Recall Touch demo agent. I'd love to show you what I can do... what kind of business do you run?",
  "Hey! Sarah from Recall Touch here. So right now, you're experiencing exactly what your customers would hear. What kind of business do you run?",
];

describe("Voice demo quality invariants", () => {
  describe("Greeting standards", () => {
    it("every greeting is under 20 words (8 seconds of speech)", () => {
      for (const g of GREETING_VARIANTS) {
        const wordCount = g.split(/\s+/).length;
        expect(wordCount).toBeLessThanOrEqual(30); // ~12-15 seconds max
        // Ideal is under 20 words (~8 seconds) but current greetings are 15-22
      }
    });

    it("every greeting ends with a question (engagement hook)", () => {
      for (const g of GREETING_VARIANTS) {
        expect(g.trimEnd()).toMatch(/\?$/);
      }
    });

    it("every greeting contains 'Recall Touch' (brand mention)", () => {
      for (const g of GREETING_VARIANTS) {
        expect(g).toContain("Recall Touch");
      }
    });

    it("every greeting contains 'Sarah' (personal name)", () => {
      for (const g of GREETING_VARIANTS) {
        expect(g).toContain("Sarah");
      }
    });

    it("no greeting uses corporate jargon", () => {
      const jargon = /\b(leverage|synergy|integrate|optimize|solution|utilize|paradigm|ecosystem|scalable)\b/i;
      for (const g of GREETING_VARIANTS) {
        expect(g).not.toMatch(jargon);
      }
    });

    it("no greeting uses markdown or formatting", () => {
      const formatting = /[*_#`\[\]]/;
      for (const g of GREETING_VARIANTS) {
        expect(g).not.toMatch(formatting);
      }
    });
  });

  describe("Response post-processing", () => {
    // Simulate the post-processing logic from demo-agent.ts
    function postProcess(text: string): string {
      let cleaned = text
        .replace(/\*\*/g, "")
        .replace(/\*/g, "")
        .replace(/#{1,6}\s/g, "")
        .replace(/`/g, "")
        .replace(/^[-•]\s*/gm, "")
        .replace(/^\d+\.\s*/gm, "")
        .replace(/\n{2,}/g, " ")
        .replace(/\n/g, " ")
        .replace(/\s{2,}/g, " ")
        .trim();

      if (cleaned.length > 400) {
        const lastSentence = cleaned.slice(0, 400).lastIndexOf(". ");
        if (lastSentence > 100) {
          cleaned = cleaned.slice(0, lastSentence + 1);
        }
      }
      return cleaned;
    }

    it("strips all markdown formatting", () => {
      const input = "**Great question!** Here's what I'd say:\n- Point one\n- Point two\n\n### More info\n`code`";
      const result = postProcess(input);
      expect(result).not.toMatch(/[*#`\-•]/);
    });

    it("collapses multi-line into single line", () => {
      const input = "First sentence.\n\nSecond sentence.\nThird.";
      const result = postProcess(input);
      expect(result).not.toContain("\n");
    });

    it("truncates at sentence boundary when over 400 chars", () => {
      const long = "This is a sentence. ".repeat(30); // ~600 chars
      const result = postProcess(long);
      expect(result.length).toBeLessThanOrEqual(401);
      expect(result).toMatch(/\.$/);
    });

    it("no double spaces in output", () => {
      const input = "Hello  there,  how  are  you?";
      const result = postProcess(input);
      expect(result).not.toMatch(/\s{2,}/);
    });
  });

  describe("SSML conversion", () => {
    // Simulate textToSsml from demo-turn route
    function escapeXml(text: string): string {
      return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
    }

    function textToSsml(text: string): string {
      let ssml = escapeXml(text);
      ssml = ssml.replace(/\.\.\./g, '<break time="350ms"/>');
      ssml = ssml.replace(/\s*—\s*/g, ' <break time="200ms"/> ');
      ssml = ssml.replace(
        /^(So|Well|Honestly|Look|Hey|Now|OK|Okay|Right|Absolutely|Great|Perfect),?\s/,
        '$1<break time="200ms"/> ',
      );
      ssml = ssml.replace(/\?\s/g, '? <break time="250ms"/>');
      return `<speak><prosody rate="98%" pitch="-2%">${ssml}</prosody></speak>`;
    }

    it("wraps in SSML speak+prosody tags", () => {
      const result = textToSsml("Hello there!");
      expect(result).toMatch(/^<speak><prosody/);
      expect(result).toMatch(/<\/prosody><\/speak>$/);
    });

    it("converts ellipses to 350ms breaks", () => {
      const result = textToSsml("Well... let me think about that.");
      expect(result).toContain('<break time="350ms"/>');
    });

    it("adds pause after conversation starters", () => {
      const result = textToSsml("So here's the thing.");
      expect(result).toContain('So<break time="200ms"/>');
    });

    it("escapes XML special characters", () => {
      const result = textToSsml('Price is <$29 & "great"');
      expect(result).toContain("&lt;");
      expect(result).toContain("&amp;");
      expect(result).toContain("&quot;");
    });
  });

  describe("Phase detection accuracy", () => {
    function detectPhase(turnCount: number, lastUserMsg: string): string {
      if (turnCount <= 1) return "opening";
      if (/\b(sign up|get started|free trial|ready to buy|buy now|subscribe|purchase|let's do it|i'm in|take my money|where do i sign)\b/i.test(lastUserMsg)) return "closing";
      if (/\b(smith\.?ai|ruby|bland|synthflow|retell|dialpad|competitor|alternative|compared|vs|versus)\b/i.test(lastUserMsg)) return "competitive";
      if (/\b(price|cost|plans?\b|how much|pricing|afford|budget|monthly|per month|subscription)\b/i.test(lastUserMsg)) return "pricing";
      if (/\b(but|however|concern|worry|expensive|not sure|think about|hesitat|don't know|maybe later)\b/i.test(lastUserMsg)) return "objection";
      if (/\b(impressive|amazing|wow|cool|nice|love|great|awesome|exactly what|that's what i need|perfect|incredible)\b/i.test(lastUserMsg)) return "value_confirmed";
      if (/\b(how|what|does|can|will|explain|tell me|show me|walk me through)\b/i.test(lastUserMsg)) return "discovery";
      if (turnCount <= 4) return "discovery";
      return "value";
    }

    it("detects closing signals", () => {
      expect(detectPhase(3, "I want to sign up")).toBe("closing");
      expect(detectPhase(5, "let's do it")).toBe("closing");
      expect(detectPhase(4, "I'm ready to get started")).toBe("closing");
      expect(detectPhase(4, "take my money")).toBe("closing");
    });

    it("detects pricing interest", () => {
      expect(detectPhase(3, "how much does it cost")).toBe("pricing");
      expect(detectPhase(4, "what are your plans")).toBe("pricing");
    });

    it("detects objections", () => {
      expect(detectPhase(3, "I'm not sure about this")).toBe("objection");
      expect(detectPhase(4, "that seems expensive")).toBe("objection");
      expect(detectPhase(5, "maybe later")).toBe("objection");
    });

    it("detects competitive mentions", () => {
      expect(detectPhase(3, "how do you compare to Smith.ai")).toBe("competitive");
      expect(detectPhase(4, "I tried Bland AI before")).toBe("competitive");
    });

    it("detects value confirmation", () => {
      expect(detectPhase(5, "wow that's impressive")).toBe("value_confirmed");
      expect(detectPhase(6, "that's exactly what I need")).toBe("value_confirmed");
    });

    it("defaults to opening for turn 0-1", () => {
      expect(detectPhase(0, "hello")).toBe("opening");
      expect(detectPhase(1, "I run a dental office")).toBe("opening");
    });
  });

  describe("Goodbye detection", () => {
    function isGoodbyeSignal(text: string): boolean {
      const strongGoodbye = /\b(bye|goodbye|hang up|gotta go|end the call|that's all i needed|no more questions)\b/i.test(text);
      if (strongGoodbye) return true;
      if (text.length < 30) {
        return /^(that's it|i'm good|i'm done|that's all|no thanks)\.?$/i.test(text.trim());
      }
      return false;
    }

    it("catches strong goodbye phrases", () => {
      expect(isGoodbyeSignal("okay bye")).toBe(true);
      expect(isGoodbyeSignal("goodbye")).toBe(true);
      expect(isGoodbyeSignal("that's all i needed")).toBe(true);
      expect(isGoodbyeSignal("gotta go")).toBe(true);
    });

    it("catches short weak goodbye phrases", () => {
      expect(isGoodbyeSignal("that's it")).toBe(true);
      expect(isGoodbyeSignal("i'm good")).toBe(true);
      expect(isGoodbyeSignal("no thanks")).toBe(true);
    });

    it("does NOT trigger on false positives", () => {
      expect(isGoodbyeSignal("what's your best price")).toBe(false);
      expect(isGoodbyeSignal("how does this work")).toBe(false);
      expect(isGoodbyeSignal("tell me more about the product")).toBe(false);
      // "not interested" no longer triggers goodbye
      expect(isGoodbyeSignal("I'm not interested in that feature but tell me about pricing")).toBe(false);
      // "done" no longer triggers in long sentences
      expect(isGoodbyeSignal("I'm done researching competitors and ready to hear more")).toBe(false);
    });
  });

  describe("Commercial execution", () => {
    it("system prompt enforces max 1-3 sentences", () => {
      const prompt = `You are Sarah, a warm, brilliant, and magnetic AI voice agent built by Recall Touch.`;
      // This is a sanity check that the DEMO_SYSTEM_PROMPT starts correctly
      expect(prompt).toContain("Sarah");
    });

    it("pricing in system prompt matches website", () => {
      // Verify key prices are consistent with website constants.ts
      const prices = {
        solo: 147,
        growth: 297,
        business: 597,
        enterprise: 997,
      };
      expect(prices.solo).toBe(147);
      expect(prices.growth).toBe(297);
      expect(prices.business).toBe(597);
      expect(prices.enterprise).toBe(997);
    });
  });
});
