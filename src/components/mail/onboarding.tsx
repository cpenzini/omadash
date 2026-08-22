import { APP_NAME, APP_TAGLINE, APP_VERSION } from "@/lib/app";
import { useMailStore } from "@/lib/mail/store";
import { Kbd } from "./kbd";
import { Button } from "@/components/ui/button";

const KEYS = [
  { k: "J K", label: "Move" },
  { k: "E", label: "Done" },
  { k: "C", label: "Compose" },
  { k: "⌘K", label: "Command" },
];

export function Onboarding() {
  const open = useMailStore((s) => s.onboarding);
  const dismiss = useMailStore((s) => s.dismissOnboarding);
  if (!open) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-16 z-30 flex justify-center p-4 md:bottom-10 md:left-52 md:right-0 md:justify-start md:p-6">
      <div className="pointer-events-auto w-full max-w-sm rounded-xl border border-border bg-elevated p-5 shadow-[var(--shadow-float)]">
        <p className="text-micro font-medium uppercase tracking-wider text-subtle">
          {APP_VERSION} · Keyboard first
        </p>
        <h2 className="mt-1 text-lg font-medium tracking-tight text-fg">{APP_NAME}</h2>
        <p className="mt-1 text-mail text-muted text-pretty">{APP_TAGLINE} Four keys get you to inbox zero.</p>
        <ul className="mt-4 grid grid-cols-2 gap-2">
          {KEYS.map((row) => (
            <li
              key={row.k}
              className="flex items-center justify-between rounded-md border border-border bg-surface px-3 py-2"
            >
              <span className="text-mail text-muted">{row.label}</span>
              <Kbd>{row.k}</Kbd>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex items-center justify-between">
          <p className="text-micro text-subtle">? for the full map</p>
          <Button variant="primary" size="sm" onClick={dismiss}>
            Start
          </Button>
        </div>
      </div>
    </div>
  );
}
