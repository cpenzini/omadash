import { useMemo, useState } from "react";
import { toast } from "sonner";
import { APP_NAME } from "@/lib/app";
import { requestMailNotifications } from "@/lib/mail/notify";
import { useMailStore } from "@/lib/mail/store";
import { Button } from "@/components/ui/button";
import { Kbd } from "./kbd";

export function OmarchyInstall() {
  const open = useMailStore((s) => s.omarchyOpen);
  const setOpen = useMailStore((s) => s.setOmarchyOpen);
  const [copied, setCopied] = useState<string | null>(null);
  const origin = useMemo(() => (typeof window === "undefined" ? "" : window.location.origin), []);
  const bind = `bindd = SUPER, M, ${APP_NAME}, exec, omarchy-launch-webapp ${APP_NAME}`;
  const compose = `bindd = SUPER SHIFT, M, Compose, exec, omarchy-launch-webapp ${APP_NAME} -- ${origin}/?compose=1`;

  if (!open) return null;

  function copy(label: string, value: string) {
    void navigator.clipboard.writeText(value).then(() => {
      setCopied(label);
      toast("Copied");
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-bg/70 p-4"
      onClick={() => setOpen(false)}
    >
      <div
        role="dialog"
        aria-label="Install on Omarchy"
        className="w-full max-w-lg rounded-xl border border-border bg-elevated p-5 shadow-[var(--shadow-float)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-medium text-fg">Install on Omarchy</h2>
          <Kbd>Esc</Kbd>
        </div>
        <ol className="space-y-3 text-mail text-muted">
          <li>
            <p className="font-medium text-fg">1. Web app</p>
            <p className="mt-0.5 text-pretty">
              Super + Alt + Space → Install → Web App. Name it {APP_NAME}. URL:
            </p>
            <Code onCopy={() => copy("url", origin)}>{origin}</Code>
          </li>
          <li>
            <p className="font-medium text-fg">2. Super + M</p>
            <p className="mt-0.5">Paste into ~/.config/hypr/bindings.conf</p>
            <Code onCopy={() => copy("bind", bind)}>{bind}</Code>
            <Code onCopy={() => copy("compose", compose)}>{compose}</Code>
          </li>
          <li>
            <p className="font-medium text-fg">3. Notifications</p>
            <p className="mt-0.5">Chromium talks to mako. Allow them once.</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => {
                void requestMailNotifications().then((ok) => {
                  toast(ok ? "Notifications on — new mail hits mako" : "Notifications blocked");
                });
              }}
            >
              Allow notifications
            </Button>
          </li>
        </ol>
        {copied && <p className="mt-3 text-micro text-subtle">Copied {copied}</p>}
      </div>
    </div>
  );
}

function Code({ children, onCopy }: { children: string; onCopy: () => void }) {
  return (
    <button
      type="button"
      onClick={onCopy}
      className="mt-1.5 block w-full truncate rounded-md border border-border bg-surface px-2.5 py-2 text-left font-mono text-micro text-fg hover:bg-select"
    >
      {children}
    </button>
  );
}