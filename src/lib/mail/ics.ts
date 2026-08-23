/** Small ICS reader/writer. Enough for CalDAV objects and Google iCal feeds. */

export interface IcsEvent {
  uid: string;
  title: string;
  start: Date;
  end: Date;
  where?: string;
  description?: string;
  rrule?: string;
}

function unfold(raw: string): string[] {
  const lines = raw.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const out: string[] = [];
  for (const line of lines) {
    if ((line.startsWith(" ") || line.startsWith("\t")) && out.length) {
      out[out.length - 1] += line.slice(1);
    } else {
      out.push(line);
    }
  }
  return out;
}

function unescapeIcs(value: string): string {
  return value
    .replace(/\\n/gi, "\n")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\");
}

function escapeIcs(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

function parseDate(value: string, params: Record<string, string>): Date {
  const compact = value.replace(/[-:]/g, "");
  const isDate = params.VALUE === "DATE" || /^[0-9]{8}$/.test(compact);
  const y = Number(compact.slice(0, 4));
  const mo = Number(compact.slice(4, 6)) - 1;
  const d = Number(compact.slice(6, 8));
  if (isDate) return new Date(y, mo, d);
  const h = Number(compact.slice(9, 11) || 0);
  const mi = Number(compact.slice(11, 13) || 0);
  const s = Number(compact.slice(13, 15) || 0);
  if (value.endsWith("Z") || compact.endsWith("Z")) return new Date(Date.UTC(y, mo, d, h, mi, s));
  return new Date(y, mo, d, h, mi, s);
}

function splitParams(name: string): { key: string; params: Record<string, string> } {
  const parts = name.split(";");
  const key = parts[0]!.toUpperCase();
  const params: Record<string, string> = {};
  for (const p of parts.slice(1)) {
    const eq = p.indexOf("=");
    if (eq > 0) params[p.slice(0, eq).toUpperCase()] = p.slice(eq + 1);
  }
  return { key, params };
}

export function parseIcsEvents(raw: string): IcsEvent[] {
  const events: IcsEvent[] = [];
  let cur: Partial<IcsEvent> | null = null;
  for (const line of unfold(raw)) {
    if (!line || line.startsWith(" ")) continue;
    const colon = line.indexOf(":");
    if (colon < 0) continue;
    const { key, params } = splitParams(line.slice(0, colon));
    const value = line.slice(colon + 1);
    if (key === "BEGIN" && value === "VEVENT") {
      cur = {};
      continue;
    }
    if (key === "END" && value === "VEVENT") {
      if (cur?.title && cur.start) {
        const start = cur.start;
        const end = cur.end ?? new Date(start.getTime() + 60 * 60 * 1000);
        events.push({
          uid: cur.uid || `ics-${start.toISOString()}`,
          title: cur.title,
          start,
          end,
          where: cur.where,
          description: cur.description,
          rrule: cur.rrule,
        });
      }
      cur = null;
      continue;
    }
    if (!cur) continue;
    if (key === "UID") cur.uid = value;
    else if (key === "SUMMARY") cur.title = unescapeIcs(value);
    else if (key === "LOCATION") cur.where = unescapeIcs(value);
    else if (key === "DESCRIPTION") cur.description = unescapeIcs(value);
    else if (key === "RRULE") cur.rrule = value;
    else if (key === "DTSTART") cur.start = parseDate(value, params);
    else if (key === "DTEND") cur.end = parseDate(value, params);
    else if (key === "DURATION" && cur.start && !cur.end) {
      const hours = /PT(?:(\d+)H)?(?:(\d+)M)?/.exec(value);
      if (hours) {
        const h = Number(hours[1] || 0);
        const m = Number(hours[2] || 0);
        cur.end = new Date(cur.start.getTime() + (h * 60 + m) * 60_000);
      }
    }
  }
  return events;
}

function stamp(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

export function serializeIcsEvent(event: IcsEvent): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Omadash//Calendar//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${event.uid}`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(event.start)}`,
    `DTEND:${stamp(event.end)}`,
    `SUMMARY:${escapeIcs(event.title)}`,
  ];
  if (event.where) lines.push(`LOCATION:${escapeIcs(event.where)}`);
  if (event.description) lines.push(`DESCRIPTION:${escapeIcs(event.description)}`);
  if (event.rrule) lines.push(`RRULE:${event.rrule}`);
  lines.push("END:VEVENT", "END:VCALENDAR");
  return lines.join("\r\n") + "\r\n";
}

export function rruleLabel(rrule?: string): string | undefined {
  if (!rrule) return undefined;
  const u = rrule.toUpperCase();
  if (u.includes("FREQ=DAILY")) return "Daily";
  if (u.includes("FREQ=WEEKLY")) return "Weekly";
  if (u.includes("FREQ=MONTHLY")) return "Monthly";
  if (u.includes("FREQ=YEARLY")) return "Yearly";
  return "Repeats";
}
