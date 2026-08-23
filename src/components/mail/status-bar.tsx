import { APP_NAME, APP_VERSION } from "@/lib/app";
import { useMailStore } from "@/lib/mail/store";
import { themeLabel, useThemeStore } from "@/lib/theme";
import { Kbd } from "./kbd";

export function StatusBar() {
  const pendingG = useMailStore((s) => s.pendingG);
  const compose = useMailStore((s) => s.compose);
  const folder = useMailStore((s) => s.folder);
  const selectedId = useMailStore((s) => s.selectedId);
  const calendarOpen = useMailStore((s) => s.calendarOpen);
  const checkedIds = useMailStore((s) => s.checkedIds);

  const source = useMailStore((s) => s.source);
  const syncing = useMailStore((s) => s.syncing);
  const setShortcutsOpen = useMailStore((s) => s.setShortcutsOpen);
  const setConnectOpen = useMailStore((s) => s.setConnectOpen);
  const themeId = useThemeStore((s) => s.id);
  const resolved = useThemeStore((s) => s.resolved);
  const setThemeOpen = useThemeStore((s) => s.setOpen);
  const boxes = useMailStore((s) => s.boxes);
  const activeBoxId = useMailStore((s) => s.activeBoxId);
  const box = boxes.find((b) => b.id === activeBoxId);

  const hint = compose
    ? "Send"
    : calendarOpen
      ? "H/L day · [ ] month · N new · Enter mail"
      : pendingG
        ? "I inbox · W waiting · C calendar · 1 work · 2 personal"
        : checkedIds.length
          ? `${checkedIds.length} selected · E done · # trash · M mute`
          : selectedId
            ? "E done · R reply · ⇧I/O split · Y summarize"
            : "J/K move · C compose";


  return (
    <footer className="hidden h-8 shrink-0 items-center gap-3 border-t border-border bg-panel px-3 text-micro text-subtle md:flex">
      <span className="font-medium tracking-tight text-muted">{APP_NAME}</span>
      <span className="text-border-strong">/</span>
      <span className="tabular-nums">{APP_VERSION}</span>
      <span className="text-border-strong">/</span>
      <span className="capitalize">{folder}</span>
      {box && <span>{box.label}</span>}
      <button
        type="button"
        className="hover:text-fg"
        onClick={() => setConnectOpen(true)}
      >
        {syncing ? "Syncing…" : source === "imap" ? "Live · writes back" : "Demo"}
      </button>
      <button type="button" className="hover:text-fg" onClick={() => setThemeOpen(true)}>
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
