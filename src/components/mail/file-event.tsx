import { useEffect, useMemo, useState } from "react";
import { addHours, format, setHours, setMinutes, startOfDay } from "date-fns";
import { CalendarPlus } from "lucide-react";
import { toast } from "sonner";
import { colorDot, useCalendarStore } from "@/lib/mail/calendar";
import { saveRemoteEvent, getCalendars } from "@/lib/mail/calendar-sync";
import {
  defaultEventStart,
  formatHit,
  parseThreadDates,
  stampThread,
  type DateHit,
} from "@/lib/mail/dates";
import { useMailStore } from "@/lib/mail/store";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Kbd } from "./kbd";

const DURATIONS = [
  { id: 30, label: "30m" },
  { id: 60, label: "1h" },
  { id: 120, label: "2h" },
];

function hitFromPrefill(prefill: { start: string; end: string; text?: string } | null): DateHit | null {
  if (!prefill) return null;
  const start = new Date(prefill.start);
  const end = new Date(prefill.end);
  if (Number.isNaN(start.getTime())) return null;
  return {
    text: prefill.text || "",
    start,
    end: Number.isNaN(end.getTime()) ? addHours(start, 1) : end,
    allDay: false,
  };
}

export function FileEvent() {
  const open = useMailStore((s) => s.fileEventOpen);
  const setOpen = useMailStore((s) => s.setFileEventOpen);
  const prefill = useMailStore((s) => s.fileEventPrefill);
  const selectedId = useMailStore((s) => s.selectedId);
  const thread = useMailStore((s) => s.threads.find((t) => t.id === s.selectedId));
  const boxes = useMailStore((s) => s.boxes);
  const activeBoxId = useMailStore((s) => s.activeBoxId);
  const setCalendarOpen = useMailStore((s) => s.setCalendarOpen);
  const accounts = useCalendarStore((s) => s.accounts);
  const addLocal = useCalendarStore((s) => s.add);
  const hydrateCal = useCalendarStore((s) => s.hydrate);
  const applyFeed = useCalendarStore((s) => s.applyFeed);
  const setCalConnect = useCalendarStore((s) => s.setConnectOpen);
  const setSyncing = useCalendarStore((s) => s.setSyncing);
  const syncing = useCalendarStore((s) => s.syncing);
  const writable = accounts.filter((a) => !a.readOnly);
  const hits = useMemo(() => (thread ? parseThreadDates(thread) : []), [thread]);
  const seed = hitFromPrefill(prefill) ?? hits[0] ?? null;

  const [title, setTitle] = useState("");
  const [day, setDay] = useState("");
  const [time, setTime] = useState("09:00");
  const [duration, setDuration] = useState(60);
  const [where, setWhere] = useState("");
  const [dest, setDest] = useState("local");
  const [picked, setPicked] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    hydrateCal();
    void getCalendars()
      .then(applyFeed)
      .catch(() => {
        /* signed out */
      });
    const start = seed?.start ?? defaultEventStart();
    const end = seed?.end ?? addHours(start, 1);
    const mins = Math.max(30, Math.round((end.getTime() - start.getTime()) / 60_000));
    setTitle(thread?.subject?.replace(/^(re|fwd?):\s*/i, "").trim() || "");
    setDay(format(start, "yyyy-MM-dd"));
    setTime(format(start, "HH:mm"));
    setDuration(mins <= 30 ? 30 : mins <= 60 ? 60 : 120);
    setWhere("");
    setDest(writable[0]?.id ?? "local");
    setPicked(seed ? formatHit(seed) : null);
  }, [open, selectedId]);

  useEffect(() => {
    if (!open) return;
    if (writable[0] && dest === "local") setDest(writable[0].id);
  }, [open, writable.length]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        e.stopPropagation();
        void onSave();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open, title, day, time, duration, where, dest, thread, writable, accounts.length]);

  if (!open) return null;

  function applyHit(hit: DateHit) {
    setDay(format(hit.start, "yyyy-MM-dd"));
    setTime(format(hit.start, "HH:mm"));
    const mins = Math.max(30, Math.round((hit.end.getTime() - hit.start.getTime()) / 60_000));
    setDuration(mins <= 30 ? 30 : mins <= 60 ? 60 : 120);
    setPicked(formatHit(hit));
  }

  async function onSave() {
    const trimmed = title.trim();
    if (!trimmed) {
      toast("Give it a title");
      return;
    }
    if (!thread) {
      toast("Select a thread");
      return;
    }
    const [hh, mm] = time.split(":").map(Number);
    const [y, mo, d] = day.split("-").map(Number);
    const start = setMinutes(setHours(startOfDay(new Date(y || 0, (mo || 1) - 1, d || 1)), hh || 0), mm || 0);
    const box = boxes.find((b) => b.id === activeBoxId)?.slot === 2 ? 2 : 1;
    const note = stampThread(undefined, thread.id);

    if (dest === "local" || !writable.some((a) => a.id === dest)) {
      addLocal({ title: trimmed, start, durationMin: duration, where, threadId: thread.id, box });
      setOpen(false);
      toast(accounts.length === 0 ? "Saved on this device · connect a calendar to see it" : "Added on this device");
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
          description: note,
        },
      });
      applyFeed(feed);
      setOpen(false);
      const label = writable.find((a) => a.id === dest)?.label ?? "calendar";
      toast(`Added to ${label}`);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not add");
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-bg/70 p-0 sm:items-center sm:p-6"
      onClick={() => setOpen(false)}
    >
      <div
        role="dialog"
        aria-label="File on calendar"
        className="w-full max-w-md rounded-none border border-border bg-elevated p-4 shadow-[var(--shadow-float)] sm:rounded-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarPlus className="size-3.5 text-muted" />
            <h2 className="text-sm font-medium text-fg">File on calendar</h2>
          </div>
          <Kbd>Esc</Kbd>
        </div>

        {hits.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-1">
            {hits.map((hit) => {
              const label = formatHit(hit);
              return (
                <button
                  key={`${hit.start.toISOString()}-${hit.text}`}
                  type="button"
                  onClick={() => applyHit(hit)}
                  className={cn(
                    "h-8 rounded-md border px-2 text-micro",
                    picked === label
                      ? "border-accent bg-select text-fg"
                      : "border-border text-muted hover:text-fg",
                  )}
                >
                  {label}
                </button>
              );
            })}
          </div>
        )}

        <form
          className="space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            void onSave();
          }}
        >
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title"
            className="h-10 w-full rounded-md border border-border bg-surface px-3 text-mail text-fg outline-none placeholder:text-subtle focus:border-border-strong"
          />
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={day}
              onChange={(e) => {
                setDay(e.target.value);
                setPicked(null);
              }}
              className="h-10 min-w-0 flex-1 rounded-md border border-border bg-surface px-3 text-mail text-fg outline-none focus:border-border-strong"
            />
            <input
              type="time"
              value={time}
              onChange={(e) => {
                setTime(e.target.value);
                setPicked(null);
              }}
              className="h-10 w-32 rounded-md border border-border bg-surface px-3 text-mail text-fg outline-none focus:border-border-strong"
            />
          </div>
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
          <input
            value={where}
            onChange={(e) => setWhere(e.target.value)}
            placeholder="Where (optional)"
            className="h-10 w-full rounded-md border border-border bg-surface px-3 text-mail text-fg outline-none placeholder:text-subtle focus:border-border-strong"
          />
          <div className="flex flex-wrap items-center gap-1 pt-1">
            <span className="mr-1 text-micro text-subtle">On</span>
            {writable.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => setDest(a.id)}
                className={cn(
                  "inline-flex h-8 items-center gap-1.5 rounded-md border px-2 text-micro",
                  dest === a.id ? "border-accent bg-select text-fg" : "border-border text-muted hover:text-fg",
                )}
              >
                <span className={cn("size-1.5 rounded-full", colorDot(a.color))} />
                {a.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setDest("local")}
              className={cn(
                "inline-flex h-8 items-center gap-1.5 rounded-md border px-2 text-micro",
                dest === "local" ? "border-accent bg-select text-fg" : "border-border text-muted hover:text-fg",
              )}
            >
              <span className="size-1.5 rounded-full bg-accent" />
              This device
            </button>
          </div>
          {accounts.length === 0 && (
            <p className="text-micro text-subtle text-pretty">
              No calendar connected — it stays on this device until you add one.{" "}
              <button
                type="button"
                className="text-fg hover:underline"
                onClick={() => {
                  setOpen(false);
                  setCalendarOpen(true);
                  setCalConnect(true);
                }}
              >
                Connect
              </button>
            </p>
          )}
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" disabled={syncing}>
              Add
              <Kbd className="opacity-70">⌘↵</Kbd>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
