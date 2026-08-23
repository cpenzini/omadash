import { useState } from "react";
import { X } from "lucide-react";
import { ruleLabel, useRulesStore, type RuleMatch } from "@/lib/mail/rules";
import type { Split } from "@/lib/mail/types";
import { useMailStore } from "@/lib/mail/store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Kbd } from "./kbd";

const MATCHES: { id: RuleMatch; label: string }[] = [
  { id: "from", label: "from" },
  { id: "domain", label: "@" },
  { id: "subject", label: "subj" },
];

export function RulesPanel() {
  const open = useMailStore((s) => s.rulesOpen);
  const setOpen = useMailStore((s) => s.setRulesOpen);
  const rules = useRulesStore((s) => s.rules);
  const add = useRulesStore((s) => s.add);
  const remove = useRulesStore((s) => s.remove);
  const patch = useRulesStore((s) => s.patch);
  const reset = useRulesStore((s) => s.reset);
  const [match, setMatch] = useState<RuleMatch>("from");
  const [value, setValue] = useState("");
  const [split, setSplit] = useState<Split>("other");

  if (!open) return null;

  function onAdd() {
    add({ match, value, split });
    setValue("");
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-bg/70 p-4"
      onClick={() => setOpen(false)}
    >
      <div
        role="dialog"
        aria-label="Inbox rules"
        className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-xl border border-border bg-elevated shadow-[var(--shadow-float)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
          <div>
            <h2 className="text-sm font-medium text-fg">Inbox rules</h2>
            <p className="mt-0.5 text-mail text-muted">
              First match wins. Unmatched keep the mailbox split.{" "}
              <span className="text-subtle">Shift+I / Shift+O</span> train from the current thread.
            </p>
          </div>
          <button type="button" className="text-mail text-subtle hover:text-fg" onClick={() => setOpen(false)}>
            <Kbd>Esc</Kbd>
          </button>
        </div>

        <ul className="min-h-0 flex-1 overflow-y-auto px-2 py-2 scroll-thin">
          {rules.length === 0 ? (
            <li className="px-2 py-6 text-center text-mail text-subtle">No rules — everything uses the mailbox split.</li>
          ) : (
            rules.map((rule) => (
              <li
                key={rule.id}
                className={cn(
                  "flex flex-wrap items-center gap-1.5 rounded-md px-2 py-1.5",
                  !rule.enabled && "opacity-50",
                )}
              >
                <select
                  aria-label="Match"
                  value={rule.match}
                  onChange={(e) => patch(rule.id, { match: e.target.value as RuleMatch })}
                  className="h-9 rounded-sm border border-border bg-surface px-1.5 text-micro text-fg"
                >
                  {MATCHES.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))}
                </select>
                <input
                  aria-label={ruleLabel(rule)}
                  value={rule.value}
                  onChange={(e) => patch(rule.id, { value: e.target.value })}
                  className="h-9 min-w-0 flex-1 rounded-sm border border-border bg-surface px-2 text-mail text-fg outline-none"
                />
                <SplitToggle value={rule.split} onChange={(s) => patch(rule.id, { split: s })} />
                <button
                  type="button"
                  className="h-9 px-1.5 text-micro text-subtle hover:text-fg"
                  onClick={() => patch(rule.id, { enabled: !rule.enabled })}
                >
                  {rule.enabled ? "on" : "off"}
                </button>
                <button
                  type="button"
                  aria-label={`Remove ${ruleLabel(rule)}`}
                  className="inline-flex size-9 items-center justify-center text-subtle hover:text-fg"
                  onClick={() => remove(rule.id)}
                >
                  <X className="size-3.5" />
                </button>
              </li>
            ))
          )}
        </ul>

        <form
          className="flex flex-wrap items-center gap-1.5 border-t border-border px-3 py-2.5"
          onSubmit={(e) => {
            e.preventDefault();
            onAdd();
          }}
        >
          <select
            aria-label="New match"
            value={match}
            onChange={(e) => setMatch(e.target.value as RuleMatch)}
            className="h-9 rounded-sm border border-border bg-surface px-1.5 text-micro text-fg"
          >
            {MATCHES.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={match === "domain" ? "github.com" : match === "subject" ? "invoice" : "maya@studio.null"}
            className="h-9 min-w-0 flex-1 rounded-sm border border-border bg-surface px-2 text-mail text-fg outline-none placeholder:text-subtle"
          />
          <SplitToggle value={split} onChange={setSplit} />
          <Button type="submit" size="sm" variant="primary" disabled={!value.trim()}>
            Add
          </Button>
        </form>
        <div className="flex items-center justify-between border-t border-border px-4 py-2">
          <button type="button" className="text-micro text-subtle hover:text-fg" onClick={() => reset()}>
            Reset defaults
          </button>
          <span className="text-micro text-subtle">{rules.filter((r) => r.enabled).length} on</span>
        </div>
      </div>
    </div>
  );
}

function SplitToggle({ value, onChange }: { value: Split; onChange: (s: Split) => void }) {
  return (
    <div className="inline-flex h-9 overflow-hidden rounded-sm border border-border">
      <button
        type="button"
        className={cn(
          "px-2 text-micro",
          value === "focused" ? "bg-select text-fg" : "text-subtle hover:text-fg",
        )}
        onClick={() => onChange("focused")}
      >
        Focused
      </button>
      <button
        type="button"
        className={cn(
          "px-2 text-micro",
          value === "other" ? "bg-select text-fg" : "text-subtle hover:text-fg",
        )}
        onClick={() => onChange("other")}
      >
        Other
      </button>
    </div>
  );
}
