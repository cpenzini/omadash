import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode, type RefObject } from "react";
import { Clock, Eye, Paperclip, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { draftWithGrok, rewriteDraft } from "@/lib/mail/ai";
import { contactPool, emailsInField, filterContacts, formatAddress, lastToken } from "@/lib/mail/contacts";
import { formatBytes } from "@/lib/mail/format";
import { SNIPPETS } from "@/lib/mail/snippets";
import { useMailStore } from "@/lib/mail/store";
import type { Attachment, Person } from "@/lib/mail/types";
import { Button } from "@/components/ui/button";
import { Kbd } from "./kbd";
import { cn } from "@/lib/utils";

const MAX_FILES = 8;
const MAX_BYTES = 8 * 1024 * 1024;

function fileBytes(file: File) {
  return file.size;
}

function attachBytes(a: Attachment) {
  if (!a.dataUrl) return 0;
  const i = a.dataUrl.indexOf("base64,");
  if (i < 0) return 0;
  return Math.ceil((a.dataUrl.length - i - 7) * 0.75);
}

function readFile(file: File): Promise<Attachment> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      resolve({
        name: file.name,
        size: formatBytes(file.size),
        mime: file.type || "application/octet-stream",
        dataUrl: String(reader.result),
      });
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function Compose() {
  const compose = useMailStore((s) => s.compose);
  const patch = useMailStore((s) => s.patchCompose);
  const send = useMailStore((s) => s.send);
  const close = useMailStore((s) => s.closeCompose);
  const insertSnippet = useMailStore((s) => s.insertSnippet);
  const setSendLaterOpen = useMailStore((s) => s.setSendLaterOpen);
  const threads = useMailStore((s) => s.threads);
  const source = useMailStore((s) => s.source);
  const activeBoxId = useMailStore((s) => s.activeBoxId);
  const me = useMailStore((s) => s.me);
  const toRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [aiBusy, setAiBusy] = useState<"draft" | "shorter" | "warmer" | null>(null);
  const [dragging, setDragging] = useState(false);

  const people = useMemo(
    () => contactPool(threads, source, activeBoxId, me.email),
    [threads, source, activeBoxId, me.email],
  );

  useEffect(() => {
    if (!compose) return;
    const t = window.setTimeout(() => {
      if (compose.mode === "new" && !compose.to) toRef.current?.focus();
      else bodyRef.current?.focus();
    }, 30);
    return () => window.clearTimeout(t);
  }, [compose?.mode]);

  if (!compose) return null;

  const atts = compose.attachments ?? [];
  const title =
    compose.mode === "reply"
      ? "Reply"
      : compose.mode === "replyAll"
        ? "Reply all"
        : compose.mode === "forward"
          ? "Forward"
          : "New message";

  async function addFiles(files: FileList | File[]) {
    const list = [...files];
    if (!list.length) return;
    const current = useMailStore.getState().compose?.attachments ?? [];
    if (current.length + list.length > MAX_FILES) {
      toast(`At most ${MAX_FILES} files`);
      return;
    }
    const used = current.reduce((n, a) => n + attachBytes(a), 0);
    const incoming = list.reduce((n, f) => n + fileBytes(f), 0);
    if (used + incoming > MAX_BYTES) {
      toast("Attachments are too large (8 MB max)");
      return;
    }
    try {
      const next = await Promise.all(list.map(readFile));
      const latest = useMailStore.getState().compose;
      if (!latest) return;
      patch({ attachments: [...(latest.attachments ?? []), ...next] });
    } catch {
      toast("Could not attach that file");
    }
  }

  async function onAi() {
    if (!compose) return;
    setAiBusy("draft");
    try {
      const result = await draftWithGrok({
        data: {
          to: compose.to,
          subject: compose.subject,
          notes: compose.body || "Write a short, direct email matching the subject.",
        },
      });
      if (!result.ok) {
        toast(result.error === "Unauthorized" ? "Sign in to write with Grok" : result.error);
        return;
      }
      patch({ body: result.text });
    } catch {
      toast("Sign in to write with Grok");
    } finally {
      setAiBusy(null);
    }
  }

  async function onRewrite(tone: "shorter" | "warmer") {
    if (!compose?.body.trim()) {
      toast("Write something first");
      return;
    }
    setAiBusy(tone);
    try {
      const result = await rewriteDraft({ data: { body: compose.body, tone } });
      if (!result.ok) {
        toast(result.error === "Unauthorized" ? "Sign in to rewrite with Grok" : result.error);
        return;
      }
      patch({ body: result.text });
    } catch {
      toast("Sign in to rewrite with Grok");
    } finally {
      setAiBusy(null);
    }
  }

  async function onSend() {
    const err = await send();
    if (err) toast(err);
    else toast("Sending · U to undo");
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-bg/60 p-0 sm:items-center sm:p-6">
      <div
        role="dialog"
        aria-label={title}
        onDragOver={(e) => {
          e.preventDefault();
          if ([...e.dataTransfer.types].includes("Files")) setDragging(true);
        }}
        onDragLeave={(e) => {
          if (e.currentTarget.contains(e.relatedTarget as Node)) return;
          setDragging(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          void addFiles(e.dataTransfer.files);
        }}
        className="relative flex max-h-dvh w-full max-w-2xl flex-col rounded-none border border-border bg-elevated shadow-[var(--shadow-float)] sm:max-h-screen sm:rounded-xl"
      >
        {dragging && (
          <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center rounded-[inherit] bg-bg/80">
            <p className="text-sm text-fg">Drop files to attach</p>
          </div>
        )}
        <header className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-sm font-medium text-fg">{title}</h2>
          <Button size="icon-sm" onClick={() => close(true)} aria-label="Close">
            <X className="size-4" />
          </Button>
        </header>

        <AddressField
          label="To"
          value={compose.to}
          onChange={(to) => patch({ to })}
          inputRef={toRef}
          placeholder="name@omarchy.dev"
          people={people}
          trailing={
            <button
              type="button"
              className="text-micro text-subtle hover:text-fg"
              onClick={() => patch({ showCc: !compose.showCc })}
            >
              Cc
            </button>
          }
        />
        {compose.showCc && (
          <AddressField
            label="Cc"
            value={compose.cc}
            onChange={(cc) => patch({ cc })}
            people={people}
          />
        )}
        <div className="flex items-center gap-2 border-b border-border px-4">
          <span className="w-10 shrink-0 text-micro text-subtle">Subj</span>
          <input
            value={compose.subject}
            onChange={(e) => patch({ subject: e.target.value })}
            placeholder="Subject"
            className="h-10 min-w-0 flex-1 bg-transparent text-mail text-fg outline-none placeholder:text-subtle"
          />
        </div>

        <textarea
          ref={bodyRef}
          value={compose.body}
          onChange={(e) => patch({ body: e.target.value })}
          placeholder="Write. ;thanks for snippets. ⌘↵ to send. Drop files to attach."
          className="min-h-48 flex-1 resize-none bg-transparent px-4 py-3 text-mail leading-relaxed text-fg outline-none placeholder:text-subtle"
        />

        {atts.length > 0 && (
          <ul className="flex flex-wrap gap-1.5 border-t border-border px-4 py-2">
            {atts.map((a, i) => (
              <li key={`${a.name}-${i}`}>
                <span className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-surface px-2 text-micro text-fg">
                  <Paperclip className="size-3 text-muted" />
                  <span className="max-w-40 truncate">{a.name}</span>
                  <span className="text-subtle">{a.size}</span>
                  <button
                    type="button"
                    aria-label={`Remove ${a.name}`}
                    className="text-subtle hover:text-fg"
                    onClick={() => patch({ attachments: atts.filter((_, j) => j !== i) })}
                  >
                    <X className="size-3" />
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}

        <footer className="flex flex-wrap items-center gap-2 border-t border-border px-3 py-2.5">
          <Button variant="primary" size="sm" onClick={onSend}>
            Send
            <Kbd>⌘↵</Kbd>
          </Button>
          <Button size="sm" onClick={() => setSendLaterOpen(true)}>
            <Clock className="size-3.5" />
            Later
          </Button>
          <input
            ref={fileRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files) void addFiles(e.target.files);
              e.target.value = "";
            }}
          />
          <Button
            size="sm"
            onClick={() => fileRef.current?.click()}
            aria-label="Attach files"
          >
            <Paperclip className="size-3.5" />
            Attach
          </Button>
          <button
            type="button"
            onClick={() => patch({ tracking: !compose.tracking })}
            className={cn(
              "inline-flex h-8 items-center gap-1.5 rounded-sm px-2 text-micro",
              compose.tracking ? "text-success" : "text-subtle hover:text-muted",
            )}
          >
            <Eye className="size-3.5" />
            {compose.tracking ? "Tracking on" : "Track opens"}
          </button>
          <button
            type="button"
            onClick={() => patch({ remind: !compose.remind })}
            className={cn(
              "inline-flex h-8 items-center rounded-sm px-2 text-micro",
              compose.remind ? "text-fg" : "text-subtle hover:text-muted",
            )}
          >
            {compose.remind ? "Remind if no reply" : "Remind me"}
          </button>
          <Button size="sm" disabled={aiBusy !== null} onClick={onAi}>
            <Sparkles className="size-3.5" />
            {aiBusy === "draft" ? "Drafting…" : "Write with Grok"}
          </Button>
          <Button size="sm" disabled={aiBusy !== null} onClick={() => void onRewrite("shorter")}>
            {aiBusy === "shorter" ? "…" : "Shorter"}
          </Button>
          <Button size="sm" disabled={aiBusy !== null} onClick={() => void onRewrite("warmer")}>
            {aiBusy === "warmer" ? "…" : "Warmer"}
          </Button>
          <div className="hidden items-center gap-1 md:flex">
            {SNIPPETS.slice(0, 3).map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => insertSnippet(s.id)}
                className="rounded-sm px-1.5 py-1 font-mono text-micro text-subtle hover:text-fg"
              >
                ;{s.trigger}
              </button>
            ))}
          </div>
          <span className="ml-auto text-micro text-subtle">Esc drafts</span>
        </footer>
      </div>
    </div>
  );
}

function AddressField({
  label,
  value,
  onChange,
  inputRef,
  placeholder,
  people,
  trailing,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  inputRef?: RefObject<HTMLInputElement | null>;
  placeholder?: string;
  people: Person[];
  trailing?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(0);
  const { head, query } = lastToken(value);
  const hits = filterContacts(people, query, emailsInField(head));
  const show = open && hits.length > 0;

  function accept(p: Person) {
    onChange(`${head}${formatAddress(p)}, `);
    setOpen(false);
    setHi(0);
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (!show) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHi((i) => (i + 1) % hits.length);
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setHi((i) => (i - 1 + hits.length) % hits.length);
      return;
    }
    if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      const pick = hits[hi] ?? hits[0];
      if (pick) accept(pick);
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      setOpen(false);
    }
  }

  return (
    <div className="relative flex items-center gap-2 border-b border-border px-4">
      <span className="w-10 shrink-0 text-micro text-subtle">{label}</span>
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          setHi(0);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 140)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        autoComplete="off"
        className="h-10 min-w-0 flex-1 bg-transparent text-mail text-fg outline-none placeholder:text-subtle"
      />
      {trailing}
      {show && (
        <ul
          role="listbox"
          className="absolute left-12 right-3 top-full z-20 mt-0.5 overflow-hidden rounded-md border border-border bg-elevated py-1 shadow-[var(--shadow-float)]"
        >
          {hits.map((p, i) => (
            <li key={p.email}>
              <button
                type="button"
                role="option"
                aria-selected={i === hi}
                className={cn(
                  "flex h-10 w-full items-center gap-2 px-3 text-left text-mail",
                  i === hi ? "bg-select text-fg" : "text-muted hover:bg-select hover:text-fg",
                )}
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setHi(i)}
                onClick={() => accept(p)}
              >
                <span className="truncate text-fg">{p.name}</span>
                <span className="truncate text-micro text-subtle">{p.email}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
