/**
 * Phase 25 — Playbook compliance scorer.
 */

import { describe, it, expect } from "vitest";
import {
  scorePlaybookCompliance,
  getDefaultProspectingPlaybook,
  type Playbook,
  type TranscriptTurn,
} from "../src/lib/sales/playbook-compliance";

const completeTranscript: TranscriptTurn[] = [
  { speaker: "rep", text: "Hi, my name is Alice calling from Acme Corp. This call may be recorded for quality purposes." },
  { speaker: "lead", text: "Okay." },
  { speaker: "rep", text: "The reason I'm calling is we help SaaS companies with outbound automation. Can I ask what tools you currently use?" },
  { speaker: "lead", text: "We use HubSpot." },
  { speaker: "rep", text: "Great. What if we schedule a meeting next week to walk through a demo?" },
  { speaker: "lead", text: "Sure." },
  { speaker: "rep", text: "Perfect, I'll send a calendar invite. That's our next step." },
];

const partialTranscript: TranscriptTurn[] = [
  { speaker: "rep", text: "Hi, my name is Bob. We offer CRM services." },
  { speaker: "lead", text: "What?" },
];

describe("scorePlaybookCompliance — default playbook", () => {
  it("scores a complete transcript highly", () => {
    const r = scorePlaybookCompliance({
      playbook: getDefaultProspectingPlaybook(),
      turns: completeTranscript,
    });
    expect(r.score).toBeGreaterThanOrEqual(90);
    expect(r.coveredCount).toBe(r.totalCount);
  });

  it("scores a partial transcript low", () => {
    const r = scorePlaybookCompliance({
      playbook: getDefaultProspectingPlaybook(),
      turns: partialTranscript,
    });
    expect(r.score).toBeLessThan(50);
    expect(r.coveredCount).toBeLessThan(r.totalCount);
  });

  it("identifies specific missed sections", () => {
    const r = scorePlaybookCompliance({
      playbook: getDefaultProspectingPlaybook(),
      turns: partialTranscript,
    });
    const missedIds = r.sections.filter((s) => !s.covered).map((s) => s.sectionId);
    expect(missedIds).toContain("recording_disclosure");
    expect(missedIds).toContain("next_steps");
  });
});

describe("scorePlaybookCompliance — literal matches", () => {
  it("matches literal phrases case-insensitively", () => {
    const pb: Playbook = {
      id: "p",
      name: "p",
      sections: [
        { id: "s", label: "exact", patterns: [{ type: "literal", phrase: "thank you for your business" }] },
      ],
    };
    const r = scorePlaybookCompliance({
      playbook: pb,
      turns: [{ speaker: "rep", text: "Thank YOU for your Business today!" }],
    });
    expect(r.sections[0].covered).toBe(true);
  });
});

describe("scorePlaybookCompliance — regex patterns", () => {
  it("matches regex patterns", () => {
    const pb: Playbook = {
      id: "p",
      name: "p",
      sections: [
        {
          id: "s",
          label: "has-phone",
          patterns: [
            { type: "regex", pattern: "\\(?\\d{3}\\)?[-. ]?\\d{3}[-. ]?\\d{4}", flags: "" },
          ],
        },
      ],
    };
    const r = scorePlaybookCompliance({
      playbook: pb,
      turns: [{ speaker: "rep", text: "Call me at 415-555-1234." }],
    });
    expect(r.sections[0].covered).toBe(true);
    expect(r.sections[0].matchedExcerpt).toBe("415-555-1234");
  });

  it("handles invalid regex gracefully", () => {
    const pb: Playbook = {
      id: "p",
      name: "p",
      sections: [
        { id: "s", label: "broken", patterns: [{ type: "regex", pattern: "(unclosed" }] },
      ],
    };
    const r = scorePlaybookCompliance({
      playbook: pb,
      turns: [{ speaker: "rep", text: "hello" }],
    });
    expect(r.sections[0].covered).toBe(false);
  });
});

describe("scorePlaybookCompliance — keyword clusters", () => {
  it("finds keywords within window", () => {
    const pb: Playbook = {
      id: "p",
      name: "p",
      sections: [
        {
          id: "s",
          label: "schedule-demo",
          patterns: [{ type: "keyword_cluster", keywords: ["schedule", "demo"], maxWordsBetween: 5 }],
        },
      ],
    };
    const r = scorePlaybookCompliance({
      playbook: pb,
      turns: [{ speaker: "rep", text: "Let's schedule a short demo for next week." }],
    });
    expect(r.sections[0].covered).toBe(true);
  });

  it("rejects keywords too far apart", () => {
    const pb: Playbook = {
      id: "p",
      name: "p",
      sections: [
        {
          id: "s",
          label: "close-words",
          patterns: [{ type: "keyword_cluster", keywords: ["schedule", "demo"], maxWordsBetween: 2 }],
        },
      ],
    };
    const r = scorePlaybookCompliance({
      playbook: pb,
      turns: [{ speaker: "rep", text: "Schedule something and also if we have time maybe a demo." }],
    });
    expect(r.sections[0].covered).toBe(false);
  });
});

describe("scorePlaybookCompliance — speaker requirements", () => {
  it("defaults to requiring rep speaker", () => {
    const pb: Playbook = {
      id: "p",
      name: "p",
      sections: [
        { id: "s", label: "disclosure", patterns: [{ type: "literal", phrase: "recorded" }] },
      ],
    };
    const r = scorePlaybookCompliance({
      playbook: pb,
      turns: [{ speaker: "lead", text: "Am I being recorded?" }],
    });
    expect(r.sections[0].covered).toBe(false);
  });

  it("accepts from any speaker with requiredFrom=any", () => {
    const pb: Playbook = {
      id: "p",
      name: "p",
      sections: [
        {
          id: "s",
          label: "disclosure",
          patterns: [{ type: "literal", phrase: "recorded" }],
          requiredFrom: ["any"],
        },
      ],
    };
    const r = scorePlaybookCompliance({
      playbook: pb,
      turns: [{ speaker: "lead", text: "Am I being recorded?" }],
    });
    expect(r.sections[0].covered).toBe(true);
  });
});

describe("scorePlaybookCompliance — weighting", () => {
  it("weights impact the score", () => {
    const pb: Playbook = {
      id: "p",
      name: "p",
      sections: [
        { id: "critical", label: "critical", weight: 0.9, patterns: [{ type: "literal", phrase: "recorded" }] },
        { id: "minor", label: "minor", weight: 0.1, patterns: [{ type: "literal", phrase: "sunny" }] },
      ],
    };
    const missCritical = scorePlaybookCompliance({
      playbook: pb,
      turns: [{ speaker: "rep", text: "What a sunny day" }],
    });
    const missMinor = scorePlaybookCompliance({
      playbook: pb,
      turns: [{ speaker: "rep", text: "This call may be recorded" }],
    });
    expect(missCritical.score).toBeLessThan(missMinor.score);
  });
});

describe("scorePlaybookCompliance — coaching feedback", () => {
  it("notes critical misses specifically", () => {
    const pb: Playbook = {
      id: "p",
      name: "p",
      sections: [
        { id: "recording", label: "Recording disclosure", weight: 0.9, patterns: [{ type: "literal", phrase: "recorded" }] },
      ],
    };
    const r = scorePlaybookCompliance({
      playbook: pb,
      turns: [{ speaker: "rep", text: "Nothing relevant" }],
    });
    expect(r.coachingFeedback.some((f) => f.includes("critical"))).toBe(true);
  });

  it("produces all-covered message on perfect score", () => {
    const pb: Playbook = {
      id: "p",
      name: "p",
      sections: [
        { id: "greeting", label: "greet", patterns: [{ type: "literal", phrase: "hello" }] },
      ],
    };
    const r = scorePlaybookCompliance({
      playbook: pb,
      turns: [{ speaker: "rep", text: "Hello there" }],
    });
    expect(r.coachingFeedback.some((f) => f.includes("All playbook sections"))).toBe(true);
  });
});
