import { APP_NAME, APP_TAGLINE, APP_VERSION } from "@/lib/app";
import { useMailStore } from "@/lib/mail/store";
import { useCalendarStore } from "@/lib/mail/calendar";
import { Button } from "@/components/ui/button";

export function Onboarding() {
  const open = useMailStore((s) => s.onboarding);
  const dismiss = useMailStore((s) => s.dismissOnboarding);
  const setConnectOpen = useMailStore((s) => s.setConnectOpen);
  const setCalendarOpen = useMailStore((s) => s.setCalendarOpen);
  const setCalConnect = useCalendarStore((s) => s.setConnectOpen);
  if (!open) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-16 z-30 flex justify-center p-4 md:bottom-10 md:left-56 md:right-0 md:justify-start md:p-6">
      <div className="pointer-events-auto w-full max-w-sm rounded-xl border border-border bg-elevated p-5 shadow-[var(--shadow-float)]">
        <p className="text-micro font-medium uppercase tracking-wider text-subtle">
          {APP_VERSION} · Empty until you connect
        </p>
        <h2 className="mt-1 text-lg font-medium tracking-tight text-fg">{APP_NAME}</h2>
        <p className="mt-1 text-mail text-muted text-pretty">
          {APP_TAGLINE} Like Mail and Calendar on a phone: no messages, no events, until an account is yours.
        </p>
        <div className="mt-4 flex flex-col gap-2">
          <Button
            variant="primary"
            className="w-full"
            onClick={() => {
              dismiss();
              setConnectOpen(true);
            }}
          >
            Connect mailbox
          </Button>
          <Button
            className="w-full"
            onClick={() => {
              dismiss();
              setCalendarOpen(true);
              setCalConnect(true);
            }}
          >
            Connect calendar
          </Button>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <p className="text-micro text-subtle">1 / 2 mailboxes · 3 calendar</p>
          <button type="button" className="text-micro text-subtle hover:text-fg" onClick={dismiss}>
            Skip
          </button>
        </div>
      </div>
    </div>
  );
}
