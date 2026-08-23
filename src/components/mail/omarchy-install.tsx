import { useMemo, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { APP_NAME } from "@/lib/app";
import { canPromptInstall, isStandalone, promptInstall, subscribeInstall } from "@/lib/mail/install";
import { requestMailNotifications } from "@/lib/mail/notify";
import { useMailStore } from "@/lib/mail/store";
import { Button } from "@/components/ui/button";
import { Kbd } from "./kbd";

export function OmarchyInstall() {
  const open = useMailStore((s) => s.omarchyOpen);
  const setOpen = useMailStore((s) => s.setOmarchyOpen);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const origin = useMemo(() => (typeof window === "undefined" ? "" : window.location.origin), []);
  const ready = useSyncExternalStore(subscribeInstall, canPromptInstall, () => false);
  const standalone = useSyncExternalStore(subscribeInstall, isStandalone, () => false);
  const bind = `bindd = SUPER, M, ${APP_NAME}, exec, omarchy-launch-webapp ${APP_NAME}`;

  if (!open) return null;

  function copyUrl() {
    void navigator.clipboard.writeText(origin).then(() => {
      setCopied(true);
      toast("Address copied");
    });
  }

  async function installHere() {
    setBusy(true);
    const result = await promptInstall();
    setBusy(false);
    if (result === "accepted") {
      toast(`${APP_NAME} is an app on this computer`);
      setOpen(false);
    } else if (result === "unavailable") {
      toast("Use Install → Web App from the Omarchy menu");
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-bg/70 p-4"
      onClick={() => setOpen(false)}
    >
      <div
        role="dialog"
        aria-label={`Install ${APP_NAME}`}
        className="w-full max-w-lg rounded-xl border border-border bg-elevated p-5 shadow-[var(--shadow-float)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-medium text-fg">Install {APP_NAME}</h2>
          <Kbd>Esc</Kbd>
        </div>
        <p className="text-mail text-muted text-pretty">
          Put it next to your other apps. No terminal, no git, no local server.
        </p>

        {standalone ? (
          <p className="mt-4 rounded-md border border-border bg-surface px-3 py-2.5 text-mail text-fg">
            It is already installed. Open it from the app list like a browser.
          </p>
        ) : (
          <Button
            variant="primary"
            className="mt-4 w-full"
            disabled={busy}
            onClick={() => {
              if (ready) void installHere();
              else copyUrl();
            }}
          >
            {busy ? "Installing…" : ready ? `Install ${APP_NAME}` : "Copy the address, then Install → Web App"}
          </Button>
        )}

        <ol className="mt-5 space-y-3 text-mail text-muted">
          <li>
            <p className="font-medium text-fg">On Omarchy</p>
            <p className="mt-0.5 text-pretty">
              Super + Alt + Space → Install → Web App. Name it {APP_NAME}. Paste this address if it asks:
            </p>
            <button
              type="button"
              onClick={copyUrl}
              className="mt-1.5 block w-full truncate rounded-md border border-border bg-surface px-2.5 py-2 text-left font-mono text-micro text-fg hover:bg-select"
            >
              {origin || "this page"}
            </button>
          </li>
          <li>
            <p className="font-medium text-fg">On a phone or tablet</p>
            <p className="mt-0.5 text-pretty">
              Open this page in the browser, then Share → Add to Home Screen (Apple) or the install icon in the
              address bar (Android).
            </p>
          </li>
          <li>
            <p className="font-medium text-fg">Notifications</p>
            <p className="mt-0.5">Once, so new mail and upcoming events can ping the desktop.</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => {
                void requestMailNotifications().then((ok) => {
                  toast(ok ? "Notifications on" : "Notifications blocked");
                });
              }}
            >
              Allow notifications
            </Button>
          </li>
        </ol>

        <details className="mt-4 text-mail text-muted">
          <summary className="cursor-pointer font-medium text-fg">Optional: Super + M</summary>
          <p className="mt-1.5 text-pretty">
            Only if you want a key. Paste this one line into Hyprland bindings, then Super + M opens {APP_NAME}.
          </p>
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard.writeText(bind).then(() => toast("Binding copied"));
            }}
            className="mt-1.5 block w-full truncate rounded-md border border-border bg-surface px-2.5 py-2 text-left font-mono text-micro text-fg hover:bg-select"
          >
            {bind}
          </button>
        </details>
        {copied && <p className="mt-3 text-micro text-subtle">Address copied</p>}
      </div>
    </div>
  );
}
