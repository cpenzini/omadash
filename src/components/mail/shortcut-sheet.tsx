import { APP_NAME } from "@/lib/app";
import { useMailStore } from "@/lib/mail/store";
import { Kbd } from "./kbd";

const GROUPS = [
  {
    title: "Move",
    rows: [
      ["J / K", "Next / previous"],
      ["↑ / ↓", "Same"],
      ["Enter / O", "Open thread"],
      ["Esc", "Back to list / close"],
      ["\\", "Two panes / three panes"],
      [",", "Settings"],
      ["G then G", "Jump to top"],
      ["G then I", "Inbox"],
      ["G then S", "Starred"],
      ["G then W", "Waiting"],
      ["G then T", "Sent"],
      ["G then D", "Drafts"],
      ["G then H", "Snoozed"],
      ["G then E", "Done"],
      ["G then #", "Trash"],
      ["G then C / 3", "Calendar"],
      ["G then 1 / 2", "Mailbox 1 / 2"],
      ["1 / 2 / 3", "Mailbox / mailbox / calendar"],
      ["`", "Cycle mailbox / calendar"],
      ["Shift + `", "Cycle backward"],
    ],
  },
  {
    title: "Act",
    rows: [
      ["E", "Done — archives on the server"],
      ["#", "Trash"],
      ["H", "Snooze"],
      ["N", "File on calendar"],
      ["S", "Star"],
      ["X", "Select"],
      ["M", "Mute"],
      ["L", "Label"],
      ["Y", "Summarize"],
      ["Shift + I", "Train as Focused"],
      ["Shift + O", "Train as Other"],
      ["Z", "Toggle unread"],
      ["U", "Undo"],
      [",", "Settings"],
      ["G then A", "Settings"],
    ],
  },
  {
    title: "Write",
    rows: [
      ["C", "Compose"],
      ["R", "Reply"],
      ["Shift + R", "Reply all"],
      ["F", "Forward"],
      ["⌘ Enter", "Send (8s to undo)"],
      ["Esc", "Save draft"],
      [";thanks", "Expand snippet"],
    ],
  },
  {
    title: "Find",
    rows: [
      ["⌘K / /", "Search all mailboxes"],
      ["?", "This reference"],
      ["Inbox rules", "From ⌘K"],
      ["Connect", "From ⌘K"],
      ["Settings", "From ⌘K or ,"],
      ["Install", "From ⌘K or Settings"],
    ],
  },
  {
    title: "Calendar",
    rows: [
      ["G then C / 3", "Calendar"],
      ["`", "Cycle mailbox / calendar"],
      ["D / W / F / M / A", "Day / week / work / month / agenda"],
      ["V", "Cycle views"],
      ["Z", "Second time zone"],
      ["H / L", "Previous / next period"],
      ["↑ / ↓", "Week or month"],
      ["T", "Today"],
      ["N", "New event"],
      ["J / K", "Next / previous event"],
      ["P", "Connect CalDAV / Google"],
      ["R", "Sync connected calendars"],
      ["Enter", "Open the mail"],
      ["#", "Delete an event you can write"],
      ["Esc", "Back to mail"],
    ],
  },
] as const;

export function ShortcutSheet() {
  const open = useMailStore((s) => s.shortcutsOpen);
  const setOpen = useMailStore((s) => s.setShortcutsOpen);
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-bg/70 p-4"
      onClick={() => setOpen(false)}
    >
      <div
        role="dialog"
        aria-label="Keyboard shortcuts"
        className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-xl border border-border bg-elevated p-5 shadow-[var(--shadow-float)] scroll-thin sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-medium tracking-tight text-fg">Keyboard reference</h2>
            <p className="text-mail text-muted">Every key {APP_NAME} listens for.</p>
          </div>
          <button type="button" className="text-mail text-subtle hover:text-fg" onClick={() => setOpen(false)}>
            Close <Kbd>?</Kbd> <Kbd>Esc</Kbd>
          </button>
        </div>
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {GROUPS.map((g) => (
            <section key={g.title}>
              <h3 className="mb-2 text-micro font-medium uppercase tracking-wider text-subtle">{g.title}</h3>
              <ul className="space-y-1.5">
                {g.rows.map(([k, label]) => (
                  <li key={`${g.title}-${k}`} className="flex items-center justify-between gap-3 text-mail">
                    <span className="text-muted text-pretty">{label}</span>
                    <Kbd className="shrink-0">{k}</Kbd>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
