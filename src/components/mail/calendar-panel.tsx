import { useEffect, useMemo, useState } from "react";
import {
  addHours,
  format,
  isBefore,
  isSameDay,
  isToday,
  setHours,
  setMinutes,
  startOfDay,
} from "date-fns";
import { ChevronLeft, ChevronRight, Plug, Plus, RefreshCw, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import {
  colorDot,
  eventColor,
  eventSubline,
  eventsOnDay,
  extractEvents,
  inMonth,
  mergeEvents,
  monthCells,
  shiftDay,
  shiftMonth,
  threadsForCalendar,
  useCalendarStore,
  visibleEvents,
  type CalAccount,
  type CalEvent,
} from "@/lib/mail/calendar";
import { deleteRemoteEvent, getCalendars, saveRemoteEvent, syncCalendars } from "@/lib/mail/calendar-sync";
import { rruleLabel } from "@/lib/mail/ics";
import { useMailStore } from "@/lib/mail/store";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Kbd } from "./kbd";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DURATIONS = [
  { id: 30, label: "30m" },
  { id: 60, label: "1h" },
  { id: 120, label: "2h" },
];

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
  const { user } = useCurrentUserState();

  const [cursor, setCursor] = useState(() => startOfDay(new Date()));
  const [month, setMonth] = useState(() => startOfDay(new Date()));
  const [focusId, setFocusId] = useState<string | null>(null);
  const [composing, setComposing] = useState(false);
  const [title, setTitle] = useState("");
  const [time, setTime] = useState("09:00");
  const [duration, setDuration] = useState(60);
  const [where, setWhere] = useState("");
  const [dest, setDest] = useState("local");

  const writable = accounts.filter((a) => !a.readOnly);

  useEffect(() => {
    if (open) hydrateLocals();
  }, [open, hydrateLocals]);

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
    if (!open) {
      setComposing(false);
      return;
    }
    const today = startOfDay(new Date());
    setCursor(today);
    setMonth(today);
    setFocusId(null);
  }, [open]);

  const pool = threadsForCalendar(threads, source, activeBoxId);
  const events = useMemo(
    () => visibleEvents(mergeEvents(extractEvents(pool, me.email), locals, remote), hidden),
    [pool, me.email, locals, remote, hidden],
  );
  const cells = useMemo(() => monthCells(month), [month]);
  const dayEvents = eventsOnDay(events, cursor);
  const now = new Date();

  useEffect(() => {
    if (!open) return;
    const list = eventsOnDay(events, cursor);
    setFocusId((id) => (id && list.some((e) => e.id === id) ? id : (list[0]?.id ?? null)));
  }, [open, cursor, events]);

  function goDay(next: Date) {
    setCursor(startOfDay(next));
    if (!inMonth(next, month)) setMonth(startOfDay(next));
    setComposing(false);
  }

  function openEvent(ev: CalEvent) {
    if (ev.source !== "mail" || !ev.threadId) return;
    if (ev.box === 2 && activeBoxId !== "demo-2") switchBox(2);
    if (ev.box === 1 && activeBoxId === "demo-2") switchBox(1);
    select(ev.threadId);
    setMobilePane("read");
    setOpen(false);
  }

  function startCompose() {
    const hour = Math.min(21, Math.max(8, now.getHours() + 1));
    setTime(`${String(hour).padStart(2, "0")}:00`);
    setTitle("");
    setWhere("");
    setDuration(60);
    setDest(writable[0]?.id ?? "local");
    setComposing(true);
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

  async function deleteFocused() {
    const ev = dayEvents.find((e) => e.id === focusId);
    if (!ev) return;
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

      if (lower === "j") {
        e.preventDefault();
        e.stopPropagation();
        const idx = Math.max(0, dayEvents.findIndex((ev) => ev.id === focusId));
        const next = dayEvents[Math.min(dayEvents.length - 1, idx + 1)];
        if (next) setFocusId(next.id);
        return;
      }
      if (lower === "k") {
        e.preventDefault();
        e.stopPropagation();
        const idx = Math.max(0, dayEvents.findIndex((ev) => ev.id === focusId));
        const next = dayEvents[Math.max(0, idx - 1)];
        if (next) setFocusId(next.id);
        return;
      }
      if (e.key === "Enter" || lower === "o") {
        e.preventDefault();
        e.stopPropagation();
        const ev = dayEvents.find((x) => x.id === focusId);
        if (ev) openEvent(ev);
        return;
      }
      if (e.key === "#" || e.key === "Backspace" || e.key === "Delete") {
        e.preventDefault();
        e.stopPropagation();
        void deleteFocused();
        return;
      }

      const run = (fn: () => void) => {
        e.preventDefault();
        e.stopPropagation();
        fn();
      };

      if (e.key === "ArrowLeft" || lower === "h") run(() => goDay(shiftDay(cursor, -1)));
      else if (e.key === "ArrowRight" || lower === "l") run(() => goDay(shiftDay(cursor, 1)));
      else if (e.key === "ArrowUp") run(() => goDay(shiftDay(cursor, -7)));
      else if (e.key === "ArrowDown") run(() => goDay(shiftDay(cursor, 7)));
      else if (e.key === "[")
        run(() => {
          const next = shiftMonth(month, -1);
          setMonth(next);
          setCursor(startOfDay(next));
        });
      else if (e.key === "]")
        run(() => {
          const next = shiftMonth(month, 1);
          setMonth(next);
          setCursor(startOfDay(next));
        });
      else if (lower === "t") run(() => goDay(new Date()));
      else if (lower === "n" || lower === "c") run(() => startCompose());
      else if (lower === "r") run(() => void runSync());
      else if (lower === "a") run(() => setConnectOpen(true));
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open, composing, connectOpen, cursor, month, dayEvents, focusId, title, time, duration, where, dest, accounts.length, user, writable]);

  if (!open) return null;

  const subtitle =
    accounts.length > 0
      ? `${accounts.length} connected calendar${accounts.length === 1 ? "" : "s"}${syncing ? " · syncing" : ""}`
      : "Mail plus this device. Connect CalDAV or Google to sync.";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-bg/70 p-0 sm:items-center sm:p-4"
      onClick={() => setOpen(false)}
    >
      <div
        role="dialog"
        aria-label="Calendar"
        className="flex max-h-dvh min-h-[85dvh] w-full max-w-3xl flex-col overflow-hidden rounded-none border border-border bg-elevated shadow-[var(--shadow-float)] sm:h-auto sm:min-h-0 sm:max-h-[90vh] sm:rounded-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex shrink-0 flex-wrap items-center gap-1.5 border-b border-border px-3 py-2 sm:gap-2 sm:px-4 sm:py-2.5">
          <div className="min-w-0 flex-1 basis-36">
            <h2 className="text-sm font-medium tracking-tight text-fg">{format(month, "MMMM yyyy")}</h2>
            <p className="text-micro text-subtle text-pretty">{subtitle}</p>
          </div>
          <div className="flex items-center gap-1">
            <Button size="sm" onClick={() => setConnectOpen(true)}>
              <Plug className="size-3.5" />
              <span className="hidden sm:inline">Connect</span>
              <span className="hidden font-mono text-micro text-subtle sm:inline">A</span>
            </Button>
            {accounts.length > 0 && (
              <Button size="sm" onClick={() => void runSync()} disabled={syncing} aria-label="Sync calendars">
                <RefreshCw className={cn("size-3.5", syncing && "animate-spin")} />
                <span className="hidden sm:inline">Sync</span>
              </Button>
            )}
            <Button size="icon-sm" onClick={() => goDay(shiftMonth(month, -1))} aria-label="Previous month">
              <ChevronLeft className="size-4" />
            </Button>
            <Button size="sm" onClick={() => goDay(new Date())}>
              Today
            </Button>
            <Button size="icon-sm" onClick={() => goDay(shiftMonth(month, 1))} aria-label="Next month">
              <ChevronRight className="size-4" />
            </Button>
            <Button size="icon-sm" onClick={() => setOpen(false)} aria-label="Close">
              <X className="size-4" />
            </Button>
          </div>
        </header>

        <div className="flex flex-wrap items-center gap-1 border-b border-border px-3 py-2 sm:px-4">
          <Chip
            label="Mail"
            color="unread"
            on={ !hidden.includes("mail")}
            onClick={() => toggleHidden("mail")}
          />
          {(locals.length > 0 || hidden.includes("local")) && (
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

        <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
          <div className="min-w-0 flex-1 px-3 py-3 sm:px-4">
            <div className="grid grid-cols-7 gap-px">
              {WEEKDAYS.map((d) => (
                <div
                  key={d}
                  className="pb-1 text-center text-micro font-medium uppercase tracking-wider text-subtle"
                >
                  {d}
                </div>
              ))}
              {cells.map((day) => {
                const onDay = eventsOnDay(events, day);
                const selected = isSameDay(day, cursor);
                const today = isToday(day);
                const muted = !inMonth(day, month);
                const dots = uniqueDots(onDay, accounts);
                return (
                  <button
                    key={day.toISOString()}
                    type="button"
                    onClick={() => goDay(day)}
                    className={cn(
                      "flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-sm px-0.5 py-1 text-mail",
                      muted && "text-subtle",
                      !muted && "text-muted",
                      selected && "bg-select text-fg",
                      today && !selected && "text-fg",
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-6 items-center justify-center rounded-full tabular-nums text-micro",
                        today && "bg-accent text-accent-fg",
                      )}
                    >
                      {format(day, "d")}
                    </span>
                    <span className="flex h-1 items-center gap-0.5">
                      {dots.map((c) => (
                        <span key={c} className={cn("size-1 rounded-full", c)} />
                      ))}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <aside className="flex min-h-0 w-full shrink-0 flex-col border-t border-border lg:w-80 lg:border-l lg:border-t-0">
            <div className="flex items-center justify-between px-3 py-2.5">
              <p className="text-mail font-medium text-fg">
                {isToday(cursor) ? "Today" : format(cursor, "EEE, MMM d")}
              </p>
              <Button size="sm" onClick={startCompose}>
                <Plus className="size-3.5" />
                Event
                <span className="font-mono text-micro text-subtle">N</span>
              </Button>
            </div>
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
                  {writable.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      <DestChip label="This device" on={dest === "local"} onClick={() => setDest("local")} />
                      {writable.map((a) => (
                        <DestChip
                          key={a.id}
                          label={a.label}
                          on={dest === a.id}
                          onClick={() => setDest(a.id)}
                        />
                      ))}
                    </div>
                  )}
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
              {dayEvents.length === 0 && !composing ? (
                <p className="px-2 py-8 text-center text-mail text-subtle">Nothing this day. N to add.</p>
              ) : (
                <ul className="space-y-1">
                  {dayEvents.map((ev) => {
                    const start = new Date(ev.start);
                    const end = new Date(ev.end);
                    const past = isBefore(end, now);
                    const active = ev.id === focusId;
                    const canDelete = ev.source === "local" || (!ev.readOnly && ev.source !== "mail");
                    const repeat = rruleLabel(ev.rrule);
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
                            openEvent(ev);
                          }}
                          className="flex min-w-0 flex-1 items-start gap-2 px-2 py-2 text-left"
                        >
                          <span className="w-16 shrink-0 pt-0.5 tabular-nums text-micro text-muted">
                            {format(start, "h:mm a")}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-1.5">
                              <span className={cn("mt-px size-1.5 shrink-0 rounded-full", eventColor(ev, accounts))} />
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
                            onClick={() => {
                              setFocusId(ev.id);
                              void (async () => {
                                if (ev.source === "local") {
                                  removeLocal(ev.id);
                                  toast("Removed");
                                  return;
                                }
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
                              })();
                            }}
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
          </aside>
        </div>

        <footer className="hidden shrink-0 items-center gap-3 border-t border-border px-4 py-2 text-micro text-subtle sm:flex">
          <span className="inline-flex items-center gap-1">
            <Kbd>H</Kbd>
            <Kbd>L</Kbd>
            day
          </span>
          <span className="inline-flex items-center gap-1">
            <Kbd>[</Kbd>
            <Kbd>]</Kbd>
            month
          </span>
          <span className="inline-flex items-center gap-1">
            <Kbd>N</Kbd>
            new
          </span>
          <span className="inline-flex items-center gap-1">
            <Kbd>A</Kbd>
            connect
          </span>
          <span className="inline-flex items-center gap-1">
            <Kbd>R</Kbd>
            sync
          </span>
          <span className="ml-auto inline-flex items-center gap-1">
            <Kbd>Esc</Kbd>
            close
          </span>
        </footer>
      </div>
    </div>
  );
}

function uniqueDots(events: CalEvent[], accounts: CalAccount[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const ev of events) {
    const c = eventColor(ev, accounts);
    if (seen.has(c)) continue;
    seen.add(c);
    out.push(c);
    if (out.length === 3) break;
  }
  return out;
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

function DestChip({ label, on, onClick }: { label: string; on: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-7 rounded-sm px-2 text-micro",
        on ? "bg-select text-fg" : "text-subtle hover:text-fg",
      )}
    >
      {label}
    </button>
  );
}
