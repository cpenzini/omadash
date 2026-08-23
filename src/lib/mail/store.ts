/**
 * Zustand mailbox store. Types and helpers live in store-core.ts.
 */
import { create } from "zustand";
import { toast } from "sonner";
import { summarizeThread } from "./ai";
import { SNIPPETS } from "./snippets";
import { counterpart, dataUrlPayload, localNotes, parseAddressList, snippetOf } from "./format";
import { sendMail } from "./mailbox";
import { useRulesStore } from "./rules";
import {
  DEMO_ME,
  type Attachment,
  type MailSlot,
  type Person,
  type Split,
  type Thread,
} from "./types";
import {
  ACTIVE_KEY,
  IMAP_KEY,
  ONBOARD_KEY,
  VERSION,
  actionIds,
  commandFor,
  filterVisible,
  fireImap,
  folderOf,
  latestDate,
  loadPersistedThreads,
  mergeRemote,
  nid,
  persistKey,
  snapshot,
  type MailState,
} from "./store-core";
import { readPrefs, usePrefsStore } from "./prefs";

export type { MailState } from "./store-core";
export { DEMO_BOXES, INITIAL_THREADS, isHoldingSend, latestDate, filterVisible, folderCounts } from "./store-core";

const FOLLOW_UP_MS = 3 * 24 * 60 * 60 * 1000;
export const HOLD_MS = 8_000;
const holdTimers = new Map<string, number>();

function cancelHold(id: string) {
  const t = holdTimers.get(id);
  if (t) window.clearTimeout(t);
  holdTimers.delete(id);
}

function armHold(id: string, flush: () => void) {
  cancelHold(id);
  if (typeof window === "undefined") return;
  const t = window.setTimeout(() => {
    holdTimers.delete(id);
    flush();
  }, HOLD_MS);
  holdTimers.set(id, t);
}

function outgoingAttachments(atts: Attachment[]) {
  return atts.flatMap((a) => {
    const p = dataUrlPayload(a.dataUrl);
    if (!p) return [];
    return [{ name: a.name, mime: a.mime || p.mime, contentBase64: p.contentBase64 }];
  });
}

function persistableThreads(threads: Thread[]): Thread[] {
  return threads.map((t) => ({
    ...t,
    messages: t.messages.map((m) => ({
      ...m,
      attachments: m.attachments.map((a) =>
        a.dataUrl && a.dataUrl.length > 80_000 ? { name: a.name, size: a.size, mime: a.mime } : a,
      ),
    })),
  }));
}

export const useMailStore = create<MailState>((set, get) => ({
  version: VERSION,
  hydrated: false,
  threads: [],
  selectedId: null,
  checkedIds: [],
  folder: "inbox",
  split: "focused",
  search: "",
  compose: null,
  commandOpen: false,
  shortcutsOpen: false,
  snoozeOpen: false,
  calendarOpen: false,
  labelOpen: false,
  sendLaterOpen: false,
  rulesOpen: false,
  fileEventOpen: false,
  fileEventPrefill: null,
  onboarding: true,
  pendingG: false,
  undoStack: [],
  mobilePane: "list",
  source: "demo",
  me: { name: "", email: "" },
  connectOpen: false,
  syncing: false,
  lastSync: null,
  lastError: null,
  mailboxProvider: null,
  boxes: [],
  activeBoxId: null,
  boxCache: {},
  omarchyOpen: false,
  summaryById: {},
  summarizingId: null,

  hydrate: () => {
    if (get().hydrated) return;
    let onboarding = true;
    let threads: Thread[] = [];
    let source: "demo" | "imap" = "demo";
    let me: Person = { name: "", email: "" };
    let mailboxProvider: string | null = null;
    let lastSync: string | null = null;
    let activeBoxId: string | null = null;
    let boxes: MailState["boxes"] = [];
    let boxCache: Record<string, Thread[]> = {};
    try {
      onboarding = localStorage.getItem(ONBOARD_KEY) !== "1";
      const active = localStorage.getItem(ACTIVE_KEY);
      if (active && !active.startsWith("demo")) {
        const raw = localStorage.getItem(`${IMAP_KEY}:${active}`) ?? localStorage.getItem(IMAP_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as {
            version?: number;
            threads?: Thread[];
            me?: Person;
            mailboxProvider?: string | null;
            lastSync?: string | null;
            activeBoxId?: string | null;
            boxes?: MailState["boxes"];
          };
          if (parsed.version === VERSION && Array.isArray(parsed.threads)) {
            threads = parsed.threads;
            source = "imap";
            activeBoxId = parsed.activeBoxId ?? active;
            me = parsed.me ?? me;
            mailboxProvider = parsed.mailboxProvider ?? null;
            lastSync = parsed.lastSync ?? null;
            if (Array.isArray(parsed.boxes)) boxes = parsed.boxes.filter((b) => !String(b.id).startsWith("demo"));
          }
        }
      }
    } catch {
      /* ignore */
    }
    if (source === "imap") {
      for (const b of boxes) {
        boxCache[b.id] =
          b.id === activeBoxId ? threads : loadPersistedThreads(persistKey("imap", b.id), []);
      }
      if (activeBoxId) boxCache[activeBoxId] = threads;
    }
    const focused = threads
      .filter((t) => t.folder === "inbox" && t.focused)
      .sort((a, b) => latestDate(b) - latestDate(a));
    const selectedId = focused[0]?.id ?? threads[0]?.id ?? null;
    const markOpened = readPrefs().layout === "three";
    set({
      hydrated: true,
      threads: markOpened
        ? threads.map((t) => (t.id === selectedId ? { ...t, unread: false } : t))
        : threads,
      onboarding,
      selectedId,
      source,
      me,
      mailboxProvider,
      lastSync,
      activeBoxId,
      boxes,
      boxCache,
    });
  },

  persist: () => {
    const { threads, version, source, me, lastSync, mailboxProvider, activeBoxId, boxes, boxCache } = get();
    if (source !== "imap" || !activeBoxId) return;
    if (boxCache[activeBoxId] !== threads) {
      set({ boxCache: { ...boxCache, [activeBoxId]: threads } });
    }
    const key = persistKey(source, activeBoxId);
    try {
      localStorage.setItem(
        key,
        JSON.stringify({
          version,
          threads: persistableThreads(threads),
          me,
          lastSync,
          mailboxProvider,
          activeBoxId,
          boxes,
        }),
      );
      localStorage.setItem(ACTIVE_KEY, activeBoxId);
    } catch {
      /* ignore */
    }
  },

  applyMailbox: (status) => {
    if (!status.connected) {
      get().useDemo();
      return;
    }
    const boxes = status.boxes.length ? status.boxes : get().boxes;
    const active = boxes.find((b) => b.id === status.activeId) ?? boxes[0];
    const me: Person = {
      name: status.name || status.email?.split("@")[0] || "Me",
      email: status.email || DEMO_ME.email,
    };
    const local = get().source === "imap" && get().activeBoxId === (active?.id ?? null) ? get().threads : [];
    const threads = mergeRemote(local, status.threads);
    const keepId = get().selectedId;
    const keepFolder = get().folder;
    const keepSplit = get().split;
    const still = keepId && threads.some((t) => t.id === keepId);
    const focused = threads
      .filter((t) => t.folder === "inbox" && t.focused)
      .sort((a, b) => latestDate(b) - latestDate(a));
    set({
      source: "imap",
      me,
      threads,
      lastSync: status.lastSync,
      lastError: status.lastError,
      mailboxProvider: status.provider,
      boxes,
      activeBoxId: active?.id ?? null,
      boxCache: active ? { ...get().boxCache, [active.id]: threads } : get().boxCache,
      syncing: false,
      selectedId: still ? keepId : (focused[0]?.id ?? threads[0]?.id ?? null),
      folder: keepFolder,
      split: keepSplit,
    });
    get().persist();
  },

  useDemo: () => {
    set({
      source: "demo",
      me: { name: "", email: "" },
      threads: [],
      lastSync: null,
      lastError: null,
      mailboxProvider: null,
      boxes: [],
      activeBoxId: null,
      boxCache: {},
      syncing: false,
      selectedId: null,
      folder: "inbox",
      split: "focused",
    });
  },

  setConnectOpen: (connectOpen) => set({ connectOpen, pendingG: false }),
  setSyncing: (syncing) => set({ syncing }),
  setOmarchyOpen: (omarchyOpen) => set({ omarchyOpen, pendingG: false }),

  switchBox: (slot, selectId) => {
    const n: MailSlot = Number(slot) === 2 ? 2 : 1;
    const { boxes, activeBoxId, source, threads: prevThreads } = get();
    const next = boxes.find((b) => Number(b.slot) === n);
    if (!next) {
      set({ connectOpen: true, calendarOpen: false, pendingG: false });
      return;
    }
    if (next.id === activeBoxId) {
      if (selectId) {
        const t = get().threads.find((x) => x.id === selectId);
        if (t) {
          get().select(selectId, { open: true });
          if (t.folder === "inbox") get().setSplit(t.focused ? "focused" : "other");
          else get().setFolder(folderOf(t));
        }
      }
      set({ calendarOpen: false, pendingG: false });
      return;
    }
    get().persist();
    const threads = source === "imap" ? loadPersistedThreads(persistKey("imap", next.id), []) : [];
    const pick = selectId ? threads.find((t) => t.id === selectId) : undefined;
    const focused = threads
      .filter((t) => t.folder === "inbox" && t.focused)
      .sort((a, b) => latestDate(b) - latestDate(a));
    const selected = pick ?? focused[0] ?? threads[0];
    const folder = pick ? folderOf(pick) : "inbox";
    const split = pick && pick.folder === "inbox" ? (pick.focused ? "focused" : "other") : "focused";
    set({
      activeBoxId: next.id,
      me: { name: next.name, email: next.email },
      mailboxProvider: source === "imap" ? next.provider : null,
      lastSync: next.lastSync,
      lastError: next.lastError,
      threads,
      selectedId: selected?.id ?? null,
      folder,
      split,
      mobilePane: "list",
      checkedIds: [],
      calendarOpen: false,
      pendingG: false,
      boxCache: {
        ...get().boxCache,
        ...(activeBoxId ? { [activeBoxId]: prevThreads } : {}),
        [next.id]: threads,
      },
    });
    toast(next.label);
  },

  cacheBox: (boxId, threads) => {
    set((s) => ({ boxCache: { ...s.boxCache, [boxId]: threads } }));
    if (get().source !== "imap") return;
    try {
      const raw = localStorage.getItem(persistKey("imap", boxId));
      const parsed = raw ? (JSON.parse(raw) as { version?: number }) : null;
      const version = parsed?.version === VERSION ? parsed.version : VERSION;
      localStorage.setItem(
        persistKey("imap", boxId),
        JSON.stringify({
          ...(raw ? JSON.parse(raw) : {}),
          version,
          threads: persistableThreads(threads),
          activeBoxId: boxId,
        }),
      );
    } catch {
      /* ignore */
    }
  },

  cycleSpace: (dir = 1) => {
    const { boxes, activeBoxId, calendarOpen } = get();
    type Space = { kind: "mail"; slot: MailSlot } | { kind: "cal" };
    const items: Space[] = boxes.map((b) => ({ kind: "mail" as const, slot: b.slot }));
    items.push({ kind: "cal" });
    if (items.length === 1) {
      get().setCalendarOpen(!calendarOpen);
      return;
    }
    let idx = calendarOpen
      ? items.findIndex((i) => i.kind === "cal")
      : items.findIndex((i) => i.kind === "mail" && boxes.find((b) => b.slot === i.slot)?.id === activeBoxId);
    if (idx < 0) idx = 0;
    const next = items[(idx + dir + items.length) % items.length]!;
    if (next.kind === "cal") get().setCalendarOpen(true);
    else get().switchBox(next.slot);
  },

  select: (id, opts) => {
    const layout = usePrefsStore.getState().layout;
    const pane = get().mobilePane;
    const open = opts?.open ?? (layout === "three" || pane === "read");
    const prev = id ? get().threads.find((t) => t.id === id) : undefined;
    set({
      selectedId: id,
      mobilePane: open ? (id ? "read" : "list") : get().mobilePane,
    });
    if (!id || !open) return;
    set((s) => ({
      threads: s.threads.map((t) => {
        if (t.id !== id || !t.unread) return t;
        const last = t.messages[t.messages.length - 1];
        const messages =
          last?.receiptRequested && last.opens.length === 0
            ? t.messages.map((m, i) =>
                i === t.messages.length - 1
                  ? {
                      ...m,
                      opens: [
                        {
                          at: new Date().toISOString(),
                          city: "Miami",
                          device: "Omadash",
                        },
                      ],
                    }
                  : m,
              )
            : t.messages;
        return { ...t, unread: false, messages };
      }),
    }));
    get().persist();
    if (prev?.unread) fireImap(get().source, commandFor("seen", prev, { unread: false }), get().activeBoxId);
  },

  move: (delta) => {
    const { threads, folder, split, search, selectedId } = get();
    const list = filterVisible(threads, folder, split, search);
    if (list.length === 0) return;
    const idx = Math.max(0, list.findIndex((t) => t.id === selectedId));
    const next = list[Math.min(list.length - 1, Math.max(0, idx + delta))];
    if (next) get().select(next.id);
  },

  setFolder: (folder) => {
    set({ folder, search: "", mobilePane: "list", checkedIds: [], calendarOpen: false });
    const { threads, split, search } = get();
    const list = filterVisible(threads, folder, split, search);
    set({ selectedId: list[0]?.id ?? null });
  },

  setSplit: (split) => {
    set({ split, folder: "inbox", search: "", mobilePane: "list", checkedIds: [], calendarOpen: false });
    const { threads, search } = get();
    const list = filterVisible(threads, "inbox", split, search);
    set({ selectedId: list[0]?.id ?? null });
  },

  setSearch: (search) => set({ search }),
  setCommandOpen: (commandOpen) => set({ commandOpen, pendingG: false }),
  setShortcutsOpen: (shortcutsOpen) => set({ shortcutsOpen }),
  setSnoozeOpen: (snoozeOpen) => set({ snoozeOpen }),
  setCalendarOpen: (calendarOpen) => set({ calendarOpen, pendingG: false }),
  setLabelOpen: (labelOpen) => set({ labelOpen }),
  setSendLaterOpen: (sendLaterOpen) => set({ sendLaterOpen }),
  setRulesOpen: (rulesOpen) => set({ rulesOpen }),
  setFileEventOpen: (fileEventOpen, prefill = null) =>
    set({
      fileEventOpen,
      fileEventPrefill: fileEventOpen ? prefill : null,
    }),
  trainSplit: (split: Split) => {
    const { selectedId, threads, me, folder, split: view, search } = get();
    const t = threads.find((x) => x.id === selectedId);
    if (!t) return;
    const person = counterpart(t, me.email);
    if (!person.email.includes("@")) return;
    const prev = filterVisible(threads, folder, view, search);
    const idx = prev.findIndex((x) => x.id === t.id);
    useRulesStore.getState().upsertFrom(person.email, split);
    toast(`${person.name} → ${split === "focused" ? "Focused" : "Other"}`);
    if (folder !== "inbox") return;
    const nextList = filterVisible(get().threads, "inbox", view, search);
    if (nextList.some((x) => x.id === t.id)) return;
    const after = prev.slice(idx + 1).find((x) => nextList.some((n) => n.id === x.id));
    set({ selectedId: after?.id ?? nextList[0]?.id ?? t.id, checkedIds: [] });
  },
  setPendingG: (pendingG) => set({ pendingG }),
  setMobilePane: (mobilePane) => set({ mobilePane }),
  dismissOnboarding: () => {
    set({ onboarding: false });
    try {
      localStorage.setItem(ONBOARD_KEY, "1");
    } catch {
      /* ignore */
    }
  },

  toggleCheck: (id) => {
    const tid = id ?? get().selectedId;
    if (!tid) return;
    set((s) => ({
      checkedIds: s.checkedIds.includes(tid)
        ? s.checkedIds.filter((x) => x !== tid)
        : [...s.checkedIds, tid],
    }));
  },

  clearChecks: () => set({ checkedIds: [] }),

  toggleStar: (id) => {
    const ids = actionIds(get(), id);
    if (!ids.length) return;
    const currents = get().threads.filter((t) => ids.includes(t.id));
    const starred = currents.some((t) => !t.starred);
    set((s) => ({
      threads: s.threads.map((t) => (ids.includes(t.id) ? { ...t, starred } : t)),
      checkedIds: [],
    }));
    get().persist();
    for (const current of currents) {
      fireImap(get().source, commandFor(starred ? "star" : "unstar", current, { starred }), get().activeBoxId);
    }
  },

  toggleUnread: (id) => {
    const tid = id ?? get().selectedId;
    if (!tid) return;
    const current = get().threads.find((t) => t.id === tid);
    if (!current) return;
    const unread = !current.unread;
    set((s) => ({
      threads: s.threads.map((t) => (t.id === tid ? { ...t, unread } : t)),
    }));
    get().persist();
    fireImap(get().source, commandFor(unread ? "unseen" : "seen", current, { unread }), get().activeBoxId);
  },

  done: (id) => {
    const ids = actionIds(get(), id);
    if (!ids.length) return;
    const { threads, folder, split, search } = get();
    const currents = threads.filter((t) => ids.includes(t.id) && t.folder !== "done");
    if (!currents.length) return;
    const list = filterVisible(threads, folder, split, search);
    const lastIdx = Math.max(...currents.map((c) => list.findIndex((t) => t.id === c.id)));
    const next = list.find((t, i) => i > lastIdx && !ids.includes(t.id)) ?? list.find((t) => !ids.includes(t.id));
    set((s) => ({
      undoStack: [
        {
          label: currents.length > 1 ? `Done ${currents.length}` : "Done",
          threads: snapshot(s.threads, currents.map((t) => t.id)),
          imapMany: currents.map((c) => commandFor("unarchive", c)),
        },
        ...s.undoStack,
      ].slice(0, 12),
      threads: s.threads.map((t) => (ids.includes(t.id) ? { ...t, folder: "done" as const, unread: false } : t)),
      selectedId: next?.id ?? null,
      mobilePane: next ? s.mobilePane : "list",
      checkedIds: [],
    }));
    get().persist();
    for (const current of currents) {
      fireImap(get().source, commandFor("archive", current, { folder: "done", unread: false }), get().activeBoxId);
    }
  },

  trash: (id) => {
    const ids = actionIds(get(), id);
    if (!ids.length) return;
    const { threads, folder, split, search } = get();
    const currents = threads.filter((t) => ids.includes(t.id));
    if (!currents.length) return;
    const list = filterVisible(threads, folder, split, search);
    const lastIdx = Math.max(...currents.map((c) => list.findIndex((t) => t.id === c.id)));
    const next = list.find((t, i) => i > lastIdx && !ids.includes(t.id)) ?? list.find((t) => !ids.includes(t.id));
    set((s) => ({
      undoStack: [
        {
          label: currents.length > 1 ? `Trash ${currents.length}` : "Trash",
          threads: snapshot(s.threads, currents.map((t) => t.id)),
          imapMany: currents.map((c) => commandFor("restore", c)),
        },
        ...s.undoStack,
      ].slice(0, 12),
      threads: s.threads.map((t) => (ids.includes(t.id) ? { ...t, folder: "trash" as const, unread: false } : t)),
      selectedId: next?.id ?? null,
      mobilePane: next ? s.mobilePane : "list",
      checkedIds: [],
    }));
    get().persist();
    for (const current of currents) {
      fireImap(get().source, commandFor("trash", current, { folder: "trash", unread: false }), get().activeBoxId);
    }
  },

  mute: (id) => {
    const ids = actionIds(get(), id);
    if (!ids.length) return;
    const currents = get().threads.filter((t) => ids.includes(t.id));
    const muted = currents.some((t) => !t.muted);
    set((s) => ({
      undoStack: [{ label: muted ? "Mute" : "Unmute", threads: snapshot(s.threads, ids) }, ...s.undoStack].slice(0, 12),
      threads: s.threads.map((t) =>
        ids.includes(t.id) ? { ...t, muted, unread: muted ? false : t.unread } : t,
      ),
      checkedIds: [],
    }));
    get().persist();
  },

  snooze: (until, id) => {
    const ids = actionIds(get(), id);
    if (!ids.length) return;
    const { threads, folder, split, search } = get();
    const list = filterVisible(threads, folder, split, search);
    const lastIdx = Math.max(...ids.map((tid) => list.findIndex((t) => t.id === tid)));
    const next = list.find((t, i) => i > lastIdx && !ids.includes(t.id)) ?? list.find((t) => !ids.includes(t.id));
    set((s) => ({
      undoStack: [{ label: "Snooze", threads: snapshot(s.threads, ids) }, ...s.undoStack].slice(0, 12),
      threads: s.threads.map((t) =>
        ids.includes(t.id)
          ? { ...t, folder: "snoozed" as const, snoozeUntil: until.toISOString(), unread: false }
          : t,
      ),
      selectedId: next?.id ?? null,
      snoozeOpen: false,
      mobilePane: next ? s.mobilePane : "list",
      checkedIds: [],
    }));
    get().persist();
  },

  restoreSnoozes: () => {
    const now = Date.now();
    const { threads } = get();
    let changed = false;
    const next = threads.map((t) => {
      if (t.folder === "snoozed" && t.snoozeUntil && new Date(t.snoozeUntil).getTime() <= now) {
        changed = true;
        return { ...t, folder: "inbox" as const, unread: true, snoozeUntil: undefined };
      }
      return t;
    });
    if (!changed) return;
    set({ threads: next });
    get().persist();
  },

  restoreFollowUps: () => {
    const now = Date.now();
    const bounced: string[] = [];
    const next = get().threads.map((t) => {
      if (!t.followUpUntil || new Date(t.followUpUntil).getTime() > now) return t;
      const last = t.messages[t.messages.length - 1];
      if (!last || last.from.email !== get().me.email) {
        return { ...t, followUpUntil: undefined };
      }
      bounced.push(last.to[0]?.name || last.to[0]?.email || t.subject);
      return {
        ...t,
        folder: "inbox" as const,
        unread: true,
        focused: true,
        followUpUntil: undefined,
        labels: t.labels.includes("Waiting") ? t.labels : [...t.labels, "Waiting"],
      };
    });
    if (!bounced.length) return bounced;
    set({ threads: next });
    get().persist();
    return bounced;
  },

  restoreScheduled: () => {
    const now = Date.now();
    const due = get().threads.filter((t) => t.sendAt && new Date(t.sendAt).getTime() <= now);
    if (!due.length) return { count: 0, held: 0 };
    const held = due.filter((t) => t.folder === "sent").length;
    set((s) => ({
      threads: s.threads.map((t) =>
        t.sendAt && new Date(t.sendAt).getTime() <= now
          ? { ...t, folder: "sent" as const, sendAt: undefined, unread: false }
          : t,
      ),
    }));
    get().persist();
    if (get().source === "imap") {
      for (const t of due) {
        const last = t.messages[t.messages.length - 1];
        if (!last) continue;
        void sendMail({
          data: {
            to: last.to.map((p) => p.email).join(", "),
            cc: last.cc.map((p) => p.email).join(", "),
            subject: t.subject,
            body: last.body,
            attachments: outgoingAttachments(last.attachments),
            boxId: get().activeBoxId ?? undefined,
          },
        }).then((res) => {
          if (!res.ok) toast(res.error);
        });
      }
    }
    return { count: due.length, held };
  },

  setLabel: (label, id) => {
    const ids = actionIds(get(), id);
    if (!ids.length) return;
    set((s) => ({
      threads: s.threads.map((t) => {
        if (!ids.includes(t.id)) return t;
        const has = t.labels.includes(label);
        return { ...t, labels: has ? t.labels.filter((l) => l !== label) : [...t.labels, label] };
      }),
      labelOpen: false,
      checkedIds: [],
    }));
    get().persist();
  },

  undo: () => {
    const item = get().undoStack[0];
    if (!item) return null;
    if (item.label === "Send") {
      for (const id of item.removeIds ?? []) cancelHold(id);
      for (const t of item.threads) cancelHold(t.id);
    }
    const restored = new Map(item.threads.map((t) => [t.id, t]));
    const remove = new Set(item.removeIds ?? []);
    set((s) => ({
      undoStack: s.undoStack.slice(1),
      threads: s.threads
        .filter((t) => !remove.has(t.id))
        .map((t) => restored.get(t.id) ?? t),
      selectedId: item.threads[0]?.id ?? s.selectedId,
    }));
    get().persist();
    const cmds = item.imapMany ?? (item.imap ? [item.imap] : []);
    for (const cmd of cmds) fireImap(get().source, cmd, get().activeBoxId);
    return item.label;
  },

  summarize: async () => {
    const tid = get().selectedId;
    if (!tid) return;
    const thread = get().threads.find((t) => t.id === tid);
    if (!thread) return;
    if (get().summaryById[tid] || get().summarizingId === tid) return;
    set({ summarizingId: tid });
    const fallback = localNotes(thread);
    try {
      const result = await summarizeThread({
        data: {
          subject: thread.subject,
          messages: thread.messages.map((m) => ({
            from: m.from.name || m.from.email,
            body: m.body,
          })),
        },
      });
      if (result.ok && result.text) {
        set((s) => ({
          summaryById: { ...s.summaryById, [tid]: result.text },
          summarizingId: null,
        }));
        return;
      }
    } catch {
      /* unsigned or network — local notes */
    }
    set((s) => ({
      summaryById: { ...s.summaryById, [tid]: fallback },
      summarizingId: null,
    }));
  },

  openCompose: (draft) => {
    if (get().source !== "imap") {
      set({ connectOpen: true, commandOpen: false });
      toast("Connect a mailbox to write");
      return;
    }
    set({
      compose: {
        mode: "new",
        to: "",
        cc: "",
        subject: "",
        body: "",
        tracking: true,
        remind: false,
        showCc: false,
        sendAt: null,
        attachments: [],
        ...draft,
      },
      commandOpen: false,
      sendLaterOpen: false,
      rulesOpen: false,
    });
  },

  closeCompose: (saveDraft = false) => {
    const c = get().compose;
    if (saveDraft && c && (c.to.trim() || c.subject.trim() || c.body.trim() || (c.attachments ?? []).length)) {
      const to = parseAddressList(c.to);
      const thread: Thread = {
        id: nid("t"),
        subject: c.subject.trim() || "(no subject)",
        folder: "drafts",
        unread: false,
        starred: false,
        focused: true,
        labels: [],
        messages: [
          {
            id: nid("m"),
            from: get().me,
            to: to.length ? to : [{ name: "", email: "" }],
            cc: parseAddressList(c.cc),
            date: new Date().toISOString(),
            body: c.body,
            attachments: (c.attachments ?? []).map((a) =>
              a.dataUrl && a.dataUrl.length > 80_000 ? { name: a.name, size: a.size, mime: a.mime } : a,
            ),
            tracking: c.tracking,
            opens: [],
          },
        ],
      };
      set((s) => ({
        compose: null,
        sendLaterOpen: false,
        threads: [thread, ...s.threads.filter((t) => t.folder !== "drafts" || t.id !== thread.id)],
      }));
      get().persist();
      return;
    }
    set({ compose: null, sendLaterOpen: false });
  },

  patchCompose: (patch) => {
    set((s) => (s.compose ? { compose: { ...s.compose, ...patch } } : s));
  },

  reply: (all = false) => {
    const { selectedId, threads } = get();
    const t = threads.find((x) => x.id === selectedId);
    if (!t) return;
    const last = t.messages[t.messages.length - 1]!;
    const others = [last.from, ...last.to, ...last.cc].filter((p) => p.email !== get().me.email);
    const to = all ? others : [last.from.email === get().me.email ? last.to[0]! : last.from];
    const quoted = last.body
      .split("\n")
      .map((line) => `> ${line}`)
      .join("\n");
    get().openCompose({
      mode: all ? "replyAll" : "reply",
      threadId: t.id,
      to: to
        .filter(Boolean)
        .map((p) => `${p!.name} <${p!.email}>`)
        .join(", "),
      cc: "",
      subject: t.subject.startsWith("Re:") ? t.subject : `Re: ${t.subject}`,
      body: `\n\n${quoted}`,
      tracking: true,
    });
  },

  forward: () => {
    const { selectedId, threads } = get();
    const t = threads.find((x) => x.id === selectedId);
    if (!t) return;
    const last = t.messages[t.messages.length - 1]!;
    get().openCompose({
      mode: "forward",
      threadId: t.id,
      to: "",
      subject: t.subject.startsWith("Fwd:") ? t.subject : `Fwd: ${t.subject}`,
      body: `\n\n---------- Forwarded message ----------\nFrom: ${last.from.name} <${last.from.email}>\n\n${last.body}`,
      tracking: true,
      attachments: last.attachments.filter((a) => a.dataUrl),
    });
  },

  send: async () => {
    const c = get().compose;
    if (!c) return null;
    const to = parseAddressList(c.to);
    if (to.length === 0) return "Add a recipient";
    const now = new Date().toISOString();
    const me = get().me;
    const followUpUntil = c.remind ? new Date(Date.now() + FOLLOW_UP_MS).toISOString() : undefined;
    const msg = {
      id: nid("m"),
      from: me,
      to,
      cc: parseAddressList(c.cc),
      date: now,
      body: c.body.trim() || snippetOf(c.subject),
      attachments: c.attachments ?? [],
      tracking: get().source === "demo" && c.tracking,
      opens: [],
    };
    const existing = c.threadId ? get().threads.find((t) => t.id === c.threadId) : undefined;
    const holdUntil = new Date(Date.now() + HOLD_MS).toISOString();
    const thread: Thread = existing
      ? {
          ...existing,
          folder: "sent",
          unread: false,
          subject: c.subject.trim() || existing.subject,
          followUpUntil,
          sendAt: holdUntil,
          labels: c.remind
            ? existing.labels.includes("Waiting")
              ? existing.labels
              : [...existing.labels, "Waiting"]
            : existing.labels,
          messages: [...existing.messages, msg],
        }
      : {
          id: nid("t"),
          subject: c.subject.trim() || "(no subject)",
          folder: "sent",
          unread: false,
          starred: false,
          focused: true,
          labels: c.remind ? ["Waiting"] : [],
          followUpUntil,
          sendAt: holdUntil,
          messages: [msg],
        };
    set((s) => ({
      compose: null,
      sendLaterOpen: false,
      threads: [thread, ...s.threads.filter((t) => t.id !== thread.id)],
      undoStack: [
        existing
          ? { label: "Send", threads: snapshot(s.threads, [existing.id]) }
          : { label: "Send", threads: [], removeIds: [thread.id] },
        ...s.undoStack,
      ].slice(0, 12),
    }));
    get().persist();
    armHold(thread.id, () => {
      const result = get().restoreScheduled();
      if (result.held) toast("Sent");
    });
    return null;
  },

  sendLater: async (at) => {
    const c = get().compose;
    if (!c) return null;
    const to = parseAddressList(c.to);
    if (to.length === 0) return "Add a recipient";
    const me = get().me;
    const thread: Thread = {
      id: nid("t"),
      subject: c.subject.trim() || "(no subject)",
      folder: "drafts",
      unread: false,
      starred: false,
      focused: true,
      labels: c.remind ? ["Waiting"] : [],
      sendAt: at.toISOString(),
      followUpUntil: c.remind ? new Date(at.getTime() + FOLLOW_UP_MS).toISOString() : undefined,
      messages: [
        {
          id: nid("m"),
          from: me,
          to,
          cc: parseAddressList(c.cc),
          date: at.toISOString(),
          body: c.body.trim() || snippetOf(c.subject),
          attachments: c.attachments ?? [],
          tracking: get().source === "demo" && c.tracking,
          opens: [],
        },
      ],
    };
    set((s) => ({
      compose: null,
      sendLaterOpen: false,
      threads: [thread, ...s.threads],
      undoStack: [{ label: "Send later", threads: [], removeIds: [thread.id] }, ...s.undoStack].slice(0, 12),
    }));
    get().persist();
    return null;
  },

  insertSnippet: (id) => {
    const snip = SNIPPETS.find((s) => s.id === id);
    if (!snip) return;
    const c = get().compose;
    if (!c) {
      get().openCompose({ body: snip.body });
      return;
    }
    const body = c.body.trim() ? `${c.body.replace(/\s+$/, "")}\n\n${snip.body}` : snip.body;
    get().patchCompose({ body });
  },
}));
