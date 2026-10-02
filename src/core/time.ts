// Timezone-aware helpers built on Intl (no dependencies, works in Workers and Node).

export interface ZonedParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  /** 0 = Sunday … 6 = Saturday. */
  weekday: number;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const fmtCache = new Map<string, Intl.DateTimeFormat>();

function formatter(tz: string): Intl.DateTimeFormat {
  let f = fmtCache.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      weekday: "short",
    });
    fmtCache.set(tz, f);
  }
  return f;
}

export function zonedParts(ts: number, tz: string): ZonedParts {
  const parts: Record<string, string> = {};
  for (const p of formatter(tz).formatToParts(new Date(ts))) parts[p.type] = p.value;
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    weekday: WEEKDAYS.indexOf(parts.weekday),
  };
}

/** Converts a wall-clock time in `tz` to epoch millis. */
export function zonedTimeToUtc(year: number, month: number, day: number, hour: number, minute: number, tz: string): number {
  const guess = Date.UTC(year, month - 1, day, hour, minute);
  let ts = guess;
  // Two passes settle the offset, including across DST transitions.
  for (let i = 0; i < 2; i++) {
    const p = zonedParts(ts, tz);
    const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute);
    ts += guess - asUtc;
  }
  return ts;
}

export function parseHHMM(s: string): { hour: number; minute: number } {
  const [h, m] = s.split(":").map(Number);
  return { hour: h || 0, minute: m || 0 };
}

/** Start of the local day containing `ts`, plus `offsetDays`, at HH:MM local. */
export function localTimeOnDay(ts: number, tz: string, hhmm: string, offsetDays = 0): number {
  const p = zonedParts(ts, tz);
  const { hour, minute } = parseHHMM(hhmm);
  const d = new Date(Date.UTC(p.year, p.month - 1, p.day + offsetDays));
  return zonedTimeToUtc(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate(), hour, minute, tz);
}

/** The next occurrence of HH:MM local time strictly after `now`. */
export function nextLocalTime(now: number, tz: string, hhmm: string): number {
  for (let i = 0; i < 3; i++) {
    const t = localTimeOnDay(now, tz, hhmm, i);
    if (t > now) return t;
  }
  return localTimeOnDay(now, tz, hhmm, 1);
}

/** Adds N business days (Mon–Fri in `tz`), keeping the local time of day. */
export function addBusinessDays(ts: number, n: number, tz: string): number {
  let t = ts;
  let added = 0;
  while (added < n) {
    t += 24 * 3600 * 1000;
    const wd = zonedParts(t, tz).weekday;
    if (wd !== 0 && wd !== 6) added++;
  }
  return t;
}

/** Resolves "monday", "tomorrow", "next week" etc. to the user's next briefing time on that day. */
export function resolveRelativeDay(word: string, now: number, tz: string, hhmm = "08:00"): number | null {
  const w = word.trim().toLowerCase();
  const today = zonedParts(now, tz).weekday;
  if (w === "today") return Math.max(now, localTimeOnDay(now, tz, hhmm, 0));
  if (w === "tomorrow") return localTimeOnDay(now, tz, hhmm, 1);
  if (w === "next week") return localTimeOnDay(now, tz, hhmm, ((8 - today) % 7) || 7);
  const idx = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"].findIndex(
    (d) => d === w || d.slice(0, 3) === w,
  );
  if (idx < 0) return null;
  const delta = ((idx - today + 7) % 7) || 7;
  return localTimeOnDay(now, tz, hhmm, delta);
}

export function formatLocal(ts: number, tz: string, opts: Intl.DateTimeFormatOptions = {}): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    ...opts,
  }).format(new Date(ts));
}
