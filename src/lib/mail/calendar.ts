import {
  addDays,
  addHours,
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { create } from "zustand";
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

export type CalColor = "unread" | "success" | "warn" | "accent" | "danger" | "avatar-1" | "avatar-3" | "avatar-4";

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
  "avatar-1": "bg-avatar-1",
  "avatar-3": "bg-avatar-3",
  "avatar-4": "bg-avatar-4",
};

const COLOR_FILL: Record<string, string> = {
  unread: "bg-unread/20",
  success: "bg-success/20",
  warn: "bg-warn/20",
  accent: "bg-accent/20",
  danger: "bg-danger/20",
  "avatar-1": "bg-avatar-1/20",
  "avatar-3": "bg-avatar-3/20",
  "avatar-4": "bg-avatar-4/20",
};

export function colorDot(color?: string): string {
  return COLOR_DOT[color ?? ""] ?? "bg-unread";
}

export function eventColor(ev: CalEvent, accounts: CalAccount[]): string {
  return eventTone(ev, accounts).dot;
}

export function eventTone(
  ev: CalEvent,
  accounts: CalAccount[],
): { key: string; dot: string; fill: string } {
  let key = "unread";
  if (ev.accountId) {
    const acc = accounts.find((a) => a.id === ev.accountId);
    if (acc && COLOR_DOT[acc.color]) key = acc.color;
  } else if (ev.source === "local") key = "accent";
  else if (ev.source === "google") key = "warn";
  else if (ev.source === "caldav") key = "success";
  else if (ev.source === "ics") key = "unread";
  return {
    key,
    dot: COLOR_DOT[key] ?? "bg-unread",
    fill: COLOR_FILL[key] ?? "bg-unread/20",
  };
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
  if (ev.threadId) bits.push("From mail");
  else if (ev.source === "mail") bits.push(ev.who);
  else if (ev.source === "local") bits.push("On this device");
  else bits.push(ev.who);
  if (ev.where) bits.push(ev.where);
  return bits.join(" · ");
}

export function threadsForCalendar(
  current: Thread[],
  _source: "demo" | "imap",
  _activeBoxId: string | null,
): Thread[] {
  return current;
}

export function extractEvents(_threads: Thread[], _meEmail: string, _now = new Date()): CalEvent[] {
  return [];
}

export function mergeEvents(...lists: CalEvent[][]): CalEvent[] {
  return lists.flat().sort((a, b) => a.start.localeCompare(b.start));
}

export function eventsOnDay(events: CalEvent[], day: Date): CalEvent[] {
  return events.filter((e) => isSameDay(new Date(e.start), day));
}

export type CalView = "day" | "week" | "work" | "month" | "agenda";

export const CAL_VIEWS: { id: CalView; label: string; key: string }[] = [
  { id: "day", label: "Day", key: "D" },
  { id: "week", label: "Week", key: "W" },
  { id: "work", label: "Work", key: "F" },
  { id: "month", label: "Month", key: "M" },
  { id: "agenda", label: "Agenda", key: "A" },
];

export function cycleView(current: CalView): CalView {
  const ids = CAL_VIEWS.map((v) => v.id);
  const idx = Math.max(0, ids.indexOf(current));
  return ids[(idx + 1) % ids.length]!;
}

export const HOUR_PX = 48;

export const TZ_OPTIONS = [
  { id: "America/New_York", short: "NY", label: "New York" },
  { id: "America/Chicago", short: "CHI", label: "Chicago" },
  { id: "America/Denver", short: "DEN", label: "Denver" },
  { id: "America/Los_Angeles", short: "LA", label: "Los Angeles" },
  { id: "UTC", short: "UTC", label: "UTC" },
  { id: "Europe/London", short: "LON", label: "London" },
  { id: "Europe/Berlin", short: "BER", label: "Berlin" },
  { id: "Europe/Paris", short: "PAR", label: "Paris" },
  { id: "Asia/Tokyo", short: "TYO", label: "Tokyo" },
  { id: "Asia/Singapore", short: "SIN", label: "Singapore" },
  { id: "Australia/Sydney", short: "SYD", label: "Sydney" },
] as const;

export type TzId = (typeof TZ_OPTIONS)[number]["id"];

export function tzMeta(id: string | null): { short: string; label: string } | null {
  if (!id) return null;
  const hit = TZ_OPTIONS.find((z) => z.id === id);
  if (hit) return { short: hit.short, label: hit.label };
  const tail = id.split("/").pop()?.replace(/_/g, " ") ?? id;
  return { short: tail.slice(0, 3).toUpperCase(), label: tail };
}

export function hourInTz(date: Date, tz: string): string {
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hour: "numeric",
      hour12: true,
    }).format(date);
  } catch {
    return "";
  }
}

export function clockInTz(date: Date, tz: string): string {
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(date);
  } catch {
    return "";
  }
}

export function cycleTz(current: string | null): string | null {
  const ids: Array<string | null> = [null, ...TZ_OPTIONS.map((z) => z.id)];
  const idx = ids.findIndex((id) => id === current);
  return ids[(idx + 1) % ids.length] ?? null;
}

export function weekDays(day: Date): Date[] {
  const start = startOfWeek(day, { weekStartsOn: 0 });
  const end = endOfWeek(day, { weekStartsOn: 0 });
  return eachDayOfInterval({ start, end });
}

export function workDays(day: Date): Date[] {
  const start = startOfWeek(day, { weekStartsOn: 1 });
  return eachDayOfInterval({ start, end: addDays(start, 4) });
}

export function agendaDays(day: Date, count = 14): Date[] {
  const start = startOfDay(day);
  return Array.from({ length: count }, (_, i) => addDays(start, i));
}

export function shiftPeriod(day: Date, view: CalView, delta: number): Date {
  if (view === "day") return addDays(day, delta);
  if (view === "week" || view === "work") return addWeeks(day, delta);
  if (view === "agenda") return addDays(day, delta * 7);
  return addMonths(day, delta);
}

function rangeLabel(a: Date, b: Date): string {
  if (a.getMonth() === b.getMonth()) return `${format(a, "MMM d")} – ${format(b, "d, yyyy")}`;
  if (a.getFullYear() === b.getFullYear()) return `${format(a, "MMM d")} – ${format(b, "MMM d, yyyy")}`;
  return `${format(a, "MMM d, yyyy")} – ${format(b, "MMM d, yyyy")}`;
}

export function periodLabel(day: Date, view: CalView): string {
  if (view === "day") return format(day, "EEEE, MMMM d");
  if (view === "week") {
    const days = weekDays(day);
    return rangeLabel(days[0]!, days[6]!);
  }
  if (view === "work") {
    const days = workDays(day);
    return rangeLabel(days[0]!, days[4]!);
  }
  if (view === "agenda") {
    const days = agendaDays(day);
    return rangeLabel(days[0]!, days[days.length - 1]!);
  }
  return format(day, "MMMM yyyy");
}

export function isAllDay(ev: CalEvent): boolean {
  const s = new Date(ev.start);
  const e = new Date(ev.end);
  const min = (e.getTime() - s.getTime()) / 60_000;
  return min >= 23 * 60 || (s.getHours() === 0 && s.getMinutes() === 0 && min >= 12 * 60);
}

export interface PlacedEvent {
  event: CalEvent;
  top: number;
  height: number;
  left: number;
  width: number;
}

export function layoutDayEvents(events: CalEvent[]): PlacedEvent[] {
  const items = events
    .filter((e) => !isAllDay(e))
    .map((event) => {
      const s = new Date(event.start);
      const e = new Date(event.end);
      const startMin = s.getHours() * 60 + s.getMinutes();
      const sameDay = isSameDay(s, e);
      const endMin = sameDay
        ? Math.max(startMin + 20, e.getHours() * 60 + e.getMinutes())
        : Math.max(startMin + 20, 24 * 60);
      return { event, startMin, endMin };
    })
    .sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin);

  const clusters: typeof items[] = [];
  for (const it of items) {
    const last = clusters[clusters.length - 1];
    if (!last) {
      clusters.push([it]);
      continue;
    }
    const clusterEnd = Math.max(...last.map((x) => x.endMin));
    if (it.startMin < clusterEnd) last.push(it);
    else clusters.push([it]);
  }

  const out: PlacedEvent[] = [];
  for (const cluster of clusters) {
    const colEnd: number[] = [];
    const colOf: number[] = [];
    for (const it of cluster) {
      let c = colEnd.findIndex((end) => end <= it.startMin);
      if (c < 0) {
        c = colEnd.length;
        colEnd.push(it.endMin);
      } else {
        colEnd[c] = it.endMin;
      }
      colOf.push(c);
    }
    const cols = Math.max(1, colEnd.length);
    cluster.forEach((it, i) => {
      const col = colOf[i] ?? 0;
      let span = 1;
      for (let next = col + 1; next < cols; next++) {
        const conflict = cluster.some((other, j) => {
          if (j === i) return false;
          if ((colOf[j] ?? 0) !== next) return false;
          return other.startMin < it.endMin && it.startMin < other.endMin;
        });
        if (conflict) break;
        span++;
      }
      out.push({
        event: it.event,
        top: (it.startMin / 60) * HOUR_PX,
        height: Math.max(18, ((it.endMin - it.startMin) / 60) * HOUR_PX),
        left: col / cols,
        width: span / cols,
      });
    });
  }
  return out;
}

export function nowOffset(now = new Date()): number {
  return ((now.getHours() * 60 + now.getMinutes()) / 60) * HOUR_PX;
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
const TZ_KEY = "omadash-cal-tz-v1";

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

function loadSecondTz(): string | null {
  try {
    const raw = localStorage.getItem(TZ_KEY);
    if (!raw) return null;
    if (raw === "off" || raw === "null") return null;
    return TZ_OPTIONS.some((z) => z.id === raw) ? raw : null;
  } catch {
    return null;
  }
}

function persistSecondTz(tz: string | null) {
  try {
    if (tz) localStorage.setItem(TZ_KEY, tz);
    else localStorage.removeItem(TZ_KEY);
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
  secondTz: string | null;
  hydrate: () => void;
  add: (input: {
    title: string;
    start: Date;
    durationMin: number;
    where?: string;
    threadId?: string;
    box?: 1 | 2;
  }) => CalEvent;
  remove: (id: string) => void;
  applyFeed: (feed: CalendarFeed) => void;
  clearRemote: () => void;
  setConnectOpen: (open: boolean) => void;
  setSyncing: (v: boolean) => void;
  toggleHidden: (calendarId: string) => void;
  setSecondTz: (tz: string | null) => void;
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
  secondTz: null,
  hydrate: () => {
    if (get().hydrated) return;
    set({ hydrated: true, locals: loadLocals(), secondTz: loadSecondTz() });
  },
  add: ({ title, start, durationMin, where, threadId, box }) => {
    const mins = Math.max(15, durationMin || 60);
    const event: CalEvent = {
      id: nid(),
      calendarId: "local",
      title: title.trim(),
      start: start.toISOString(),
      end: addHours(start, mins / 60).toISOString(),
      where: where?.trim() || undefined,
      threadId,
      who: threadId ? "Mail" : "You",
      box: box === 2 ? 2 : 1,
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
  setSecondTz: (secondTz) => {
    persistSecondTz(secondTz);
    set({ secondTz });
  },
}));
