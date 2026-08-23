/**
 * Editable Focused / Other rules. First match wins; unmatched keep the
 * seed/IMAP split. Persisted in localStorage — same device, any mailbox.
 */
import { create } from "zustand";
import type { Split, Thread } from "./types";

export type RuleMatch = "from" | "domain" | "subject";

export interface InboxRule {
  id: string;
  match: RuleMatch;
  value: string;
  split: Split;
  enabled: boolean;
}

export const DEFAULT_RULES: InboxRule[] = [
  {
    id: "d-noreply",
    match: "from",
    value: "noreply,no-reply,notifications,newsletter,billing,receipts,mailer-daemon,digest",
    split: "other",
    enabled: true,
  },
  { id: "d-github", match: "domain", value: "github.com", split: "other", enabled: true },
  { id: "d-stripe", match: "domain", value: "stripe.com", split: "other", enabled: true },
  { id: "d-linear", match: "domain", value: "linear.app", split: "other", enabled: true },
  { id: "d-figma", match: "domain", value: "figma.com", split: "other", enabled: true },
  { id: "d-changelog", match: "domain", value: "changelog.com", split: "other", enabled: true },
  { id: "d-cal", match: "domain", value: "cal.com", split: "other", enabled: true },
  { id: "d-fly", match: "domain", value: "fly.io", split: "other", enabled: true },
  { id: "d-linkedin", match: "domain", value: "linkedin.com", split: "other", enabled: true },
];

const KEY = "omadash-rules-v1";

function nid() {
  return `r-${Math.random().toString(36).slice(2, 9)}`;
}

function load(): InboxRule[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_RULES.map((r) => ({ ...r }));
    const parsed = JSON.parse(raw) as { rules?: InboxRule[] };
    if (!Array.isArray(parsed.rules)) return DEFAULT_RULES.map((r) => ({ ...r }));
    return parsed.rules
      .filter((r) => r && r.id && (r.match === "from" || r.match === "domain" || r.match === "subject"))
      .map((r) => ({
        id: r.id,
        match: r.match,
        value: String(r.value ?? ""),
        split: r.split === "other" ? "other" : "focused",
        enabled: r.enabled !== false,
      }));
  } catch {
    return DEFAULT_RULES.map((r) => ({ ...r }));
  }
}

function persist(rules: InboxRule[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ rules }));
  } catch {
    /* ignore */
  }
}

function fromEmail(t: Thread): string {
  const last = t.messages[t.messages.length - 1];
  return (last?.from.email ?? "").toLowerCase();
}

export function ruleMatches(t: Thread, rule: InboxRule): boolean {
  if (!rule.enabled) return false;
  const value = rule.value.trim().toLowerCase();
  if (!value) return false;
  const from = fromEmail(t);
  const domain = from.split("@")[1] ?? "";
  if (rule.match === "from") {
    return value.split(/[,;]+/).some((n) => {
      const needle = n.trim();
      return needle.length > 0 && from.includes(needle);
    });
  }
  if (rule.match === "domain") {
    const d = value.replace(/^@/, "");
    return domain === d || domain.endsWith(`.${d}`);
  }
  return t.subject.toLowerCase().includes(value);
}

export function applyRules(t: Thread, rules: InboxRule[]): boolean {
  for (const rule of rules) {
    if (ruleMatches(t, rule)) return rule.split === "focused";
  }
  return t.focused;
}

interface RulesStore {
  rules: InboxRule[];
  hydrated: boolean;
  hydrate: () => void;
  add: (input: { match: RuleMatch; value: string; split: Split }) => void;
  remove: (id: string) => void;
  patch: (id: string, patch: Partial<Pick<InboxRule, "match" | "value" | "split" | "enabled">>) => void;
  upsertFrom: (email: string, split: Split) => void;
  reset: () => void;
}

export const useRulesStore = create<RulesStore>((set, get) => ({
  rules: DEFAULT_RULES.map((r) => ({ ...r })),
  hydrated: false,
  hydrate: () => {
    if (get().hydrated) return;
    set({ hydrated: true, rules: load() });
  },
  add: ({ match, value, split }) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    const rules = [{ id: nid(), match, value: trimmed, split, enabled: true }, ...get().rules];
    set({ rules });
    persist(rules);
  },
  remove: (id) => {
    const rules = get().rules.filter((r) => r.id !== id);
    set({ rules });
    persist(rules);
  },
  patch: (id, next) => {
    const rules = get().rules.map((r) => (r.id === id ? { ...r, ...next } : r));
    set({ rules });
    persist(rules);
  },
  upsertFrom: (email, split) => {
    const addr = email.trim().toLowerCase();
    if (!addr.includes("@")) return;
    const existing = get().rules.find((r) => r.match === "from" && r.value.trim().toLowerCase() === addr);
    let rules: InboxRule[];
    if (existing) {
      rules = get().rules.map((r) => (r.id === existing.id ? { ...r, split, enabled: true } : r));
    } else {
      rules = [{ id: nid(), match: "from", value: addr, split, enabled: true }, ...get().rules];
    }
    set({ rules });
    persist(rules);
  },
  reset: () => {
    const rules = DEFAULT_RULES.map((r) => ({ ...r }));
    set({ rules });
    persist(rules);
  },
}));

export function classifyThread(t: Thread): boolean {
  return applyRules(t, useRulesStore.getState().rules);
}

export function ruleLabel(rule: InboxRule): string {
  if (rule.match === "from") return `from ${rule.value}`;
  if (rule.match === "domain") return `@${rule.value.replace(/^@/, "")}`;
  return `subject “${rule.value}”`;
}
