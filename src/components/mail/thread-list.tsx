import { useEffect, useMemo, useRef } from "react";
import { BellOff, Clock, Paperclip, Star } from "lucide-react";
import { counterpart, formatListTime, snippetOf, threadPreview } from "@/lib/mail/format";
import { filterVisible, useMailStore } from "@/lib/mail/store";
import { useRulesStore } from "@/lib/mail/rules";
import { cn } from "@/lib/utils";
import { Avatar } from "./avatar";

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
    <section className="flex h-full min-w-0 flex-1 flex-col border-r border-border bg-bg lg:max-w-96 lg:flex-none lg:w-96">
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-border px-4">
        <h1 className="text-sm font-medium tracking-tight text-fg">
          {checking ? `${checkedIds.length} selected` : title}
        </h1>
        <span className="tabular-nums text-micro text-subtle">{threads.length}</span>
      </header>
      <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto scroll-thin">
        {threads.length === 0 ? (
          <Empty folder={folder} searching={Boolean(search.trim())} />
        ) : (
          threads.map((t) => {
            const last = threadPreview(t);
            const person = counterpart(t, me.email);
            const active = t.id === selectedId;
            const checked = checkedIds.includes(t.id);
            const tracked = Boolean(last?.tracking && last.from.email === me.email);
            return (
              <button
                key={t.id}
                type="button"
                data-tid={t.id}
                onClick={() => select(t.id)}
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
                      toggleCheck(t.id);
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
                        <span>Scheduled</span>
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
                    {last && last.attachments.length > 0 && (
                      <Paperclip className="ml-auto size-3 shrink-0" />
                    )}
                  </div>
                </div>
                {t.unread && !t.muted && <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-unread" />}
              </button>
            );
          })
        )}
      </div>
    </section>
  );
}

function Empty({ folder, searching }: { folder: string; searching: boolean }) {
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
