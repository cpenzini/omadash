import { APP_NAME, APP_VERSION } from "@/lib/app";
import { isHoldingSend, useMailStore } from "@/lib/mail/store";
import { usePrefsStore } from "@/lib/mail/prefs";
import { themeLabel, useThemeStore } from "@/lib/theme";
import { Kbd } from "./kbd";

export function StatusBar() {
  const pendingG = useMailStore((s) => s.pendingG);
  const compose = useMailStore((s) => s.compose);
  const folder = useMailStore((s) => s.folder);
  const selectedId = useMailStore((s) => s.selectedId);
  const calendarOpen = useMailStore((s) => s.calendarOpen);
  const checkedIds = useMailStore((s) => s.checkedIds);
  const threads = useMailStore((s) => s.threads);

  const source = useMailStore((s) => s.source);
  const syncing = useMailStore((s) => s.syncing);
  const setShortcutsOpen = useMailStore((s) => s.setShortcutsOpen);
  const setConnectOpen = useMailStore((s) => s.setConnectOpen);
  const setSettingsOpen = usePrefsStore((s) => s.setSettingsOpen);
  const layout = usePrefsStore((s) => s.layout);
  const themeId = useThemeStore((s) => s.id);
  const resolved = useThemeStore((s) => s.resolved);
  const boxes = useMailStore((s) => s.boxes);
  const activeBoxId = useMailStore((s) => s.activeBoxId);
  const box = boxes.find((b) => b.id === activeBoxId);
  const holding = threads.some((t) => isHoldingSend(t));

  const hint = compose
    ? "⌘↵ send · 8s to undo"
    : holding
      ? "Sending · U to undo"
      : calendarOpen
        ? "D/W/F/M/A view · Z zone · N new · ` cycle"
        : pendingG
          ? "I inbox · C / 3 calendar · 1 / 2 mailbox"
          : checkedIds.length
            ? `${checkedIds.length} selected · E done · # trash · M mute`
            : selectedId
              ? layout === "two"
                ? "Enter open · N file · E done · Esc list"
                : "E done · N file · R reply · Y summarize"
              : "J/K move · Enter open · C compose";

  return (
    <footer className="hidden h-8 shrink-0 items-center gap-3 border-t border-border bg-panel px-3 text-micro text-subtle md:flex">
      <span className="font-medium tracking-tight text-muted">{APP_NAME}</span>
      <span className="text-border-strong">/</span>
      <span className="tabular-nums">{APP_VERSION}</span>
      <span className="text-border-strong">/</span>
      <span className="capitalize">{calendarOpen ? "calendar" : folder}</span>
      {box && <span>{box.label}</span>}
      <button
        type="button"
        className="hover:text-fg"
        onClick={() => setConnectOpen(true)}
      >
        {holding ? "Sending…" : syncing ? "Syncing…" : source === "imap" ? "Live · writes back" : "No mailbox"}
      </button>
      <button type="button" className="hover:text-fg" onClick={() => setSettingsOpen(true)}>
        {layout === "two" ? "Two panes" : "Three panes"}
      </button>
      <button type="button" className="hover:text-fg" onClick={() => setSettingsOpen(true)}>
        {themeLabel(themeId === "auto" ? resolved : themeId)}
      </button>
      <span className="mx-auto flex items-center gap-2">
        {pendingG && <Kbd>G</Kbd>}
        <span>{hint}</span>
      </span>
      <button
        type="button"
        className="inline-flex items-center gap-1 hover:text-fg"
        onClick={() => setShortcutsOpen(true)}
      >
        <Kbd>?</Kbd>
        <span>reference</span>
      </button>
    </footer>
  );
}
