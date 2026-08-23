import {
  addDays,
  addHours,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  isSameDay,
  isSameMonth,
  setDay,
  setHours,
  setMinutes,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { create } from "zustand";
import { counterpart } from "./format";
import { buildPersonalSeed, buildSeed } from "./seed";
import type { Thread } from "./types";

export type CalSource = "mail" | "local" | "caldav" | "google" | "ics";

export interface CalEvent {
  id: string;
  calendarId: string;
  title: string;
  start: string;
  end: string;
  where?: string;
  description?: string;
  rrule?: string;
  threadId?: string;
  who: string;
  box: 1 | 2;
  source: CalSource;
  remoteUid?: string;
  href?: string;
  etag?: string;
  accountId?: string;
  readOnly?: boolean;
}

export type CalColor = "unread" | "success" | "warn" | "accent" | "danger";

export interface CalAccount {
  id: string;
  provider: string;
  label: string;
  lastSync: string | null;
  lastError: string | null;
  color: string;
  readOnly: boolean;
}

export type CalendarFeed = {
  connected: boolean;
  googleOAuth: boolean;
  accounts: CalAccount[];
  events: CalEvent[];
};

const COLOR_DOT: Record<string, string> = {
  unread: "bg-unread",
  success: "bg-success",
  warn: "bg-warn",
  accent: "bg-accent",
  danger: "bg-danger",
};

export function colorDot(color?: string): string {
  return COLOR_DOT[color ?? ""] ?? "bg-unread";
}

export function eventColor(ev: CalEvent, accounts: CalAccount[]): string {
  if (ev.accountId) {
    const acc = accounts.find((a) => a.id === ev.accountId);
    if (acc) return colorDot(acc.color);
  }
  if (ev.source === "local") return "bg-accent";
  if (ev.source === "google") return "bg-warn";
  if (ev.source === "caldav") return "bg-success";
  if (ev.source === "ics") return "bg-muted";
  return "bg-unread";
}

export function visibleEvents(events: CalEvent[], hidden: string[]): CalEvent[] {
  if (hidden.length === 0) return events;
  return events.filter((e) => {
    if (hidden.includes(e.calendarId)) return false;
    if (e.accountId && hidden.includes(e.accountId)) return false;
    return true;
  });
}

export function eventSubline(ev: CalEvent): string {
  const bits: string[] = [];
  if (ev.source === "mail") bits.push(ev.who);
  else if (ev.source === "local") bits.push("On this device");
  else bits.push(ev.who);
  if (ev.where) bits.push(ev.where);
  return bits.join(" · ");
}


const PINNED: Array<{
  threadId: string;
  title: string;
  weekday: number;
  hour: number;
  minute: number;
  durationMin: number;
  where?: string;
  box: 1 | 2;
  roll: "next" | "this";
}> = [
  {
    threadId: "p-flight",
    title: "UA 1745 · MIA → SFO",
    weekday: 6,
    hour: 7,
    minute: 40,
    durationMin: 360,
    where: "Terminal 4",
    box: 2,
    roll: "this",
  },
  {
    threadId: "p-mom",
    title: "Sunday dinner",
    weekday: 0,
    hour: 18,
    minute: 0,
    durationMin: 120,
    where: "Home",
    box: 2,
    roll: "next",
  },
  {
    threadId: "t-jordan",
    title: "Omarchy ISO 3.1 cut",
    weekday: 1,
    hour: 9,
    minute: 0,
    durationMin: 60,
    box: 1,
    roll: "next",
  },
  {
    threadId: "t-elena",
    title: "Keyboard review",
    weekday: 4,
    hour: 14,
    minute: 0,
    durationMin: 30,
    where: "Cal.com · Elena Voss",
    box: 1,
    roll: "next",
  },
  {
    threadId: "t-riley",
    title: "Talk · Inbox at 120Hz",
    weekday: 4,
    hour: 11,
    minute: 20,
    durationMin: 40,
    where: "Linux.conf Hall B",
    box: 1,
    roll: "next",
  },
];

function place(now: Date, weekday: number, hour: number, minute: number, roll: "next" | "this"): Date {
  let d = setMinutes(setHours(setDay(now, weekday, { weekStartsOn: 0 }), hour), minute);
  if (roll === "next" && d.getTime() < now.getTime()) d = addDays(d, 7);
  return d;
}

export function threadsForCalendar(
  current: Thread[],
  source: "demo" | "imap",
  activeBoxId: string | null,
): Thread[] {
  if (source !== "demo") return current;
  const extra = activeBoxId === "demo-2" ? buildSeed() : buildPersonalSeed();
  const seen = new Set(current.map((t) => t.id));
  return [...current, ...extra.filter((t) => !seen.has(t.id))];
}

export function extractEvents(threads: Thread[], meEmail: string, now = new Date()): CalEvent[] {
  const byId = new Map(threads.map((t) => [t.id, t]));
  const events: CalEvent[] = [];
  const seen = new Set<string>();

  for (const p of PINNED) {
    const t = byId.get(p.threadId);
    if (!t) continue;
    const start = place(now, p.weekday, p.hour, p.minute, p.roll);
    const key = `${p.title}:${start.toISOString()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    events.push({
      id: p.threadId,
      calendarId: "mail",
      title: p.title,
      start: start.toISOString(),
      end: addHours(start, p.durationMin / 60).toISOString(),
      where: p.where,
      threadId: p.threadId,
      who: counterpart(t, meEmail).name,
      box: p.box,
      source: "mail",
      readOnly: true,
    });
  }

  return events;
}

export function mergeEvents(...lists: CalEvent[][]): CalEvent[] {
  return lists.flat().sort((a, b) => a.start.localeCompare(b.start));
}

export function eventsOnDay(events: CalEvent[], day: Date): CalEvent[] {
  return events.filter((e) => isSameDay(new Date(e.start), day));
}

export function monthCells(month: Date): Date[] {
  const start = startOfWeek(startOfMonth(month), { weekStartsOn: 0 });
  const end = endOfWeek(endOfMonth(month), { weekStartsOn: 0 });
  return eachDayOfInterval({ start, end });
}

export function shiftDay(day: Date, delta: number): Date {
  return addDays(day, delta);
}

export function shiftMonth(month: Date, delta: number): Date {
  return addMonths(month, delta);
}

export function inMonth(day: Date, month: Date): boolean {
  return isSameMonth(day, month);
}

const LOCAL_KEY = "omadash-cal-v2";
const LOCAL_KEY_V1 = "omadash-cal-v1";

function nid() {
  return `c-${Math.random().toString(36).slice(2, 9)}`;
}

function loadLocals(): CalEvent[] {
  try {
    const raw = localStorage.getItem(LOCAL_KEY) ?? localStorage.getItem(LOCAL_KEY_V1);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { events?: CalEvent[]; locals?: CalEvent[] };
    const list = parsed.locals ?? parsed.events;
    if (!Array.isArray(list)) return [];
    return list
      .filter((e) => e && e.id && e.title && e.start)
      .map((e) => ({
        ...e,
        calendarId: e.calendarId || "local",
        source: "local" as const,
      }));
  } catch {
    return [];
  }
}

function persistLocals(locals: CalEvent[]) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify({ locals }));
  } catch {
    /* ignore */
  }
}

interface CalendarStore {
  locals: CalEvent[];
  remote: CalEvent[];
  accounts: CalAccount[];
  googleOAuth: boolean;
  connectOpen: boolean;
  syncing: boolean;
  hidden: string[];
  hydrated: boolean;
  hydrate: () => void;
  add: (input: { title: string; start: Date; durationMin: number; where?: string }) => CalEvent;
  remove: (id: string) => void;
  applyFeed: (feed: CalendarFeed) => void;
  clearRemote: () => void;
  setConnectOpen: (open: boolean) => void;
  setSyncing: (v: boolean) => void;
  toggleHidden: (calendarId: string) => void;
}

export const useCalendarStore = create<CalendarStore>((set, get) => ({
  locals: [],
  remote: [],
  accounts: [],
  googleOAuth: false,
  connectOpen: false,
  syncing: false,
  hidden: [],
  hydrated: false,
  hydrate: () => {
    if (get().hydrated) return;
    set({ hydrated: true, locals: loadLocals() });
  },
  add: ({ title, start, durationMin, where }) => {
    const event: CalEvent = {
      id: nid(),
      calendarId: "local",
      title: title.trim(),
      start: start.toISOString(),
      end: addHours(start, durationMin / 60).toISOString(),
      where: where?.trim() || undefined,
      who: "You",
      box: 1,
      source: "local",
    };
    const locals = [...get().locals, event].sort((a, b) => a.start.localeCompare(b.start));
    set({ locals });
    persistLocals(locals);
    return event;
  },
  remove: (id) => {
    const locals = get().locals.filter((e) => e.id !== id);
    set({ locals });
    persistLocals(locals);
  },
  applyFeed: (feed) => {
    set({
      remote: feed.events,
      accounts: feed.accounts,
      googleOAuth: feed.googleOAuth,
      syncing: false,
    });
  },
  clearRemote: () => set({ remote: [], accounts: [], googleOAuth: false, syncing: false }),
  setConnectOpen: (connectOpen) => set({ connectOpen }),
  setSyncing: (syncing) => set({ syncing }),
  toggleHidden: (calendarId) => {
    const hidden = get().hidden.includes(calendarId)
      ? get().hidden.filter((id) => id !== calendarId)
      : [...get().hidden, calendarId];
    set({ hidden });
  },
}));
