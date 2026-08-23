import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { APP_NAME } from "@/lib/app";
import { GROK_PROVIDERS, authEnabled, signIn } from "@/lib/auth/client";

export const Route = createFileRoute("/login")({
  validateSearch: (raw: Record<string, unknown>) => ({
    connect: raw.connect === "1" || raw.connect === true ? true : undefined,
    calendar: raw.calendar === "1" || raw.calendar === true ? true : undefined,
  }),
  component: Login,
});

function Login() {
  const { connect, calendar } = Route.useSearch();
  const afterX = calendar ? "/?calendar=1" : connect ? "/?connect=1" : "/";
  const afterGoogle = calendar ? "/?calendar=1&google=1" : connect ? "/?connect=1&google=1" : "/?google=1";
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  return (
    <main className="grid min-h-dvh place-items-center bg-bg px-5 text-fg">
      <div className="w-full max-w-sm">
        <p className="text-micro font-medium uppercase tracking-wider text-subtle">{APP_NAME}</p>
        <h1 className="mt-1 text-2xl font-medium tracking-tight">
          {calendar ? "Sign in to connect a calendar" : connect ? "Sign in to connect mail" : "Sign in"}
        </h1>
        <p className="mt-2 text-mail text-muted text-pretty">
          Continue with Google signs you into {APP_NAME}, then asks Google for Gmail and Calendar.
          X only signs you in — attach mail and calendar after.
        </p>

        {err ? <p className="mt-4 text-mail text-danger">{err}</p> : null}

        {authEnabled ? (
          <div className="mt-6 space-y-2">
            {GROK_PROVIDERS.map((p) => (
              <button
                key={p.providerId}
                type="button"
                disabled={busy !== null}
                onClick={() => {
                  setErr(null);
                  setBusy(p.providerId);
                  void signIn(p.providerId, {
                    callbackURL: p.idp === "google" ? afterGoogle : afterX,
                  }).catch((e: unknown) => {
                    const raw = e instanceof Error ? e.message : "";
                    setErr(
                      /state_mismatch|cancelled or failed/i.test(raw)
                        ? "Google sign-in was interrupted. Allow pop-ups and try again."
                        : raw || "Sign-in failed. Try again.",
                    );
                    setBusy(null);
                  });
                }}
                className={
                  p.idp === "google"
                    ? "flex h-11 w-full items-center justify-center rounded-md bg-accent text-sm font-medium text-accent-fg hover:opacity-90 disabled:opacity-60"
                    : "flex h-11 w-full items-center justify-center rounded-md border border-border bg-surface text-sm font-medium text-fg hover:bg-elevated disabled:opacity-60"
                }
              >
                {busy === p.providerId ? "Opening Google…" : `Continue with ${p.label}`}
              </button>
            ))}
          </div>
        ) : (
          <p className="mt-6 text-mail text-subtle">Sign-in is disabled.</p>
        )}

        <p className="mt-6 text-micro text-subtle">
          <Link
            to="/"
            search={{
              connect: undefined,
              compose: undefined,
              omarchy: undefined,
              calendar: undefined,
              google: undefined,
              linked: undefined,
              linkerr: undefined,
              to: undefined,
            }}
            className="hover:text-fg"
          >
            Back to Omadash
          </Link>
        </p>
      </div>
    </main>
  );
}
