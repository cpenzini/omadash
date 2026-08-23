import { useEffect, useRef, useState } from "react";
import { Inbox, Keyboard, Menu, PenSquare, Search, Star } from "lucide-react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { Toaster, toast } from "sonner";
import { APP_NAME } from "@/lib/app";
import { handleHotkey } from "@/lib/mail/hotkeys";
import { getMailbox, syncMailbox } from "@/lib/mail/mailbox";
import { getCalendars, startGoogleOAuth } from "@/lib/mail/calendar-sync";
import { useCalendarStore } from "@/lib/mail/calendar";
import { notifyNewMail } from "@/lib/mail/notify";
import { useRulesStore } from "@/lib/mail/rules";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { useMailStore } from "@/lib/mail/store";
import { Button } from "@/components/ui/button";
import { CommandPalette } from "./command-palette";
import { Compose } from "./compose";
import { ConnectMailbox } from "./connect-mailbox";
import { ConnectCalendar } from "./connect-calendar";
import { CalendarPanel } from "./calendar-panel";
import { LabelPicker } from "./label-picker";
import { RulesPanel } from "./rules-panel";
import { Onboarding } from "./onboarding";
import { ReadingPane } from "./reading-pane";
import { SendLater } from "./send-later";
import { ShortcutSheet } from "./shortcut-sheet";
import { Sidebar } from "./sidebar";
import { SnoozePicker } from "./snooze-picker";
import { StatusBar } from "./status-bar";
import { ThemePicker } from "./theme-picker";
import { OmarchyInstall } from "./omarchy-install";
import { ThreadList } from "./thread-list";
import { cn } from "@/lib/utils";
import { isLightTheme, useThemeStore } from "@/lib/theme";

const HOME_SEARCH = {
  connect: undefined,
  compose: undefined,
  omarchy: undefined,
  calendar: undefined,
  google: undefined,
  linked: undefined,
  linkerr: undefined,
  to: undefined,
} as const;

export function MailApp() {
  const hydrate = useMailStore((s) => s.hydrate);
  const hydrated = useMailStore((s) => s.hydrated);
  const restoreSnoozes = useMailStore((s) => s.restoreSnoozes);
  const restoreFollowUps = useMailStore((s) => s.restoreFollowUps);
  const restoreScheduled = useMailStore((s) => s.restoreScheduled);
  const mobilePane = useMailStore((s) => s.mobilePane);
  const openCompose = useMailStore((s) => s.openCompose);
  const setCommandOpen = useMailStore((s) => s.setCommandOpen);
  const setShortcutsOpen = useMailStore((s) => s.setShortcutsOpen);
  const setSplit = useMailStore((s) => s.setSplit);
  const setFolder = useMailStore((s) => s.setFolder);
  const setMobilePane = useMailStore((s) => s.setMobilePane);
  const setConnectOpen = useMailStore((s) => s.setConnectOpen);
  const setOmarchyOpen = useMailStore((s) => s.setOmarchyOpen);
  const setCalendarOpen = useMailStore((s) => s.setCalendarOpen);
  const applyMailbox = useMailStore((s) => s.applyMailbox);
  const useDemo = useMailStore((s) => s.useDemo);
  const setSyncing = useMailStore((s) => s.setSyncing);
  const activeBoxId = useMailStore((s) => s.activeBoxId);
  const source = useMailStore((s) => s.source);
  const me = useMailStore((s) => s.me);
  const applyCalFeed = useCalendarStore((s) => s.applyFeed);
  const clearCalRemote = useCalendarStore((s) => s.clearRemote);
  const resolvedTheme = useThemeStore((s) => s.resolved);
  const { user, isPending } = useCurrentUserState();
  const search = useSearch({ from: "/" });
  const navigate = useNavigate();
  const [navOpen, setNavOpen] = useState(false);
  const lastOpens = useRef<Map<string, number>>(new Map());
  const googleLinkStarted = useRef(false);

  useEffect(() => {
    hydrate();
    useRulesStore.getState().hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (search.connect) {
      setConnectOpen(true);
      void navigate({
        to: "/",
        search: { ...HOME_SEARCH, google: search.google, linked: search.linked, linkerr: search.linkerr },
        replace: true,
      });
    }
    if (search.omarchy) {
      setOmarchyOpen(true);
      void navigate({ to: "/", search: HOME_SEARCH, replace: true });
    }
    if (search.compose) {
      openCompose(search.to ? { to: search.to } : undefined);
      void navigate({ to: "/", search: HOME_SEARCH, replace: true });
    }
    if (search.calendar) {
      setCalendarOpen(true);
      void navigate({
        to: "/",
        search: { ...HOME_SEARCH, google: search.google, linked: search.linked, linkerr: search.linkerr },
        replace: true,
      });
    }
    if (search.linked) {
      toast("Gmail and Calendar connected");
      void navigate({ to: "/", search: HOME_SEARCH, replace: true });
    }
    if (search.linkerr) {
      toast("Google didn’t attach Gmail and Calendar. Try Connect again.");
      void navigate({ to: "/", search: HOME_SEARCH, replace: true });
    }
  }, [
    search.connect,
    search.omarchy,
    search.compose,
    search.calendar,
    search.google,
    search.linked,
    search.linkerr,
    search.to,
    setConnectOpen,
    setOmarchyOpen,
    setCalendarOpen,
    openCompose,
    navigate,
  ]);

  useEffect(() => {
    if (isPending || !user || !search.google || googleLinkStarted.current) return;
    googleLinkStarted.current = true;
    void navigate({
      to: "/",
      search: { ...HOME_SEARCH, connect: search.connect, calendar: search.calendar },
      replace: true,
    });
    void (async () => {
      try {
        const [mail, cal] = await Promise.all([getMailbox({ data: {} }), getCalendars()]);
        if (mail.connected) applyMailbox(mail);
        applyCalFeed(cal);
        const hasGmail = mail.boxes.some((b) => b.provider === "gmail");
        const hasCal = cal.accounts.some((a) => a.provider === "google" && !a.readOnly);
        if (hasGmail && hasCal) {
          toast("Gmail and Calendar are already connected");
          return;
        }
        if (!cal.googleOAuth) {
          setConnectOpen(true);
          toast("This host can’t finish Google mail yet. Connect Gmail with an app password.");
          return;
        }
        const res = await startGoogleOAuth({
          data: { redirectUri: `${window.location.origin}/api/calendar/google` },
        });
        if (!res.ok) {
          setConnectOpen(true);
          toast(res.error);
          return;
        }
        window.location.href = res.url;
      } catch {
        setConnectOpen(true);
        toast("Could not start Google mail. Connect with an app password.");
      }
    })();
  }, [isPending, user?.id, search.google, applyMailbox, applyCalFeed, setConnectOpen, navigate]);

  useEffect(() => {
    if (isPending) return;
    if (!user) {
      if (useMailStore.getState().source === "imap") useDemo();
      clearCalRemote();
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const boxId = useMailStore.getState().activeBoxId?.startsWith("demo")
          ? undefined
          : useMailStore.getState().activeBoxId ?? undefined;
        const status = await getMailbox({ data: { boxId } });
        if (cancelled) return;
        if (status.connected) {
          applyMailbox(status);
          setSyncing(true);
          const fresh = await syncMailbox({ data: { boxId: status.activeId ?? undefined } });
          if (!cancelled) {
            const prev = useMailStore.getState().threads;
            applyMailbox(fresh);
            notifyNewMail(prev, fresh.threads);
            if (fresh.lastError) toast(fresh.lastError);
          }
        }
      } catch {
        /* signed out or network — stay on demo */
      } finally {
        if (!cancelled) setSyncing(false);
      }
    })();
    void getCalendars()
      .then((feed) => {
        if (!cancelled) applyCalFeed(feed);
      })
      .catch(() => {
        /* no calendars yet */
      });
    return () => {
      cancelled = true;
    };
  }, [isPending, user?.id, applyMailbox, useDemo, setSyncing, applyCalFeed, clearCalRemote]);

  useEffect(() => {
    if (!hydrated) return;
    restoreSnoozes();
    const bounced = restoreFollowUps();
    if (!useMailStore.getState().onboarding) {
      for (const name of bounced) toast(`${name} has not replied · bounced back`);
    }
    const sent = restoreScheduled();
    if (sent && !useMailStore.getState().onboarding) {
      toast(sent === 1 ? "Scheduled message sent" : `${sent} scheduled messages sent`);
    }
    const id = window.setInterval(() => {
      restoreSnoozes();
      const more = useMailStore.getState().restoreFollowUps();
      for (const name of more) toast(`${name} has not replied · bounced back`);
      const n = useMailStore.getState().restoreScheduled();
      if (n) toast(n === 1 ? "Scheduled message sent" : `${n} scheduled messages sent`);
    }, 30_000);
    return () => window.clearInterval(id);
  }, [hydrated, restoreSnoozes, restoreFollowUps, restoreScheduled]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const store = useMailStore.getState();
      const handled = handleHotkey(e, store, (msg) => toast(msg));
      if (handled) e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const init = new Map<string, number>();
    for (const t of useMailStore.getState().threads) {
      for (const m of t.messages) init.set(m.id, m.opens.length);
    }
    lastOpens.current = init;
    return useMailStore.subscribe((s) => {
      for (const t of s.threads) {
        for (const m of t.messages) {
          if (!m.tracking || m.from.email !== me.email) continue;
          const prev = lastOpens.current.get(m.id) ?? m.opens.length;
          if (m.opens.length > prev) {
            const last = m.opens[m.opens.length - 1]!;
            toast(`${last.city} opened your email`);
          }
          lastOpens.current.set(m.id, m.opens.length);
        }
      }
    });
  }, [hydrated, me.email]);

  useEffect(() => {
    if (source !== "imap" || !user || !activeBoxId || activeBoxId.startsWith("demo")) return;
    let cancelled = false;
    void getMailbox({ data: { boxId: activeBoxId } }).then((status) => {
      if (cancelled || !status.connected) return;
      if (status.activeId === activeBoxId) applyMailbox(status);
    });
    return () => {
      cancelled = true;
    };
  }, [source, user?.id, activeBoxId, applyMailbox]);

  useEffect(() => {
    if (source !== "imap" || !user) return;
    const tick = window.setInterval(() => {
      const boxId = useMailStore.getState().activeBoxId ?? undefined;
      void syncMailbox({ data: { boxId } }).then((fresh) => {
        if (!fresh.connected) return;
        const prev = useMailStore.getState().threads;
        applyMailbox(fresh);
        notifyNewMail(prev, fresh.threads);
      });
    }, 90_000);
    return () => window.clearInterval(tick);
  }, [source, user?.id, applyMailbox]);

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-bg text-fg">
      <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-2 md:hidden">
        <Button size="icon-sm" onClick={() => setNavOpen(true)} aria-label="Menu">
          <Menu className="size-4" />
        </Button>
        <span className="flex-1 text-sm font-medium tracking-tight">{APP_NAME}</span>
        <Button size="icon-sm" onClick={() => setCommandOpen(true)} aria-label="Search">
          <Search className="size-4" />
        </Button>
        <Button size="icon-sm" onClick={() => setShortcutsOpen(true)} aria-label="Keyboard shortcuts">
          <Keyboard className="size-4" />
        </Button>
        <Button size="icon-sm" onClick={() => openCompose()} aria-label="Compose">
          <PenSquare className="size-4" />
        </Button>
      </header>

      <div className="flex min-h-0 flex-1">
        <div className="hidden md:flex">
          <Sidebar />
        </div>
        {navOpen && (
          <div className="fixed inset-0 z-30 flex md:hidden">
            <div className="h-full">
              <Sidebar onNavigate={() => setNavOpen(false)} />
            </div>
            <button
              type="button"
              className="flex-1 bg-bg/60"
              aria-label="Close menu"
              onClick={() => setNavOpen(false)}
            />
          </div>
        )}

        <div className={cn("min-w-0 flex-1", mobilePane === "read" ? "hidden lg:flex" : "flex")}>
          <ThreadList />
        </div>
        <div className={cn("min-w-0 flex-1", mobilePane === "list" ? "hidden lg:flex" : "flex")}>
          <ReadingPane />
        </div>
      </div>

      <nav className="flex h-14 shrink-0 items-center justify-around border-t border-border bg-panel md:hidden">
        <button
          type="button"
          className="flex h-11 w-16 flex-col items-center justify-center gap-0.5 text-micro text-muted"
          onClick={() => {
            setSplit("focused");
            setMobilePane("list");
          }}
        >
          <Inbox className="size-4" />
          Inbox
        </button>
        <button
          type="button"
          className="flex h-11 w-16 flex-col items-center justify-center gap-0.5 text-micro text-muted"
          onClick={() => {
            setFolder("starred");
            setMobilePane("list");
          }}
        >
          <Star className="size-4" />
          Starred
        </button>
        <button
          type="button"
          className="flex h-11 w-16 flex-col items-center justify-center gap-0.5 text-micro text-muted"
          onClick={() => openCompose()}
        >
          <PenSquare className="size-4" />
          Write
        </button>
        <button
          type="button"
          className="flex h-11 w-16 flex-col items-center justify-center gap-0.5 text-micro text-muted"
          onClick={() => setCommandOpen(true)}
        >
          <Search className="size-4" />
          Search
        </button>
      </nav>

      <StatusBar />
      <Compose />
      <CommandPalette />
      <ShortcutSheet />
      <SnoozePicker />
      <SendLater />
      <CalendarPanel />
      <ConnectCalendar />
      <LabelPicker />
      <RulesPanel />
      <Onboarding />
      <ConnectMailbox />
      <ThemePicker />
      <OmarchyInstall />
      <Toaster
        theme={isLightTheme(resolvedTheme) ? "light" : "dark"}
        position="bottom-center"
        offset={48}
        className="omadash-toaster"
      />
    </div>
  );
}
