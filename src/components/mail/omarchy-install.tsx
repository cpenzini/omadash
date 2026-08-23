import { useMemo, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { APP_NAME, APP_RELEASE } from "@/lib/app";
import { canPromptInstall, isStandalone, promptInstall, subscribeInstall } from "@/lib/mail/install";
import { requestMailNotifications } from "@/lib/mail/notify";
import { useMailStore } from "@/lib/mail/store";
import { Button } from "@/components/ui/button";
import { Kbd } from "./kbd";

const BIND = `bindd = SUPER, M, ${APP_NAME}, exec, omadash`;

export function OmarchyInstall() {
  const open = useMailStore((s) => s.omarchyOpen);
  const setOpen = useMailStore((s) => s.setOmarchyOpen);
  const [copied, setCopied] = useState<"bind" | "url" | null>(null);
  const [busy, setBusy] = useState(false);
  const origin = useMemo(() => (typeof window === "undefined" ? "" : window.location.origin), []);
  const ready = useSyncExternalStore(subscribeInstall, canPromptInstall, () => false);
  const standalone = useSyncExternalStore(subscribeInstall, isStandalone, () => false);

  if (!open) return null;

  function copy(text: string, which: "bind" | "url") {
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(which);
      toast("Copied");
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
      toast("On Omarchy, download the Linux binary from GitHub Releases");
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
          On Omarchy we ship a compiled GTK binary. Download it, run install.sh, bind Super + M. Source is on
          GitHub. This browser window is the same mailbox UI.
        </p>

        <ol className="mt-5 space-y-3 text-mail text-muted">
          <li>
            <p className="font-medium text-fg">1. Linux binary</p>
            <p className="mt-0.5 text-pretty">
              Grab <span className="text-fg">omadash-*-linux-x64.tar.gz</span> from Releases, extract,{" "}
              <span className="font-mono text-micro text-fg">./install.sh</span>.
            </p>
            <a
              href={APP_RELEASE}
              target="_blank"
              rel="noreferrer"
              className="mt-1.5 inline-flex rounded-md border border-border bg-surface px-2.5 py-2 font-mono text-micro text-fg hover:bg-select"
            >
              github.com/cpenzini/omadash/releases
            </a>
          </li>
          <li>
            <p className="font-medium text-fg">2. Super + M</p>
            <button
              type="button"
              onClick={() => copy(BIND, "bind")}
              className="mt-1.5 block w-full truncate rounded-md border border-border bg-surface px-2.5 py-2 text-left font-mono text-micro text-fg hover:bg-select"
            >
              {BIND}
            </button>
          </li>
          <li>
            <p className="font-medium text-fg">This browser (optional)</p>
            {standalone ? (
              <p className="mt-0.5">Already installed as a web app on this computer.</p>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                disabled={busy}
                onClick={() => {
                  if (ready) void installHere();
                  else copy(origin, "url");
                }}
              >
                {busy ? "Installing…" : ready ? "Install this page as a web app" : "Copy this address"}
              </Button>
            )}
          </li>
        </ol>

        <Button
          variant="outline"
          size="sm"
          className="mt-4"
          onClick={() => {
            void requestMailNotifications().then((ok) => {
              toast(ok ? "Notifications on" : "Notifications blocked");
            });
          }}
        >
          Allow notifications
        </Button>
        {copied && (
          <p className="mt-3 text-micro text-subtle">
            Copied {copied === "bind" ? "binding" : "address"}
          </p>
        )}
      </div>
    </div>
  );
}
