/**
 * Phase 22 — Meeting scheduler availability calculator.
 */

import { describe, it, expect } from "vitest";
import {
  calculateAvailability,
  groupSlotsByLocalDate,
  type HostAvailability,
} from "../src/lib/scheduling/availability-calculator";

const ET_OFFSET = -300;

function makeHost(overrides: Partial<HostAvailability> = {}): HostAvailability {
  return {
    hostId: "host-1",
    utcOffsetMinutes: ET_OFFSET,
    // 9am–5pm ET on weekdays
    workingHours: [
      { dayOfWeek: 1, startHour: 9, endHour: 17 },
      { dayOfWeek: 2, startHour: 9, endHour: 17 },
      { dayOfWeek: 3, startHour: 9, endHour: 17 },
      { dayOfWeek: 4, startHour: 9, endHour: 17 },
      { dayOfWeek: 5, startHour: 9, endHour: 17 },
    ],
    busy: [],
    ...overrides,
  };
}

describe("calculateAvailability — basic", () => {
  it("produces slots within working hours only", () => {
    const slots = calculateAvailability({
      hosts: [makeHost()],
      durationMinutes: 30,
      earliestUtc: "2026-04-22T00:00:00Z", // Wed
      latestUtc: "2026-04-23T00:00:00Z",
      slotStepMinutes: 30,
      minNoticeMinutes: 0,
      nowUtc: "2026-04-22T00:00:00Z",
    });
    // 9am ET = 14:00 UTC … 5pm ET = 22:00 UTC. 30-min slots → 16 slots, last starting 21:30.
    expect(slots.length).toBe(16);
    expect(slots[0].startUtc).toBe("2026-04-22T14:00:00.000Z");
    expect(slots[slots.length - 1].startUtc).toBe("2026-04-22T21:30:00.000Z");
  });

  it("respects meeting duration (60-min slots)", () => {
    const slots = calculateAvailability({
      hosts: [makeHost()],
      durationMinutes: 60,
      slotStepMinutes: 60,
      earliestUtc: "2026-04-22T00:00:00Z",
      latestUtc: "2026-04-23T00:00:00Z",
      nowUtc: "2026-04-22T00:00:00Z",
    });
    // 9am–5pm ET = 8 × 60-min starts. (9, 10, 11, 12, 13, 14, 15, 16).
    expect(slots.length).toBe(8);
  });

  it("returns empty on weekends when no working hours", () => {
    const slots = calculateAvailability({
      hosts: [makeHost()],
      durationMinutes: 30,
      earliestUtc: "2026-04-25T00:00:00Z", // Sat
      latestUtc: "2026-04-26T00:00:00Z",
      nowUtc: "2026-04-25T00:00:00Z",
    });
    expect(slots.length).toBe(0);
  });
});

describe("calculateAvailability — busy intervals", () => {
  it("excludes slots overlapping existing meetings", () => {
    const slots = calculateAvailability({
      hosts: [
        makeHost({
          busy: [
            { startUtc: "2026-04-22T14:00:00Z", endUtc: "2026-04-22T15:00:00Z" },
          ],
        }),
      ],
      durationMinutes: 30,
      earliestUtc: "2026-04-22T00:00:00Z",
      latestUtc: "2026-04-23T00:00:00Z",
      slotStepMinutes: 30,
      nowUtc: "2026-04-22T00:00:00Z",
    });
    // 14:00 and 14:30 should be blocked.
    expect(slots.some((s) => s.startUtc === "2026-04-22T14:00:00.000Z")).toBe(false);
    expect(slots.some((s) => s.startUtc === "2026-04-22T14:30:00.000Z")).toBe(false);
    // 15:00 should be open.
    expect(slots.some((s) => s.startUtc === "2026-04-22T15:00:00.000Z")).toBe(true);
  });

  it("applies buffer before/after busy intervals", () => {
    const slots = calculateAvailability({
      hosts: [
        makeHost({
          busy: [
            { startUtc: "2026-04-22T15:00:00Z", endUtc: "2026-04-22T16:00:00Z" },
          ],
        }),
      ],
      durationMinutes: 30,
      earliestUtc: "2026-04-22T00:00:00Z",
      latestUtc: "2026-04-23T00:00:00Z",
      slotStepMinutes: 30,
      bufferMinutes: 15,
      nowUtc: "2026-04-22T00:00:00Z",
    });
    // 14:30 ends at 15:00 — overlaps the 15-min buffer BEFORE the 15:00 busy block.
    expect(slots.some((s) => s.startUtc === "2026-04-22T14:30:00.000Z")).toBe(false);
    // 14:00 ends at 14:30 — comfortably before the 14:45 buffer edge, so kept.
    expect(slots.some((s) => s.startUtc === "2026-04-22T14:00:00.000Z")).toBe(true);
    // 16:00 would be inside the buffer AFTER the 16:00 end. 16:15 is the first safe slot.
    expect(slots.some((s) => s.startUtc === "2026-04-22T16:00:00.000Z")).toBe(false);
  });
});

describe("calculateAvailability — minimum notice", () => {
  it("drops slots before minimum notice window", () => {
    const slots = calculateAvailability({
      hosts: [makeHost()],
      durationMinutes: 30,
      slotStepMinutes: 30,
      earliestUtc: "2026-04-22T00:00:00Z",
      latestUtc: "2026-04-23T00:00:00Z",
      minNoticeMinutes: 60 * 4, // 4 hour notice
      nowUtc: "2026-04-22T14:00:00Z", // 10am ET
    });
    // Earliest bookable = 14:00 + 4h = 18:00Z. First slot must be 18:00 or later.
    const first = slots[0];
    expect(first.startUtc >= "2026-04-22T18:00:00.000Z").toBe(true);
  });
});

describe("calculateAvailability — multi-host", () => {
  it("any_available returns slot if ANY host is free", () => {
    const busyHost = makeHost({
      hostId: "A",
      busy: [{ startUtc: "2026-04-22T14:00:00Z", endUtc: "2026-04-22T22:00:00Z" }],
    });
    const freeHost = makeHost({ hostId: "B" });
    const slots = calculateAvailability({
      hosts: [busyHost, freeHost],
      strategy: "any_available",
      durationMinutes: 30,
      slotStepMinutes: 30,
      earliestUtc: "2026-04-22T14:00:00Z",
      latestUtc: "2026-04-22T16:00:00Z",
      nowUtc: "2026-04-22T00:00:00Z",
    });
    expect(slots.length).toBeGreaterThan(0);
    expect(slots[0].hostIds).toContain("B");
    expect(slots[0].hostIds).not.toContain("A");
  });

  it("all_required requires every host to be free", () => {
    const busyHost = makeHost({
      hostId: "A",
      busy: [{ startUtc: "2026-04-22T14:00:00Z", endUtc: "2026-04-22T15:00:00Z" }],
    });
    const freeHost = makeHost({ hostId: "B" });
    const slots = calculateAvailability({
      hosts: [busyHost, freeHost],
      strategy: "all_required",
      durationMinutes: 30,
      slotStepMinutes: 30,
      earliestUtc: "2026-04-22T14:00:00Z",
      latestUtc: "2026-04-22T16:00:00Z",
      nowUtc: "2026-04-22T00:00:00Z",
    });
    // 14:00, 14:30 blocked for A. 15:00, 15:30 both free.
    expect(slots.some((s) => s.startUtc === "2026-04-22T14:00:00.000Z")).toBe(false);
    expect(slots.some((s) => s.startUtc === "2026-04-22T15:00:00.000Z")).toBe(true);
    // All slots must list both hosts.
    for (const s of slots) {
      expect(s.hostIds).toContain("A");
      expect(s.hostIds).toContain("B");
    }
  });
});

describe("calculateAvailability — max-per-day cap", () => {
  it("enforces maxPerDay across the result", () => {
    const slots = calculateAvailability({
      hosts: [makeHost()],
      durationMinutes: 30,
      slotStepMinutes: 30,
      earliestUtc: "2026-04-22T00:00:00Z",
      latestUtc: "2026-04-23T00:00:00Z",
      maxPerDay: 3,
      nowUtc: "2026-04-22T00:00:00Z",
    });
    expect(slots.length).toBe(3);
  });
});

describe("calculateAvailability — edge cases", () => {
  it("returns empty when no hosts", () => {
    const slots = calculateAvailability({
      hosts: [],
      durationMinutes: 30,
      earliestUtc: "2026-04-22T00:00:00Z",
      latestUtc: "2026-04-23T00:00:00Z",
      nowUtc: "2026-04-22T00:00:00Z",
    });
    expect(slots.length).toBe(0);
  });

  it("returns empty when duration is 0 or negative", () => {
    const slots = calculateAvailability({
      hosts: [makeHost()],
      durationMinutes: 0,
      earliestUtc: "2026-04-22T00:00:00Z",
      latestUtc: "2026-04-23T00:00:00Z",
      nowUtc: "2026-04-22T00:00:00Z",
    });
    expect(slots.length).toBe(0);
  });

  it("handles fractional working hour boundaries (9:30am)", () => {
    const slots = calculateAvailability({
      hosts: [
        makeHost({
          workingHours: [{ dayOfWeek: 3, startHour: 9.5, endHour: 10 }],
        }),
      ],
      durationMinutes: 30,
      slotStepMinutes: 30,
      earliestUtc: "2026-04-22T00:00:00Z",
      latestUtc: "2026-04-23T00:00:00Z",
      nowUtc: "2026-04-22T00:00:00Z",
    });
    // 9:30am ET = 14:30 UTC. Single slot.
    expect(slots.length).toBe(1);
    expect(slots[0].startUtc).toBe("2026-04-22T14:30:00.000Z");
  });
});

describe("groupSlotsByLocalDate", () => {
  it("groups slots by lead local date", () => {
    const slots = [
      { startUtc: "2026-04-22T14:00:00.000Z", endUtc: "2026-04-22T14:30:00.000Z", hostIds: ["a"] },
      { startUtc: "2026-04-22T23:00:00.000Z", endUtc: "2026-04-22T23:30:00.000Z", hostIds: ["a"] },
      { startUtc: "2026-04-23T14:00:00.000Z", endUtc: "2026-04-23T14:30:00.000Z", hostIds: ["a"] },
    ];
    const grouped = groupSlotsByLocalDate(slots, ET_OFFSET);
    expect(grouped.length).toBe(2);
    expect(grouped[0].dateLabel).toBe("2026-04-22");
    expect(grouped[1].dateLabel).toBe("2026-04-23");
  });

  it("handles timezone wrap at midnight", () => {
    // 04:00 UTC = 23:00 prev-day Eastern (offset -300)
    const slots = [
      { startUtc: "2026-04-23T04:00:00.000Z", endUtc: "2026-04-23T04:30:00.000Z", hostIds: ["a"] },
    ];
    const grouped = groupSlotsByLocalDate(slots, ET_OFFSET);
    expect(grouped[0].dateLabel).toBe("2026-04-22");
  });
});
