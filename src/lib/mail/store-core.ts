/**
 * Client mailbox state. Every user-facing action that mutates mail lives here.
 * Keys call these methods; IMAP writes go through fireImap → mailbox.ts.
 */
import { toast } from "sonner";
import { buildSeed } from "./seed";
import { applyImap, type MailboxStatus } from "./mailbox";
import { isWaiting } from "./format";
import { classifyThread } from "./rules";
import {
  DEMO_ME,
  DEMO_PERSONAL,
  type ComposeDraft,
  type Folder,
  type ImapCommand,
  type ImapOp,
  type ImapRef,
  type MailSlot,
  type MailboxInfo,
  type Message,
  type Person,
  type Split,
  type Thread,
  type UndoItem,
} from "./types";

export const STORAGE_KEY = "omadash-mail-v1";
export const PERSONAL_KEY = "omadash-mail-personal-v1";
export const IMAP_KEY = "omadash-imap-v1";
export const ONBOARD_KEY = "omadash-onboarded-v1";
export const ACTIVE_KEY = "omadash-active-box-v1";
export const VERSION = 2;

export const DEMO_BOXES: MailboxInfo[] = [
  {
    id: "demo-1",
    slot: 1,
    label: "Work",
    email: DEMO_ME.email,
    name: DEMO_ME.name,
    provider: "demo",
    lastSync: null,
    lastError: null,
  },
  {
    id: "demo-2",
    slot: 2,
    label: "Personal",
    email: DEMO_PERSONAL.email,
    name: DEMO_PERSONAL.name,
    provider: "demo",
    lastSync: null,
    lastError: null,
  },
];

export interface MailState {
  version: number;
  hydrated: boolean;
  threads: Thread[];
  selectedId: string | null;
  checkedIds: string[];
  folder: Folder;
  split: Split;
  search: string;
  compose: ComposeDraft | null;
  commandOpen: boolean;
  shortcutsOpen: boolean;
  snoozeOpen: boolean;
  calendarOpen: boolean;
  labelOpen: boolean;
  sendLaterOpen: boolean;
  rulesOpen: boolean;
  fileEventOpen: boolean;
  fileEventPrefill: { start: string; end: string; text?: string } | null;
  onboarding: boolean;
  pendingG: boolean;
  undoStack: UndoItem[];
  mobilePane: "list" | "read";
  source: "demo" | "imap";
  me: Person;
  connectOpen: boolean;
  syncing: boolean;
  lastSync: string | null;
  lastError: string | null;
  mailboxProvider: string | null;
  boxes: MailboxInfo[];
  activeBoxId: string | null;
  boxCache: Record<string, Thread[]>;
  omarchyOpen: boolean;
  summaryById: Record<string, string>;
  summarizingId: string | null;

  hydrate: () => void;
  persist: () => void;
  applyMailbox: (status: MailboxStatus) => void;
  useDemo: () => void;
  setConnectOpen: (open: boolean) => void;
  setSyncing: (v: boolean) => void;
  setOmarchyOpen: (open: boolean) => void;
  switchBox: (slot: MailSlot, selectId?: string) => void;
  cycleSpace: (dir?: 1 | -1) => void;
  cacheBox: (boxId: string, threads: Thread[]) => void;

  select: (id: string | null, opts?: { open?: boolean }) => void;
  move: (delta: number) => void;
  setFolder: (folder: Folder) => void;
  setSplit: (split: Split) => void;
  setSearch: (q: string) => void;
  setCommandOpen: (open: boolean) => void;
  setShortcutsOpen: (open: boolean) => void;
  setSnoozeOpen: (open: boolean) => void;
  setCalendarOpen: (open: boolean) => void;
  setLabelOpen: (open: boolean) => void;
  setSendLaterOpen: (open: boolean) => void;
  setRulesOpen: (open: boolean) => void;
  setFileEventOpen: (open: boolean, prefill?: { start: string; end: string; text?: string } | null) => void;
  trainSplit: (split: Split) => void;
  setPendingG: (v: boolean) => void;
  dismissOnboarding: () => void;
  setMobilePane: (pane: "list" | "read") => void;
  toggleCheck: (id?: string) => void;
  clearChecks: () => void;

  toggleStar: (id?: string) => void;
  toggleUnread: (id?: string) => void;
  done: (id?: string) => void;
  trash: (id?: string) => void;
  mute: (id?: string) => void;
  snooze: (until: Date, id?: string) => void;
  restoreSnoozes: () => void;
  restoreFollowUps: () => string[];
  restoreScheduled: () => { count: number; held: number };
  setLabel: (label: string, id?: string) => void;
  undo: () => string | null;
  summarize: () => Promise<void>;

  openCompose: (draft?: Partial<ComposeDraft>) => void;
  closeCompose: (saveDraft?: boolean) => void;
  patchCompose: (patch: Partial<ComposeDraft>) => void;
  reply: (all?: boolean) => void;
  forward: () => void;
  send: () => Promise<string | null>;
  sendLater: (at: Date) => Promise<string | null>;
  insertSnippet: (id: string) => void;
}

export function latestDate(t: Thread): number {
  const last = t.messages[t.messages.length - 1];
  return last ? new Date(last.date).getTime() : 0;
}

function matches(t: Thread, q: string): boolean {
  const s = q.trim().toLowerCase();
  if (!s) return true;
  if (t.subject.toLowerCase().includes(s)) return true;
  if (t.labels.some((l) => l.toLowerCase().includes(s))) return true;
  return t.messages.some((m) => {
    return (
      m.from.name.toLowerCase().includes(s) ||
      m.from.email.toLowerCase().includes(s) ||
      m.body.toLowerCase().includes(s) ||
      m.to.some((p) => p.name.toLowerCase().includes(s) || p.email.toLowerCase().includes(s))
    );
  });
}

export function filterVisible(
  threads: Thread[],
  folder: Folder,
  split: Split,
  search: string,
): Thread[] {
  const now = Date.now();
  return threads
    .filter((t) => {
      if (!matches(t, search)) return false;
      if (folder === "starred") return t.starred && t.folder !== "trash";
      if (folder === "waiting") return isWaiting(t);
      if (folder === "inbox") {
        if (t.folder !== "inbox") return false;
        if (t.snoozeUntil && new Date(t.snoozeUntil).getTime() > now) return false;
        if (search.trim()) return true;
        const focused = classifyThread(t);
        return split === "focused" ? focused : !focused;
      }
      return t.folder === folder;
    })
    .sort((a, b) => latestDate(b) - latestDate(a));
}

export function folderCounts(threads: Thread[]) {
  const now = Date.now();
  const inbox = threads.filter(
    (t) =>
      t.folder === "inbox" &&
      !t.muted &&
      !(t.snoozeUntil && new Date(t.snoozeUntil).getTime() > now),
  );
  const unread = (list: Thread[]) => list.filter((t) => t.unread).length;
  return {
    inbox: unread(inbox),
    focused: unread(inbox.filter((t) => classifyThread(t))),
    other: unread(inbox.filter((t) => !classifyThread(t))),
    starred: threads.filter((t) => t.starred && t.folder !== "trash").length,
    waiting: threads.filter((t) => isWaiting(t)).length,
    drafts: threads.filter((t) => t.folder === "drafts").length,
    sent: threads.filter((t) => t.folder === "sent").length,
    snoozed: threads.filter((t) => t.folder === "snoozed").length,
    done: threads.filter((t) => t.folder === "done").length,
    trash: threads.filter((t) => t.folder === "trash").length,
  };
}

export function mergeRemote(local: Thread[], remote: Thread[]): Thread[] {
  const byId = new Map(local.map((t) => [t.id, t]));
  const remoteIds = new Set(remote.map((t) => t.id));
  const merged = remote.map((r) => {
    const l = byId.get(r.id);
    if (!l) return r;
    const held = l.folder === "done" || l.folder === "trash" || l.folder === "snoozed";
    return {
      ...r,
      folder: held ? l.folder : r.folder,
      starred: l.starred,
      unread: held ? l.unread : r.unread,
      snoozeUntil: l.snoozeUntil,
      followUpUntil: l.followUpUntil,
      sendAt: l.sendAt,
      muted: l.muted,
      labels: l.labels.length ? l.labels : r.labels,
    };
  });
  for (const l of local) {
    if (remoteIds.has(l.id)) continue;
    if (l.folder === "done" || l.folder === "trash" || l.folder === "snoozed" || l.sendAt) merged.push(l);
  }
  return merged;
}

function refOf(m: Message): ImapRef | null {
  if (m.imapUid && m.imapMailbox) return { mailbox: m.imapMailbox, uid: m.imapUid };
  const hit = /^m:(inbox|sent|drafts):(\d+)$/.exec(m.id);
  if (!hit) return null;
  return { mailbox: hit[1] === "inbox" ? "INBOX" : hit[1]!, uid: Number(hit[2]) };
}

function refsOf(thread: Thread, inboxOnly = false): ImapRef[] {
  return thread.messages.flatMap((m) => {
    const ref = refOf(m);
    if (!ref) return [];
    if (inboxOnly && ref.mailbox.toUpperCase() !== "INBOX") return [];
    return [ref];
  });
}

function rfcIdsOf(thread: Thread): string[] {
  return thread.messages.map((m) => m.rfcId).filter((id): id is string => Boolean(id));
}

export function commandFor(op: ImapOp, thread: Thread, extra?: Partial<ImapCommand>): ImapCommand {
  const inboxOnly = op === "archive" || op === "unarchive";
  return {
    op,
    refs: refsOf(thread, inboxOnly),
    rfcIds: rfcIdsOf(thread),
    threadId: thread.id,
    ...extra,
  };
}

export function fireImap(source: "demo" | "imap", cmd: ImapCommand, boxId?: string | null) {
  if (source !== "imap") return;
  if (cmd.refs.length === 0 && cmd.rfcIds.length === 0) return;
  void applyImap({ data: { ...cmd, boxId: boxId ?? undefined } })
    .then((res) => {
      if (!res.ok) toast(res.error);
    })
    .catch(() => toast("Could not update the mailbox"));
}

export function persistKey(source: "demo" | "imap", boxId: string | null) {
  if (source === "demo") return boxId === "demo-2" ? PERSONAL_KEY : STORAGE_KEY;
  return boxId ? `${IMAP_KEY}:${boxId}` : IMAP_KEY;
}

export function loadPersistedThreads(key: string, fallback: Thread[]): Thread[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as { version?: number; threads?: Thread[] };
    if (parsed.version === VERSION && Array.isArray(parsed.threads) && parsed.threads.length > 0) {
      return parsed.threads;
    }
  } catch {
    /* ignore */
  }
  return fallback;
}

export function snapshot(threads: Thread[], ids: string[]): Thread[] {
  const set = new Set(ids);
  return threads.filter((t) => set.has(t.id)).map((t) => structuredClone(t));
}

export function nid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

export function actionIds(state: { checkedIds: string[]; selectedId: string | null }, id?: string): string[] {
  if (id) return [id];
  if (state.checkedIds.length) return [...state.checkedIds];
  return state.selectedId ? [state.selectedId] : [];
}

export function isHoldingSend(t: Thread, now = Date.now()): boolean {
  if (!t.sendAt || t.folder !== "sent") return false;
  return new Date(t.sendAt).getTime() > now;
}

export function folderOf(t: Thread): Folder {
  if (t.folder === "inbox") return "inbox";
  if (t.folder === "sent" || t.folder === "drafts" || t.folder === "snoozed" || t.folder === "done" || t.folder === "trash") {
    return t.folder;
  }
  return "inbox";
}

const SEEDED = buildSeed();
export const INITIAL_SELECTED =
  SEEDED.filter((t) => t.folder === "inbox" && t.focused).sort(
    (a, b) => latestDate(b) - latestDate(a),
  )[0]?.id ?? null;
export const INITIAL_THREADS = SEEDED.map((t) =>
  t.id === INITIAL_SELECTED ? { ...t, unread: false } : t,
);
