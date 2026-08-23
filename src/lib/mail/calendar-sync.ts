/**
 * Auth-scoped calendar accounts. CalDAV + Google + ICS feeds.
 */
import { addMonths, subMonths } from "date-fns";
import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql } from "@/lib/db";
import { calPresetById, type CalProviderId } from "./cal-presets";
import type { CalEvent, CalendarFeed } from "./calendar";

type AccountRow = {
  id: string;
  provider: string;
  label: string;
  username: string;
  caldav_url: string;
  ics_url: string;
  password_cipher: string;
  refresh_cipher: string;
  color: string;
  last_sync: string | null;
  last_error: string | null;
};

type EventRow = {
  id: string;
  account_id: string;
  calendar_id: string;
  calendar_name: string;
  remote_uid: string;
  etag: string;
  title: string;
  start_at: string;
  end_at: string;
  location: string;
  description: string;
  rrule: string;
  read_only: boolean;
  payload: string;
};

function nid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function range() {
  const now = new Date();
  return { start: subMonths(now, 2), end: addMonths(now, 10) };
}

function sourceOf(row: EventRow): CalEvent["source"] {
  if (row.read_only) return "ics";
  if (row.account_id.startsWith("g-")) return "google";
  return "caldav";
}

function toEvent(row: EventRow): CalEvent {
  return {
    id: row.id,
    calendarId: `${row.account_id}:${row.calendar_id || "cal"}`,
    title: row.title,
    start: new Date(row.start_at).toISOString(),
    end: new Date(row.end_at).toISOString(),
    where: row.location || undefined,
    description: row.description || undefined,
    rrule: row.rrule || undefined,
    who: row.calendar_name || "Calendar",
    box: 1,
    source: sourceOf(row),
    remoteUid: row.remote_uid,
    href: row.payload || row.calendar_id,
    etag: row.etag,
    accountId: row.account_id,
    readOnly: Boolean(row.read_only),
  };
}

async function listAccounts(userId: string): Promise<AccountRow[]> {
  const sql = await getSql();
  return sql<AccountRow>`
    select id, provider, label, username, caldav_url, ics_url, password_cipher, refresh_cipher, color, last_sync, last_error
    from cal_accounts where user_id = ${userId} order by created_at
  `;
}

async function loadEvents(userId: string): Promise<CalEvent[]> {
  const sql = await getSql();
  const rows = await sql<EventRow>`
    select id, account_id, calendar_id, calendar_name, remote_uid, etag, title, start_at, end_at, location, description, rrule, read_only, payload
    from cal_events where user_id = ${userId} order by start_at
  `;
  return rows.map(toEvent);
}

function toFeed(accounts: AccountRow[], events: CalEvent[], googleOAuth: boolean): CalendarFeed {
  return {
    connected: accounts.length > 0,
    googleOAuth,
    accounts: accounts.map((a) => ({
      id: a.id,
      provider: a.provider,
      label: a.label || a.provider,
      lastSync: a.last_sync,
      lastError: a.last_error,
      color: a.color,
      readOnly: a.provider === "ics" || (a.provider === "google" && !a.refresh_cipher),
    })),
    events,
  };
}

async function replaceAccountEvents(
  userId: string,
  accountId: string,
  events: Array<{
    calendarId: string;
    calendarName: string;
    remoteUid: string;
    etag?: string;
    title: string;
    start: Date;
    end: Date;
    where?: string;
    description?: string;
    rrule?: string;
    href?: string;
    readOnly: boolean;
  }>,
) {
  const sql = await getSql();
  await sql`delete from cal_events where user_id = ${userId} and account_id = ${accountId}`;
  for (const ev of events.slice(0, 400)) {
    const id = nid("ce");
    await sql`
      insert into cal_events (
        id, user_id, account_id, calendar_id, calendar_name, remote_uid, etag,
        title, start_at, end_at, location, description, rrule, read_only, payload
      ) values (
        ${id}, ${userId}, ${accountId}, ${ev.calendarId}, ${ev.calendarName},
        ${ev.remoteUid}, ${ev.etag || ""}, ${ev.title}, ${ev.start.toISOString()}, ${ev.end.toISOString()},
        ${ev.where || ""}, ${ev.description || ""}, ${ev.rrule || ""}, ${ev.readOnly}, ${ev.href || ""}
      )
    `;
  }
}

async function syncAccount(userId: string, account: AccountRow): Promise<string | null> {
  const sql = await getSql();
  try {
    if (account.provider === "ics" || (account.provider === "google" && account.ics_url && !account.refresh_cipher)) {
      const { fetchIcsUrl } = await import("./caldav.server");
      const parsed = await fetchIcsUrl(account.ics_url);
      await replaceAccountEvents(
        userId,
        account.id,
        parsed.map((ev) => ({
          calendarId: "ics",
          calendarName: account.label || "ICS",
          remoteUid: ev.uid,
          title: ev.title,
          start: ev.start,
          end: ev.end,
          where: ev.where,
          description: ev.description,
          rrule: ev.rrule,
          readOnly: true,
        })),
      );
    } else if (account.provider === "google" && account.refresh_cipher) {
      const { openSecret } = await import("./crypto.server");
      const google = await import("./google-cal.server");
      const refresh = openSecret(account.refresh_cipher);
      const access = await google.refreshGoogleAccess(refresh);
      const parsed = await google.fetchGoogleEvents(access, range());
      await replaceAccountEvents(
        userId,
        account.id,
        parsed.map((ev) => ({
          calendarId: ev.calendarId,
          calendarName: ev.calendarName,
          remoteUid: ev.uid,
          title: ev.title,
          start: ev.start,
          end: ev.end,
          where: ev.where,
          description: ev.description,
          rrule: ev.rrule,
          readOnly: false,
        })),
      );
    } else {
      const { openSecret } = await import("./crypto.server");
      const { fetchCalDavEvents } = await import("./caldav.server");
      const password = openSecret(account.password_cipher);
      const bundles = await fetchCalDavEvents(account.caldav_url, account.username, password, range());
      await replaceAccountEvents(
        userId,
        account.id,
        bundles.flatMap((b) =>
          b.events.map((ev) => ({
            calendarId: b.calendar.url,
            calendarName: b.calendar.displayName,
            remoteUid: ev.uid,
            etag: ev.etag,
            href: ev.href,
            title: ev.title,
            start: ev.start,
            end: ev.end,
            where: ev.where,
            description: ev.description,
            rrule: ev.rrule,
            readOnly: false,
          })),
        ),
      );
    }
    await sql`update cal_accounts set last_sync = now(), last_error = null where user_id = ${userId} and id = ${account.id}`;
    return null;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sync failed";
    await sql`update cal_accounts set last_error = ${message} where user_id = ${userId} and id = ${account.id}`;
    return message;
  }
}

export const getCalendars = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<CalendarFeed> => {
    const { googleOAuthEnabled } = await import("./google-cal.server");
    const accounts = await listAccounts(context.userId);
    const events = await loadEvents(context.userId);
    return toFeed(accounts, events, googleOAuthEnabled());
  });

export const connectCalDav = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: {
    provider: CalProviderId;
    username: string;
    password: string;
    caldavUrl?: string;
    label?: string;
  }) => {
    const username = input.username.trim();
    if (!username) throw new Error("Username or email is required");
    if (!input.password.trim()) throw new Error("App password is required");
    return { ...input, username, password: input.password.trim() };
  })
  .handler(async ({ context, data }): Promise<CalendarFeed> => {
    const preset = calPresetById(data.provider);
    const caldavUrl = (data.caldavUrl || preset.caldavUrl).trim().replace(/\/$/, "");
    if (!caldavUrl) throw new Error("CalDAV URL is required");
    const { fetchCalDavEvents } = await import("./caldav.server");
    const { sealSecret } = await import("./crypto.server");
    const { googleOAuthEnabled } = await import("./google-cal.server");
    await fetchCalDavEvents(caldavUrl, data.username, data.password, range());
    const id = nid("ca");
    const cipher = sealSecret(data.password);
    const label = data.label?.trim() || preset.label;
    const sql = await getSql();
    await sql`
      insert into cal_accounts (id, user_id, provider, label, username, caldav_url, password_cipher, color)
      values (${id}, ${context.userId}, ${data.provider}, ${label}, ${data.username}, ${caldavUrl}, ${cipher}, ${preset.color})
    `;
    const account = (await listAccounts(context.userId)).find((a) => a.id === id);
    if (account) await syncAccount(context.userId, account);
    return toFeed(await listAccounts(context.userId), await loadEvents(context.userId), googleOAuthEnabled());
  });

export const connectIcs = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { url: string; label?: string; provider?: CalProviderId }) => {
    const url = input.url.trim();
    if (!/^https?:\/\//i.test(url)) throw new Error("ICS URL must start with https://");
    return { url, label: input.label?.trim(), provider: input.provider ?? "ics" };
  })
  .handler(async ({ context, data }): Promise<CalendarFeed> => {
    const { fetchIcsUrl } = await import("./caldav.server");
    const { googleOAuthEnabled } = await import("./google-cal.server");
    await fetchIcsUrl(data.url);
    const id = nid("ca");
    const preset = calPresetById(data.provider);
    const sql = await getSql();
    await sql`
      insert into cal_accounts (id, user_id, provider, label, ics_url, color)
      values (${id}, ${context.userId}, ${data.provider}, ${data.label || preset.label}, ${data.url}, ${preset.color})
    `;
    const account = (await listAccounts(context.userId)).find((a) => a.id === id);
    if (account) await syncAccount(context.userId, account);
    return toFeed(await listAccounts(context.userId), await loadEvents(context.userId), googleOAuthEnabled());
  });

export const startGoogleOAuth = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { redirectUri: string }) => input)
  .handler(async ({ context, data }) => {
    const google = await import("./google-cal.server");
    if (!google.googleOAuthEnabled()) {
      return { ok: false as const, error: "Google OAuth is not configured on this host" };
    }
    const { signOAuthState } = await import("./google-oauth.server");
    const url = google.googleAuthUrl({
      redirectUri: data.redirectUri,
      state: await signOAuthState(context.userId),
    });
    return { ok: true as const, url };
  });

export async function finishGoogleOAuth(opts: {
  userId: string;
  code: string;
  redirectUri: string;
}): Promise<void> {
  const google = await import("./google-cal.server");
  const { sealSecret } = await import("./crypto.server");
  const tokens = await google.exchangeGoogleCode(opts.code, opts.redirectUri);
  if (!tokens.refreshToken) throw new Error("Google did not return a refresh token. Try again and approve offline access.");
  const profile = await google.googleUserInfo(tokens.accessToken);
  const cipher = sealSecret(tokens.refreshToken);
  const sql = await getSql();
  const existing = (await listAccounts(opts.userId)).find((a) => a.provider === "google" && a.refresh_cipher);
  const id = existing?.id ?? nid("g");
  if (existing) {
    await sql`
      update cal_accounts
      set refresh_cipher = ${cipher}, label = ${profile.email || "Google"}, last_error = null
      where user_id = ${opts.userId} and id = ${id}
    `;
  } else {
    await sql`
      insert into cal_accounts (id, user_id, provider, label, refresh_cipher, color)
      values (${id}, ${opts.userId}, ${"google"}, ${profile.email || "Google"}, ${cipher}, ${"warn"})
    `;
  }
  try {
    const { upsertGoogleMailbox } = await import("./mailbox");
    await upsertGoogleMailbox(opts.userId, {
      email: profile.email,
      name: profile.name,
      refreshToken: tokens.refreshToken,
    });
  } catch {
    /* calendar still saves if both mailboxes are already filled */
  }
  const account = (await listAccounts(opts.userId)).find((a) => a.id === id);
  if (account) await syncAccount(opts.userId, account);
}

export const syncCalendars = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<CalendarFeed> => {
    const { googleOAuthEnabled } = await import("./google-cal.server");
    const accounts = await listAccounts(context.userId);
    for (const account of accounts) await syncAccount(context.userId, account);
    return toFeed(await listAccounts(context.userId), await loadEvents(context.userId), googleOAuthEnabled());
  });

export const disconnectCalendar = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { accountId: string }) => input)
  .handler(async ({ context, data }): Promise<CalendarFeed> => {
    const { googleOAuthEnabled } = await import("./google-cal.server");
    const sql = await getSql();
    await sql`delete from cal_events where user_id = ${context.userId} and account_id = ${data.accountId}`;
    await sql`delete from cal_accounts where user_id = ${context.userId} and id = ${data.accountId}`;
    return toFeed(await listAccounts(context.userId), await loadEvents(context.userId), googleOAuthEnabled());
  });

export const saveRemoteEvent = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: {
    accountId: string;
    calendarUrl?: string;
    title: string;
    start: string;
    end: string;
    where?: string;
  }) => {
    if (!input.title.trim()) throw new Error("Title is required");
    return { ...input, title: input.title.trim() };
  })
  .handler(async ({ context, data }): Promise<CalendarFeed> => {
    const { googleOAuthEnabled } = await import("./google-cal.server");
    const accounts = await listAccounts(context.userId);
    const account = accounts.find((a) => a.id === data.accountId);
    if (!account) throw new Error("Calendar account not found");
    const start = new Date(data.start);
    const end = new Date(data.end);
    const uid = `omadash-${Math.random().toString(36).slice(2, 12)}`;
    const event = {
      uid,
      title: data.title,
      start,
      end,
      where: data.where,
    };
    if (account.provider === "google" && account.refresh_cipher) {
      const { openSecret } = await import("./crypto.server");
      const google = await import("./google-cal.server");
      const access = await google.refreshGoogleAccess(openSecret(account.refresh_cipher));
      await google.insertGoogleEvent(access, data.calendarUrl || "primary", event);
    } else if (account.password_cipher && account.caldav_url) {
      const { openSecret } = await import("./crypto.server");
      const { createCalDavEvent, fetchCalDavEvents } = await import("./caldav.server");
      const password = openSecret(account.password_cipher);
      let calendarUrl = data.calendarUrl;
      if (!calendarUrl) {
        const bundles = await fetchCalDavEvents(account.caldav_url, account.username, password, range());
        calendarUrl = bundles[0]?.calendar.url;
      }
      if (!calendarUrl) throw new Error("No calendar on that account");
      await createCalDavEvent(account.caldav_url, account.username, password, calendarUrl, event);
    } else {
      throw new Error("This calendar is read-only");
    }
    await syncAccount(context.userId, account);
    return toFeed(await listAccounts(context.userId), await loadEvents(context.userId), googleOAuthEnabled());
  });

export const deleteRemoteEvent = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { eventId: string }) => input)
  .handler(async ({ context, data }): Promise<CalendarFeed> => {
    const { googleOAuthEnabled } = await import("./google-cal.server");
    const sql = await getSql();
    const rows = await sql<EventRow>`
      select id, account_id, calendar_id, calendar_name, remote_uid, etag, title, start_at, end_at, location, description, rrule, read_only, payload
      from cal_events where user_id = ${context.userId} and id = ${data.eventId}
    `;
    const row = rows[0];
    if (!row) throw new Error("Event not found");
    const account = (await listAccounts(context.userId)).find((a) => a.id === row.account_id);
    if (!account) throw new Error("Account not found");
    if (row.read_only) throw new Error("This calendar is read-only");
    if (account.provider === "google" && account.refresh_cipher) {
      const { openSecret } = await import("./crypto.server");
      const google = await import("./google-cal.server");
      const access = await google.refreshGoogleAccess(openSecret(account.refresh_cipher));
      await google.deleteGoogleEvent(access, row.calendar_id || "primary", row.remote_uid);
    } else if (account.password_cipher) {
      const { openSecret } = await import("./crypto.server");
      const { deleteCalDavEvent } = await import("./caldav.server");
      const href = row.payload || row.calendar_id;
      await deleteCalDavEvent(
        account.caldav_url,
        account.username,
        openSecret(account.password_cipher),
        href,
        row.etag,
      );
    }
    await sql`delete from cal_events where user_id = ${context.userId} and id = ${data.eventId}`;
    return toFeed(await listAccounts(context.userId), await loadEvents(context.userId), googleOAuthEnabled());
  });
