import { useEffect } from "react";
import { LABELS } from "@/lib/mail/types";
import { useMailStore } from "@/lib/mail/store";
import { cn } from "@/lib/utils";
import { Kbd } from "./kbd";

export function LabelPicker() {
  const open = useMailStore((s) => s.labelOpen);
  const setOpen = useMailStore((s) => s.setLabelOpen);
  const setLabel = useMailStore((s) => s.setLabel);
  const selectedId = useMailStore((s) => s.selectedId);
  const thread = useMailStore((s) => s.threads.find((t) => t.id === s.selectedId));

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      const n = Number(e.key);
      if (n >= 1 && n <= LABELS.length) {
        e.preventDefault();
        e.stopPropagation();
        const label = LABELS[n - 1];
        if (label) setLabel(label);
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open, setLabel]);

  if (!open || !selectedId) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-bg/70 p-4"
      onClick={() => setOpen(false)}
    >
      <div
        role="dialog"
        aria-label="Labels"
        className="w-full max-w-sm rounded-xl border border-border bg-elevated p-4 shadow-[var(--shadow-float)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-medium text-fg">Label</h2>
          <Kbd>Esc</Kbd>
        </div>
        <ul className="space-y-1">
          {LABELS.map((label, i) => {
            const on = thread?.labels.includes(label);
            return (
              <li key={label}>
                <button
                  type="button"
                  className={cn(
                    "flex h-11 w-full items-center justify-between rounded-md px-3 text-left text-mail hover:bg-select",
                    on && "bg-select",
                  )}
                  onClick={() => setLabel(label)}
                >
                  <span className="text-fg">{label}</span>
                  <span className="flex items-center gap-2">
                    {on && <span className="text-micro text-subtle">on</span>}
                    <Kbd>{String(i + 1)}</Kbd>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
