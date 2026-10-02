import { describe, expect, it } from "vitest";
import { formatSlot, hasConflict, proposeSlots } from "../../src/core/slots";
import { addBusinessDays, localTimeOnDay, nextLocalTime, resolveRelativeDay, zonedParts, zonedTimeToUtc } from "../../src/core/time";
import { DEFAULT_SETTINGS } from "../../src/types";

const H = 3600 * 1000;

describe("timezone helpers", () => {
  it("converts wall-clock time in a zone to UTC, including DST zones", () => {
    expect(new Date(zonedTimeToUtc(2026, 10, 2, 9, 0, "Asia/Kolkata")).toISOString()).toBe("2026-10-02T03:30:00.000Z");
    expect(new Date(zonedTimeToUtc(2026, 7, 1, 9, 0, "America/New_York")).toISOString()).toBe("2026-07-01T13:00:00.000Z");
    expect(new Date(zonedTimeToUtc(2026, 12, 1, 9, 0, "America/New_York")).toISOString()).toBe("2026-12-01T14:00:00.000Z");
  });

  it("finds the next 08:00 local for the morning brief", () => {
    const now = Date.parse("2026-10-02T03:30:00Z"); // 09:00 IST Friday
    expect(new Date(nextLocalTime(now, "Asia/Kolkata", "08:00")).toISOString()).toBe("2026-10-03T02:30:00.000Z");
    expect(new Date(nextLocalTime(now, "Asia/Kolkata", "10:00")).toISOString()).toBe("2026-10-02T04:30:00.000Z");
  });

  it("adds business days across a weekend", () => {
    const fri = Date.parse("2026-10-02T10:00:00Z");
    expect(new Date(addBusinessDays(fri, 3, "UTC")).toISOString()).toBe("2026-10-07T10:00:00.000Z");
  });

  it("resolves snooze targets", () => {
    const fri = Date.parse("2026-10-02T10:00:00Z");
    expect(new Date(resolveRelativeDay("monday", fri, "UTC")!).toISOString()).toBe("2026-10-05T08:00:00.000Z");
    expect(new Date(resolveRelativeDay("tomorrow", fri, "UTC")!).toISOString()).toBe("2026-10-03T08:00:00.000Z");
    expect(new Date(resolveRelativeDay("fri", fri, "UTC")!).toISOString()).toBe("2026-10-09T08:00:00.000Z");
    expect(resolveRelativeDay("someday", fri, "UTC")).toBeNull();
  });
});

describe("slot proposal (FR-13)", () => {
  const settings = { ...DEFAULT_SETTINGS, timezone: "America/New_York" };
  const now = Date.parse("2026-10-02T13:00:00Z"); // Fri 09:00 EDT

  it("proposes one slot per working day, after the earliest-meeting preference", () => {
    const slots = proposeSlots({ now, busy: [], settings });
    expect(slots).toHaveLength(3);
    const parts = slots.map((s) => zonedParts(s.start, "America/New_York"));
    expect(parts.map((p) => p.weekday)).toEqual([5, 1, 2]); // Fri, Mon, Tue — skips the weekend
    expect(parts[0]).toMatchObject({ hour: 11, minute: 0 }); // 2h notice from 09:00
    expect(parts[1]).toMatchObject({ hour: 10, minute: 0 }); // meetings.earliest = 10:00
    for (const s of slots) expect(s.end - s.start).toBe(30 * 60 * 1000);
  });

  it("respects busy time plus buffers", () => {
    const mon10 = localTimeOnDay(now, "America/New_York", "10:00", 3);
    const busy = [{ start: mon10, end: mon10 + H }];
    const slots = proposeSlots({ now, busy, settings, count: 2, minNoticeMinutes: 60 * 24 * 3 });
    // Busy 10–11 with a 15 min buffer → the 11:00 start is blocked, first free is 11:30.
    expect(zonedParts(slots[0].start, "America/New_York")).toMatchObject({ weekday: 1, hour: 11, minute: 30 });
  });

  it("returns nothing when the calendar is full", () => {
    const busy = [{ start: now, end: now + 30 * 24 * H }];
    expect(proposeSlots({ now, busy, settings })).toEqual([]);
  });

  it("formats slots in the user's timezone", () => {
    const s = localTimeOnDay(now, "America/New_York", "10:00", 3);
    expect(formatSlot({ start: s, end: s + 30 * 60 * 1000 }, "America/New_York")).toBe("Mon, Oct 5, 10:00 AM – 10:30 AM EDT");
  });

  it("detects RSVP conflicts", () => {
    expect(hasConflict({ start: 0, end: 10 }, [{ start: 5, end: 15 }])).toBe(true);
    expect(hasConflict({ start: 0, end: 10 }, [{ start: 10, end: 15 }])).toBe(false);
    expect(hasConflict({ start: 0, end: 10 }, [{ start: 0, end: 10 }])).toBe(false); // the event itself
  });
});
