import { format } from "date-fns";
import { toast } from "sonner";
import { LATER_OPTIONS } from "@/lib/mail/later";
import { useMailStore } from "@/lib/mail/store";
import { Kbd } from "./kbd";

export function SnoozePicker() {
  const open = useMailStore((s) => s.snoozeOpen);
  const setOpen = useMailStore((s) => s.setSnoozeOpen);
  const snooze = useMailStore((s) => s.snooze);
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-bg/70 p-4"
      onClick={() => setOpen(false)}
    >
      <div
        role="dialog"
        aria-label="Snooze"
        className="w-full max-w-sm rounded-xl border border-border bg-elevated p-4 shadow-[var(--shadow-float)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-medium text-fg">Snooze until</h2>
          <Kbd>Esc</Kbd>
        </div>
        <ul className="space-y-1">
          {LATER_OPTIONS.map((o) => {
            const at = o.at();
            return (
              <li key={o.id}>
                <button
                  type="button"
                  className="flex h-11 w-full items-center justify-between rounded-md px-3 text-left text-mail hover:bg-select"
                  onClick={() => {
                    snooze(at);
                    toast(`Snoozed · ${format(at, "EEE h:mm a")}`);
                  }}
                >
                  <span className="text-fg">{o.label}</span>
                  <span className="text-micro text-subtle">{format(at, "EEE h:mm a")}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
