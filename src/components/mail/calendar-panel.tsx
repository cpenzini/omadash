import { useEffect, useMemo, useRef, useState, type MouseEvent, type RefObject } from "react";
import {
  addHours,
  format,
  isBefore,
  isSameDay,
  isToday,
  isWeekend,
  setHours,
  setMinutes,
  startOfDay,
} from "date-fns";
import { ChevronLeft, ChevronRight, Plug, Plus, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import {
  CAL_VIEWS,
  HOUR_PX,
  agendaDays,
  clockInTz,
  colorDot,
  cycleTz,
  cycleView,
  eventSubline,
  eventTone,
  eventsOnDay,
  extractEvents,
  hourInTz,
  inMonth,
  isAllDay,
  layoutDayEvents,
  mergeEvents,
  monthCells,
  nowOffset,
  periodLabel,
  shiftPeriod,
  threadsForCalendar,
  tzMeta,
  useCalendarStore,
  visibleEvents,
  weekDays,
  workDays,
  type CalAccount,
  type CalEvent,
  type CalView,
} from "@/lib/mail/calendar";
import { deleteRemoteEvent, getCalendars, saveRemoteEvent, syncCalendars } from "@/lib/mail/calendar-sync";
import { rruleLabel } from "@/lib/mail/ics";
import { requestMailNotifications } from "@/lib/mail/notify";
import { useMailStore } from "@/lib/mail/store";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DURATIONS = [
  { id: 30, label: "30m" },
  { id: 60, label: "1h" },
  { id: 120, label: "2h" },
];
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const VIEW_KEY = "omadash-cal-view";

function readView(): CalView {
  if (typeof window === "undefined") return "week";
  const saved = window.localStorage.getItem(VIEW_KEY);
  if (saved === "day" || saved === "week" || saved === "work" || saved === "month" || saved === "agenda") {
    return saved;
  }
  return window.innerWidth < 768 ? "day" : "week";
}

function hourLabel(h: number, showMidnight = false): string {
  if (h === 0 && !showMidnight) return "";
  return format(setHours(startOfDay(new Date()), h), "h a");
}

function compactWhen(ev: CalEvent): string {
  if (isAllDay(ev)) return "All day";
  const start = new Date(ev.start);
  return format(start, start.getMinutes() ? "h:mm" : "haaa");
}

function ghostPlacement(time: string, duration: number): { top: number; height: number } {
  const [hh, mm] = time.split(":").map(Number);
  const startMin = (hh || 0) * 60 + (mm || 0);
  return {
    top: (startMin / 60) * HOUR_PX,
    height: Math.max(24, (duration / 60) * HOUR_PX),
  };
}

export function CalendarPanel() {
  const open = useMailStore((s) => s.calendarOpen);
  const setOpen = useMailStore((s) => s.setCalendarOpen);
  const threads = useMailStore((s) => s.threads);
  const source = useMailStore((s) => s.source);
  const activeBoxId = useMailStore((s) => s.activeBoxId);
  const me = useMailStore((s) => s.me);
  const select = useMailStore((s) => s.select);
  const switchBox = useMailStore((s) => s.switchBox);
  const setMobilePane = useMailStore((s) => s.setMobilePane);
  const hydrateLocals = useCalendarStore((s) => s.hydrate);
  const locals = useCalendarStore((s) => s.locals);
  const remote = useCalendarStore((s) => s.remote);
  const accounts = useCalendarStore((s) => s.accounts);
  const hidden = useCalendarStore((s) => s.hidden);
  const syncing = useCalendarStore((s) => s.syncing);
  const connectOpen = useCalendarStore((s) => s.connectOpen);
  const addLocal = useCalendarStore((s) => s.add);
  const removeLocal = useCalendarStore((s) => s.remove);
  const applyFeed = useCalendarStore((s) => s.applyFeed);
  const setConnectOpen = useCalendarStore((s) => s.setConnectOpen);
  const setSyncing = useCalendarStore((s) => s.setSyncing);
  const toggleHidden = useCalendarStore((s) => s.toggleHidden);
  const secondTz = useCalendarStore((s) => s.secondTz);
  const setSecondTz = useCalendarStore((s) => s.setSecondTz);
  const { user } = useCurrentUserState();

  const [cursor, setCursor] = useState(() => startOfDay(new Date()));
  const [view, setView] = useState<CalView>(readView);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [composing, setComposing] = useState(false);
  const [title, setTitle] = useState("");
  const [time, setTime] = useState("09:00");
  const [duration, setDuration] = useState(60);
  const [where, setWhere] = useState("");
  const [dest, setDest] = useState("local");
  const [now, setNow] = useState(() => new Date());
  const scrollRef = useRef<HTMLDivElement>(null);

  const writable = accounts.filter((a) => !a.readOnly);

  useEffect(() => {
    window.localStorage.setItem(VIEW_KEY, view);
  }, [view]);

  useEffect(() => {
    if (open) hydrateLocals();
  }, [open, hydrateLocals]);

  useEffect(() => {
    if (!open) return;
    const id = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, [open]);

  useEffect(() => {
    if (!open || !user) return;
    let cancelled = false;
    void getCalendars()
      .then((feed) => {
        if (!cancelled) applyFeed(feed);
      })
      .catch(() => {
        /* signed out or network */
      });
    return () => {
      cancelled = true;
    };
  }, [open, user?.id, applyFeed]);

  useEffect(() => {
    if (!open) setComposing(false);
  }, [open]);

  const pool = threadsForCalendar(threads, source, activeBoxId);
  const connected = accounts.length > 0;
  const events = useMemo(
    () =>
      connected
        ? visibleEvents(mergeEvents(extractEvents(pool, me.email), locals, remote), hidden)
        : [],
    [connected, pool, me.email, locals, remote, hidden],
  );
  const cells = useMemo(() => monthCells(cursor), [cursor]);
  const days = useMemo(() => {
    if (view === "day") return [cursor];
    if (view === "work") return workDays(cursor);
    if (view === "agenda") return agendaDays(cursor);
    return weekDays(cursor);
  }, [view, cursor]);
  const dayEvents = eventsOnDay(events, cursor);
  const weeks = cells.length / 7;

  useEffect(() => {
    if (accounts.length > 0) void requestMailNotifications();
  }, [accounts.length]);

  useEffect(() => {
    if (!open) return;
    const list = eventsOnDay(events, cursor);
    setFocusId((id) => (id && list.some((e) => e.id === id) ? id : null));
  }, [open, cursor, events]);

  useEffect(() => {
    if (!open || view === "month" || view === "agenda") return;
    const el = scrollRef.current;
    if (!el) return;
    const target = isToday(cursor) ? Math.max(0, nowOffset(now) - HOUR_PX * 2) : HOUR_PX * 7;
    el.scrollTop = target;
  }, [open, view, cursor, now]);

  function go(next: Date) {
    setCursor(startOfDay(next));
    setComposing(false);
  }

  function changeView(next: CalView) {
    setView(next);
    setComposing(false);
  }

  function openEvent(ev: CalEvent) {
    if (!ev.threadId) return;
    switchBox(ev.box);
    select(ev.threadId, { open: true });
    setMobilePane("read");
    setOpen(false);
  }

  function startCompose(at?: string) {
    if (accounts.length === 0) {
      setConnectOpen(true);
      toast("Connect a calendar to add events");
      return;
    }
    const hour = Math.min(21, Math.max(8, now.getHours() + 1));
    setTime(at ?? `${String(hour).padStart(2, "0")}:00`);
    setTitle("");
    setWhere("");
    setDuration(60);
    setDest(writable[0]?.id ?? "local");
    setComposing(true);
  }

  function slotTime(e: MouseEvent<HTMLDivElement>): string {
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const hours = Math.min(23, Math.max(0, y / HOUR_PX));
    const h = Math.floor(hours);
    const m = hours - h >= 0.5 ? 30 : 0;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }

  async function saveCompose() {
    const trimmed = title.trim();
    if (!trimmed) {
      toast("Give it a title");
      return;
    }
    const [hh, mm] = time.split(":").map(Number);
    const start = setMinutes(setHours(cursor, hh || 0), mm || 0);
    if (dest === "local" || !writable.some((a) => a.id === dest)) {
      const created = addLocal({ title: trimmed, start, durationMin: duration, where });
      setComposing(false);
      setFocusId(created.id);
      toast("Added to this device");
      return;
    }
    setSyncing(true);
    try {
      const feed = await saveRemoteEvent({
        data: {
          accountId: dest,
          title: trimmed,
          start: start.toISOString(),
          end: addHours(start, duration / 60).toISOString(),
          where: where.trim() || undefined,
        },
      });
      applyFeed(feed);
      setComposing(false);
      toast(`Added to ${writable.find((a) => a.id === dest)?.label ?? "calendar"}`);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not add");
    } finally {
      setSyncing(false);
    }
  }

  async function deleteEvent(ev: CalEvent) {
    if (ev.source === "local") {
      removeLocal(ev.id);
      toast("Removed");
      return;
    }
    if (ev.readOnly || ev.source === "mail" || !ev.accountId) return;
    setSyncing(true);
    try {
      const feed = await deleteRemoteEvent({ data: { eventId: ev.id } });
      applyFeed(feed);
      toast("Removed");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not remove");
    } finally {
      setSyncing(false);
    }
  }

  async function runSync() {
    if (!user || accounts.length === 0) {
      setConnectOpen(true);
      return;
    }
    setSyncing(true);
    try {
      const feed = await syncCalendars();
      applyFeed(feed);
      const err = feed.accounts.find((a) => a.lastError)?.lastError;
      toast(err ?? "Calendars synced");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Sync failed");
      setSyncing(false);
    }
  }

  const periodEvents = useMemo(() => {
    if (view === "day") return dayEvents;
    if (view === "week" || view === "work" || view === "agenda") {
      return days.flatMap((d) => eventsOnDay(events, d));
    }
    return events.filter((e) => inMonth(new Date(e.start), cursor));
  }, [view, dayEvents, days, events, cursor]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target;
      const inField =
        target instanceof HTMLElement &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT");
      const lower = e.key.length === 1 ? e.key.toLowerCase() : e.key;

      if (connectOpen) {
        if (e.key === "Escape") {
          e.preventDefault();
          e.stopPropagation();
          setConnectOpen(false);
        }
        return;
      }

      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        if (composing) setComposing(false);
        else setOpen(false);
        return;
      }
      if (composing) {
        if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
          e.preventDefault();
          e.stopPropagation();
          void saveCompose();
        }
        return;
      }
      if (inField) return;
      if (e.metaKey || e.ctrlKey) return;

      const run = (fn: () => void) => {
        e.preventDefault();
        e.stopPropagation();
        fn();
      };

      if (lower === "d") return run(() => changeView("day"));
      if (lower === "w") return run(() => changeView("week"));
      if (lower === "f") return run(() => changeView("work"));
      if (lower === "m") return run(() => changeView("month"));
      if (lower === "a") return run(() => changeView("agenda"));
      if (lower === "v") return run(() => changeView(cycleView(view)));
      if (lower === "z") return run(() => setSecondTz(cycleTz(secondTz)));

      if (lower === "j") {
        run(() => {
          const list = periodEvents;
          if (list.length === 0) return;
          const idx = list.findIndex((ev) => ev.id === focusId);
          const next = list[idx < 0 ? 0 : Math.min(list.length - 1, idx + 1)];
          if (next) {
            setFocusId(next.id);
            setCursor(startOfDay(new Date(next.start)));
          }
        });
        return;
      }
      if (lower === "k") {
        run(() => {
          const list = periodEvents;
          if (list.length === 0) return;
          const idx = list.findIndex((ev) => ev.id === focusId);
          const next = list[idx < 0 ? list.length - 1 : Math.max(0, idx - 1)];
          if (next) {
            setFocusId(next.id);
            setCursor(startOfDay(new Date(next.start)));
          }
        });
        return;
      }
      if (e.key === "Enter" || lower === "o") {
        run(() => {
          const ev = events.find((x) => x.id === focusId);
          if (ev) openEvent(ev);
        });
        return;
      }
      if (e.key === "#" || e.key === "Backspace" || e.key === "Delete") {
        run(() => {
          const ev = events.find((x) => x.id === focusId);
          if (ev) void deleteEvent(ev);
        });
        return;
      }

      if (e.key === "ArrowLeft" || lower === "h") run(() => go(shiftPeriod(cursor, view, -1)));
      else if (e.key === "ArrowRight" || lower === "l") run(() => go(shiftPeriod(cursor, view, 1)));
      else if (e.key === "ArrowUp") run(() => go(shiftPeriod(cursor, view === "month" ? "month" : "week", -1)));
      else if (e.key === "ArrowDown") run(() => go(shiftPeriod(cursor, view === "month" ? "month" : "week", 1)));
      else if (e.key === "[") run(() => go(shiftPeriod(cursor, "month", -1)));
      else if (e.key === "]") run(() => go(shiftPeriod(cursor, "month", 1)));
      else if (lower === "t") run(() => go(new Date()));
      else if (lower === "n" || lower === "c") run(() => startCompose());
      else if (lower === "r") run(() => void runSync());
      else if (lower === "p") run(() => setConnectOpen(true));
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [
    open,
    composing,
    connectOpen,
    cursor,
    view,
    periodEvents,
    focusId,
    events,
    accounts.length,
    user,
    writable,
    title,
    time,
    duration,
    where,
    dest,
    secondTz,
  ]);

  if (!open) return null;

  const focused = events.find((e) => e.id === focusId) ?? null;
  const subtitle =
    accounts.length > 0
      ? `${accounts.length} connected calendar${accounts.length === 1 ? "" : "s"}${syncing ? " · syncing" : ""}`
      : "Empty until you connect CalDAV, Google, or an ICS feed.";
  const ghost = composing ? ghostPlacement(time, duration) : null;
  const hasMail = events.some((e) => e.source === "mail");
  const showLocals = connected && (locals.length > 0 || hidden.includes("local"));
  const showChips = hasMail || showLocals || accounts.length > 0;

  const inspect = {
    cursor,
    composing,
    dayEvents,
    focused,
    accounts,
    now,
    title,
    time,
    duration,
    where,
    dest,
    writable,
    syncing,
    setTitle,
    setTime,
    setDuration,
    setWhere,
    setDest,
    setComposing,
    setFocusId,
    startCompose,
    saveCompose,
    openEvent,
    deleteEvent,
  };

  return (
    <section className="flex h-full min-w-0 flex-1 flex-col bg-bg" aria-label="Calendar">
      <header className="flex shrink-0 flex-wrap items-center gap-2 border-b border-border px-3 py-2 sm:px-4">
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-medium tracking-tight text-fg">{periodLabel(cursor, view)}</h2>
          <p className="text-micro text-subtle text-pretty">{subtitle}</p>
        </div>
        <div className="flex max-w-full items-center overflow-x-auto rounded-md border border-border p-0.5 scroll-thin" role="tablist" aria-label="Calendar view">
          {CAL_VIEWS.map((v) => (
            <button
              key={v.id}
              type="button"
              role="tab"
              aria-selected={view === v.id}
              onClick={() => changeView(v.id)}
              className={cn(
                "h-8 shrink-0 rounded-sm px-2 text-micro capitalize",
                view === v.id ? "bg-select text-fg" : "text-subtle hover:text-fg",
              )}
            >
              {v.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          title="Second time zone (Z)"
          onClick={() => setSecondTz(cycleTz(secondTz))}
          className={cn(
            "h-8 shrink-0 rounded-md border px-2 text-micro",
            secondTz ? "border-border bg-surface text-fg" : "border-border text-subtle hover:text-fg",
          )}
        >
          {secondTz ? tzMeta(secondTz)?.short : "TZ"}
        </button>
        <div className="flex items-center gap-1">
          <Button size="icon-sm" onClick={() => go(shiftPeriod(cursor, view, -1))} aria-label="Previous">
            <ChevronLeft className="size-4" />
          </Button>
          <Button size="sm" onClick={() => go(new Date())}>
            Today
          </Button>
          <Button size="icon-sm" onClick={() => go(shiftPeriod(cursor, view, 1))} aria-label="Next">
            <ChevronRight className="size-4" />
          </Button>
          <Button size="sm" onClick={() => setConnectOpen(true)}>
            <Plug className="size-3.5" />
            <span className="hidden sm:inline">Connect</span>
          </Button>
          {accounts.length > 0 && (
            <Button size="sm" onClick={() => void runSync()} disabled={syncing} aria-label="Sync calendars">
              <RefreshCw className={cn("size-3.5", syncing && "animate-spin")} />
            </Button>
          )}
          <Button variant="primary" size="sm" onClick={() => startCompose()}>
            <Plus className="size-3.5" />
            Event
          </Button>
        </div>
      </header>

      {showChips && (
        <div className="flex shrink-0 flex-wrap items-center gap-1 border-b border-border px-3 py-1.5 sm:px-4">
          {hasMail && (
            <Chip label="Mail" color="unread" on={!hidden.includes("mail")} onClick={() => toggleHidden("mail")} />
          )}
          {showLocals && (
            <Chip
              label="This device"
              color="accent"
              on={!hidden.includes("local")}
              onClick={() => toggleHidden("local")}
            />
          )}
          {accounts.map((a) => (
            <Chip
              key={a.id}
              label={a.label}
              color={a.color}
              on={!hidden.includes(a.id)}
              onClick={() => toggleHidden(a.id)}
            />
          ))}
        </div>
      )}
      {accounts.length === 0 && (
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-3 py-2 sm:px-4">
          <p className="text-micro text-subtle text-pretty">
            No calendars connected. Events stay empty until you add CalDAV, Google, or an ICS feed.
          </p>
          <Button size="sm" onClick={() => setConnectOpen(true)}>
            Connect
          </Button>
        </div>
      )}

      <div className="flex min-h-0 flex-1">
        <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
          {view === "month" ? (
            <MonthGrid
              cells={cells}
              weeks={weeks}
              cursor={cursor}
              events={events}
              accounts={accounts}
              focusId={focusId}
              onDay={(d) => {
                go(d);
                if (typeof window !== "undefined" && window.innerWidth < 768) changeView("day");
              }}
              onEnterDay={(d) => {
                go(d);
                changeView("day");
              }}
              onEvent={(ev) => {
                setFocusId(ev.id);
                setCursor(startOfDay(new Date(ev.start)));
                if (typeof window !== "undefined" && window.innerWidth < 768) changeView("day");
              }}
            />
          ) : view === "agenda" ? (
            <AgendaList
              days={days}
              events={events}
              accounts={accounts}
              now={now}
              focusId={focusId}
              onDay={go}
              onEvent={(ev) => {
                setFocusId(ev.id);
                setCursor(startOfDay(new Date(ev.start)));
              }}
              onOpen={openEvent}
            />
          ) : (
            <TimeGrid
              days={days}
              events={events}
              accounts={accounts}
              cursor={cursor}
              focusId={focusId}
              now={now}
              ghost={ghost}
              ghostTitle={title}
              secondTz={secondTz}
              scrollRef={scrollRef}
              onDay={go}
              onEnterDay={(d) => {
                go(d);
                changeView("day");
              }}
              onEvent={(ev) => {
                setFocusId(ev.id);
                setCursor(startOfDay(new Date(ev.start)));
              }}
              onOpen={openEvent}
              onSlot={(day, ev) => {
                go(day);
                startCompose(slotTime(ev));
              }}
            />
          )}

          <div className="absolute inset-x-0 bottom-0 z-20 xl:hidden">
            {composing && (
              <div className="border-t border-border bg-panel shadow-[var(--shadow-float)]">
                <Inspector {...inspect} sheet />
              </div>
            )}
          </div>
        </div>

        <aside className="hidden min-h-0 w-80 shrink-0 flex-col border-l border-border bg-panel xl:flex">
          <Inspector {...inspect} />
        </aside>
      </div>
    </section>
  );
}

function MonthGrid({
  cells,
  weeks,
  cursor,
  events,
  accounts,
  focusId,
  onDay,
  onEnterDay,
  onEvent,
}: {
  cells: Date[];
  weeks: number;
  cursor: Date;
  events: CalEvent[];
  accounts: CalAccount[];
  focusId: string | null;
  onDay: (d: Date) => void;
  onEnterDay: (d: Date) => void;
  onEvent: (ev: CalEvent) => void;
}) {
  const cap = weeks > 5 ? 3 : 4;
  return (
    <div
      className="grid min-h-0 flex-1 grid-cols-7"
      style={{ gridTemplateRows: `auto repeat(${weeks}, minmax(0, 1fr))` }}
    >
      {WEEKDAYS.map((d) => (
        <div
          key={d}
          className="border-b border-border px-2 py-1.5 text-micro font-medium uppercase tracking-wider text-subtle"
        >
          <span className="hidden sm:inline">{d}</span>
          <span className="sm:hidden">{d.slice(0, 1)}</span>
        </div>
      ))}
      {cells.map((day) => {
        const onDayEv = eventsOnDay(events, day);
        const selected = isSameDay(day, cursor);
        const today = isToday(day);
        const muted = !inMonth(day, cursor);
        const shown = onDayEv.slice(0, cap);
        const extra = onDayEv.length - shown.length;
        return (
          <div
            key={day.toISOString()}
            className={cn(
              "flex min-h-16 flex-col items-stretch gap-0.5 overflow-hidden border-b border-r border-border p-1 sm:min-h-20",
              selected && "bg-select",
              !selected && isWeekend(day) && "bg-panel",
              muted && !selected && "opacity-50",
            )}
          >
            <button
              type="button"
              onClick={() => onDay(day)}
              onDoubleClick={() => onEnterDay(day)}
              className="flex items-center justify-between gap-1"
              aria-label={format(day, "EEEE, MMMM d")}
              aria-current={today ? "date" : undefined}
            >
              <span
                className={cn(
                  "flex size-6 items-center justify-center rounded-full tabular-nums text-micro",
                  today && "bg-accent text-accent-fg",
                  !today && selected && "text-fg",
                  !today && !selected && "text-muted",
                )}
              >
                {format(day, "d")}
              </span>
            </button>
            <div className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-hidden">
              {shown.map((ev) => {
                const tone = eventTone(ev, accounts);
                return (
                  <button
                    key={ev.id}
                    type="button"
                    onClick={() => onEvent(ev)}
                    onDoubleClick={() => onEnterDay(day)}
                    className={cn(
                      "flex min-w-0 items-center gap-1 rounded-sm px-1 py-0.5 text-left text-micro",
                      tone.fill,
                      ev.id === focusId ? "ring-1 ring-border-strong" : "text-fg",
                    )}
                  >
                    {!isAllDay(ev) && (
                      <span className="shrink-0 tabular-nums text-subtle">{compactWhen(ev)}</span>
                    )}
                    <span className="min-w-0 truncate text-fg">{ev.title}</span>
                  </button>
                );
              })}
              {extra > 0 && (
                <button
                  type="button"
                  onClick={() => onEnterDay(day)}
                  className="px-1 text-left text-micro text-subtle hover:text-fg"
                >
                  +{extra} more
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function AgendaList({
  days,
  events,
  accounts,
  now,
  focusId,
  onDay,
  onEvent,
  onOpen,
}: {
  days: Date[];
  events: CalEvent[];
  accounts: CalAccount[];
  now: Date;
  focusId: string | null;
  onDay: (d: Date) => void;
  onEvent: (ev: CalEvent) => void;
  onOpen: (ev: CalEvent) => void;
}) {
  const rows = days
    .map((d) => ({ day: d, events: eventsOnDay(events, d) }))
    .filter((row) => row.events.length > 0);
  if (rows.length === 0) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center px-6">
        <p className="max-w-sm text-center text-mail text-subtle text-pretty">
          Nothing upcoming in this stretch. N to add, or connect another calendar.
        </p>
      </div>
    );
  }
  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3 scroll-thin sm:px-4">
      <ul className="mx-auto w-full max-w-2xl space-y-5">
        {rows.map(({ day, events: list }) => (
          <li key={day.toISOString()}>
            <button
              type="button"
              onClick={() => onDay(day)}
              className="mb-1.5 flex items-baseline gap-2 text-left"
            >
              <span className={cn("text-mail font-medium", isToday(day) ? "text-fg" : "text-muted")}>
                {isToday(day) ? "Today" : format(day, "EEEE")}
              </span>
              <span className="text-micro text-subtle">{format(day, "MMM d")}</span>
            </button>
            <ul className="space-y-0.5">
              {list.map((ev) => {
                const tone = eventTone(ev, accounts);
                const start = new Date(ev.start);
                const past = isBefore(new Date(ev.end), now);
                const active = ev.id === focusId;
                return (
                  <li key={ev.id}>
                    <button
                      type="button"
                      onClick={() => onEvent(ev)}
                      onDoubleClick={() => onOpen(ev)}
                      className={cn(
                        "flex w-full items-start gap-3 rounded-md px-2 py-2 text-left",
                        active ? "bg-select" : "hover:bg-surface",
                        past && "opacity-60",
                      )}
                    >
                      <span className="w-16 shrink-0 pt-0.5 tabular-nums text-micro text-muted">
                        {isAllDay(ev) ? "All day" : format(start, "h:mm a")}
                      </span>
                      <span className={cn("mt-1.5 size-1.5 shrink-0 rounded-full", tone.dot)} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-mail text-fg">{ev.title}</span>
                        <span className="block truncate text-micro text-subtle">{eventSubline(ev)}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
}

function TimeGrid({
  days,
  events,
  accounts,
  cursor,
  focusId,
  now,
  ghost,
  ghostTitle,
  secondTz,
  scrollRef,
  onDay,
  onEnterDay,
  onEvent,
  onOpen,
  onSlot,
}: {
  days: Date[];
  events: CalEvent[];
  accounts: CalAccount[];
  cursor: Date;
  focusId: string | null;
  now: Date;
  ghost: { top: number; height: number } | null;
  ghostTitle: string;
  secondTz: string | null;
  scrollRef: RefObject<HTMLDivElement | null>;
  onDay: (d: Date) => void;
  onEnterDay: (d: Date) => void;
  onEvent: (ev: CalEvent) => void;
  onOpen: (ev: CalEvent) => void;
  onSlot: (day: Date, e: MouseEvent<HTMLDivElement>) => void;
}) {
  const allDayByDay = days.map((d) => eventsOnDay(events, d).filter(isAllDay));
  const hasAllDay = allDayByDay.some((list) => list.length > 0);
  const cols = days.length;
  const line = nowOffset(now);
  const gutter = secondTz ? (cols === 1 ? "6.5rem" : "6.25rem") : cols === 1 ? "3rem" : "2.5rem";
  const columns = `${gutter} repeat(${cols}, minmax(0, 1fr))`;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="grid shrink-0 border-b border-border" style={{ gridTemplateColumns: columns }}>
        <div />
        {days.map((d) => {
          const selected = isSameDay(d, cursor);
          const today = isToday(d);
          return (
            <button
              key={d.toISOString()}
              type="button"
              onClick={() => onDay(d)}
              onDoubleClick={() => onEnterDay(d)}
              className={cn("flex flex-col items-center gap-0.5 py-2", selected && "bg-select")}
            >
              <span className="text-micro uppercase tracking-wider text-subtle">{format(d, "EEE")}</span>
              <span
                className={cn(
                  "flex size-8 items-center justify-center rounded-full tabular-nums text-mail",
                  today && "bg-accent text-accent-fg",
                  !today && selected && "text-fg",
                  !today && !selected && "text-muted",
                )}
              >
                {format(d, "d")}
              </span>
            </button>
          );
        })}
      </div>
      {hasAllDay && (
        <div className="grid shrink-0 border-b border-border" style={{ gridTemplateColumns: columns }}>
          <div className="px-1 py-1.5 text-right text-micro text-subtle">all</div>
          {days.map((d, i) => (
            <div key={d.toISOString()} className="flex flex-col gap-0.5 p-1">
              {allDayByDay[i]!.map((ev) => {
                const tone = eventTone(ev, accounts);
                return (
                  <button
                    key={ev.id}
                    type="button"
                    onClick={() => onEvent(ev)}
                    className={cn(
                      "truncate rounded-sm px-1.5 py-0.5 text-left text-micro text-fg",
                      tone.fill,
                      ev.id === focusId && "ring-1 ring-border-strong",
                    )}
                  >
                    {ev.title}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto scroll-thin">
        <div
          className="grid"
          style={{
            gridTemplateColumns: columns,
            height: HOUR_PX * 24,
          }}
        >
          <div className="relative">
            {HOURS.map((h) => {
              const nearNow = days.some((d) => isToday(d)) && Math.abs(h * HOUR_PX - line) < 16;
              if (nearNow) return null;
              const local = hourLabel(h, Boolean(secondTz));
              const other = secondTz ? hourInTz(setHours(startOfDay(now), h), secondTz) : "";
              if (!local && !other) return null;
              return (
                <div
                  key={h}
                  className="absolute right-1.5 flex -translate-y-1/2 items-baseline gap-1.5 text-micro tabular-nums text-subtle"
                  style={{ top: h * HOUR_PX }}
                >
                  <span className="w-10 text-right">{local}</span>
                  {secondTz && <span className="w-10 text-right opacity-60">{other}</span>}
                </div>
              );
            })}
            {days.some((d) => isToday(d)) && (
              <div
                className="absolute right-1 z-20 flex -translate-y-1/2 items-baseline gap-1 rounded-sm bg-danger px-1 py-px text-micro tabular-nums text-fg"
                style={{ top: line }}
              >
                <span>{format(now, "h:mm")}</span>
                {secondTz && <span className="opacity-80">{clockInTz(now, secondTz)}</span>}
              </div>
            )}
          </div>
          {days.map((d) => {
            const placed = layoutDayEvents(eventsOnDay(events, d));
            const today = isToday(d);
            const selected = isSameDay(d, cursor);
            return (
              <div
                key={d.toISOString()}
                className={cn(
                  "relative border-l border-border",
                  !selected && isWeekend(d) && "bg-panel",
                )}
                onClick={(e) => onSlot(d, e)}
              >
                {HOURS.map((h) => (
                  <div key={h}>
                    <div
                      className="absolute inset-x-0 border-t border-border"
                      style={{ top: h * HOUR_PX, height: HOUR_PX }}
                    />
                    <div
                      className="absolute inset-x-0 border-t border-border/40"
                      style={{ top: h * HOUR_PX + HOUR_PX / 2 }}
                    />
                  </div>
                ))}
                {today && (
                  <div className="pointer-events-none absolute inset-x-0 z-10" style={{ top: line }}>
                    <span className="absolute -left-1 -top-1 size-2 rounded-full bg-danger" />
                    <div className="border-t border-danger" />
                  </div>
                )}
                {ghost && selected && (
                  <div
                    className="pointer-events-none absolute inset-x-1 z-10 overflow-hidden rounded-sm border border-dashed border-accent bg-accent/10 px-1.5 py-0.5"
                    style={{ top: ghost.top, height: ghost.height }}
                  >
                    <span className="truncate text-micro font-medium text-fg">
                      {ghostTitle.trim() || "New event"}
                    </span>
                  </div>
                )}
                {placed.map((p) => (
                  <EventBlock
                    key={p.event.id}
                    event={p.event}
                    accounts={accounts}
                    focused={p.event.id === focusId}
                    top={p.top}
                    height={p.height}
                    left={p.left}
                    width={p.width}
                    onSelect={() => onEvent(p.event)}
                    onOpen={() => onOpen(p.event)}
                  />
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function EventBlock({
  event,
  accounts,
  focused,
  top,
  height,
  left,
  width,
  onSelect,
  onOpen,
}: {
  event: CalEvent;
  accounts: CalAccount[];
  focused: boolean;
  top: number;
  height: number;
  left: number;
  width: number;
  onSelect: () => void;
  onOpen: () => void;
}) {
  const tone = eventTone(event, accounts);
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        onOpen();
      }}
      className={cn(
        "absolute overflow-hidden rounded-sm border border-border pl-2 pr-1 py-0.5 text-left",
        tone.fill,
        focused && "z-20 ring-1 ring-border-strong",
      )}
      style={{
        top,
        height,
        left: `calc(${left * 100}% + 2px)`,
        width: `calc(${width * 100}% - 4px)`,
      }}
    >
      <span className={cn("absolute inset-y-0 left-0 w-0.5", tone.dot)} />
      <span className="flex min-w-0 items-center gap-1">
        <span className="truncate text-micro font-medium text-fg">{event.title}</span>
      </span>
      {height > 32 && (
        <span className="block truncate text-micro text-subtle">{format(new Date(event.start), "h:mm a")}</span>
      )}
    </button>
  );
}

function Inspector({
  cursor,
  composing,
  dayEvents,
  focused,
  accounts,
  now,
  title,
  time,
  duration,
  where,
  dest,
  writable,
  syncing,
  sheet,
  setTitle,
  setTime,
  setDuration,
  setWhere,
  setDest,
  setComposing,
  setFocusId,
  startCompose,
  saveCompose,
  openEvent,
  deleteEvent,
}: {
  cursor: Date;
  composing: boolean;
  dayEvents: CalEvent[];
  focused: CalEvent | null;
  accounts: CalAccount[];
  now: Date;
  title: string;
  time: string;
  duration: number;
  where: string;
  dest: string;
  writable: CalAccount[];
  syncing: boolean;
  sheet?: boolean;
  setTitle: (v: string) => void;
  setTime: (v: string) => void;
  setDuration: (v: number) => void;
  setWhere: (v: string) => void;
  setDest: (v: string) => void;
  setComposing: (v: boolean) => void;
  setFocusId: (v: string) => void;
  startCompose: () => void;
  saveCompose: () => Promise<void>;
  openEvent: (ev: CalEvent) => void;
  deleteEvent: (ev: CalEvent) => Promise<void>;
}) {
  const list = sheet ? (composing ? [] : focused ? [focused] : []) : dayEvents;
  return (
    <div className={cn("flex min-h-0 flex-col", sheet && "max-h-64")}>
      {!sheet && (
        <div className="flex items-center justify-between px-3 py-2.5">
          <p className="text-mail font-medium text-fg">
            {isToday(cursor) ? "Today" : format(cursor, "EEE, MMM d")}
          </p>
          <Button size="sm" onClick={() => startCompose()}>
            <Plus className="size-3.5" />
            Event
          </Button>
        </div>
      )}
      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3 scroll-thin">
        {composing && (
          <form
            className="mb-3 space-y-2 rounded-md border border-border bg-surface p-3"
            onSubmit={(e) => {
              e.preventDefault();
              void saveCompose();
            }}
          >
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Title"
              className="h-9 w-full bg-transparent text-mail text-fg outline-none placeholder:text-subtle"
            />
            <div className="flex items-center gap-2">
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="h-9 min-w-0 flex-1 bg-transparent text-mail text-fg outline-none"
              />
              <div className="flex gap-1">
                {DURATIONS.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setDuration(d.id)}
                    className={cn(
                      "h-8 rounded-sm px-2 text-micro",
                      duration === d.id ? "bg-select text-fg" : "text-subtle hover:text-fg",
                    )}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
            <input
              value={where}
              onChange={(e) => setWhere(e.target.value)}
              placeholder="Where (optional)"
              className="h-9 w-full bg-transparent text-mail text-fg outline-none placeholder:text-subtle"
            />
            <div className="flex flex-wrap items-center gap-1 pt-1">
              <span className="mr-1 text-micro text-subtle">On</span>
              {writable.map((a) => (
                <DestChip
                  key={a.id}
                  label={a.label}
                  color={a.color}
                  on={dest === a.id}
                  onClick={() => setDest(a.id)}
                />
              ))}
              <DestChip label="This device" color="accent" on={dest === "local"} onClick={() => setDest("local")} />
            </div>
            <div className="flex items-center justify-end gap-2 pt-1">
              <Button size="sm" onClick={() => setComposing(false)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" type="submit" disabled={syncing}>
                Add
              </Button>
            </div>
          </form>
        )}
        {list.length === 0 && !composing ? (
          <p className="px-2 py-8 text-center text-mail text-subtle">
            {accounts.length === 0 ? "Connect a calendar to see the day." : "Nothing this day. N to add."}
          </p>
        ) : (
          <ul className="space-y-1">
            {list.map((ev) => {
              const start = new Date(ev.start);
              const end = new Date(ev.end);
              const past = isBefore(end, now);
              const active = ev.id === focused?.id;
              const canDelete = ev.source === "local" || (!ev.readOnly && ev.source !== "mail");
              const repeat = rruleLabel(ev.rrule);
              const tone = eventTone(ev, accounts);
              return (
                <li
                  key={ev.id}
                  className={cn(
                    "flex items-start gap-1 rounded-md",
                    active ? "bg-select" : "hover:bg-surface",
                    past && "opacity-60",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setFocusId(ev.id);
                      if (ev.threadId) openEvent(ev);
                    }}
                    className="flex min-w-0 flex-1 items-start gap-2 px-2 py-2 text-left"
                  >
                    <span className="w-16 shrink-0 pt-0.5 tabular-nums text-micro text-muted">
                      {isAllDay(ev) ? "All day" : format(start, "h:mm a")}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <span className={cn("mt-px size-1.5 shrink-0 rounded-full", tone.dot)} />
                        <span className="min-w-0 truncate text-mail text-fg">{ev.title}</span>
                      </span>
                      <span className="block text-micro text-subtle">
                        {eventSubline(ev)}
                        {repeat ? ` · ${repeat}` : ""}
                      </span>
                    </span>
                  </button>
                  {canDelete && (
                    <Button
                      size="icon-sm"
                      className="mt-1 mr-1"
                      aria-label="Remove event"
                      disabled={syncing}
                      onClick={() => void deleteEvent(ev)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function Chip({
  label,
  color,
  on,
  onClick,
}: {
  label: string;
  color: string;
  on: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-7 items-center gap-1.5 rounded-full border px-2 text-micro",
        on ? "border-border bg-surface text-fg" : "border-transparent text-subtle line-through",
      )}
    >
      <span className={cn("size-1.5 rounded-full", colorDot(color), !on && "opacity-40")} />
      {label}
    </button>
  );
}

function DestChip({
  label,
  color,
  on,
  onClick,
}: {
  label: string;
  on: boolean;
  onClick: () => void;
  color?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-7 items-center gap-1.5 rounded-sm px-2 text-micro",
        on ? "bg-select text-fg" : "text-subtle hover:text-fg",
      )}
    >
      <span className={cn("size-1.5 rounded-full", colorDot(color))} />
      {label}
    </button>
  );
}