import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Archive,
  ArrowLeft,
  BellOff,
  CalendarPlus,
  Clock,
  CornerUpLeft,
  Eye,
  Forward,
  ImageOff,
  Paperclip,
  Reply,
  Sparkles,
  Star,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { formatFullTime, formatPeople, formatReceiptTime, minutesBetween } from "@/lib/mail/format";
import { emailHasRemoteImages, prepareEmailHtml } from "@/lib/mail/html";
import { getAttachment } from "@/lib/mail/mailbox";
import { useMailStore } from "@/lib/mail/store";
import { usePrefsStore } from "@/lib/mail/prefs";
import { formatHit, parseThreadDates } from "@/lib/mail/dates";
import type { Attachment, Message } from "@/lib/mail/types";
import { Button } from "@/components/ui/button";
import { Avatar } from "./avatar";
import { cn } from "@/lib/utils";

export function ReadingPane() {
  const selectedId = useMailStore((s) => s.selectedId);
  const thread = useMailStore((s) => s.threads.find((t) => t.id === s.selectedId));
  const done = useMailStore((s) => s.done);
  const trash = useMailStore((s) => s.trash);
  const toggleStar = useMailStore((s) => s.toggleStar);
  const mute = useMailStore((s) => s.mute);
  const reply = useMailStore((s) => s.reply);
  const forward = useMailStore((s) => s.forward);
  const setSnoozeOpen = useMailStore((s) => s.setSnoozeOpen);
  const summarize = useMailStore((s) => s.summarize);
  const summary = useMailStore((s) => (s.selectedId ? s.summaryById[s.selectedId] : undefined));
  const summarizing = useMailStore((s) => s.summarizingId === s.selectedId);
  const me = useMailStore((s) => s.me);
  const setMobilePane = useMailStore((s) => s.setMobilePane);
  const source = useMailStore((s) => s.source);
  const setConnectOpen = useMailStore((s) => s.setConnectOpen);
  const layout = usePrefsStore((s) => s.layout);
  const showBack = layout === "two";
  const setFileEventOpen = useMailStore((s) => s.setFileEventOpen);
  const dateHits = useMemo(() => (thread ? parseThreadDates(thread) : []), [thread]);

  if (!thread || !selectedId) {
    return (
      <section className="flex h-full min-w-0 flex-1 flex-col items-center justify-center bg-bg">
        {source !== "imap" ? (
          <>
            <p className="text-sm text-fg">Connect a mailbox</p>
            <p className="mt-1 max-w-xs text-center text-mail text-subtle text-pretty">
              Mail stays empty until you add Gmail, Fastmail, iCloud, or IMAP.
            </p>
            <button
              type="button"
              onClick={() => setConnectOpen(true)}
              className="mt-4 inline-flex h-9 items-center rounded-md bg-accent px-3 text-sm font-medium text-accent-fg"
            >
              Connect mailbox
            </button>
          </>
        ) : (
          <>
            <p className="text-sm text-subtle">Select a thread</p>
            <p className="mt-1 text-mail text-subtle">J / K to move · Enter to open</p>
          </>
        )}
      </section>
    );
  }

  return (
    <section className="flex h-full min-w-0 flex-1 flex-col bg-bg">
      <header className="flex shrink-0 items-center gap-1 border-b border-border px-2 py-1.5 lg:px-3">
        <Button
          size="icon-sm"
          className={showBack ? undefined : "lg:hidden"}
          onClick={() => setMobilePane("list")}
          aria-label="Back to list"
        >
          <ArrowLeft className="size-4" />
        </Button>
        <div className="min-w-0 flex-1 px-1">
          <h2 className="truncate text-sm font-medium tracking-tight text-fg text-balance">
            {thread.subject}
          </h2>
          {thread.labels.length > 0 && (
            <div className="mt-0.5 flex flex-wrap gap-1">
              {thread.labels.map((l) => (
                <span key={l} className="rounded-sm bg-elevated px-1.5 py-0.5 text-micro text-muted">
                  {l}
                </span>
              ))}
            </div>
          )}
        </div>
        <Button size="icon-sm" onClick={() => setFileEventOpen(true)} aria-label="File on calendar">
          <CalendarPlus className="size-4" />
        </Button>
        <Button size="icon-sm" onClick={() => void summarize()} aria-label="Summarize">
          <Sparkles className={cn("size-4", summarizing && "text-unread")} />
        </Button>
        <Button size="icon-sm" onClick={() => toggleStar()} aria-label="Star">
          <Star className={cn("size-4", thread.starred && "fill-warn text-warn")} />
        </Button>
        <Button size="icon-sm" onClick={() => mute()} aria-label="Mute">
          <BellOff className={cn("size-4", thread.muted && "text-warn")} />
        </Button>
        <Button size="icon-sm" onClick={() => setSnoozeOpen(true)} aria-label="Snooze">
          <Clock className="size-4" />
        </Button>
        <Button size="icon-sm" onClick={() => done()} aria-label="Done">
          <Archive className="size-4" />
        </Button>
        <Button size="icon-sm" onClick={() => trash()} aria-label="Trash">
          <Trash2 className="size-4" />
        </Button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto scroll-thin">
        <div className="w-full min-w-0 px-4 py-5 lg:px-8">
          {dateHits.length > 0 && (
            <div className="mb-4 flex flex-wrap items-center gap-1.5">
              {dateHits.slice(0, 3).map((hit) => (
                <button
                  key={`${hit.start.toISOString()}-${hit.text}`}
                  type="button"
                  onClick={() =>
                    setFileEventOpen(true, {
                      start: hit.start.toISOString(),
                      end: hit.end.toISOString(),
                      text: hit.text,
                    })
                  }
                  className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-surface px-2 text-micro text-muted hover:text-fg"
                >
                  <CalendarPlus className="size-3" />
                  {formatHit(hit)}
                </button>
              ))}
              <span className="text-micro text-subtle">N</span>
            </div>
          )}
          {(summarizing || summary) && (
            <div className="mb-6 rounded-md border border-border bg-surface px-3 py-3">
              <p className="mb-1.5 text-micro font-medium uppercase tracking-wider text-subtle">
                {summarizing ? "Summarizing" : "Thread notes"}
                <span className="ml-2 font-mono normal-case tracking-normal">Y</span>
              </p>
              <p className="whitespace-pre-wrap text-mail leading-relaxed text-fg">
                {summarizing ? "Reading the thread…" : summary}
              </p>
            </div>
          )}

          {thread.muted && (
            <p className="mb-4 flex items-center gap-1.5 text-micro text-subtle">
              <BellOff className="size-3" />
              Muted — new mail won’t bump unread.
            </p>
          )}
          {thread.followUpUntil && (
            <p className="mb-4 text-micro text-muted">
              Follow-up armed · bounces back if they don’t reply.
            </p>
          )}
          {thread.sendAt && (
            <p className="mb-4 text-micro text-muted">
              Scheduled · {formatFullTime(thread.sendAt)}
            </p>
          )}

          {thread.messages.map((m, i) => (
            <article key={m.id} className={cn(i > 0 && "mt-6 border-t border-border pt-6")}>
              <div className="flex gap-3">
                <Avatar name={m.from.name} email={m.from.email} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                    <span className="font-medium text-mail text-fg">{m.from.name}</span>
                    <span className="text-micro text-subtle">{m.from.email}</span>
                    <span className="ml-auto tabular-nums text-micro text-subtle" suppressHydrationWarning>
                      {formatFullTime(m.date)}
                    </span>
                  </div>
                  <div className="text-micro text-subtle">
                    To {formatPeople(m.to)}
                    {m.cc.length > 0 && ` · Cc ${formatPeople(m.cc)}`}
                  </div>
                </div>
              </div>

              {m.tracking && m.from.email === me.email && (
                <ReceiptCard sentAt={m.date} opens={m.opens} />
              )}
              {m.receiptRequested && m.from.email !== me.email && (
                <p className="mt-3 flex items-center gap-1.5 text-micro text-subtle">
                  <Eye className="size-3" />
                  They asked for a read receipt — sent when you opened this.
                </p>
              )}

              <MessageBody message={m} />

              {m.attachments.length > 0 && (
                <AttachmentList message={m} />
              )}
            </article>
          ))}

          <div className="mt-8 flex flex-wrap gap-2 pb-10">
            <Button variant="outline" size="sm" onClick={() => reply(false)}>
              <Reply className="size-3.5" />
              Reply
              <span className="font-mono text-micro text-subtle">R</span>
            </Button>
            <Button variant="outline" size="sm" onClick={() => reply(true)}>
              <CornerUpLeft className="size-3.5" />
              Reply all
            </Button>
            <Button variant="outline" size="sm" onClick={() => forward()}>
              <Forward className="size-3.5" />
              Forward
              <span className="font-mono text-micro text-subtle">F</span>
            </Button>
            <Button variant="outline" size="sm" onClick={() => void summarize()}>
              <Sparkles className="size-3.5" />
              Summarize
              <span className="font-mono text-micro text-subtle">Y</span>
            </Button>
            <Button variant="outline" size="sm" onClick={() => done()}>
              <Archive className="size-3.5" />
              Done
              <span className="font-mono text-micro text-subtle">E</span>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

function ReceiptCard({
  sentAt,
  opens,
}: {
  sentAt: string;
  opens: { at: string; city: string; device: string }[];
}) {
  const [open, setOpen] = useState(opens.length > 0);
  return (
    <div className="mt-4 rounded-md border border-border bg-surface px-3 py-2.5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 text-left text-mail"
      >
        <Eye className={cn("size-3.5", opens.length ? "text-success" : "text-muted")} />
        <span className="text-fg">
          {opens.length === 0
            ? "Tracking · Not opened yet"
            : opens.length === 1
              ? `Opened · ${formatReceiptTime(opens[0]!.at)}`
              : `Opened ${opens.length} times`}
        </span>
        {opens.length > 0 && (
          <span className="text-micro text-subtle">
            first open {Math.max(1, minutesBetween(sentAt, opens[0]!.at))}m after send
          </span>
        )}
      </button>
      {open && opens.length > 0 && (
        <ul className="mt-2 space-y-1 border-t border-border pt-2">
          {opens.map((o) => (
            <li key={o.at} className="flex justify-between text-micro text-muted">
              <span>
                {o.city} · {o.device}
              </span>
              <span className="tabular-nums text-subtle">{formatReceiptTime(o.at)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function MessageBody({ message }: { message: Message }) {
  const html = message.html;
  if (html && typeof document !== "undefined") {
    return <HtmlBody html={html} fallback={message.body} />;
  }
  return <TextBody text={message.body} />;
}

function HtmlBody({ html, fallback }: { html: string; fallback: string }) {
  const showRemoteDefault = usePrefsStore((s) => s.showRemoteImages);
  const [showImages, setShowImages] = useState(showRemoteDefault);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const remote = emailHasRemoteImages(html);
  const fg = typeof document !== "undefined"
    ? getComputedStyle(document.documentElement).getPropertyValue("--c-fg").trim() || "#eeeff2"
    : "#eeeff2";
  const bg = typeof document !== "undefined"
    ? getComputedStyle(document.documentElement).getPropertyValue("--c-bg").trim() || "#0b0c0e"
    : "#0b0c0e";
  const srcDoc = useMemo(
    () => prepareEmailHtml(html, { showImages, fg, bg }),
    [html, showImages, fg, bg],
  );

  const fit = useCallback(() => {
    const iframe = frameRef.current;
    const doc = iframe?.contentDocument;
    if (!iframe || !doc?.body) return;
    const h = Math.max(160, Math.min(Math.max(doc.body.scrollHeight, doc.documentElement.scrollHeight) + 8, 8000));
    if (Math.abs((parseFloat(iframe.style.height) || 0) - h) < 2) return;
    iframe.style.height = `${h}px`;
  }, []);

  useEffect(() => {
    const iframe = frameRef.current;
    const wrap = wrapRef.current;
    if (!iframe) return;
    iframe.addEventListener("load", fit);
    window.addEventListener("resize", fit);
    const ro = wrap ? new ResizeObserver(fit) : null;
    if (wrap && ro) ro.observe(wrap);
    fit();
    const t = window.setTimeout(fit, 50);
    return () => {
      iframe.removeEventListener("load", fit);
      window.removeEventListener("resize", fit);
      ro?.disconnect();
      window.clearTimeout(t);
    };
  }, [srcDoc, fit]);

  if (!srcDoc) return <TextBody text={fallback} />;

  return (
    <div ref={wrapRef} className="mt-4 min-w-0">
      {remote && !showImages && (
        <button
          type="button"
          onClick={() => setShowImages(true)}
          className="mb-3 inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-2.5 py-1.5 text-micro text-muted hover:text-fg"
        >
          <ImageOff className="size-3.5" />
          Show images · tracking pixels stay blocked
        </button>
      )}
      <iframe
        ref={frameRef}
        title="Message"
        sandbox="allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation allow-same-origin"
        srcDoc={srcDoc}
        className="block w-full min-w-0 rounded-md border border-border bg-bg"
        style={{ minHeight: 160, height: 160 }}
      />
    </div>
  );
}

function TextBody({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <div className="mt-4 space-y-0 text-mail leading-relaxed text-fg text-pretty">
      {lines.map((line, i) => {
        const quoted = line.startsWith(">");
        const content = quoted ? line.replace(/^>\s?/, "") : line;
        if (content === "" && !quoted) return <div key={i} className="h-3" />;
        return (
          <p key={i} className={cn(quoted && "border-l-2 border-border pl-3 text-muted")}>
            {content || "\u00A0"}
          </p>
        );
      })}
    </div>
  );
}

function AttachmentList({ message }: { message: Message }) {
  const source = useMailStore((s) => s.source);
  const activeBoxId = useMailStore((s) => s.activeBoxId);
  const [busy, setBusy] = useState<string | null>(null);

  async function open(att: Attachment) {
    if (att.dataUrl) {
      const a = document.createElement("a");
      a.href = att.dataUrl;
      a.download = att.name;
      a.click();
      return;
    }
    if (source !== "imap" || !message.imapMailbox || !message.imapUid) {
      toast("This attachment isn't available in the demo");
      return;
    }
    setBusy(att.name);
    try {
      const res = await getAttachment({
        data: {
          boxId: activeBoxId ?? undefined,
          mailbox: message.imapMailbox,
          uid: message.imapUid,
          filename: att.name,
        },
      });
      if (!res.ok) {
        toast(res.error);
        return;
      }
      const bin = Uint8Array.from(atob(res.base64), (c) => c.charCodeAt(0));
      const url = URL.createObjectURL(new Blob([bin], { type: res.mime }));
      const a = document.createElement("a");
      a.href = url;
      a.download = res.filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not open attachment");
    } finally {
      setBusy(null);
    }
  }

  return (
    <ul className="mt-4 flex flex-wrap gap-2">
      {message.attachments.map((a) => (
        <li key={a.name}>
          <button
            type="button"
            onClick={() => void open(a)}
            className="flex items-center gap-2 rounded-md border border-border bg-surface px-2.5 py-2 text-left text-mail hover:bg-elevated"
          >
            <Paperclip className="size-3.5 text-muted" />
            <span className="text-fg">{busy === a.name ? "Opening…" : a.name}</span>
            <span className="text-micro text-subtle">{a.size}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
