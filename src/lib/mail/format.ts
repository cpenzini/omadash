import { format, isThisWeek, isToday, isYesterday } from "date-fns";
import type { Person, Thread } from "./types";

export function formatListTime(iso: string, now = new Date()): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  if (isToday(d)) return format(d, "h:mm a");
  if (isYesterday(d)) return "Yesterday";
  if (isThisWeek(d, { weekStartsOn: 1 })) return format(d, "EEE");
  if (d.getFullYear() === now.getFullYear()) return format(d, "MMM d");
  return format(d, "MMM d, yyyy");
}

export function formatFullTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return format(d, "EEE, MMM d · h:mm a");
}

export function formatReceiptTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return format(d, "MMM d, h:mm a");
}

export function threadPreview(thread: Thread) {
  const last = thread.messages[thread.messages.length - 1];
  return last;
}

export function counterpart(thread: Thread, meEmail: string): Person {
  const last = threadPreview(thread);
  if (last.from.email === meEmail) {
    return last.to[0] ?? last.from;
  }
  return last.from;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

const AVATARS = [
  "bg-avatar-1",
  "bg-avatar-2",
  "bg-avatar-3",
  "bg-avatar-4",
  "bg-avatar-5",
  "bg-avatar-6",
] as const;

export function avatarClass(email: string): string {
  let h = 0;
  for (let i = 0; i < email.length; i++) h = (h + email.charCodeAt(i) * (i + 1)) % 2147483647;
  return AVATARS[Math.abs(h) % AVATARS.length]!;
}

export function snippetOf(body: string, max = 96): string {
  const clean = body
    .split("\n")
    .filter((line) => !line.startsWith(">"))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
  if (clean.length <= max) return clean;
  return clean.slice(0, max - 1).trimEnd() + "…";
}

export function parseAddressList(raw: string): Person[] {
  return raw
    .split(/[,;]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((token) => {
      const named = token.match(/^(.*)<([^>]+)>$/);
      if (named) {
        return { name: named[1]!.trim().replace(/^["']|["']$/g, "") || named[2]!, email: named[2]!.trim() };
      }
      if (token.includes("@")) {
        const local = token.split("@")[0] ?? token;
        const name = local
          .replace(/[._]/g, " ")
          .replace(/\b\w/g, (c) => c.toUpperCase());
        return { name, email: token };
      }
      return { name: token, email: `${token.replace(/\s+/g, ".").toLowerCase()}@omarchy.dev` };
    });
}

export function formatPeople(people: Person[]): string {
  if (people.length === 0) return "";
  if (people.length === 1) return people[0]!.name;
  if (people.length === 2) return `${people[0]!.name}, ${people[1]!.name}`;
  return `${people[0]!.name} +${people.length - 1}`;
}

export function minutesBetween(a: string, b: string): number {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 60000);
}
