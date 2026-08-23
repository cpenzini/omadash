import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { X } from "lucide-react";
import { toast } from "sonner";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { CAL_PRESETS, CAL_COLORS, nextCalColor, type CalProviderId } from "@/lib/mail/cal-presets";
import {
  connectCalDav,
  connectIcs,
  disconnectCalendar,
  setCalendarColor,
  startGoogleOAuth,
} from "@/lib/mail/calendar-sync";
import { colorDot, useCalendarStore } from "@/lib/mail/calendar";
import { Button } from "@/components/ui/button";
import { Kbd } from "./kbd";
import { cn } from "@/lib/utils";

const fieldClass =
  "h-10 w-full rounded-md border border-border bg-surface px-3 text-mail text-fg outline-none placeholder:text-subtle focus:border-border-strong";

export function ConnectCalendar() {
  const open = useCalendarStore((s) => s.connectOpen);
  const setOpen = useCalendarStore((s) => s.setConnectOpen);
  const applyFeed = useCalendarStore((s) => s.applyFeed);
  const accounts = useCalendarStore((s) => s.accounts);
  const googleOAuth = useCalendarStore((s) => s.googleOAuth);
  const { user, isPending } = useCurrentUserState();
  const [provider, setProvider] = useState<CalProviderId>("google");
  const preset = CAL_PRESETS.find((p) => p.id === provider)!;
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [url, setUrl] = useState("");
  const [label, setLabel] = useState("");
  const [color, setColor] = useState(() => nextCalColor(accounts.map((a) => a.color)));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setColor(nextCalColor(useCalendarStore.getState().accounts.map((a) => a.color)));
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      e.stopPropagation();
      setOpen(false);
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open, setOpen]);

  if (!open) return null;

  async function onConnect() {
    setBusy(true);
    setError(null);
    try {
      if (provider === "ics" || (provider === "google" && url.trim())) {
        const feed = await connectIcs({
          data: { url, label: label || undefined, provider, color },
        });
        applyFeed(feed);
        toast(`Connected ${feed.accounts.at(-1)?.label ?? "calendar"}`);
      } else if (provider === "google") {
        if (!googleOAuth) {
          setError("Paste a secret iCal URL, or deploy with Google Calendar OAuth for two-way sync.");
          return;
        }
        const redirectUri = `${window.location.origin}/api/calendar/google`;
        const res = await startGoogleOAuth({ data: { redirectUri } });
        if (!res.ok) {
          setError(res.error);
          return;
        }
        window.location.href = res.url;
        return;
      } else {
        const feed = await connectCalDav({
          data: {
            provider,
            username,
            password,
            caldavUrl: url || undefined,
            label: label || undefined,
            color,
          },
        });
        applyFeed(feed);
        toast(`Connected ${feed.accounts.at(-1)?.label ?? preset.label}`);
      }
      setOpen(false);
      setPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not connect");
    } finally {
      setBusy(false);
    }
  }

  async function onDisconnect(id: string) {
    setBusy(true);
    try {
      const feed = await disconnectCalendar({ data: { accountId: id } });
      applyFeed(feed);
      toast("Calendar removed");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not disconnect");
    } finally {
      setBusy(false);
    }
  }

  const needsPassword = preset.kind === "caldav";
  const needsUrl =
    provider === "ics" ||
    provider === "nextcloud" ||
    provider === "caldav" ||
    (provider === "google" && !googleOAuth);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-bg/70 p-0 sm:items-center sm:p-6"
      onClick={() => setOpen(false)}
    >
      <div
        role="dialog"
        aria-label="Connect calendar"
        className="flex max-h-dvh w-full max-w-lg flex-col overflow-y-auto rounded-none border border-border bg-elevated p-5 shadow-[var(--shadow-float)] sm:max-h-[90vh] sm:rounded-xl scroll-thin"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-medium tracking-tight text-fg">Connect calendar</h2>
            <p className="mt-1 text-mail text-muted text-pretty">
              CalDAV writes back. Continue with Google attaches Gmail and Calendar.
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
            <p className="text-mail text-fg">Sign in first — calendar credentials stay on your account.</p>
            <Link
              to="/login"
              search={{ connect: undefined, calendar: true }}
              className="mt-3 inline-flex h-10 items-center rounded-md bg-accent px-3 text-sm font-medium text-accent-fg"
            >
              Sign in to connect
            </Link>
          </div>
        ) : (
          <>
            {accounts.length > 0 && (
              <ul className="mt-4 space-y-1 rounded-md border border-border p-1">
                {accounts.map((a) => (
                  <li key={a.id} className="flex items-center gap-2 px-2 py-1.5 text-mail">
                    <button
                      type="button"
                      title="Change color"
                      aria-label={`Color for ${a.label}`}
                      className={cn("size-2.5 shrink-0 rounded-full", colorDot(a.color))}
                      disabled={busy}
                      onClick={() => {
                        const idx = Math.max(0, CAL_COLORS.indexOf(a.color as (typeof CAL_COLORS)[number]));
                        const next = CAL_COLORS[(idx + 1) % CAL_COLORS.length]!;
                        void setCalendarColor({ data: { accountId: a.id, color: next } }).then(applyFeed);
                      }}
                    />
                    <span className="min-w-0 flex-1 truncate text-fg">{a.label}</span>
                    <span className="text-micro text-subtle">{a.provider}</span>
                    <button
                      type="button"
                      className="text-micro text-danger hover:text-fg"
                      disabled={busy}
                      onClick={() => void onDisconnect(a.id)}
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {CAL_PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setProvider(p.id);
                    setUrl(p.caldavUrl);
                    setError(null);
                  }}
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

            {needsUrl && (
              <label className="mt-4 block">
                <span className="mb-1 block text-micro text-subtle">
                  {provider === "ics" || provider === "google" ? "ICS URL" : "CalDAV URL"}
                </span>
                <input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder={
                    provider === "google" || provider === "ics"
                      ? "https://calendar.google.com/calendar/ical/…"
                      : "https://caldav.example.com"
                  }
                  className={fieldClass}
                />
              </label>
            )}

            {needsPassword && (
              <>
                <label className="mt-3 block">
                  <span className="mb-1 block text-micro text-subtle">Email or username</span>
                  <input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
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
                    autoComplete="current-password"
                    className={fieldClass}
                  />
                </label>
              </>
            )}

            <label className="mt-3 block">
              <span className="mb-1 block text-micro text-subtle">Color</span>
              <div className="flex flex-wrap gap-1.5">
                {CAL_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-label={c}
                    aria-pressed={color === c}
                    onClick={() => setColor(c)}
                    className={cn(
                      "flex size-7 items-center justify-center rounded-full border",
                      color === c ? "border-fg" : "border-transparent hover:border-border",
                    )}
                  >
                    <span className={cn("size-3.5 rounded-full", colorDot(c))} />
                  </button>
                ))}
              </div>
            </label>

            <label className="mt-3 block">
              <span className="mb-1 block text-micro text-subtle">Label</span>
              <input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder={preset.label}
                className={fieldClass}
              />
            </label>

            {error && <p className="mt-3 text-mail text-danger">{error}</p>}

            <div className="mt-5 flex flex-wrap items-center gap-2">
              <Button
                variant="primary"
                size="md"
                disabled={busy}
                onClick={() => void onConnect()}
              >
                {busy
                  ? "Connecting…"
                  : provider === "google" && googleOAuth && !url.trim()
                    ? "Gmail and Calendar with Google"
                    : "Connect"}
              </Button>
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
