import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { X } from "lucide-react";
import { toast } from "sonner";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { connectMailbox, disconnectMailbox } from "@/lib/mail/mailbox";
import { startGoogleOAuth } from "@/lib/mail/calendar-sync";
import { useCalendarStore } from "@/lib/mail/calendar";
import { MAIL_PRESETS, type MailProviderId } from "@/lib/mail/presets";
import { useMailStore } from "@/lib/mail/store";
import type { MailSlot } from "@/lib/mail/types";
import { Button } from "@/components/ui/button";
import { Kbd } from "./kbd";
import { cn } from "@/lib/utils";

const fieldClass =
  "h-10 w-full rounded-md border border-border bg-surface px-3 text-mail text-fg outline-none placeholder:text-subtle focus:border-border-strong";

export function ConnectMailbox() {
  const open = useMailStore((s) => s.connectOpen);
  const setOpen = useMailStore((s) => s.setConnectOpen);
  const source = useMailStore((s) => s.source);
  const boxes = useMailStore((s) => s.boxes);
  const activeBoxId = useMailStore((s) => s.activeBoxId);
  const applyMailbox = useMailStore((s) => s.applyMailbox);
  const useDemo = useMailStore((s) => s.useDemo);
  const { user, isPending } = useCurrentUserState();
  const googleOAuth = useCalendarStore((s) => s.googleOAuth);
  const [provider, setProvider] = useState<MailProviderId>("gmail");
  const preset = MAIL_PRESETS.find((p) => p.id === provider)!;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [imapHost, setImapHost] = useState(preset.imapHost);
  const [smtpHost, setSmtpHost] = useState(preset.smtpHost);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const taken = new Set(source === "imap" ? boxes.map((b) => b.slot) : []);
  const defaultSlot: MailSlot = taken.has(1) && !taken.has(2) ? 2 : 1;
  const [slot, setSlot] = useState<MailSlot>(defaultSlot);

  useEffect(() => {
    if (user?.primaryEmail && !email) setEmail(user.primaryEmail);
  }, [user?.primaryEmail, email]);

  async function onGoogle() {
    setBusy(true);
    setError(null);
    try {
      const res = await startGoogleOAuth({
        data: { redirectUri: `${window.location.origin}/api/calendar/google` },
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      window.location.href = res.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start Google");
    } finally {
      setBusy(false);
    }
  }

  if (!open) return null;

  function pick(id: MailProviderId) {
    const next = MAIL_PRESETS.find((p) => p.id === id)!;
    setProvider(id);
    setImapHost(next.imapHost);
    setSmtpHost(next.smtpHost);
    setError(null);
  }

  async function onConnect() {
    setBusy(true);
    setError(null);
    try {
      const status = await connectMailbox({
        data: {
          provider,
          email,
          password,
          name: name || undefined,
          slot,
          label: slot === 2 ? "Personal" : "Work",
          imapHost: provider === "imap" ? imapHost : undefined,
          smtpHost: provider === "imap" ? smtpHost : undefined,
        },
      });
      applyMailbox(status);
      setOpen(false);
      setPassword("");
      toast(`Connected ${status.email}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not connect");
    } finally {
      setBusy(false);
    }
  }

  async function onDisconnect() {
    setBusy(true);
    try {
      const status = await disconnectMailbox({ data: { boxId: activeBoxId ?? undefined } });
      if (status.connected) applyMailbox(status);
      else useDemo();
      setOpen(false);
      toast(status.connected ? "Mailbox removed" : "Back on the demo inbox");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not disconnect");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-bg/70 p-0 sm:items-center sm:p-6"
      onClick={() => setOpen(false)}
    >
      <div
        role="dialog"
        aria-label="Connect mailbox"
        className="flex max-h-dvh w-full max-w-lg flex-col overflow-y-auto rounded-none border border-border bg-elevated p-5 shadow-[var(--shadow-float)] sm:max-h-[90vh] sm:rounded-xl scroll-thin"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-medium tracking-tight text-fg">Connect mailbox</h2>
            <p className="mt-1 text-mail text-muted text-pretty">
              Pull a real inbox over IMAP. Two mailboxes — Work and Personal.
              Continue with Google attaches Gmail and Calendar together.
            </p>
          </div>
          <Button size="icon-sm" onClick={() => setOpen(false)} aria-label="Close">
            <X className="size-4" />
          </Button>
        </header>

        {isPending ? (
          <div className="mt-6 h-24 animate-pulse rounded-md bg-surface" />
        ) : !user ? (
          <div className="mt-6 rounded-md border border-border bg-surface px-4 py-4">
            <p className="text-mail text-fg">Sign in first — mailbox credentials stay on your account.</p>
            <Link
              to="/login"
              search={{ connect: true, calendar: undefined }}
              className="mt-3 inline-flex h-10 items-center rounded-md bg-accent px-3 text-sm font-medium text-accent-fg"
            >
              Sign in to connect
            </Link>
          </div>
        ) : (
          <>
            <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {MAIL_PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => pick(p.id)}
                  className={cn(
                    "h-10 rounded-md border text-mail",
                    provider === p.id
                      ? "border-accent bg-select text-fg"
                      : "border-border bg-surface text-muted hover:text-fg",
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <p className="mt-3 text-micro text-subtle text-pretty">{preset.hint}</p>
            {provider === "gmail" && googleOAuth && (
              <Button
                variant="primary"
                size="md"
                className="mt-4 w-full"
                disabled={busy}
                onClick={() => void onGoogle()}
              >
                {busy ? "Opening Google…" : "Gmail and Calendar with Google"}
              </Button>
            )}
            <div className="mt-3 flex gap-2">
              {([1, 2] as MailSlot[]).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setSlot(n)}
                  className={cn(
                    "h-9 flex-1 rounded-md border text-mail",
                    slot === n ? "border-accent bg-select text-fg" : "border-border bg-surface text-muted",
                  )}
                >
                  {n === 1 ? "1 Work" : "2 Personal"}
                </button>
              ))}
            </div>
            {preset.id === "gmail" && (
              <a
                href="https://myaccount.google.com/apppasswords"
                target="_blank"
                rel="noreferrer"
                className="mt-1 text-micro text-unread hover:text-fg"
              >
                Open Google App Passwords
              </a>
            )}

            <label className="mt-4 block">
              <span className="mb-1 block text-micro text-subtle">Email</span>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@gmail.com"
                autoComplete="username"
                className={fieldClass}
              />
            </label>
            <label className="mt-3 block">
              <span className="mb-1 block text-micro text-subtle">App password</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="xxxx xxxx xxxx xxxx"
                autoComplete="current-password"
                className={fieldClass}
              />
            </label>
            <label className="mt-3 block">
              <span className="mb-1 block text-micro text-subtle">From name</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Optional"
                className={fieldClass}
              />
            </label>
            {provider === "imap" && (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label>
                  <span className="mb-1 block text-micro text-subtle">IMAP host</span>
                  <input
                    value={imapHost}
                    onChange={(e) => setImapHost(e.target.value)}
                    placeholder="imap.example.com"
                    className={fieldClass}
                  />
                </label>
                <label>
                  <span className="mb-1 block text-micro text-subtle">SMTP host</span>
                  <input
                    value={smtpHost}
                    onChange={(e) => setSmtpHost(e.target.value)}
                    placeholder="smtp.example.com"
                    className={fieldClass}
                  />
                </label>
              </div>
            )}

            {error && <p className="mt-3 text-mail text-danger">{error}</p>}

            <div className="mt-5 flex flex-wrap items-center gap-2">
              <Button variant="primary" size="md" disabled={busy || !email || !password} onClick={onConnect}>
                {busy ? "Connecting…" : "Connect"}
              </Button>
              {source === "imap" && (
                <Button variant="danger" size="md" disabled={busy} onClick={onDisconnect}>
                  Disconnect
                </Button>
              )}
              <span className="ml-auto text-micro text-subtle">
                Esc <Kbd>Esc</Kbd>
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
