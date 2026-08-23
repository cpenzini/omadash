import { useState, useSyncExternalStore } from "react";
import { toast } from "sonner";
import {
  Bell,
  CalendarDays,
  Columns2,
  Download,
  Keyboard,
  Mail,
  Palette,
  Plug,
  Rows3,
  Settings2,
  X,
} from "lucide-react";
import { APP_NAME, APP_VERSION } from "@/lib/app";
import { applyMailLayout, usePrefsStore, type MailLayout } from "@/lib/mail/prefs";
import { canPromptInstall, isStandalone, promptInstall, subscribeInstall } from "@/lib/mail/install";
import { useMailStore } from "@/lib/mail/store";
import { colorDot, TZ_OPTIONS, useCalendarStore } from "@/lib/mail/calendar";
import { CAL_COLORS } from "@/lib/mail/cal-presets";
import { disconnectMailbox } from "@/lib/mail/mailbox";
import { disconnectCalendar, setCalendarColor } from "@/lib/mail/calendar-sync";
import { requestMailNotifications } from "@/lib/mail/notify";
import { HOLD_MS } from "@/lib/mail/store";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Kbd } from "./kbd";
import { ThemeGrid } from "./theme-picker";

const SECTIONS = [
  { id: "layout", label: "Layout", icon: Columns2 },
  { id: "accounts", label: "Accounts", icon: Mail },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "calendar", label: "Calendar", icon: CalendarDays },
  { id: "alerts", label: "Notifications", icon: Bell },
  { id: "mail", label: "Mail", icon: Rows3 },
  { id: "install", label: "Install", icon: Download },
] as const;

type Section = (typeof SECTIONS)[number]["id"];

export function Settings() {
  const open = usePrefsStore((s) => s.settingsOpen);
  const setOpen = usePrefsStore((s) => s.setSettingsOpen);
  const [section, setSection] = useState<Section>("layout");

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-bg/70 p-0 sm:items-center sm:p-6"
      onClick={() => setOpen(false)}
    >
      <div
        role="dialog"
        aria-label="Settings"
        className="flex h-dvh w-full max-w-3xl flex-col overflow-hidden rounded-none border border-border bg-elevated shadow-[var(--shadow-float)] sm:h-[min(90vh,40rem)] sm:rounded-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex h-12 shrink-0 items-center justify-between border-b border-border px-4">
          <div className="flex items-baseline gap-2">
            <Settings2 className="size-3.5 text-muted" />
            <h2 className="text-sm font-medium tracking-tight text-fg">Settings</h2>
            <span className="text-micro text-subtle">
              {APP_NAME} {APP_VERSION}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Kbd>Esc</Kbd>
            <Button size="icon-sm" onClick={() => setOpen(false)} aria-label="Close">
              <X className="size-4" />
            </Button>
          </div>
        </header>
        <div className="flex min-h-0 flex-1 flex-col sm:flex-row">
          <nav className="flex shrink-0 gap-1 overflow-x-auto border-b border-border px-2 py-2 sm:w-44 sm:flex-col sm:overflow-y-auto sm:border-r sm:border-b-0 sm:px-2 sm:py-3 scroll-thin">
            {SECTIONS.map((s) => {
              const Icon = s.icon;
              const active = section === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSection(s.id)}
                  className={cn(
                    "inline-flex h-9 shrink-0 items-center gap-2 rounded-md px-2.5 text-mail",
                    active ? "bg-select text-fg" : "text-muted hover:bg-surface hover:text-fg",
                  )}
                >
                  <Icon className="size-3.5" />
                  {s.label}
                </button>
              );
            })}
          </nav>
          <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5 scroll-thin">
            {section === "layout" && <LayoutSection />}
            {section === "accounts" && <AccountsSection />}
            {section === "appearance" && <AppearanceSection />}
            {section === "calendar" && <CalendarSection />}
            {section === "alerts" && <AlertsSection />}
            {section === "mail" && <MailSection />}
            {section === "install" && <InstallSection />}
          </div>
        </div>
      </div>
    </div>
  );
}

function LayoutSection() {
  const layout = usePrefsStore((s) => s.layout);
  return (
    <div>
      <h3 className="text-sm font-medium text-fg">Mail layout</h3>
      <p className="mt-1 text-mail text-muted text-pretty">
        Two panes is Superhuman: a compact list, then Enter to open. Three panes keeps the list beside the thread.
      </p>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <LayoutCard
          id="two"
          label="Two panes"
          hint="List, then open. Default."
          active={layout === "two"}
          onPick={() => applyMailLayout("two", useMailStore.getState())}
        />
        <LayoutCard
          id="three"
          label="Three panes"
          hint="List and thread side by side."
          active={layout === "three"}
          onPick={() => applyMailLayout("three", useMailStore.getState())}
        />
      </div>
      <p className="mt-4 text-micro text-subtle">
        Toggle anytime with <Kbd>\</Kbd> · Settings is <Kbd>,</Kbd>
      </p>
    </div>
  );
}

function LayoutCard({
  id,
  label,
  hint,
  active,
  onPick,
}: {
  id: MailLayout;
  label: string;
  hint: string;
  active: boolean;
  onPick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onPick}
      className={cn(
        "rounded-lg border p-3 text-left transition-colors duration-150",
        active ? "border-accent bg-select" : "border-border bg-surface hover:border-border-strong",
      )}
    >
      <LayoutPreview id={id} />
      <p className="mt-3 text-mail font-medium text-fg">{label}</p>
      <p className="text-micro text-subtle">{hint}</p>
    </button>
  );
}

function LayoutPreview({ id }: { id: MailLayout }) {
  return (
    <div className="flex h-20 overflow-hidden rounded-md border border-border bg-bg">
      <div className="w-5 shrink-0 border-r border-border bg-panel" />
      {id === "two" ? (
        <div className="flex flex-1 flex-col justify-center gap-1 p-2">
          <div className="h-1.5 w-full rounded-sm bg-border-strong" />
          <div className="h-1.5 w-5/6 rounded-sm bg-border" />
          <div className="h-1.5 w-full rounded-sm bg-border" />
          <div className="h-1.5 w-4/5 rounded-sm bg-border" />
          <div className="h-1.5 w-full rounded-sm bg-border" />
        </div>
      ) : (
        <>
          <div className="flex w-1/3 flex-col justify-center gap-1 border-r border-border p-1.5">
            <div className="h-4 rounded-sm bg-border-strong" />
            <div className="h-4 rounded-sm bg-border" />
            <div className="h-4 rounded-sm bg-border" />
          </div>
          <div className="flex flex-1 flex-col gap-1.5 p-2">
            <div className="h-2 w-2/3 rounded-sm bg-border-strong" />
            <div className="h-1.5 w-full rounded-sm bg-border" />
            <div className="h-1.5 w-5/6 rounded-sm bg-border" />
            <div className="mt-auto h-8 rounded-sm bg-surface" />
          </div>
        </>
      )}
    </div>
  );
}

function AccountsSection() {
  const boxes = useMailStore((s) => s.boxes);
  const activeBoxId = useMailStore((s) => s.activeBoxId);
  const source = useMailStore((s) => s.source);
  const applyMailbox = useMailStore((s) => s.applyMailbox);
  const clearMailbox = useMailStore((s) => s.useDemo);
  const switchBox = useMailStore((s) => s.switchBox);
  const setConnectOpen = useMailStore((s) => s.setConnectOpen);
  const setCalConnect = useCalendarStore((s) => s.setConnectOpen);
  const accounts = useCalendarStore((s) => s.accounts);
  const hidden = useCalendarStore((s) => s.hidden);
  const toggleHidden = useCalendarStore((s) => s.toggleHidden);
  const applyFeed = useCalendarStore((s) => s.applyFeed);
  const [busy, setBusy] = useState<string | null>(null);

  async function removeBox(boxId: string) {
    setBusy(boxId);
    try {
      const status = await disconnectMailbox({ data: { boxId } });
      if (status.connected) applyMailbox(status);
      else clearMailbox();
      toast(status.connected ? "Mailbox removed" : "Mailbox disconnected");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not disconnect");
    } finally {
      setBusy(null);
    }
  }

  async function removeCal(id: string) {
    setBusy(id);
    try {
      applyFeed(await disconnectCalendar({ data: { accountId: id } }));
      toast("Calendar removed");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not disconnect");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-medium text-fg">Mailboxes</h3>
          {boxes.length < 2 && (
            <button
              type="button"
              onClick={() => setConnectOpen(true)}
              className="inline-flex h-8 items-center gap-1.5 text-mail text-muted hover:text-fg"
            >
              <Plug className="size-3.5" />
              Connect
            </button>
          )}
        </div>
        {boxes.length === 0 ? (
          <p className="mt-2 text-mail text-subtle">None yet. Connect Gmail, Fastmail, iCloud, or IMAP.</p>
        ) : (
          <ul className="mt-2 divide-y divide-border rounded-md border border-border">
            {boxes.map((b) => (
              <li key={b.id} className="flex items-center gap-3 px-3 py-2.5">
                <span className="font-mono text-micro text-subtle">{b.slot}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-mail text-fg">{b.label}</p>
                  <p className="truncate text-micro text-subtle">{b.email}</p>
                </div>
                {b.id !== activeBoxId && (
                  <button
                    type="button"
                    className="text-micro text-muted hover:text-fg"
                    onClick={() => switchBox(b.slot)}
                  >
                    Switch
                  </button>
                )}
                <button
                  type="button"
                  className="text-micro text-danger hover:text-fg disabled:opacity-50"
                  disabled={busy === b.id}
                  onClick={() => void removeBox(b.id)}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
        {source !== "imap" && (
          <p className="mt-2 text-micro text-subtle">Sign in, then connect — credentials stay on your account.</p>
        )}
      </div>
      <div>
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-medium text-fg">Calendars</h3>
          <button
            type="button"
            onClick={() => setCalConnect(true)}
            className="inline-flex h-8 items-center gap-1.5 text-mail text-muted hover:text-fg"
          >
            <Plug className="size-3.5" />
            Connect
          </button>
        </div>
        {accounts.length === 0 ? (
          <p className="mt-2 text-mail text-subtle">None yet. CalDAV, Google, or an ICS URL.</p>
        ) : (
          <ul className="mt-2 divide-y divide-border rounded-md border border-border">
            {accounts.map((a) => {
              const on = !hidden.includes(a.id);
              return (
                <li key={a.id} className="flex items-center gap-3 px-3 py-2.5">
                  <button
                    type="button"
                    title="Change color"
                    aria-label={`Color for ${a.label}`}
                    className={cn("size-2.5 shrink-0 rounded-full", colorDot(a.color))}
                    onClick={() => {
                      const idx = Math.max(0, CAL_COLORS.indexOf(a.color as (typeof CAL_COLORS)[number]));
                      const next = CAL_COLORS[(idx + 1) % CAL_COLORS.length]!;
                      void setCalendarColor({ data: { accountId: a.id, color: next } }).then(applyFeed);
                    }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-mail text-fg">{a.label}</p>
                    <p className="truncate text-micro text-subtle">
                      {a.provider}
                      {a.readOnly ? " · read only" : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="text-micro text-muted hover:text-fg"
                    onClick={() => toggleHidden(a.id)}
                  >
                    {on ? "Hide" : "Show"}
                  </button>
                  <button
                    type="button"
                    className="text-micro text-danger hover:text-fg disabled:opacity-50"
                    disabled={busy === a.id}
                    onClick={() => void removeCal(a.id)}
                  >
                    Remove
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function AppearanceSection() {
  return (
    <div>
      <h3 className="text-sm font-medium text-fg">Omarchy theme</h3>
      <p className="mt-1 mb-3 text-mail text-muted">Steel, Nord, paper, or follow the system.</p>
      <ThemeGrid />
    </div>
  );
}

function CalendarSection() {
  const secondTz = useCalendarStore((s) => s.secondTz);
  const setSecondTz = useCalendarStore((s) => s.setSecondTz);
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium text-fg">Second time zone</h3>
        <p className="mt-1 text-mail text-muted text-pretty">
          A second clock on the day and week grid. <Kbd>Z</Kbd> cycles from the calendar.
        </p>
        <select
          value={secondTz ?? ""}
          onChange={(e) => setSecondTz(e.target.value || null)}
          className="mt-3 h-10 w-full max-w-xs rounded-md border border-border bg-surface px-3 text-mail text-fg outline-none focus:border-border-strong"
        >
          <option value="">Off — local only</option>
          {TZ_OPTIONS.map((z) => (
            <option key={z.id} value={z.id}>
              {z.label} ({z.short})
            </option>
          ))}
        </select>
      </div>
      <p className="text-micro text-subtle text-pretty">
        Views: day, week, work week, month, agenda. Events you can write, you can delete.
      </p>
    </div>
  );
}

function AlertsSection() {
  const notifyMail = usePrefsStore((s) => s.notifyMail);
  const notifyEvents = usePrefsStore((s) => s.notifyEvents);
  const setNotifyMail = usePrefsStore((s) => s.setNotifyMail);
  const setNotifyEvents = usePrefsStore((s) => s.setNotifyEvents);
  const permission =
    typeof Notification === "undefined" ? "unsupported" : Notification.permission;

  async function enable(kind: "mail" | "events", on: boolean) {
    if (on) {
      const ok = await requestMailNotifications();
      if (!ok) {
        toast("Notifications are blocked in this browser");
        return;
      }
    }
    if (kind === "mail") setNotifyMail(on);
    else setNotifyEvents(on);
  }

  return (
    <div className="space-y-1">
      <h3 className="mb-2 text-sm font-medium text-fg">Desktop</h3>
      {permission === "unsupported" && (
        <p className="mb-2 text-mail text-subtle">This browser cannot show desktop notifications.</p>
      )}
      {permission === "denied" && (
        <p className="mb-2 text-mail text-subtle">Blocked in the browser. Allow notifications, then turn these on.</p>
      )}
      <Toggle
        on={notifyMail}
        label="New mail"
        hint="Ping when a message lands in the open tab."
        onChange={(v) => void enable("mail", v)}
      />
      <Toggle
        on={notifyEvents}
        label="Upcoming events"
        hint="Ping ten minutes before a timed event."
        onChange={(v) => void enable("events", v)}
      />
    </div>
  );
}

function MailSection() {
  const showRemote = usePrefsStore((s) => s.showRemoteImages);
  const setShowRemote = usePrefsStore((s) => s.setShowRemoteImages);
  const setShortcuts = useMailStore((s) => s.setShortcutsOpen);
  const setSettings = usePrefsStore((s) => s.setSettingsOpen);
  const seconds = Math.round(HOLD_MS / 1000);
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium text-fg">Reading</h3>
        <Toggle
          on={showRemote}
          label="Show remote images"
          hint="Off by default. Tracking pixels never load, even when this is on."
          onChange={setShowRemote}
        />
      </div>
      <div>
        <h3 className="text-sm font-medium text-fg">Send</h3>
        <p className="mt-1 text-mail text-muted text-pretty">
          Send holds {seconds} seconds so <Kbd>U</Kbd> can catch it. Undo lives on the home row, not a toast button.
        </p>
      </div>
      <div>
        <h3 className="text-sm font-medium text-fg">Keyboard</h3>
        <p className="mt-1 text-mail text-muted">Every key Omadash listens for.</p>
        <button
          type="button"
          onClick={() => {
            setSettings(false);
            setShortcuts(true);
          }}
          className="mt-2 inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-surface px-3 text-mail text-fg hover:bg-select"
        >
          <Keyboard className="size-3.5" />
          Open reference
          <Kbd>?</Kbd>
        </button>
      </div>
    </div>
  );
}

function InstallSection() {
  const setOmarchyOpen = useMailStore((s) => s.setOmarchyOpen);
  const setSettings = usePrefsStore((s) => s.setSettingsOpen);
  const ready = useSyncExternalStore(subscribeInstall, canPromptInstall, () => false);
  const standalone = useSyncExternalStore(subscribeInstall, isStandalone, () => false);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium text-fg">This computer</h3>
        <p className="mt-1 text-mail text-muted text-pretty">
          {APP_NAME} is a web app. Install it and it sits next to the browser. No terminal.
        </p>
        {standalone ? (
          <p className="mt-3 text-mail text-fg">Already installed. Launch it from the app list.</p>
        ) : (
          <Button
            variant="primary"
            className="mt-3"
            onClick={() => {
              if (ready) {
                void promptInstall().then((r) => {
                  if (r === "accepted") toast(`${APP_NAME} is an app on this computer`);
                });
              } else {
                setSettings(false);
                setOmarchyOpen(true);
              }
            }}
          >
            {ready ? `Install ${APP_NAME}` : "Show install steps"}
          </Button>
        )}
      </div>
      <div>
        <h3 className="text-sm font-medium text-fg">Omarchy</h3>
        <p className="mt-1 text-mail text-muted text-pretty">
          Super + Alt + Space → Install → Web App. Name it {APP_NAME}. That is the whole install.
        </p>
      </div>
    </div>
  );
}

function Toggle({
  on,
  label,
  hint,
  onChange,
}: {
  on: boolean;
  label: string;
  hint: string;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      className="flex w-full items-center gap-3 rounded-md px-2 py-2.5 text-left hover:bg-select"
    >
      <span className="min-w-0 flex-1">
        <span className="block text-mail text-fg">{label}</span>
        <span className="block text-micro text-subtle text-pretty">{hint}</span>
      </span>
      <span
        className={cn(
          "shrink-0 rounded-full px-2 py-0.5 text-micro font-medium",
          on ? "bg-accent text-accent-fg" : "bg-surface text-subtle",
        )}
      >
        {on ? "On" : "Off"}
      </span>
    </button>
  );
}
