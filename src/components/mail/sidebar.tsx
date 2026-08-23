import { useMemo, useState } from "react";
import {
  Archive,
  CalendarDays,
  Clock,
  FileText,
  Hourglass,
  Inbox,
  Keyboard,
  PenSquare,
  Plug,
  RefreshCw,
  Search,
  Send,
  Star,
  Trash2,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { signOut } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { APP_NAME } from "@/lib/app";
import { FOLDERS, type Folder } from "@/lib/mail/types";
import { syncMailbox } from "@/lib/mail/mailbox";
import { folderCounts, useMailStore } from "@/lib/mail/store";
import { useRulesStore } from "@/lib/mail/rules";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const ICONS: Record<Folder, typeof Inbox> = {
  inbox: Inbox,
  starred: Star,
  waiting: Hourglass,
  drafts: FileText,
  sent: Send,
  snoozed: Clock,
  done: Archive,
  trash: Trash2,
};

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const folder = useMailStore((s) => s.folder);
  const split = useMailStore((s) => s.split);
  const threads = useMailStore((s) => s.threads);
  const setFolder = useMailStore((s) => s.setFolder);
  const setSplit = useMailStore((s) => s.setSplit);
  const setCommandOpen = useMailStore((s) => s.setCommandOpen);
  const setCalendarOpen = useMailStore((s) => s.setCalendarOpen);
  const setRulesOpen = useMailStore((s) => s.setRulesOpen);
  const openCompose = useMailStore((s) => s.openCompose);
  const rules = useRulesStore((s) => s.rules);
  const counts = useMemo(() => folderCounts(threads), [threads, rules]);

  const go = (fn: () => void) => {
    fn();
    onNavigate?.();
  };

  return (
    <aside className="flex h-full w-52 shrink-0 flex-col border-r border-border bg-panel">
      <div className="flex items-center justify-between px-3 pt-4 pb-3">
        <div className="flex items-baseline gap-2">
          <span className="text-lg font-semibold tracking-tight text-fg">{APP_NAME}</span>
          <span className="text-micro text-subtle">Omarchy</span>
        </div>
      </div>

      <div className="px-2">
        <Button
          variant="primary"
          className="w-full justify-between rounded-md"
          onClick={() => go(() => openCompose())}
        >
          <span className="inline-flex items-center gap-2">
            <PenSquare className="size-3.5" />
            Compose
          </span>
          <span className="font-mono text-micro opacity-70">C</span>
        </Button>
      </div>

      <button
        type="button"
        onClick={() => go(() => setCommandOpen(true))}
        className="mx-2 mt-2 flex h-9 items-center gap-2 rounded-md border border-border bg-surface px-2.5 text-left text-mail text-subtle hover:text-muted"
      >
        <Search className="size-3.5" />
        <span className="flex-1">Search or command</span>
        <span className="font-mono text-micro text-subtle">⌘K</span>
      </button>

      <nav className="mt-4 flex-1 overflow-y-auto px-2 scroll-thin">
        <div className="flex items-center justify-between px-2 pb-1">
          <p className="text-micro font-medium uppercase tracking-wider text-subtle">Inbox</p>
          <button
            type="button"
            onClick={() => go(() => setRulesOpen(true))}
            className="text-micro text-subtle hover:text-fg"
          >
            Rules
          </button>
        </div>
        <SplitRow
          active={folder === "inbox" && split === "focused"}
          label="Focused"
          count={counts.focused}
          onClick={() => go(() => setSplit("focused"))}
        />
        <SplitRow
          active={folder === "inbox" && split === "other"}
          label="Other"
          count={counts.other}
          onClick={() => go(() => setSplit("other"))}
        />

        <p className="mt-4 px-2 pb-1 text-micro font-medium uppercase tracking-wider text-subtle">Mailbox</p>
        {FOLDERS.filter((f) => f.id !== "inbox").map((f) => {
          const Icon = ICONS[f.id];
          const count = counts[f.id];
          const active = folder === f.id;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => go(() => setFolder(f.id))}
              className={cn(
                "flex h-9 w-full items-center gap-2 rounded-sm px-2 text-mail",
                active ? "bg-select text-fg" : "text-muted hover:bg-elevated hover:text-fg",
              )}
            >
              <Icon className="size-3.5" />
              <span className="flex-1 text-left">{f.label}</span>
              {count > 0 && <span className="tabular-nums text-micro text-subtle">{count}</span>}
            </button>
          );
        })}
      </nav>

      <div className="px-2 pb-1">
        <button
          type="button"
          onClick={() => go(() => setCalendarOpen(true))}
          className="flex h-9 w-full items-center gap-2 rounded-sm px-2 text-mail text-muted hover:bg-elevated hover:text-fg"
        >
          <CalendarDays className="size-3.5" />
          <span className="flex-1 text-left">Calendar</span>
          <span className="font-mono text-micro text-subtle">G C</span>
        </button>
      </div>

      <AccountFooter onNavigate={onNavigate} />
    </aside>
  );
}

function AccountFooter({ onNavigate }: { onNavigate?: () => void }) {
  const me = useMailStore((s) => s.me);
  const source = useMailStore((s) => s.source);
  const syncing = useMailStore((s) => s.syncing);
  const mailboxProvider = useMailStore((s) => s.mailboxProvider);
  const boxes = useMailStore((s) => s.boxes);
  const activeBoxId = useMailStore((s) => s.activeBoxId);
  const switchBox = useMailStore((s) => s.switchBox);
  const setConnectOpen = useMailStore((s) => s.setConnectOpen);
  const setOmarchyOpen = useMailStore((s) => s.setOmarchyOpen);
  const setShortcutsOpen = useMailStore((s) => s.setShortcutsOpen);
  const setSyncing = useMailStore((s) => s.setSyncing);
  const applyMailbox = useMailStore((s) => s.applyMailbox);
  const { user, isPending } = useCurrentUserState();
  const [signingOut, setSigningOut] = useState(false);

  async function onSync() {
    setSyncing(true);
    try {
      const status = await syncMailbox({ data: { boxId: activeBoxId ?? undefined } });
      applyMailbox(status);
      if (status.lastError) toast(status.lastError);
      else toast("Mailbox synced");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="border-t border-border px-3 py-3">
      <div className="flex gap-1">
        {boxes.map((b) => (
          <button
            key={b.id}
            type="button"
            onClick={() => {
              switchBox(b.slot);
              onNavigate?.();
            }}
            aria-label={`${b.label} mailbox`}
            className={cn(
              "h-7 flex-1 rounded-sm px-1.5 text-micro",
              b.id === activeBoxId ? "bg-select text-fg" : "text-subtle hover:text-fg",
            )}
          >
            {b.slot} {b.label}
          </button>
        ))}
      </div>
      <div className="mt-2 text-mail text-fg">{me.name}</div>
      <div className="truncate text-micro text-subtle">{me.email}</div>
      <div className="mt-1 text-micro text-subtle">
        {source === "imap"
          ? `${mailboxProvider === "gmail" ? "Gmail" : mailboxProvider === "fastmail" ? "Fastmail" : mailboxProvider === "icloud" ? "iCloud" : "IMAP"} · live`
          : "Demo inbox"}
      </div>
      <div className="mt-2 flex flex-col items-stretch gap-1">
        {source === "imap" ? (
          <button
            type="button"
            onClick={() => {
              void onSync();
              onNavigate?.();
            }}
            className="inline-flex h-8 items-center gap-1.5 rounded-sm px-1 text-left text-micro text-muted hover:text-fg"
          >
            <RefreshCw className={cn("size-3", syncing && "animate-spin")} />
            {syncing ? "Syncing…" : "Sync now"}
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => {
            setConnectOpen(true);
            onNavigate?.();
          }}
          className="inline-flex h-8 items-center gap-1.5 rounded-sm px-1 text-left text-micro text-muted hover:text-fg"
        >
          <Plug className="size-3" />
          {source === "imap"
            ? boxes.length < 2
              ? "Add mailbox"
              : "Mailbox settings"
            : "Connect mailbox"}
        </button>
        <button
          type="button"
          onClick={() => {
            setShortcutsOpen(true);
            onNavigate?.();
          }}
          className="inline-flex h-8 items-center gap-1.5 rounded-sm px-1 text-left text-micro text-muted hover:text-fg"
        >
          <Keyboard className="size-3" />
          Keyboard shortcuts
        </button>
        <button
          type="button"
          onClick={() => {
            setOmarchyOpen(true);
            onNavigate?.();
          }}
          className="inline-flex h-8 items-center rounded-sm px-1 text-left text-micro text-muted hover:text-fg"
        >
          Install on Omarchy
        </button>
        {isPending ? (
          <div className="h-8 w-full animate-pulse rounded-sm bg-surface" />
        ) : user ? (
          <button
            type="button"
            disabled={signingOut}
            onClick={() => {
              setSigningOut(true);
              void signOut().catch(() => setSigningOut(false));
            }}
            className="h-8 rounded-sm px-1 text-left text-micro text-muted hover:text-fg disabled:opacity-50"
          >
            {signingOut ? "Signing out…" : "Sign out"}
          </button>
        ) : (
          <Link
            to="/login"
            search={{ connect: true, calendar: undefined }}
            className="inline-flex h-8 items-center px-1 text-micro text-muted hover:text-fg"
            onClick={() => onNavigate?.()}
          >
            Sign in
          </Link>
        )}
      </div>
    </div>
  );
}

function SplitRow({
  active,
  label,
  count,
  onClick,
}: {
  active: boolean;
  label: string;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-9 w-full items-center gap-2 rounded-sm px-2 text-mail",
        active ? "bg-select text-fg" : "text-muted hover:bg-elevated hover:text-fg",
      )}
    >
      <span className={cn("size-1.5 rounded-full", active ? "bg-unread" : "bg-border-strong")} />
      <span className="flex-1 text-left">{label}</span>
      {count > 0 && <span className="tabular-nums text-micro text-unread">{count}</span>}
    </button>
  );
}
