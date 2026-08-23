/**
 * CalDAV fetch/write. Server-only. tsdav talks to Fastmail, iCloud, Nextcloud, generic DAV.
 */
import { parseIcsEvents, serializeIcsEvent, type IcsEvent } from "./ics";

export type DavCalendar = {
  url: string;
  displayName: string;
  ctag?: string;
};

export type DavObject = {
  url: string;
  etag?: string;
  data: string;
};

async function client(serverUrl: string, username: string, password: string) {
  const { createDAVClient } = await import("tsdav");
  const dav = await createDAVClient({
    serverUrl,
    credentials: { username, password },
    authMethod: "Basic",
    defaultAccountType: "caldav",
  });
  return dav;
}

export async function listCalDavCalendars(
  serverUrl: string,
  username: string,
  password: string,
): Promise<DavCalendar[]> {
  const dav = await client(serverUrl, username, password);
  const cals = await dav.fetchCalendars();
  return cals
    .map((c) => ({
      url: c.url,
      displayName: (c.displayName || "Calendar").toString(),
      ctag: c.ctag,
    }))
    .filter((c) => Boolean(c.url));
}

export async function fetchCalDavEvents(
  serverUrl: string,
  username: string,
  password: string,
  range: { start: Date; end: Date },
): Promise<{ calendar: DavCalendar; events: Array<IcsEvent & { href: string; etag?: string }> }[]> {
  const dav = await client(serverUrl, username, password);
  const cals = await dav.fetchCalendars();
  const start = range.start.toISOString();
  const end = range.end.toISOString();
  const out: { calendar: DavCalendar; events: Array<IcsEvent & { href: string; etag?: string }> }[] = [];
  for (const cal of cals.slice(0, 12)) {
    const objects = await dav.fetchCalendarObjects({
      calendar: cal,
      timeRange: { start, end },
    });
    const events = objects.flatMap((obj) => {
      if (!obj.data) return [];
      return parseIcsEvents(obj.data).map((ev) => ({
        ...ev,
        href: obj.url,
        etag: obj.etag,
      }));
    });
    out.push({
      calendar: {
        url: cal.url,
        displayName: (cal.displayName || "Calendar").toString(),
        ctag: cal.ctag,
      },
      events,
    });
  }
  return out;
}

export async function createCalDavEvent(
  serverUrl: string,
  username: string,
  password: string,
  calendarUrl: string,
  event: IcsEvent,
): Promise<void> {
  const dav = await client(serverUrl, username, password);
  const filename = `${event.uid.replace(/[^a-zA-Z0-9-_.@]/g, "")}.ics`;
  await dav.createCalendarObject({
    calendar: { url: calendarUrl },
    filename,
    iCalString: serializeIcsEvent(event),
  });
}

export async function deleteCalDavEvent(
  serverUrl: string,
  username: string,
  password: string,
  href: string,
  etag?: string,
): Promise<void> {
  const dav = await client(serverUrl, username, password);
  await dav.deleteCalendarObject({
    calendarObject: { url: href, etag: etag || "" },
  });
}

export async function fetchIcsUrl(url: string): Promise<IcsEvent[]> {
  const res = await fetch(url, {
    headers: { Accept: "text/calendar, text/plain, */*" },
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`ICS feed returned ${res.status}`);
  const text = await res.text();
  if (!/BEGIN:VCALENDAR/i.test(text)) throw new Error("That URL is not an ICS calendar");
  return parseIcsEvents(text);
}
