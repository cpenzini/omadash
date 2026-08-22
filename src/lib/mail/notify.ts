import type { Thread } from "./types";
import { snippetOf } from "./format";

const TAG = "omadash-inbox";

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
  const seen = new Set(prev.map((t) => t.id));
  const fresh = next.filter((t) => t.unread && t.folder === "inbox" && !seen.has(t.id));
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
