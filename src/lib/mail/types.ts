export type Folder =
  | "inbox"
  | "starred"
  | "waiting"
  | "drafts"
  | "sent"
  | "snoozed"
  | "done"
  | "trash";

export type Split = "focused" | "other";

export type ComposeMode = "new" | "reply" | "replyAll" | "forward";

export interface Person {
  name: string;
  email: string;
}

export interface ReceiptOpen {
  at: string;
  city: string;
  device: string;
}

export interface Attachment {
  name: string;
  size: string;
  mime?: string;
  dataUrl?: string;
}

export interface Message {
  id: string;
  from: Person;
  to: Person[];
  cc: Person[];
  date: string;
  body: string;
  html?: string;
  attachments: Attachment[];
  tracking: boolean;
  opens: ReceiptOpen[];
  receiptRequested?: boolean;
  imapMailbox?: string;
  imapUid?: number;
  rfcId?: string;
}

export interface Thread {
  id: string;
  subject: string;
  folder: Folder;
  unread: boolean;
  starred: boolean;
  focused: boolean;
  labels: string[];
  snoozeUntil?: string;
  followUpUntil?: string;
  sendAt?: string;
  muted?: boolean;
  messages: Message[];
}

export interface ComposeDraft {
  mode: ComposeMode;
  threadId?: string;
  to: string;
  cc: string;
  subject: string;
  body: string;
  tracking: boolean;
  remind: boolean;
  showCc: boolean;
  sendAt?: string | null;
  attachments: Attachment[];
}

export type ImapOp =
  | "archive"
  | "unarchive"
  | "trash"
  | "restore"
  | "star"
  | "unstar"
  | "seen"
  | "unseen";

export interface ImapRef {
  mailbox: string;
  uid: number;
}

export interface ImapCommand {
  op: ImapOp;
  refs: ImapRef[];
  rfcIds: string[];
  threadId?: string;
  folder?: Folder;
  starred?: boolean;
  unread?: boolean;
  boxId?: string;
}

export interface UndoItem {
  label: string;
  threads: Thread[];
  removeIds?: string[];
  imap?: ImapCommand;
  imapMany?: ImapCommand[];
}

export type MailSlot = 1 | 2;

export interface MailboxInfo {
  id: string;
  slot: MailSlot;
  label: string;
  email: string;
  name: string;
  provider: string;
  lastSync: string | null;
  lastError: string | null;
}

export const DEMO_ME: Person = {
  name: "Alex Rivera",
  email: "alex@omarchy.dev",
};

export const DEMO_PERSONAL: Person = {
  name: "Alex Rivera",
  email: "alex@hey.local",
};

export const ME = DEMO_ME;

export const FOLDERS: { id: Folder; label: string; hint: string }[] = [
  { id: "inbox", label: "Inbox", hint: "G then I" },
  { id: "starred", label: "Starred", hint: "G then S" },
  { id: "waiting", label: "Waiting", hint: "G then W" },
  { id: "drafts", label: "Drafts", hint: "G then D" },
  { id: "sent", label: "Sent", hint: "G then T" },
  { id: "snoozed", label: "Snoozed", hint: "G then H" },
  { id: "done", label: "Done", hint: "G then E" },
  { id: "trash", label: "Trash", hint: "G then #" },
];

export const LABELS = ["Waiting", "Later", "Work", "Personal"] as const;

export type LabelName = (typeof LABELS)[number];
