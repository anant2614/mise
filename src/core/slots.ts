// FR-13: propose 2–3 meeting slots from free/busy, working hours and preferences.

import type { Interval, UserSettings } from "../types";
import { formatLocal, localTimeOnDay, parseHHMM, zonedParts } from "./time";

export interface SlotOptions {
  now: number;
  busy: Interval[];
  settings: Pick<UserSettings, "timezone" | "workingHours" | "meetings">;
  durationMinutes?: number;
  count?: number;
  /** How many calendar days ahead to search. */
  horizonDays?: number;
  /** Don't propose anything sooner than this from now. */
  minNoticeMinutes?: number;
}

const MIN = 60 * 1000;

function overlaps(a: Interval, b: Interval): boolean {
  return a.start < b.end && b.start < a.end;
}

/**
 * Returns up to `count` free slots, at most one per day so the other side gets real choice,
 * preferring the earliest acceptable time on each day. Slots start on 30-minute boundaries.
 */
export function proposeSlots(opts: SlotOptions): Interval[] {
  const { settings, now } = opts;
  const tz = settings.timezone;
  const duration = (opts.durationMinutes ?? settings.meetings.durationMinutes) * MIN;
  const buffer = settings.meetings.bufferMinutes * MIN;
  const count = opts.count ?? 3;
  const horizon = opts.horizonDays ?? 10;
  const earliestStart = now + (opts.minNoticeMinutes ?? 120) * MIN;
  const busy = opts.busy.map((b) => ({ start: b.start - buffer, end: b.end + buffer }));

  const wh = settings.workingHours;
  const startHHMM =
    parseHHMM(settings.meetings.earliest).hour * 60 + parseHHMM(settings.meetings.earliest).minute >
    parseHHMM(wh.start).hour * 60 + parseHHMM(wh.start).minute
      ? settings.meetings.earliest
      : wh.start;

  const slots: Interval[] = [];
  for (let d = 0; d <= horizon && slots.length < count; d++) {
    const dayStart = localTimeOnDay(now, tz, startHHMM, d);
    const dayEnd = localTimeOnDay(now, tz, wh.end, d);
    if (!wh.days.includes(zonedParts(dayStart, tz).weekday)) continue;
    for (let t = dayStart; t + duration <= dayEnd; t += 30 * MIN) {
      if (t < earliestStart) continue;
      const candidate = { start: t, end: t + duration };
      if (busy.some((b) => overlaps(candidate, b))) continue;
      slots.push(candidate);
      break;
    }
  }
  return slots;
}

export function formatSlot(slot: Interval, tz: string): string {
  const start = formatLocal(slot.start, tz);
  const end = formatLocal(slot.end, tz, { weekday: undefined, month: undefined, day: undefined, timeZoneName: "short" });
  return `${start} – ${end}`;
}

/** FR-15: is the event's time free on the user's calendar (ignoring the event itself)? */
export function hasConflict(event: Interval, busy: Interval[]): boolean {
  return busy.some((b) => overlaps(event, b) && !(b.start === event.start && b.end === event.end));
}
