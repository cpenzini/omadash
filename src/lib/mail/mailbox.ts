/**
 * Auth-scoped server door to IMAP/SMTP. Every handler uses authMiddleware
 * and keys rows by context.userId. Add endpoints here, not from the client.
 */
import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import { presetById, type MailProviderId } from "./presets";
import type { Folder, ImapCommand, MailSlot, MailboxInfo, Message, Thread } from "./types";

export type MailboxStatus = {
  connected: boolean;
  boxes: MailboxInfo[];
  activeId: string | null;
  email: string | null;
  name: string | null;
  provider: string | null;
  lastSync: string | null;
  lastError: string | null;
  threads: Thread[];
};

type BoxRow = {
  id: string;
  slot: number;
  label: string;
  email: string;
  name: string;
  provider: string;
  imap_host: string;
  imap_port: number;
  smtp_host: string;
  smtp_port: number;
  username: string;
  password_cipher: string;
  auth_kind: string;
  last_sync: string | null;
  last_error: string | null;
};

type ThreadRow = {
  id: string;
  subject: string;
  folder: string;
  unread: boolean;
  starred: boolean;
  focused: boolean;
  labels: string;
  snooze_until: string | null;
  payload: string;
};

function parseThreads(rows: ThreadRow[]): Thread[] {
  return rows.map((r) => ({
    id: r.id,
    subject: r.subject,
    folder: r.folder as Folder,
    unread: Boolean(r.unread),
    starred: Boolean(r.starred),
    focused: Boolean(r.focused),
    labels: safeJson(r.labels, [] as string[]),
    snoozeUntil: r.snooze_until ?? undefined,
    messages: safeJson(r.payload, [] as Message[]),
  }));
}

function safeJson<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function toBoxInfo(row: BoxRow): MailboxInfo {
  return {
    id: row.id,
    slot: (row.slot === 2 ? 2 : 1) as MailSlot,
    label: row.label || (row.slot === 2 ? "Personal" : "Work"),
    email: row.email,
    name: row.name,
    provider: row.provider,
    lastSync: row.last_sync,
    lastError: row.last_error,
  };
}

function emptyStatus(boxes: MailboxInfo[] = []): MailboxStatus {
  return {
    connected: boxes.length > 0,
    boxes,
    activeId: boxes[0]?.id ?? null,
    email: boxes[0]?.email ?? null,
    name: boxes[0]?.name ?? null,
    provider: boxes[0]?.provider ?? null,
    lastSync: boxes[0]?.lastSync ?? null,
    lastError: boxes[0]?.lastError ?? null,
    threads: [],
  };
}

function toStatus(boxes: BoxRow[], active: BoxRow | undefined, threads: Thread[]): MailboxStatus {
  const info = boxes.map(toBoxInfo);
  if (!active) return emptyStatus(info);
  return {
    connected: true,
    boxes: info,
    activeId: active.id,
    email: active.email,
    name: active.name,
    provider: active.provider,
    lastSync: active.last_sync,
    lastError: active.last_error,
    threads,
  };
}

function toImapAccount(row: BoxRow) {
  return {
    email: row.email,
    name: row.name,
    imapHost: row.imap_host,
    imapPort: Number(row.imap_port),
    smtpHost: row.smtp_host,
    smtpPort: Number(row.smtp_port),
    username: row.username,
    authKind: (row.auth_kind === "google" ? "google" : "password") as "password" | "google",
  };
}

async function listBoxes(userId: string): Promise<BoxRow[]> {
  const sql = await getSql();
  try {
    const rows = await sql<BoxRow>`
      select id, slot, label, email, name, provider, imap_host, imap_port, smtp_host, smtp_port,
             username, password_cipher, coalesce(auth_kind, 'password') as auth_kind, last_sync, last_error
      from mail_boxes where user_id = ${userId} order by slot
    `;
    if (rows.length) return rows;
  } catch {
    /* table might not exist yet */
  }
  const legacy = await sql<{
    email: string;
    name: string;
    provider: string;
    imap_host: string;
    imap_port: number;
    smtp_host: string;
    smtp_port: number;
    username: string;
    password_cipher: string;
    last_sync: string | null;
    last_error: string | null;
  }>`
    select email, name, provider, imap_host, imap_port, smtp_host, smtp_port,
           username, password_cipher, last_sync, last_error
    from mail_accounts where user_id = ${userId} limit 1
  `;
  const row = legacy[0];
  if (!row) return [];
  try {
    await sql`
      insert into mail_boxes (
        id, user_id, slot, label, email, name, provider, imap_host, imap_port, smtp_host, smtp_port,
        username, password_cipher, last_sync, last_error
      ) values (
        'box-1', ${userId}, 1, 'Work', ${row.email}, ${row.name}, ${row.provider},
        ${row.imap_host}, ${row.imap_port}, ${row.smtp_host}, ${row.smtp_port},
        ${row.username}, ${row.password_cipher}, ${row.last_sync}, ${row.last_error}
      )
      on conflict do nothing
    `;
    await sql`update mail_threads set box_id = 'box-1' where user_id = ${userId}`;
  } catch {
    /* ignore */
  }
  return [
    {
      id: "box-1",
      slot: 1,
      label: "Work",
      auth_kind: "password",
      ...row,
    },
  ];
}

async function pickBox(userId: string, boxId?: string | null): Promise<{ boxes: BoxRow[]; active?: BoxRow }> {
  const boxes = await listBoxes(userId);
  const active = (boxId && boxes.find((b) => b.id === boxId)) || boxes[0];
  return { boxes, active };
}

async function saveThreads(userId: string, boxId: string, threads: Thread[]) {
  const sql = await getSql();
  await sql`delete from mail_threads where user_id = ${userId} and box_id = ${boxId}`;
  for (const t of threads) {
    await sql`
      insert into mail_threads (
        id, user_id, box_id, subject, folder, unread, starred, focused, labels, snooze_until, payload, updated_at
      ) values (
        ${t.id}, ${userId}, ${boxId}, ${t.subject}, ${t.folder}, ${t.unread}, ${t.starred}, ${t.focused},
        ${JSON.stringify(t.labels)}, ${t.snoozeUntil ?? null}, ${JSON.stringify(t.messages)}, now()
      )
    `;
  }
}

async function loadThreads(userId: string, boxId: string): Promise<Thread[]> {
  const sql = await getSql();
  const rows = await sql<ThreadRow>`
    select id, subject, folder, unread, starred, focused, labels, snooze_until, payload
    from mail_threads where user_id = ${userId} and box_id = ${boxId}
  `;
  if (rows.length) return parseThreads(rows);
  const legacy = await sql<ThreadRow>`
    select id, subject, folder, unread, starred, focused, labels, snooze_until, payload
    from mail_threads where user_id = ${userId}
  `;
  return parseThreads(legacy);
}

export const getMailbox = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((input?: { boxId?: string }) => input ?? {})
  .handler(async ({ context, data }): Promise<MailboxStatus> => {
    const { boxes, active } = await pickBox(context.userId, data.boxId);
    if (!active) return emptyStatus();
    return toStatus(boxes, active, await loadThreads(context.userId, active.id));
  });

export const connectMailbox = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: {
    provider: MailProviderId;
    email: string;
    password: string;
    name?: string;
    label?: string;
    slot?: MailSlot;
    imapHost?: string;
    imapPort?: number;
    smtpHost?: string;
    smtpPort?: number;
    username?: string;
  }) => {
    const email = input.email.trim().toLowerCase();
    if (!email.includes("@")) throw new Error("Enter a valid email");
    if (!input.password.trim()) throw new Error("App password is required");
    return { ...input, email, password: input.password.trim() };
  })
  .handler(async ({ context, data }): Promise<MailboxStatus> => {
    const preset = presetById(data.provider);
    const imapHost = (data.imapHost || preset.imapHost).trim();
    const smtpHost = (data.smtpHost || preset.smtpHost).trim();
    if (!imapHost || !smtpHost) throw new Error("IMAP and SMTP hosts are required");
    const username = (data.username || data.email).trim();
    const name = (data.name || data.email.split("@")[0] || data.email).trim();
    const existing = await listBoxes(context.userId);
    const slot: MailSlot = data.slot ?? (existing.some((b) => b.slot === 1) ? 2 : 1);
    if (slot !== 1 && slot !== 2) throw new Error("Only two mailboxes");
    if (existing.length >= 2 && !existing.some((b) => b.slot === slot)) {
      throw new Error("Both mailboxes are already connected");
    }
    const id = existing.find((b) => b.slot === slot)?.id ?? `box-${slot}`;
    const label = data.label?.trim() || (slot === 2 ? "Personal" : "Work");
    const account = {
      email: data.email,
      name,
      imapHost,
      imapPort: data.imapPort || preset.imapPort,
      smtpHost,
      smtpPort: data.smtpPort || preset.smtpPort,
      username,
    };

    const { fetchMailbox } = await import("./imap.server");
    const { sealSecret } = await import("./crypto.server");
    const fetched = await fetchMailbox(account, data.password);
    const cipher = sealSecret(data.password);
    const sql = await getSql();
    await sql`
      insert into mail_boxes (
        id, user_id, slot, label, email, name, provider, imap_host, imap_port, smtp_host, smtp_port,
        username, password_cipher, auth_kind, last_sync, last_error
      ) values (
        ${id}, ${context.userId}, ${slot}, ${label}, ${account.email}, ${fetched.me.name}, ${data.provider},
        ${account.imapHost}, ${account.imapPort}, ${account.smtpHost}, ${account.smtpPort},
        ${account.username}, ${cipher}, ${"password"}, now(), null
      )
      on conflict (user_id, id) do update set
        slot = excluded.slot,
        label = excluded.label,
        email = excluded.email,
        name = excluded.name,
        provider = excluded.provider,
        imap_host = excluded.imap_host,
        imap_port = excluded.imap_port,
        smtp_host = excluded.smtp_host,
        smtp_port = excluded.smtp_port,
        username = excluded.username,
        password_cipher = excluded.password_cipher,
        auth_kind = excluded.auth_kind,
        last_sync = excluded.last_sync,
        last_error = null
    `;
    await saveThreads(context.userId, id, fetched.threads);
    const { boxes, active } = await pickBox(context.userId, id);
    return toStatus(boxes, active, fetched.threads);
  });

export const syncMailbox = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input?: { boxId?: string }) => input ?? {})
  .handler(async ({ context, data }): Promise<MailboxStatus> => {
    const { boxes, active } = await pickBox(context.userId, data.boxId);
    if (!active) return emptyStatus();
    const { fetchMailbox } = await import("./imap.server");
    const { openSecret } = await import("./crypto.server");
    const sql = await getSql();
    try {
      const password = openSecret(active.password_cipher);
      const fetched = await fetchMailbox(toImapAccount(active), password);
      await sql`
        update mail_boxes set last_sync = now(), last_error = null, name = ${fetched.me.name}
        where user_id = ${context.userId} and id = ${active.id}
      `;
      await saveThreads(context.userId, active.id, fetched.threads);
      const next = await listBoxes(context.userId);
      return toStatus(next, next.find((b) => b.id === active.id), fetched.threads);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Sync failed";
      await sql`update mail_boxes set last_error = ${message} where user_id = ${context.userId} and id = ${active.id}`;
      const next = await listBoxes(context.userId);
      return toStatus(next, next.find((b) => b.id === active.id), await loadThreads(context.userId, active.id));
    }
  });

export const disconnectMailbox = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input?: { boxId?: string }) => input ?? {})
  .handler(async ({ context, data }): Promise<MailboxStatus> => {
    const sql = await getSql();
    const { boxes, active } = await pickBox(context.userId, data.boxId);
    if (!active) return emptyStatus();
    await sql`delete from mail_threads where user_id = ${context.userId} and box_id = ${active.id}`;
    await sql`delete from mail_boxes where user_id = ${context.userId} and id = ${active.id}`;
    if (boxes.length <= 1) {
      await sql`delete from mail_accounts where user_id = ${context.userId}`;
      return emptyStatus();
    }
    const next = await listBoxes(context.userId);
    const leftover = next[0];
    return toStatus(next, leftover, leftover ? await loadThreads(context.userId, leftover.id) : []);
  });

export const sendMail = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: {
    to: string;
    cc: string;
    subject: string;
    body: string;
    boxId?: string;
    attachments?: { name: string; mime?: string; contentBase64: string }[];
  }) => {
    const attachments = (input.attachments ?? [])
      .filter((a) => a && a.name && typeof a.contentBase64 === "string")
      .slice(0, 8);
    let total = 0;
    for (const a of attachments) {
      total += Math.ceil(a.contentBase64.length * 0.75);
      if (total > 8 * 1024 * 1024) throw new Error("Attachments are too large (8 MB max)");
    }
    return { ...input, attachments };
  })
  .handler(async ({ context, data }): Promise<{ ok: true } | { ok: false; error: string }> => {
    const { active } = await pickBox(context.userId, data.boxId);
    if (!active) return { ok: false, error: "Connect a mailbox first" };
    try {
      const { sendViaSmtp } = await import("./imap.server");
      const { openSecret } = await import("./crypto.server");
      await sendViaSmtp(toImapAccount(active), openSecret(active.password_cipher), data);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : "Send failed" };
    }
  });

export const applyImap = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: ImapCommand) => input)
  .handler(async ({ context, data }): Promise<{ ok: true } | { ok: false; error: string }> => {
    const { active } = await pickBox(context.userId, data.boxId);
    if (!active) return { ok: false, error: "Connect a mailbox first" };
    try {
      const { mutateMailbox } = await import("./imap.server");
      const { openSecret } = await import("./crypto.server");
      await mutateMailbox(
        toImapAccount(active),
        openSecret(active.password_cipher),
        data.op,
        data.refs,
        data.rfcIds,
      );
      if (data.threadId) {
        const sql = await getSql();
        if (data.folder) {
          await sql`
            update mail_threads
            set folder = ${data.folder}, unread = ${data.unread ?? false}, updated_at = now()
            where user_id = ${context.userId} and box_id = ${active.id} and id = ${data.threadId}
          `;
        }
        if (typeof data.starred === "boolean") {
          await sql`
            update mail_threads
            set starred = ${data.starred}, updated_at = now()
            where user_id = ${context.userId} and box_id = ${active.id} and id = ${data.threadId}
          `;
        }
        if (typeof data.unread === "boolean" && !data.folder) {
          await sql`
            update mail_threads
            set unread = ${data.unread}, updated_at = now()
            where user_id = ${context.userId} and box_id = ${active.id} and id = ${data.threadId}
          `;
        }
      }
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : "Mailbox write failed" };
    }
  });

export const getAttachment = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { boxId?: string; mailbox: string; uid: number; filename: string }) => input)
  .handler(async ({ context, data }): Promise<{ ok: true; filename: string; mime: string; base64: string } | { ok: false; error: string }> => {
    const { active } = await pickBox(context.userId, data.boxId);
    if (!active) return { ok: false, error: "Connect a mailbox first" };
    try {
      const { fetchAttachment } = await import("./imap.server");
      const { openSecret } = await import("./crypto.server");
      const file = await fetchAttachment(
        toImapAccount(active),
        openSecret(active.password_cipher),
        data.mailbox,
        data.uid,
        data.filename,
      );
      return { ok: true, ...file };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : "Could not open attachment" };
    }
  });

/** Called from Google OAuth finish — stores a Gmail box keyed by refresh token. */
export async function upsertGoogleMailbox(
  userId: string,
  opts: { email: string; name: string; refreshToken: string },
): Promise<void> {
  const { sealSecret } = await import("./crypto.server");
  const { fetchMailbox } = await import("./imap.server");
  const sql = await getSql();
  const existing = await listBoxes(userId);
  const hit =
    existing.find((b) => b.auth_kind === "google" && b.provider === "gmail") ||
    existing.find((b) => b.email === opts.email && b.provider === "gmail");
  const slot: MailSlot = hit ? ((hit.slot === 2 ? 2 : 1) as MailSlot) : existing.some((b) => b.slot === 1) ? 2 : 1;
  if (!hit && existing.length >= 2) {
    throw new Error("Both mailboxes are already connected");
  }
  const id = hit?.id ?? `box-${slot}`;
  const label = hit?.label || (slot === 2 ? "Personal" : "Work");
  const cipher = sealSecret(opts.refreshToken);
  const account = {
    email: opts.email,
    name: opts.name,
    imapHost: "imap.gmail.com",
    imapPort: 993,
    smtpHost: "smtp.gmail.com",
    smtpPort: 587,
    username: opts.email,
    authKind: "google" as const,
  };
  await sql`
    insert into mail_boxes (
      id, user_id, slot, label, email, name, provider, imap_host, imap_port, smtp_host, smtp_port,
      username, password_cipher, auth_kind, last_sync, last_error
    ) values (
      ${id}, ${userId}, ${slot}, ${label}, ${account.email}, ${account.name}, ${"gmail"},
      ${account.imapHost}, ${account.imapPort}, ${account.smtpHost}, ${account.smtpPort},
      ${account.username}, ${cipher}, ${"google"}, now(), null
    )
    on conflict (user_id, id) do update set
      email = excluded.email,
      name = excluded.name,
      provider = excluded.provider,
      imap_host = excluded.imap_host,
      imap_port = excluded.imap_port,
      smtp_host = excluded.smtp_host,
      smtp_port = excluded.smtp_port,
      username = excluded.username,
      password_cipher = excluded.password_cipher,
      auth_kind = excluded.auth_kind,
      last_sync = excluded.last_sync,
      last_error = null
  `;
  try {
    const fetched = await fetchMailbox(account, opts.refreshToken);
    await sql`
      update mail_boxes set last_sync = now(), last_error = null, name = ${fetched.me.name}
      where user_id = ${userId} and id = ${id}
    `;
    await saveThreads(userId, id, fetched.threads);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gmail sync failed";
    await sql`update mail_boxes set last_error = ${message} where user_id = ${userId} and id = ${id}`;
  }
}
