import { ImapFlow } from "imapflow";
import { simpleParser, type AddressObject, type ParsedMail } from "mailparser";
import nodemailer from "nodemailer";
import type { Folder, Message, Person, Thread } from "./types";

export interface ImapAccount {
  email: string;
  name: string;
  imapHost: string;
  imapPort: number;
  smtpHost: string;
  smtpPort: number;
  username: string;
  authKind?: "password" | "google";
}

export interface OutgoingMail {
  to: string;
  cc: string;
  subject: string;
  body: string;
  attachments?: { name: string; mime?: string; contentBase64: string }[];
}

const FETCH_LIMIT: Record<"inbox" | "sent" | "drafts", number> = {
  inbox: 28,
  sent: 10,
  drafts: 4,
};

function explain(err: unknown, kind: "password" | "google" = "password"): string {
  const m = err instanceof Error ? err.message : String(err);
  if (/auth|invalid credentials|authentication|application-specific|invalid_grant/i.test(m)) {
    return kind === "google"
      ? "Google mail access was rejected. Reconnect with Google."
      : "Username or app password was rejected. Gmail and iCloud need an App Password, not your account password.";
  }
  if (/timeout|ETIMEDOUT|ECONN|ENOTFOUND|certificate/i.test(m)) {
    return "Could not reach the mail server. Check the host and try again.";
  }
  return m.slice(0, 240);
}

function asPerson(addr?: AddressObject | AddressObject[]): Person {
  const first = Array.isArray(addr) ? addr[0] : addr;
  const v = first?.value?.[0];
  const email = (v?.address ?? "").toLowerCase();
  const name = (v?.name || email.split("@")[0] || "").trim();
  return { name, email };
}

function asPeople(addr?: AddressObject | AddressObject[]): Person[] {
  const list = !addr ? [] : Array.isArray(addr) ? addr : [addr];
  return list.flatMap((a) =>
    (a.value ?? []).map((v) => ({
      name: (v.name || v.address?.split("@")[0] || "").trim(),
      email: (v.address ?? "").toLowerCase(),
    })),
  );
}

function bodyText(parsed: ParsedMail): string {
  if (parsed.text?.trim()) return parsed.text.replace(/\r\n/g, "\n").trim();
  if (parsed.html) {
    return parsed.html
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&/g, "&")
      .replace(/</g, "<")
      .replace(/>/g, ">")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .replace(/[ \t]{2,}/g, " ")
      .trim();
  }
  return "";
}

function stripSubject(s: string): string {
  return s.replace(/^(re|fw|fwd)\s*:\s*/gi, "").trim().toLowerCase() || "(no subject)";
}

function isFocused(parsed: ParsedMail): boolean {
  const unsub = parsed.headers?.get("list-unsubscribe");
  if (unsub) return false;
  const from = asPerson(parsed.from).email;
  if (/(no-?reply|notifications?|newsletter|billing|receipts|mailer-daemon|noreply)/i.test(from)) {
    return false;
  }
  return true;
}

function fmtSize(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

async function secretAuth(account: ImapAccount, secret: string): Promise<{ user: string; pass?: string; accessToken?: string }> {
  if (account.authKind === "google") {
    const { refreshGoogleAccess } = await import("./google-cal.server");
    return { user: account.username, accessToken: await refreshGoogleAccess(secret) };
  }
  return { user: account.username, pass: secret };
}

async function withImap<T>(account: ImapAccount, secret: string, fn: (c: ImapFlow) => Promise<T>): Promise<T> {
  const auth = await secretAuth(account, secret);
  const client = new ImapFlow({
    host: account.imapHost,
    port: account.imapPort,
    secure: account.imapPort === 993,
    auth,
    logger: false,
    disableAutoIdle: true,
    connectionTimeout: 8_000,
    greetingTimeout: 8_000,
    socketTimeout: 12_000,
  });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    try {
      await client.logout();
    } catch {
      client.close();
    }
  }
}

function pickPath(
  boxes: { path: string; specialUse?: string | null }[],
  kind: "sent" | "drafts" | "trash" | "archive",
): string | null {
  if (kind === "archive") {
    const all = boxes.find((b) => b.specialUse === "\\All");
    if (all) return all.path;
    const arch = boxes.find((b) => b.specialUse === "\\Archive");
    if (arch) return arch.path;
    const named = boxes.find(
      (b) => /all mail/i.test(b.path) || /(^|\/)archive$/i.test(b.path),
    );
    return named?.path ?? null;
  }
  const special = { sent: "\\Sent", drafts: "\\Drafts", trash: "\\Trash" }[kind];
  const exact = boxes.find((b) => b.specialUse === special);
  if (exact) return exact.path;
  const re = { sent: /sent/i, drafts: /draft/i, trash: /trash|bin/i }[kind];
  return boxes.find((b) => re.test(b.path))?.path ?? null;
}

interface RawMsg {
  uid: number;
  path: string;
  folder: Folder;
  flags: Set<string>;
  parsed: ParsedMail;
}

async function fetchFolder(client: ImapFlow, path: string, folder: Folder, limit: number): Promise<RawMsg[]> {
  const lock = await client.getMailboxLock(path);
  try {
    const exists = client.mailbox && typeof client.mailbox.exists === "number" ? client.mailbox.exists : 0;
    if (!exists) return [];
    const from = Math.max(1, exists - limit + 1);
    const out: RawMsg[] = [];
    for await (const msg of client.fetch(`${from}:*`, { uid: true, source: true, flags: true })) {
      if (!msg.source) continue;
      const parsed = await simpleParser(msg.source);
      out.push({ uid: msg.uid, path, folder, flags: msg.flags ?? new Set(), parsed });
    }
    return out;
  } finally {
    lock.release();
  }
}

function threadId(accountEmail: string, msg: RawMsg, parsed: ParsedMail): string {
  const gm = parsed.headers?.get("x-gm-thrid");
  if (typeof gm === "string" && gm) return `gm:${accountEmail}:${gm}`;
  const ref = parsed.inReplyTo || (Array.isArray(parsed.references) ? parsed.references[0] : parsed.references);
  if (typeof ref === "string" && ref) return `ref:${accountEmail}:${ref}`;
  const sub = stripSubject(parsed.subject || "");
  const from = asPerson(parsed.from).email;
  return `sub:${accountEmail}:${sub}:${from}`;
}

const HTML_CAP = 80_000;

function capHtml(html?: string) {
  if (!html?.trim()) return undefined;
  const trimmed = html.trim();
  return trimmed.length > HTML_CAP ? trimmed.slice(0, HTML_CAP) : trimmed;
}

function toMessage(msg: RawMsg): Message {
  const parsed = msg.parsed;
  const from = asPerson(parsed.from);
  return {
    id: `m:${msg.folder}:${msg.uid}`,
    from,
    to: asPeople(parsed.to),
    cc: asPeople(parsed.cc),
    date: (parsed.date ?? new Date()).toISOString(),
    body: bodyText(parsed),
    html: capHtml(typeof parsed.html === "string" ? parsed.html : undefined),
    attachments: (parsed.attachments ?? [])
      .filter((a) => a.filename)
      .slice(0, 8)
      .map((a) => ({
        name: a.filename!,
        size: fmtSize(a.size ?? a.content?.length ?? 0),
        mime: a.contentType,
      })),
    tracking: false,
    opens: [],
    imapMailbox: msg.path,
    imapUid: msg.uid,
    rfcId: parsed.messageId,
  };
}

function assemble(account: ImapAccount, raw: RawMsg[]): { me: Person; threads: Thread[] } {
  const me: Person = {
    name: account.name || account.email.split("@")[0] || account.email,
    email: account.email.toLowerCase(),
  };
  const groups = new Map<string, RawMsg[]>();
  for (const msg of raw) {
    const id = threadId(me.email, msg, msg.parsed);
    const list = groups.get(id) ?? [];
    list.push(msg);
    groups.set(id, list);
  }
  const threads: Thread[] = [];
  for (const [id, msgs] of groups) {
    msgs.sort((a, b) => (a.parsed.date?.getTime() ?? 0) - (b.parsed.date?.getTime() ?? 0));
    const last = msgs[msgs.length - 1]!;
    const folder = msgs.some((m) => m.folder === "inbox")
      ? "inbox"
      : (last.folder as Folder);
    threads.push({
      id,
      subject: last.parsed.subject?.trim() || "(no subject)",
      folder,
      unread: msgs.some((m) => !m.flags.has("\\Seen") && m.folder === "inbox"),
      starred: msgs.some((m) => m.flags.has("\\Flagged")),
      focused: isFocused(last.parsed),
      labels: [],
      messages: msgs.map(toMessage),
    });
  }
  threads.sort((a, b) => {
    const da = a.messages[a.messages.length - 1]?.date ?? "";
    const db = b.messages[b.messages.length - 1]?.date ?? "";
    return db.localeCompare(da);
  });
  return { me, threads };
}

export async function fetchMailbox(account: ImapAccount, password: string) {
  try {
    return await withImap(account, password, async (client) => {
      const boxes = await client.list();
      const raw: RawMsg[] = [];
      raw.push(...(await fetchFolder(client, "INBOX", "inbox", FETCH_LIMIT.inbox)));
      const sent = pickPath(boxes, "sent");
      if (sent) raw.push(...(await fetchFolder(client, sent, "sent", FETCH_LIMIT.sent)));
      const drafts = pickPath(boxes, "drafts");
      if (drafts) raw.push(...(await fetchFolder(client, drafts, "drafts", FETCH_LIMIT.drafts)));
      return assemble(account, raw);
    });
  } catch (err) {
    throw new Error(explain(err, account.authKind));
  }
}

export async function sendViaSmtp(account: ImapAccount, secret: string, mail: OutgoingMail) {
  const creds = await secretAuth(account, secret);
  const auth =
    account.authKind === "google"
      ? { type: "OAuth2" as const, user: account.username, accessToken: creds.accessToken }
      : { user: account.username, pass: secret };
  const transporter = nodemailer.createTransport({
    host: account.smtpHost,
    port: account.smtpPort,
    secure: account.smtpPort === 465,
    auth,
    connectionTimeout: 8_000,
    greetingTimeout: 8_000,
    socketTimeout: 12_000,
  });
  try {
    await transporter.sendMail({
      from: account.name ? `"${account.name}" <${account.email}>` : account.email,
      to: mail.to,
      cc: mail.cc || undefined,
      subject: mail.subject || "(no subject)",
      text: mail.body,
      attachments: (mail.attachments ?? []).map((a) => ({
        filename: a.name,
        content: Buffer.from(a.contentBase64, "base64"),
        contentType: a.mime || undefined,
      })),
    });
  } catch (err) {
    throw new Error(explain(err, account.authKind));
  } finally {
    transporter.close();
  }
}

function groupRefs(refs: { mailbox: string; uid: number }[]) {
  const map = new Map<string, number[]>();
  for (const r of refs) {
    if (!r.mailbox || !Number.isFinite(r.uid)) continue;
    const list = map.get(r.mailbox) ?? [];
    list.push(r.uid);
    map.set(r.mailbox, list);
  }
  return map;
}

async function flagRefs(
  client: ImapFlow,
  refs: { mailbox: string; uid: number }[],
  flags: string[],
  add: boolean,
) {
  for (const [mailbox, uids] of groupRefs(refs)) {
    const lock = await client.getMailboxLock(mailbox);
    try {
      if (add) await client.messageFlagsAdd(uids, flags, { uid: true });
      else await client.messageFlagsRemove(uids, flags, { uid: true });
    } finally {
      lock.release();
    }
  }
}

async function moveRefs(
  client: ImapFlow,
  refs: { mailbox: string; uid: number }[],
  dest: string,
) {
  for (const [mailbox, uids] of groupRefs(refs)) {
    if (mailbox === dest) continue;
    const lock = await client.getMailboxLock(mailbox);
    try {
      await client.messageMove(uids.join(","), dest, { uid: true });
    } finally {
      lock.release();
    }
  }
}

function idVariants(rfcId: string): string[] {
  const trimmed = rfcId.trim();
  if (!trimmed) return [];
  const wrapped = trimmed.startsWith("<") ? trimmed : `<${trimmed}>`;
  const bare = wrapped.slice(1, -1);
  return [...new Set([trimmed, wrapped, bare])];
}

async function uidsByRfc(client: ImapFlow, mailbox: string, rfcIds: string[]): Promise<number[]> {
  const found: number[] = [];
  for (const rfcId of rfcIds) {
    for (const variant of idVariants(rfcId)) {
      const uids = await client.search({ header: { "Message-ID": variant } }, { uid: true });
      if (uids && uids.length) {
        found.push(...uids);
        break;
      }
    }
  }
  return [...new Set(found)];
}

async function moveByRfc(client: ImapFlow, mailbox: string, rfcIds: string[], dest: string) {
  const lock = await client.getMailboxLock(mailbox);
  try {
    const uids = await uidsByRfc(client, mailbox, rfcIds);
    if (uids.length === 0) return false;
    await client.messageMove(uids.join(","), dest, { uid: true });
    return true;
  } finally {
    lock.release();
  }
}

export type MutateOp =
  | "archive"
  | "unarchive"
  | "trash"
  | "restore"
  | "star"
  | "unstar"
  | "seen"
  | "unseen";

export async function mutateMailbox(
  account: ImapAccount,
  password: string,
  op: MutateOp,
  refs: { mailbox: string; uid: number }[],
  rfcIds: string[] = [],
) {
  try {
    await withImap(account, password, async (client) => {
      const boxes = await client.list();
      if (op === "star" || op === "unstar") {
        await flagRefs(client, refs, ["\\Flagged"], op === "star");
        return;
      }
      if (op === "seen" || op === "unseen") {
        await flagRefs(client, refs, ["\\Seen"], op === "seen");
        return;
      }
      if (op === "archive") {
        if (refs.length) await flagRefs(client, refs, ["\\Seen"], true);
        const dest = pickPath(boxes, "archive");
        if (!dest) throw new Error("This mailbox has no Archive folder");
        if (refs.length) await moveRefs(client, refs, dest);
        return;
      }
      if (op === "trash") {
        const dest = pickPath(boxes, "trash");
        if (!dest) throw new Error("This mailbox has no Trash folder");
        if (refs.length) await moveRefs(client, refs, dest);
        return;
      }
      if (op === "unarchive" || op === "restore") {
        const src =
          op === "unarchive" ? pickPath(boxes, "archive") : (pickPath(boxes, "trash") ?? pickPath(boxes, "archive"));
        if (!src) throw new Error("Could not find the original folder");
        if (rfcIds.length) {
          const moved = await moveByRfc(client, src, rfcIds, "INBOX");
          if (moved) return;
        }
        if (refs.length) await moveRefs(client, refs, "INBOX");
      }
    });
  } catch (err) {
    throw new Error(explain(err, account.authKind));
  }
}

const ATTACH_CAP = 8_000_000;

export async function fetchAttachment(
  account: ImapAccount,
  password: string,
  mailbox: string,
  uid: number,
  filename: string,
) {
  try {
    return await withImap(account, password, async (client) => {
      const lock = await client.getMailboxLock(mailbox);
      try {
        for await (const msg of client.fetch(String(uid), { uid: true, source: true }, { uid: true })) {
          if (!msg.source) continue;
          const parsed = await simpleParser(msg.source);
          const att = (parsed.attachments ?? []).find((a) => a.filename === filename);
          if (!att?.content) throw new Error("Attachment not found");
          const buf = Buffer.isBuffer(att.content) ? att.content : Buffer.from(att.content);
          if (buf.length > ATTACH_CAP) throw new Error("Attachment is too large to open here");
          return {
            filename: att.filename!,
            mime: att.contentType || "application/octet-stream",
            base64: buf.toString("base64"),
          };
        }
        throw new Error("Message not found");
      } finally {
        lock.release();
      }
    });
  } catch (err) {
    throw new Error(explain(err, account.authKind));
  }
}
