import type { Message, Person, Thread } from "../src/lib/mail/types";

export const ME: Person = { name: "You", email: "you@omadash.test" };

export function person(email: string, name?: string): Person {
  return { name: name ?? email.split("@")[0]!, email };
}

export function message(partial: Partial<Message> & Pick<Message, "from" | "body">): Message {
  return {
    id: partial.id ?? "m1",
    to: partial.to ?? [ME],
    cc: partial.cc ?? [],
    date: partial.date ?? "2026-08-23T15:00:00.000Z",
    html: partial.html,
    attachments: partial.attachments ?? [],
    tracking: partial.tracking ?? false,
    opens: partial.opens ?? [],
    ...partial,
  };
}

export function thread(partial: Partial<Thread> & { subject: string; from?: Person; body?: string }): Thread {
  const from = partial.from ?? person("ada@example.com", "Ada");
  const msgs =
    partial.messages ??
    [
      message({
        from,
        body: partial.body ?? "Hello",
      }),
    ];
  return {
    id: partial.id ?? "t1",
    subject: partial.subject,
    folder: partial.folder ?? "inbox",
    unread: partial.unread ?? false,
    starred: partial.starred ?? false,
    focused: partial.focused ?? true,
    labels: partial.labels ?? [],
    messages: msgs,
    snoozeUntil: partial.snoozeUntil,
    followUpUntil: partial.followUpUntil,
    sendAt: partial.sendAt,
    muted: partial.muted,
  };
}
