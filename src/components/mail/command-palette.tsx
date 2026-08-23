import type { ReactNode } from "react";
import { useMemo } from "react";
import { Command } from "cmdk";
import {
  Archive,
  BellOff,
  CalendarDays,
  CalendarPlus,
  Clock,
  FileText,
  Hourglass,
  Inbox,
  PenSquare,
  Plug,
  Send,
  Sparkles,
  Star,
  Trash2,
  Keyboard,
  Palette,
} from "lucide-react";
import { toast } from "sonner";
import { counterpart, formatListTime, snippetOf, threadPreview } from "@/lib/mail/format";
import { SNIPPETS } from "@/lib/mail/snippets";
import { buildPersonalSeed } from "@/lib/mail/seed";
import { INITIAL_THREADS, useMailStore } from "@/lib/mail/store";
import { classifyThread } from "@/lib/mail/rules";
import { useCalendarStore } from "@/lib/mail/calendar";
import { THEMES, useThemeStore } from "@/lib/theme";
import { cn } from "@/lib/utils";
import type { Thread } from "@/lib/mail/types";

export function CommandPalette() {
  const open = useMailStore((s) => s.commandOpen);
  const setOpen = useMailStore((s) => s.setCommandOpen);
  const threads = useMailStore((s) => s.threads);
  const select = useMailStore((s) => s.select);
  const setFolder = useMailStore((s) => s.setFolder);
  const setSplit = useMailStore((s) => s.setSplit);
  const done = useMailStore((s) => s.done);
  const trash = useMailStore((s) => s.trash);
  const mute = useMailStore((s) => s.mute);
  const summarize = useMailStore((s) => s.summarize);
  const openCompose = useMailStore((s) => s.openCompose);
  const insertSnippet = useMailStore((s) => s.insertSnippet);
  const setSnoozeOpen = useMailStore((s) => s.setSnoozeOpen);
  const setShortcutsOpen = useMailStore((s) => s.setShortcutsOpen);
  const setConnectOpen = useMailStore((s) => s.setConnectOpen);
  const setCalendarOpen = useMailStore((s) => s.setCalendarOpen);
  const setRulesOpen = useMailStore((s) => s.setRulesOpen);
  const trainSplit = useMailStore((s) => s.trainSplit);
  const setCalConnectOpen = useCalendarStore((s) => s.setConnectOpen);
  const compose = useMailStore((s) => s.compose);
  const me = useMailStore((s) => s.me);
  const source = useMailStore((s) => s.source);
  const activeBoxId = useMailStore((s) => s.activeBoxId);
  const setThemeOpen = useThemeStore((s) => s.setOpen);
  const setTheme = useThemeStore((s) => s.setTheme);
  const setOmarchyOpen = useMailStore((s) => s.setOmarchyOpen);
  const switchBox = useMailStore((s) => s.switchBox);

  const mailHits = useMemo(() => {
    const extra: Thread[] =
      source === "demo"
        ? activeBoxId === "demo-2"
          ? INITIAL_THREADS
          : buildPersonalSeed()
        : [];
    const seen = new Set(threads.map((t) => t.id));
    const merged = [...threads, ...extra.filter((t) => !seen.has(t.id))];
    return merged
      .filter((t) => t.folder !== "trash")
      .sort((a, b) => {
        const da = threadPreview(a)?.date ?? "";
        const db = threadPreview(b)?.date ?? "";
        return db.localeCompare(da);
      })
      .slice(0, 50);
  }, [threads, source, activeBoxId]);

  if (!open) return null;

  function openThread(t: Thread) {
    const personal = t.id.startsWith("p-");
    if (source === "demo") {
      if (personal && activeBoxId !== "demo-2") switchBox(2);
      if (!personal && activeBoxId === "demo-2") switchBox(1);
    }
    if (t.folder === "sent") setFolder("sent");
    else if (t.folder === "drafts") setFolder("drafts");
    else if (t.folder === "snoozed") setFolder("snoozed");
    else if (t.folder === "done") setFolder("done");
    else if (t.folder === "waiting") setFolder("waiting");
    else setSplit(classifyThread(t) ? "focused" : "other");
    select(t.id);
    setOpen(false);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-bg/70 p-3 pt-24 sm:p-6 sm:pt-28"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-xl overflow-hidden rounded-xl border border-border bg-elevated shadow-[var(--shadow-float)]"
        onClick={(e) => e.stopPropagation()}
      >
      <Command
        label="Command palette"
        className="w-full"
        loop
      >
        <Command.Input
          autoFocus
          placeholder="Search both boxes or jump to a command"
          className="h-12 w-full border-b border-border bg-transparent px-4 text-sm text-fg outline-none placeholder:text-subtle"
        />
        <Command.List className="max-h-96 overflow-y-auto p-1.5 scroll-thin">
          <Command.Empty className="px-3 py-8 text-center text-mail text-subtle">
            Nothing matches.
          </Command.Empty>

          <Command.Group heading="Commands">
            <Item
              keywords={["compose", "write", "new"]}
              onSelect={() => {
                openCompose();
                setOpen(false);
              }}
            >
              <PenSquare className="size-3.5" /> Compose
            </Item>
            <Item
              keywords={["calendar", "agenda", "month", "week", "schedule"]}
              onSelect={() => {
                setOpen(false);
                setCalendarOpen(true);
              }}
            >
              <CalendarDays className="size-3.5" /> Calendar
            </Item>
            <Item
              keywords={["connect", "caldav", "google", "ics", "fastmail", "icloud"]}
              onSelect={() => {
                setOpen(false);
                setCalendarOpen(true);
                setCalConnectOpen(true);
              }}
            >
              <CalendarPlus className="size-3.5" /> Connect calendar
            </Item>
            <Item
              keywords={["rules", "split", "focused", "other", "inbox", "train"]}
              onSelect={() => {
                setOpen(false);
                setRulesOpen(true);
              }}
            >
              <Inbox className="size-3.5" /> Inbox rules
            </Item>
            <Item
              keywords={["train", "focused", "split"]}
              onSelect={() => {
                trainSplit("focused");
                setOpen(false);
              }}
            >
              Train as Focused
            </Item>
            <Item
              keywords={["train", "other", "split"]}
              onSelect={() => {
                trainSplit("other");
                setOpen(false);
              }}
            >
              Train as Other
            </Item>
            <Item
              keywords={["summarize", "grok", "ai"]}
              onSelect={() => {
                setOpen(false);
                void summarize();
              }}
            >
              <Sparkles className="size-3.5" /> Summarize thread
            </Item>
            <Item
              keywords={["mute"]}
              onSelect={() => {
                mute();
                setOpen(false);
                toast("Muted · U to undo");
              }}
            >
              <BellOff className="size-3.5" /> Mute
            </Item>
            <Item
              keywords={["connect", "gmail", "imap", "mailbox"]}
              onSelect={() => {
                setConnectOpen(true);
                setOpen(false);
              }}
            >
              <Plug className="size-3.5" /> Connect mailbox
            </Item>
            <Item
              keywords={["theme", "appearance", "nord", "omarchy"]}
              onSelect={() => {
                setThemeOpen(true);
                setOpen(false);
              }}
            >
              <Palette className="size-3.5" /> Change theme
            </Item>
            <Item
              keywords={["omarchy", "install", "webapp", "mako"]}
              onSelect={() => {
                setOmarchyOpen(true);
                setOpen(false);
              }}
            >
              Install on Omarchy
            </Item>
            <Item
              keywords={["work", "mailbox", "account"]}
              onSelect={() => {
                switchBox(1);
                setOpen(false);
              }}
            >
              Work mailbox
            </Item>
            <Item
              keywords={["personal", "mailbox", "account"]}
              onSelect={() => {
                switchBox(2);
                setOpen(false);
              }}
            >
              Personal mailbox
            </Item>
            <Item
              keywords={["done", "archive"]}
              onSelect={() => {
                done();
                setOpen(false);
                toast("Done · U to undo");
              }}
            >
              <Archive className="size-3.5" /> Done
            </Item>
            <Item
              keywords={["snooze", "later"]}
              onSelect={() => {
                setOpen(false);
                setSnoozeOpen(true);
              }}
            >
              <Clock className="size-3.5" /> Snooze
            </Item>
            <Item
              keywords={["trash", "delete"]}
              onSelect={() => {
                trash();
                setOpen(false);
                toast("Trashed · U to undo");
              }}
            >
              <Trash2 className="size-3.5" /> Trash
            </Item>
            <Item
              onSelect={() => {
                setSplit("focused");
                setOpen(false);
              }}
            >
              <Inbox className="size-3.5" /> Go to Focused
            </Item>
            <Item
              onSelect={() => {
                setSplit("other");
                setOpen(false);
              }}
            >
              <Inbox className="size-3.5" /> Go to Other
            </Item>
            <Item
              onSelect={() => {
                setFolder("starred");
                setOpen(false);
              }}
            >
              <Star className="size-3.5" /> Go to Starred
            </Item>
            <Item
              onSelect={() => {
                setFolder("waiting");
                setOpen(false);
              }}
            >
              <Hourglass className="size-3.5" /> Go to Waiting
            </Item>
            <Item
              onSelect={() => {
                setFolder("sent");
                setOpen(false);
              }}
            >
              <Send className="size-3.5" /> Go to Sent
            </Item>
            <Item
              onSelect={() => {
                setFolder("drafts");
                setOpen(false);
              }}
            >
              <FileText className="size-3.5" /> Go to Drafts
            </Item>
            <Item
              keywords={["keyboard", "shortcuts", "keys", "cheatsheet", "reference"]}
              onSelect={() => {
                setOpen(false);
                setShortcutsOpen(true);
              }}
            >
              <Keyboard className="size-3.5" /> Keyboard shortcuts
            </Item>
          </Command.Group>

          <Command.Group heading="Themes">
            {THEMES.map((t) => (
              <Item
                key={t.id}
                keywords={["theme", t.label, t.hint, t.id]}
                onSelect={() => {
                  setTheme(t.id);
                  setOpen(false);
                  toast(`${t.label} theme`);
                }}
              >
                <span data-preview={t.id} className="theme-preview w-10 shrink-0">
                  <span />
                  <span />
                  <span />
                  <span />
                </span>
                {t.label}
                <span className="ml-auto text-micro text-subtle">{t.hint}</span>
              </Item>
            ))}
          </Command.Group>

          {compose && (
            <Command.Group heading="Snippets">
              {SNIPPETS.map((s) => (
                <Item
                  key={s.id}
                  keywords={[s.trigger, s.title]}
                  onSelect={() => {
                    insertSnippet(s.id);
                    setOpen(false);
                  }}
                >
                  <span className="font-mono text-micro text-subtle">;{s.trigger}</span>
                  {s.title}
                </Item>
              ))}
            </Command.Group>
          )}

          <Command.Group heading="Mail">
            {mailHits.map((t) => {
              const last = threadPreview(t);
              const person = counterpart(t, me.email);
              return (
                <Item
                  key={t.id}
                  value={`${t.subject} ${person.name} ${person.email} ${last?.body ?? ""}`}
                  onSelect={() => openThread(t)}
                >
                  <span className="w-28 shrink-0 truncate text-muted">{person.name}</span>
                  <span className="min-w-0 truncate text-fg">{t.subject}</span>
                  <span className="ml-auto hidden truncate text-subtle sm:inline">
                    {snippetOf(last?.body ?? "", 40)}
                  </span>
                  <span className="tabular-nums text-subtle">
                    {last ? formatListTime(last.date) : ""}
                  </span>
                </Item>
              );
            })}
          </Command.Group>
        </Command.List>
      </Command>
      </div>
    </div>
  );
}

function Item({
  children,
  onSelect,
  keywords,
  value,
}: {
  children: ReactNode;
  onSelect: () => void;
  keywords?: string[];
  value?: string;
}) {
  return (
    <Command.Item
      value={value}
      keywords={keywords}
      onSelect={onSelect}
      className={cn(
        "flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-mail text-muted",
        "data-[selected=true]:bg-select data-[selected=true]:text-fg",
      )}
    >
      {children}
    </Command.Item>
  );
}
