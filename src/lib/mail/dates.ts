/**
 * Pull dates and times out of a thread so you can file them on a calendar.
 * Deliberately small — mail phrasing, not a general NLP engine.
 */
import {
  addDays,
  addHours,
  format,
  isThisWeek,
  isToday,
  setHours,
  setMinutes,
  startOfDay,
} from "date-fns";
import type { Thread } from "./types";

export type DateHit = {
  text: string;
  start: Date;
  end: Date;
  allDay: boolean;
};

const MONTHS: Record<string, number> = {
  jan: 0,
  january: 0,
  feb: 1,
  february: 1,
  mar: 2,
  march: 2,
  apr: 3,
  april: 3,
  may: 4,
  jun: 5,
  june: 5,
  jul: 6,
  july: 6,
  aug: 7,
  august: 7,
  sep: 8,
  sept: 8,
  september: 8,
  oct: 9,
  october: 9,
  nov: 10,
  november: 10,
  dec: 11,
  december: 11,
};

const WEEKDAYS: Record<string, number> = {
  sun: 0,
  sunday: 0,
  mon: 1,
  monday: 1,
  tue: 2,
  tues: 2,
  tuesday: 2,
  wed: 3,
  wednesday: 3,
  thu: 4,
  thur: 4,
  thurs: 4,
  thursday: 4,
  fri: 5,
  friday: 5,
  sat: 6,
  saturday: 6,
};

const TIME =
  "(?:at\\s+)?((?:noon|midnight|morning|afternoon|evening)|(?:\\d{1,2}(?::\\d{2})?\\s*(?:a\\.?m\\.?|p\\.?m\\.?)?)|(?:\\d{1,2}:\\d{2}))";
const RANGE = `(?:\\s*[-–—]|\\s+to\\s+)\\s*${TIME}`;

function atHour(day: Date, h: number, m = 0): Date {
  return setMinutes(setHours(startOfDay(day), h), m);
}

function parseTime(raw: string): { h: number; m: number } | null {
  const s = raw.trim().toLowerCase().replace(/\./g, "");
  if (s === "noon") return { h: 12, m: 0 };
  if (s === "midnight") return { h: 0, m: 0 };
  if (s === "morning") return { h: 9, m: 0 };
  if (s === "afternoon") return { h: 14, m: 0 };
  if (s === "evening") return { h: 18, m: 0 };
  const m = /^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/.exec(s);
  if (!m) return null;
  let h = Number(m[1]);
  const min = Number(m[2] || 0);
  if (min > 59) return null;
  const ap = m[3];
  if (ap === "pm" && h < 12) h += 12;
  else if (ap === "am" && h === 12) h = 0;
  else if (!ap) {
    if (h > 23) return null;
    if (h < 7) h += 12;
  }
  if (h > 23) return null;
  return { h, m: min };
}

function applyTime(day: Date, timeRaw: string | undefined, endRaw: string | undefined): { start: Date; end: Date; allDay: boolean } {
  const t = timeRaw ? parseTime(timeRaw) : null;
  if (!t) {
    const start = atHour(day, 9, 0);
    return { start, end: addHours(start, 1), allDay: true };
  }
  const start = atHour(day, t.h, t.m);
  const endT = endRaw ? parseTime(endRaw) : null;
  const end = endT ? atHour(day, endT.h, endT.m) : addHours(start, 1);
  const safeEnd = end.getTime() <= start.getTime() ? addHours(start, 1) : end;
  return { start, end: safeEnd, allDay: false };
}

function weekdayOn(from: Date, weekday: number, nextWeek: boolean): Date {
  const d = startOfDay(from);
  let delta = (weekday - d.getDay() + 7) % 7;
  if (nextWeek) delta = delta === 0 ? 7 : delta;
  else if (delta === 0 && from.getHours() >= 21) delta = 7;
  return addDays(d, delta);
}

function monthDay(now: Date, month: number, day: number, year?: number): Date | null {
  if (day < 1 || day > 31) return null;
  const y = year && year > 1970 ? year : now.getFullYear();
  let d = new Date(y, month, day);
  if (d.getMonth() !== month) return null;
  if (!year && d.getTime() < startOfDay(now).getTime() - 36 * 3600_000) {
    d = new Date(y + 1, month, day);
  }
  return d;
}

function numericDate(now: Date, a: number, b: number, year?: number): Date | null {
  if (a > 12 && b <= 12) return monthDay(now, b - 1, a, year);
  return monthDay(now, a - 1, b, year);
}

function yearOf(raw?: string): number | undefined {
  if (!raw) return undefined;
  const n = Number(raw);
  if (n < 100) return 2000 + n;
  return n;
}

function push(
  hits: DateHit[],
  now: Date,
  text: string,
  day: Date | null,
  timeRaw?: string,
  endRaw?: string,
) {
  if (!day || Number.isNaN(day.getTime())) return;
  const { start, end, allDay } = applyTime(day, timeRaw, endRaw);
  const tooOld = start.getTime() < now.getTime() - 48 * 3600_000;
  if (tooOld) return;
  const tooFar = start.getTime() > now.getTime() + 400 * 24 * 3600_000;
  if (tooFar) return;
  const key = `${start.toISOString()}|${allDay ? "d" : "t"}`;
  if (hits.some((h) => `${h.start.toISOString()}|${h.allDay ? "d" : "t"}` === key)) return;
  const near = hits.find((h) => Math.abs(h.start.getTime() - start.getTime()) < 20 * 60_000);
  if (near) {
    if (near.allDay && !allDay) {
      near.start = start;
      near.end = end;
      near.allDay = false;
      near.text = text.trim();
    }
    return;
  }
  hits.push({ text: text.trim().replace(/\s+/g, " "), start, end, allDay });
}

function scan(text: string, now: Date): DateHit[] {
  const hits: DateHit[] = [];
  const src = text.replace(/\r/g, "");

  const combo: Array<{ re: RegExp; day: (m: RegExpExecArray) => Date | null; time: number; end?: number }> = [
    {
      re: new RegExp(`\\b(today|tomorrow|tonight)\\b(?:\\s+${TIME})?(?:${RANGE})?`, "gi"),
      day: (m) => {
        const w = m[1]!.toLowerCase();
        if (w === "today") return startOfDay(now);
        if (w === "tonight") return startOfDay(now);
        return addDays(startOfDay(now), 1);
      },
      time: 2,
      end: 3,
    },
    {
      re: new RegExp(`\\b(?:next\\s+)?(sunday|monday|tuesday|wednesday|thursday|friday|saturday|sun|mon|tue|tues|wed|thu|thur|thurs|fri|sat)\\b(?:\\s+${TIME})?(?:${RANGE})?`, "gi"),
      day: (m) => {
        const next = /^\s*next\s+/i.test(m[0]);
        const wd = WEEKDAYS[m[1]!.toLowerCase()];
        if (wd == null) return null;
        return weekdayOn(now, wd, next);
      },
      time: 2,
      end: 3,
    },
    {
      re: new RegExp(
        `\\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s*(\\d{4}))?(?:\\s+${TIME})?(?:${RANGE})?`,
        "gi",
      ),
      day: (m) => monthDay(now, MONTHS[m[1]!.toLowerCase()]!, Number(m[2]), yearOf(m[3])),
      time: 4,
      end: 5,
    },
    {
      re: new RegExp(`\\b(\\d{1,2})[\\/\\-](\\d{1,2})(?:[\\/\\-](\\d{2,4}))?(?:\\s+${TIME})?(?:${RANGE})?`, "g"),
      day: (m) => numericDate(now, Number(m[1]), Number(m[2]), yearOf(m[3])),
      time: 4,
      end: 5,
    },
    {
      re: new RegExp(`\\b(\\d{4})-(\\d{2})-(\\d{2})(?:[ T]${TIME})?(?:${RANGE})?`, "g"),
      day: (m) => monthDay(now, Number(m[2]) - 1, Number(m[3]), Number(m[1])),
      time: 4,
      end: 5,
    },
  ];

  for (const spec of combo) {
    spec.re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = spec.re.exec(src))) {
      let timeRaw = m[spec.time];
      const word = m[1]?.toLowerCase();
      if (word === "tonight" && !timeRaw) timeRaw = "evening";
      push(hits, now, m[0], spec.day(m), timeRaw, spec.end != null ? m[spec.end] : undefined);
      if (hits.length >= 12) break;
    }
  }

  const timeOnly = new RegExp(`\\b(?:at\\s+)${TIME}(?:${RANGE})?`, "gi");
  let tm: RegExpExecArray | null;
  while ((tm = timeOnly.exec(src))) {
    const t = parseTime(tm[1] || "");
    if (!t) continue;
    let day = startOfDay(now);
    const start = atHour(day, t.h, t.m);
    if (start.getTime() < now.getTime() - 10 * 60_000) day = addDays(day, 1);
    push(hits, now, tm[0], day, tm[1], tm[2]);
  }

  return hits
    .sort((a, b) => a.start.getTime() - b.start.getTime() || Number(a.allDay) - Number(b.allDay))
    .slice(0, 6);
}

function threadText(thread: Thread): string {
  const parts = [thread.subject];
  const msgs = thread.messages.slice(-3);
  for (const m of msgs) {
    const body = (m.body || "")
      .split("\n")
      .filter((line) => !line.startsWith(">") && !/^on .+ wrote:$/i.test(line.trim()))
      .join("\n");
    parts.push(body);
  }
  return parts.join("\n").slice(0, 12_000);
}

export function parseThreadDates(thread: Thread, now = new Date()): DateHit[] {
  return scan(threadText(thread), now);
}

export function formatHit(hit: DateHit): string {
  if (hit.allDay) {
    if (isToday(hit.start)) return "Today";
    if (isThisWeek(hit.start, { weekStartsOn: 1 })) return format(hit.start, "EEE, MMM d");
    return format(hit.start, "MMM d");
  }
  if (isToday(hit.start)) return format(hit.start, "'Today' · h:mm a");
  if (isThisWeek(hit.start, { weekStartsOn: 1 })) return format(hit.start, "EEE · h:mm a");
  return format(hit.start, "MMM d · h:mm a");
}

export function defaultEventStart(now = new Date()): Date {
  const hour = Math.min(21, Math.max(8, now.getHours() + 1));
  return setMinutes(setHours(now, hour), 0);
}

const MARK = /omadash-thread:(\S+)/;

export function stampThread(description: string | undefined, threadId: string): string {
  const token = `omadash-thread:${encodeURIComponent(threadId)}`;
  const base = (description || "").replace(/\n?omadash-thread:\S+/g, "").trim();
  return base ? `${base}\n${token}` : token;
}

export function readThreadId(description?: string): string | undefined {
  if (!description) return undefined;
  const m = MARK.exec(description);
  if (!m?.[1]) return undefined;
  try {
    return decodeURIComponent(m[1]);
  } catch {
    return m[1];
  }
}
