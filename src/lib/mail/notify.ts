import type { Thread } from "./types";
import { snippetOf } from "./format";
import { isAllDay, type CalEvent } from "./calendar";
import { usePrefsStore } from "./prefs";

const TAG = "omadash-inbox";
const CAL_TAG = "omadash-cal";
const upcomingSeen = new Set<string>();

export async function requestMailNotifications(): Promise<boolean> {
  if (typeof Notification === "undefined") return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const res = await Notification.requestPermission();
  return res === "granted";
}

export function notifyNewMail(prev: Thread[], next: Thread[]) {
  if (typeof Notification === "undefined") return;
  if (Notification.permission !== "granted") return;
  if (!usePrefsStore.getState().notifyMail) return;
  const seen = new Set(prev.map((t) => t.id));
  const fresh = next.filter((t) => t.unread && t.folder === "inbox" && !t.muted && !seen.has(t.id));
  if (fresh.length === 0) return;
  const first = fresh[0]!;
  const body =
    fresh.length === 1
      ? snippetOf(first.messages[first.messages.length - 1]?.body ?? "", 80)
      : `${fresh.length} new messages`;
  try {
    new Notification(fresh.length === 1 ? first.subject : "New mail", {
      body,
      tag: TAG,
    });
  } catch {
    /* ignore — preview / denied */
  }
}

/** Fire once for events starting in the next 10 minutes. */
export function notifyUpcoming(events: CalEvent[], now = new Date()): number {
  if (typeof Notification === "undefined") return 0;
  if (Notification.permission !== "granted") return 0;
  if (!usePrefsStore.getState().notifyEvents) return 0;
  const windowMs = 10 * 60 * 1000;
  let n = 0;
  for (const ev of events) {
    if (isAllDay(ev)) continue;
    const start = new Date(ev.start).getTime();
    const delta = start - now.getTime();
    if (delta <= 0 || delta > windowMs) continue;
    const key = `${ev.id}:${ev.start}`;
    if (upcomingSeen.has(key)) continue;
    upcomingSeen.add(key);
    const mins = Math.max(1, Math.round(delta / 60_000));
    const when = mins <= 1 ? "Starting now" : `In ${mins} min`;
    const body = ev.where ? `${when} · ${ev.where}` : when;
    try {
      new Notification(ev.title, { body, tag: `${CAL_TAG}-${ev.id}` });
      n += 1;
    } catch {
      /* ignore */
    }
  }
  return n;
}
