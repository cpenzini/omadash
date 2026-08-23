/**
 * Client prefs that are not mailbox state: layout, settings, notifications.
 * Stored separately from IMAP so a disconnect does not reset the desk.
 */
import { create } from "zustand";

export const PREFS_KEY = "omadash-prefs-v1";

export type MailLayout = "two" | "three";

export type PrefsData = {
  layout: MailLayout;
  notifyMail: boolean;
  notifyEvents: boolean;
  showRemoteImages: boolean;
};

const DEFAULTS: PrefsData = {
  layout: "two",
  notifyMail: true,
  notifyEvents: true,
  showRemoteImages: false,
};

function parsePrefs(raw: unknown): PrefsData {
  if (!raw || typeof raw !== "object") return { ...DEFAULTS };
  const o = raw as Record<string, unknown>;
  return {
    layout: o.layout === "three" ? "three" : "two",
    notifyMail: o.notifyMail !== false,
    notifyEvents: o.notifyEvents !== false,
    showRemoteImages: o.showRemoteImages === true,
  };
}

export function readPrefs(): PrefsData {
  if (typeof window === "undefined") return { ...DEFAULTS };
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return { ...DEFAULTS };
    return parsePrefs(JSON.parse(raw));
  } catch {
    return { ...DEFAULTS };
  }
}

function writePrefs(data: PrefsData) {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(data));
  } catch {
    /* quota */
  }
}

interface PrefsState extends PrefsData {
  hydrated: boolean;
  settingsOpen: boolean;
  hydrate: () => void;
  setLayout: (layout: MailLayout) => void;
  setSettingsOpen: (open: boolean) => void;
  setNotifyMail: (v: boolean) => void;
  setNotifyEvents: (v: boolean) => void;
  setShowRemoteImages: (v: boolean) => void;
}

export const usePrefsStore = create<PrefsState>((set, get) => ({
  ...DEFAULTS,
  hydrated: false,
  settingsOpen: false,
  hydrate: () => {
    if (get().hydrated) return;
    set({ ...readPrefs(), hydrated: true });
  },
  setLayout: (layout) => {
    const next = { ...slice(get()), layout };
    writePrefs(next);
    set({ layout });
  },
  setSettingsOpen: (settingsOpen) => set({ settingsOpen }),
  setNotifyMail: (notifyMail) => {
    const next = { ...slice(get()), notifyMail };
    writePrefs(next);
    set({ notifyMail });
  },
  setNotifyEvents: (notifyEvents) => {
    const next = { ...slice(get()), notifyEvents };
    writePrefs(next);
    set({ notifyEvents });
  },
  setShowRemoteImages: (showRemoteImages) => {
    const next = { ...slice(get()), showRemoteImages };
    writePrefs(next);
    set({ showRemoteImages });
  },
}));

function slice(s: PrefsData): PrefsData {
  return {
    layout: s.layout,
    notifyMail: s.notifyMail,
    notifyEvents: s.notifyEvents,
    showRemoteImages: s.showRemoteImages,
  };
}

/** Side effects that belong with a layout change — list vs open thread. */
export function applyMailLayout(
  layout: MailLayout,
  mail: {
    selectedId: string | null;
    setMobilePane: (pane: "list" | "read") => void;
    select: (id: string | null, opts?: { open?: boolean }) => void;
  },
) {
  usePrefsStore.getState().setLayout(layout);
  if (layout === "two") mail.setMobilePane("list");
  else if (mail.selectedId) mail.select(mail.selectedId, { open: true });
}
