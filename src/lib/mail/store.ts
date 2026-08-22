/**
 * Client mailbox state. Every user-facing action that mutates mail lives here.
 * Keys call these methods; IMAP writes go through fireImap → mailbox.ts.
 */
import { create } from "zustand";
import { toast } from "sonner";
import { SNIPPETS } from "./snippets";
import { buildSeed, buildPersonalSeed } from "./seed";
import { parseAddressList, snippetOf } from "./format";
import { applyImap, sendMail, type MailboxStatus } from "./mailbox";
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

const STORAGE_KEY = "omadash-mail-v1";
const PERSONAL_KEY = "omadash-mail-personal-v1";
const IMAP_KEY = "omadash-imap-v1";
const ONBOARD_KEY = "omadash-onboarded-v1";
const ACTIVE_KEY = "omadash-active-box-v1";
const VERSION = 1;

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
  folder: Folder;
  split: Split;
  search: string;
  compose: ComposeDraft | null;
  commandOpen: boolean;
  shortcutsOpen: boolean;
  snoozeOpen: boolean;
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
  omarchyOpen: boolean;

  hydrate: () => void;
  persist: () => void;
  applyMailbox: (status: MailboxStatus) => void;
  useDemo: () => void;
  setConnectOpen: (open: boolean) => void;
  setSyncing: (v: boolean) => void;
  setOmarchyOpen: (open: boolean) => void;
  switchBox: (slot: MailSlot) => void;

  select: (id: string | null) => void;
  move: (delta: number) => void;
  setFolder: (folder: Folder) => void;
  setSplit: (split: Split) => void;
  setSearch: (q: string) => void;
  setCommandOpen: (open: boolean) => void;
  setShortcutsOpen: (open: boolean) => void;
  setSnoozeOpen: (open: boolean) => void;
  setPendingG: (v: boolean) => void;
  dismissOnboarding: () => void;
  setMobilePane: (pane: "list" | "read") => void;

  toggleStar: (id?: string) => void;
  toggleUnread: (id?: string) => void;
  done: (id?: string) => void;
  trash: (id?: string) => void;
  snooze: (until: Date, id?: string) => void;
  restoreSnoozes: () => void;
  setLabel: (label: string, id?: string) => void;
  undo: () => string | null;

  openCompose: (draft?: Partial<ComposeDraft>) => void;
  closeCompose: (saveDraft?: boolean) => void;
  patchCompose: (patch: Partial<ComposeDraft>) => void;
  reply: (all?: boolean) => void;
  forward: () => void;
  send: () => Promise<string | null>;
  insertSnippet: (id: string) => void;
}
