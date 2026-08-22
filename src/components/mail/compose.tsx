import { useEffect, useRef, useState } from "react";
import { Eye, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { draftWithGrok } from "@/lib/mail/ai";
import { SNIPPETS } from "@/lib/mail/snippets";
import { useMailStore } from "@/lib/mail/store";
import { Button } from "@/components/ui/button";
import { Kbd } from "./kbd";
import { cn } from "@/lib/utils";

export function Compose() {
  const compose = useMailStore((s) => s.compose);
  const patch = useMailStore((s) => s.patchCompose);
  const send = useMailStore((s) => s.send);
  const close = useMailStore((s) => s.closeCompose);
  const insertSnippet = useMailStore((s) => s.insertSnippet);
  const toRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const [aiBusy, setAiBusy] = useState(false);

  useEffect(() => {
    if (!compose) return;
    const t = window.setTimeout(() => {
      if (compose.mode === "new" && !compose.to) toRef.current?.focus();
      else bodyRef.current?.focus();
    }, 30);
    return () => window.clearTimeout(t);
  }, [compose?.mode]);

  if (!compose) return null;

  const title =
    compose.mode === "reply"
      ? "Reply"
      : compose.mode === "replyAll"
        ? "Reply all"
        : compose.mode === "forward"
          ? "Forward"
          : "New message";

  async function onAi() {
    if (!compose) return;
    setAiBusy(true);
    try {
      const result = await draftWithGrok({
        data: {
          to: compose.to,
          subject: compose.subject,
          notes: compose.body || "Write a short, direct email matching the subject.",
        },
      });
      if (!result.ok) {
        toast(result.error);
        return;
      }
      patch({ body: result.text });
    } catch {
      toast("Could not draft right now");
    } finally {
      setAiBusy(false);
    }
  }

  async function onSend() {
    const err = await send();
    if (err) toast(err);
    else toast("Sent · U to undo");
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-bg/60 p-0 sm:items-center sm:p-6">
      <div
        role="dialog"
        aria-label={title}
        className="flex max-h-dvh w-full max-w-2xl flex-col rounded-none border border-border bg-elevated shadow-[var(--shadow-float)] sm:max-h-screen sm:rounded-xl"
      >
        <header className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-sm font-medium text-fg">{title}</h2>
          <Button size="icon-sm" onClick={() => close(true)} aria-label="Close">
            <X className="size-4" />
          </Button>
        </header>
        <div className="flex items-center gap-2 border-b border-border px-4">
          <span className="w-10 shrink-0 text-micro text-subtle">To</span>
          <input
            ref={toRef}
            value={compose.to}
            onChange={(e) => patch({ to: e.target.value })}
            placeholder="name@omarchy.dev"
            className="h-10 min-w-0 flex-1 bg-transparent text-mail text-fg outline-none placeholder:text-subtle"
          />
          <button type="button" className="text-micro text-subtle hover:text-fg" onClick={() => patch({ showCc: !compose.showCc })}>Cc</button>
        </div>
        {compose.showCc && (
          <div className="flex items-center gap-2 border-b border-border px-4">
            <span className="w-10 shrink-0 text-micro text-subtle">Cc</span>
            <input value={compose.cc} onChange={(e) => patch({ cc: e.target.value })} className="h-10 min-w-0 flex-1 bg-transparent text-mail text-fg outline-none" />
          </div>
        )}
        <div className="flex items-center gap-2 border-b border-border px-4">
          <span className="w-10 shrink-0 text-micro text-subtle">Subj</span>
          <input value={compose.subject} onChange={(e) => patch({ subject: e.target.value })} placeholder="Subject" className="h-10 min-w-0 flex-1 bg-transparent text-mail text-fg outline-none placeholder:text-subtle" />
        </div>
        <textarea
          ref={bodyRef}
          value={compose.body}
          onChange={(e) => patch({ body: e.target.value })}
          placeholder="Write. ;thanks for snippets. ⌘↵ to send."
          className="min-h-48 flex-1 resize-none bg-transparent px-4 py-3 text-mail leading-relaxed text-fg outline-none placeholder:text-subtle"
        />
        <footer className="flex flex-wrap items-center gap-2 border-t border-border px-3 py-2.5">
          <Button variant="primary" size="sm" onClick={onSend}>Send <Kbd>⌘↵</Kbd></Button>
          <button type="button" onClick={() => patch({ tracking: !compose.tracking })} className={cn("inline-flex h-8 items-center gap-1.5 rounded-sm px-2 text-micro", compose.tracking ? "text-success" : "text-subtle hover:text-muted")}>
            <Eye className="size-3.5" />
            {compose.tracking ? "Tracking on" : "Track opens"}
          </button>
          <button type="button" onClick={() => patch({ remind: !compose.remind })} className={cn("inline-flex h-8 items-center rounded-sm px-2 text-micro", compose.remind ? "text-fg" : "text-subtle hover:text-muted")}>
            {compose.remind ? "Remind if no reply" : "Remind me"}
          </button>
          <Button size="sm" disabled={aiBusy} onClick={onAi}>
            <Sparkles className="size-3.5" />
            {aiBusy ? "Drafting…" : "Write with Grok"}
          </Button>
          <div className="hidden items-center gap-1 md:flex">
            {SNIPPETS.slice(0, 3).map((s) => (
              <button key={s.id} type="button" onClick={() => insertSnippet(s.id)} className="rounded-sm px-1.5 py-1 font-mono text-micro text-subtle hover:text-fg">;{s.trigger}</button>
            ))}
          </div>
          <span className="ml-auto text-micro text-subtle">Esc drafts</span>
        </footer>
      </div>
    </div>
  );
}
