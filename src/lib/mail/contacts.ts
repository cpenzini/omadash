/** People you've mailed, for compose autocomplete. */
import { counterpart } from "./format";
import type { Person, Thread } from "./types";

export function formatAddress(p: Person): string {
  const email = p.email.trim();
  const name = p.name.trim();
  if (!email) return name;
  if (!name || name.toLowerCase() === email.toLowerCase()) return email;
  return `${name} <${email}>`;
}

export function collectContacts(threads: Thread[], meEmail: string): Person[] {
  const me = meEmail.toLowerCase();
  const seen = new Map<string, Person>();
  const stamp = new Map<string, string>();
  const consider = (p: Person, date: string) => {
    const email = p.email.trim().toLowerCase();
    if (!email || !email.includes("@") || email === me) return;
    const prev = stamp.get(email);
    if (!prev || date > prev) {
      stamp.set(email, date);
      const had = seen.get(email);
      const name = p.name.trim() && p.name.includes(" ") ? p.name : had?.name || p.name || email.split("@")[0]!;
      seen.set(email, { name, email });
    } else if (p.name.trim() && p.name.includes(" ") && seen.get(email) && !seen.get(email)!.name.includes(" ")) {
      seen.set(email, { name: p.name.trim(), email });
    }
  };
  const ordered = [...threads].sort((a, b) => {
    const da = a.messages[a.messages.length - 1]?.date ?? "";
    const db = b.messages[b.messages.length - 1]?.date ?? "";
    return db.localeCompare(da);
  });
  for (const t of ordered) {
    const date = t.messages[t.messages.length - 1]?.date ?? "";
    consider(counterpart(t, meEmail), date);
    for (const m of t.messages) {
      consider(m.from, m.date);
      for (const p of m.to) consider(p, m.date);
      for (const p of m.cc) consider(p, m.date);
    }
  }
  return [...seen.values()].sort((a, b) => (stamp.get(b.email) ?? "").localeCompare(stamp.get(a.email) ?? ""));
}

export function contactPool(
  threads: Thread[],
  _source: "demo" | "imap",
  _activeBoxId: string | null,
  meEmail: string,
): Person[] {
  return collectContacts(threads, meEmail);
}

export function lastToken(raw: string): { head: string; query: string } {
  const idx = Math.max(raw.lastIndexOf(","), raw.lastIndexOf(";"));
  const head = idx >= 0 ? raw.slice(0, idx + 1).replace(/\s*$/, " ") : "";
  const query = (idx >= 0 ? raw.slice(idx + 1) : raw).trim();
  return { head, query };
}

export function filterContacts(people: Person[], query: string, already: Set<string>): Person[] {
  const q = query.trim().toLowerCase();
  return people
    .filter((p) => {
      if (already.has(p.email.toLowerCase())) return false;
      if (!q) return true;
      return p.name.toLowerCase().includes(q) || p.email.toLowerCase().includes(q);
    })
    .slice(0, 8);
}

export function emailsInField(raw: string): Set<string> {
  const set = new Set<string>();
  for (const part of raw.split(/[,;]+/)) {
    const named = part.match(/<([^>]+)>/);
    const email = (named ? named[1] : part).trim().toLowerCase();
    if (email.includes("@")) set.add(email);
  }
  return set;
}
