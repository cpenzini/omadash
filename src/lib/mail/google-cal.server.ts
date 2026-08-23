/**
 * Google Calendar + Gmail OAuth. Server-only.
 * Client id/secret come from the environment when present — never a .env file.
 * Signing in via the Grok broker does not grant these scopes; this is a separate
 * Google approval that attaches the inbox (IMAP XOAUTH2) and Calendar API.
 */
import { parseIcsEvents, type IcsEvent } from "./ics";

const SCOPES = [
  "https://www.googleapis.com/auth/calendar",
  "https://mail.google.com/",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
].join(" ");

function env(name: string): string | undefined {
  const v = process.env[name]?.trim();
  return v || undefined;
}

export function googleClientId(): string | undefined {
  return env("GOOGLE_CALENDAR_CLIENT_ID") || env("GOOGLE_CLIENT_ID");
}

export function googleClientSecret(): string | undefined {
  return env("GOOGLE_CALENDAR_CLIENT_SECRET") || env("GOOGLE_CLIENT_SECRET");
}

export function googleOAuthEnabled(): boolean {
  return Boolean(googleClientId() && googleClientSecret());
}

export function googleAuthUrl(opts: { redirectUri: string; state: string; loginHint?: string }): string {
  const id = googleClientId();
  if (!id) throw new Error("Google OAuth is not configured");
  const q = new URLSearchParams({
    client_id: id,
    redirect_uri: opts.redirectUri,
    response_type: "code",
    scope: SCOPES,
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state: opts.state,
  });
  if (opts.loginHint) q.set("login_hint", opts.loginHint);
  return `https://accounts.google.com/o/oauth2/v2/auth?${q.toString()}`;
}

export async function exchangeGoogleCode(code: string, redirectUri: string): Promise<{
  accessToken: string;
  refreshToken: string;
}> {
  const id = googleClientId();
  const secret = googleClientSecret();
  if (!id || !secret) throw new Error("Google OAuth is not configured");
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: id,
      client_secret: secret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) throw new Error(`Google token exchange failed (${res.status})`);
  const body = (await res.json()) as { access_token?: string; refresh_token?: string };
  if (!body.access_token) throw new Error("Google did not return an access token");
  return { accessToken: body.access_token, refreshToken: body.refresh_token || "" };
}

export async function refreshGoogleAccess(refreshToken: string): Promise<string> {
  const id = googleClientId();
  const secret = googleClientSecret();
  if (!id || !secret) throw new Error("Google OAuth is not configured");
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: id,
      client_secret: secret,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) throw new Error(`Google refresh failed (${res.status})`);
  const body = (await res.json()) as { access_token?: string };
  if (!body.access_token) throw new Error("Google did not return an access token");
  return body.access_token;
}

export async function googleUserInfo(accessToken: string): Promise<{ email: string; name: string }> {
  const res = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Google profile failed (${res.status})`);
  const body = (await res.json()) as { email?: string; name?: string };
  const email = (body.email || "").trim().toLowerCase();
  if (!email.includes("@")) throw new Error("Google did not return an email");
  return { email, name: (body.name || email.split("@")[0] || email).trim() };
}

type GEvent = {
  id?: string;
  summary?: string;
  description?: string;
  location?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  recurrence?: string[];
  htmlLink?: string;
  status?: string;
};

function gDate(g?: { dateTime?: string; date?: string }): Date | null {
  if (!g) return null;
  if (g.dateTime) {
    const d = new Date(g.dateTime);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (g.date) {
    const [y, m, day] = g.date.split("-").map(Number);
    return new Date(y || 0, (m || 1) - 1, day || 1);
  }
  return null;
}

export type GoogleCalEvent = IcsEvent & { calendarId: string; calendarName: string };

export async function fetchGoogleEvents(
  accessToken: string,
  range: { start: Date; end: Date },
): Promise<GoogleCalEvent[]> {
  const listRes = await fetch("https://www.googleapis.com/calendar/v3/users/me/calendarList", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!listRes.ok) throw new Error(`Google calendar list failed (${listRes.status})`);
  const list = (await listRes.json()) as { items?: { id?: string; summary?: string; selected?: boolean }[] };
  const cals = (list.items ?? []).filter((c) => c.id).slice(0, 12);
  const events: GoogleCalEvent[] = [];
  const timeMin = range.start.toISOString();
  const timeMax = range.end.toISOString();
  for (const cal of cals) {
    const url = new URL(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(cal.id!)}/events`);
    url.searchParams.set("timeMin", timeMin);
    url.searchParams.set("timeMax", timeMax);
    url.searchParams.set("singleEvents", "true");
    url.searchParams.set("orderBy", "startTime");
    url.searchParams.set("maxResults", "250");
    const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!res.ok) continue;
    const body = (await res.json()) as { items?: GEvent[] };
    for (const item of body.items ?? []) {
      if (item.status === "cancelled") continue;
      const start = gDate(item.start);
      if (!start) continue;
      const end = gDate(item.end) ?? new Date(start.getTime() + 60 * 60 * 1000);
      events.push({
        uid: item.id || `${cal.id}-${start.toISOString()}`,
        title: item.summary || "(no title)",
        start,
        end,
        where: item.location,
        description: item.description,
        rrule: item.recurrence?.[0],
        calendarId: cal.id!,
        calendarName: cal.summary || "Google",
      });
    }
  }
  return events;
}

export async function insertGoogleEvent(
  accessToken: string,
  calendarId: string,
  event: IcsEvent,
): Promise<string> {
  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        summary: event.title,
        location: event.where,
        description: event.description,
        start: { dateTime: event.start.toISOString() },
        end: { dateTime: event.end.toISOString() },
      }),
    },
  );
  if (!res.ok) throw new Error(`Google create failed (${res.status})`);
  const body = (await res.json()) as { id?: string };
  return body.id || event.uid;
}

export async function deleteGoogleEvent(accessToken: string, calendarId: string, eventId: string): Promise<void> {
  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
    { method: "DELETE", headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!res.ok && res.status !== 404) throw new Error(`Google delete failed (${res.status})`);
}

export { parseIcsEvents };
