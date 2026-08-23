import { useEffect, useMemo, useRef } from "react";
import { BellOff, Clock, Paperclip, Plug, Star } from "lucide-react";
import { counterpart, formatListTime, snippetOf, threadPreview } from "@/lib/mail/format";
import { filterVisible, isHoldingSend, useMailStore } from "@/lib/mail/store";
import { usePrefsStore } from "@/lib/mail/prefs";
import { useRulesStore } from "@/lib/mail/rules";
import { cn } from "@/lib/utils";
import { Avatar } from "./avatar";
import type { Thread } from "@/lib/mail/types";

export function ThreadList() {
  const folder = useMailStore((s) => s.folder);
  const split = useMailStore((s) => s.split);
  const search = useMailStore((s) => s.search);
  const selectedId = useMailStore((s) => s.selectedId);
  const checkedIds = useMailStore((s) => s.checkedIds);
  const allThreads = useMailStore((s) => s.threads);
  const me = useMailStore((s) => s.me);
  const select = useMailStore((s) => s.select);
  const toggleCheck = useMailStore((s) => s.toggleCheck);
  const source = useMailStore((s) => s.source);
  const setConnectOpen = useMailStore((s) => s.setConnectOpen);
  const layout = usePrefsStore((s) => s.layout);
  const compact = layout === "two";
  const rules = useRulesStore((s) => s.rules);
  const listRef = useRef<HTMLDivElement>(null);
  const threads = useMemo(
    () => filterVisible(allThreads, folder, split, search),
    [allThreads, folder, split, search, rules],
  );

  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-tid="${selectedId}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [selectedId]);

  const title = search.trim()
    ? `Search · ${threads.length}`
    : folder === "inbox"
      ? split === "focused"
        ? "Focused"
        : "Other"
      : folder[0]!.toUpperCase() + folder.slice(1);

  const checking = checkedIds.length > 0;

  return (
    <section
      className={cn(
        "flex h-full min-w-0 flex-1 flex-col bg-bg",
        compact ? "" : "border-r border-border lg:max-w-96 lg:w-96 lg:flex-none",
      )}
    >
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-border px-4">
        <h1 className="text-sm font-medium tracking-tight text-fg">
          {checking ? `${checkedIds.length} selected` : title}
        </h1>
        <span className="tabular-nums text-micro text-subtle">{threads.length}</span>
      </header>
      <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto scroll-thin">
        {threads.length === 0 ? (
          <Empty
            folder={folder}
            searching={Boolean(search.trim())}
            connected={source === "imap"}
            onConnect={() => setConnectOpen(true)}
          />
        ) : compact ? (
          threads.map((t) => (
            <CompactRow
              key={t.id}
              thread={t}
              meEmail={me.email}
              active={t.id === selectedId}
              checked={checkedIds.includes(t.id)}
              checking={checking}
              onOpen={() => select(t.id, { open: true })}
              onCheck={() => toggleCheck(t.id)}
            />
          ))
        ) : (
          threads.map((t) => (
            <CardRow
              key={t.id}
              thread={t}
              meEmail={me.email}
              active={t.id === selectedId}
              checked={checkedIds.includes(t.id)}
              checking={checking}
              onOpen={() => select(t.id, { open: true })}
              onCheck={() => toggleCheck(t.id)}
            />
          ))
        )}
      </div>
    </section>
  );
}

function CompactRow({
  thread: t,
  meEmail,
  active,
  checked,
  checking,
  onOpen,
  onCheck,
}: {
  thread: Thread;
  meEmail: string;
  active: boolean;
  checked: boolean;
  checking: boolean;
  onOpen: () => void;
  onCheck: () => void;
}) {
  const last = threadPreview(t);
  const person = counterpart(t, meEmail);
  const tracked = Boolean(last?.tracking && last.from.email === meEmail);
  return (
    <button
      type="button"
      data-tid={t.id}
      onClick={onOpen}
      className={cn(
        "relative flex h-10 w-full items-center gap-3 border-b border-border px-3 text-left transition-colors duration-150",
        active ? "bg-select" : "hover:bg-surface",
        t.unread ? "text-fg" : "text-muted",
        t.muted && "opacity-70",
      )}
    >
      {active && <span className="absolute inset-y-0 left-0 w-0.5 bg-accent" />}
      {(checking || checked) && (
        <span
          role="presentation"
          onClick={(e) => {
            e.stopPropagation();
            onCheck();
          }}
          className={cn(
            "size-3.5 shrink-0 rounded-sm border",
            checked ? "border-accent bg-accent" : "border-border-strong",
          )}
        />
      )}
      {t.unread && !t.muted ? (
        <span className="size-1.5 shrink-0 rounded-full bg-unread" />
      ) : (
        <span className="size-1.5 shrink-0" />
      )}
      <span className={cn("w-24 shrink-0 truncate text-mail sm:w-36", t.unread && "font-medium text-fg")}>
        {person.name}
      </span>
      <span className={cn("min-w-0 flex-1 truncate text-mail", t.unread ? "text-fg" : "text-muted")}>
        {t.subject}
      </span>
      <span className="hidden min-w-0 flex-1 truncate text-micro text-subtle md:block">
        {t.sendAt ? (isHoldingSend(t) ? "Sending" : "Scheduled") : snippetOf(last?.body ?? "", 88)}
      </span>
      <span className="flex shrink-0 items-center gap-1.5 text-subtle">
        {t.starred && <Star className="size-3 fill-warn text-warn" />}
        {t.muted && <BellOff className="size-3" />}
        {t.sendAt && <Clock className="size-3" />}
        {tracked && <span className={last!.opens.length ? "text-success" : ""}>{last!.opens.length ? "Opened" : "Sent"}</span>}
        {last && last.attachments.length > 0 && <Paperclip className="size-3" />}
      </span>
      <span className="w-16 shrink-0 text-right tabular-nums text-micro text-subtle" suppressHydrationWarning>
        {t.sendAt ? formatListTime(t.sendAt) : last ? formatListTime(last.date) : ""}
      </span>
    </button>
  );
}

function CardRow({
  thread: t,
  meEmail,
  active,
  checked,
  checking,
  onOpen,
  onCheck,
}: {
  thread: Thread;
  meEmail: string;
  active: boolean;
  checked: boolean;
  checking: boolean;
  onOpen: () => void;
  onCheck: () => void;
}) {
  const last = threadPreview(t);
  const person = counterpart(t, meEmail);
  const tracked = Boolean(last?.tracking && last.from.email === meEmail);
  return (
    <button
      type="button"
      data-tid={t.id}
      onClick={onOpen}
      className={cn(
        "relative flex w-full gap-3 border-b border-border px-3 py-3 text-left transition-colors duration-150",
        active ? "bg-select" : "hover:bg-surface",
        t.unread ? "text-fg" : "text-muted",
        t.muted && "opacity-70",
      )}
    >
      {active && <span className="absolute inset-y-0 left-0 w-0.5 bg-accent" />}
      {(checking || checked) && (
        <span
          role="presentation"
          onClick={(e) => {
            e.stopPropagation();
            onCheck();
          }}
          className={cn(
            "mt-1.5 size-3.5 shrink-0 rounded-sm border",
            checked ? "border-accent bg-accent" : "border-border-strong",
          )}
        />
      )}
      <Avatar name={person.name} email={person.email} size="sm" />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className={cn("min-w-0 truncate text-mail", t.unread && "font-medium text-fg")}>
            {person.name}
          </span>
          <span className="ml-auto shrink-0 tabular-nums text-micro text-subtle" suppressHydrationWarning>
            {t.sendAt ? formatListTime(t.sendAt) : last ? formatListTime(last.date) : ""}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={cn("min-w-0 truncate text-mail", t.unread ? "text-fg" : "text-muted")}>
            {t.subject}
          </span>
          {t.starred && <Star className="size-3 shrink-0 fill-warn text-warn" />}
          {t.muted && <BellOff className="size-3 shrink-0 text-subtle" />}
        </div>
        <div className="mt-0.5 flex items-center gap-1.5 text-micro text-subtle">
          {t.sendAt && (
            <>
              <Clock className="size-3" />
              <span>{isHoldingSend(t) ? "Sending" : "Scheduled"}</span>
              <span>·</span>
            </>
          )}
          {tracked && (
            <span className={last!.opens.length ? "text-success" : "text-subtle"}>
              {last!.opens.length ? "Opened" : "Sent"}
            </span>
          )}
          {tracked && <span>·</span>}
          <span className="min-w-0 truncate">{snippetOf(last?.body ?? "", 72)}</span>
          {last && last.attachments.length > 0 && <Paperclip className="ml-auto size-3 shrink-0" />}
        </div>
      </div>
      {t.unread && !t.muted && <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-unread" />}
    </button>
  );
}

function Empty({
  folder,
  searching,
  connected,
  onConnect,
}: {
  folder: string;
  searching: boolean;
  connected: boolean;
  onConnect: () => void;
}) {
  if (!connected && !searching) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-8 text-center">
        <p className="text-sm font-medium text-fg">No mailbox</p>
        <p className="max-w-xs text-mail text-subtle text-pretty">
          Connect Gmail, Fastmail, iCloud, or IMAP to see mail. Nothing is shown until you do.
        </p>
        <button
          type="button"
          onClick={onConnect}
          className="inline-flex h-9 items-center gap-1.5 rounded-md bg-accent px-3 text-sm font-medium text-accent-fg"
        >
          <Plug className="size-3.5" />
          Connect mailbox
        </button>
      </div>
    );
  }
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 px-8 text-center">
      <p className="text-sm font-medium text-fg">
        {searching ? "No matches" : folder === "inbox" ? "Inbox zero" : "Nothing here"}
      </p>
      <p className="max-w-xs text-mail text-subtle text-pretty">
        {searching
          ? "Try a name, subject, or a word from the body."
          : folder === "inbox"
            ? "Enjoy the quiet. Press C to write someone."
            : folder === "waiting"
              ? "Nothing waiting on a reply."
              : "This folder is empty."}
      </p>
    </div>
  );
}
