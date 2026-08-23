import assert from "node:assert/strict";
import { test } from "node:test";
import { applyRules, DEFAULT_RULES, ruleMatches } from "../src/lib/mail/rules.ts";
import { person, thread } from "./helpers.ts";

test("noreply senders land in Other", () => {
  const t = thread({
    subject: "Your receipt",
    from: person("noreply@stripe.com", "Stripe"),
    focused: true,
  });
  assert.equal(applyRules(t, DEFAULT_RULES), false);
});

test("github.com is Other by domain", () => {
  const t = thread({
    subject: "[repo] CI failed",
    from: person("notifications@github.com", "GitHub"),
    focused: true,
  });
  assert.equal(applyRules(t, DEFAULT_RULES), false);
});

test("a human from an unknown domain stays Focused", () => {
  const t = thread({
    subject: "Thursday?",
    from: person("ada@example.com", "Ada"),
    focused: true,
  });
  assert.equal(applyRules(t, DEFAULT_RULES), true);
});

test("unmatched Other stays Other", () => {
  const t = thread({
    subject: "Thursday?",
    from: person("ada@example.com", "Ada"),
    focused: false,
  });
  assert.equal(applyRules(t, DEFAULT_RULES), false);
});

test("first matching rule wins", () => {
  const t = thread({
    subject: "Launch",
    from: person("ada@github.com", "Ada"),
    focused: true,
  });
  const rules = [
    { id: "a", match: "from" as const, value: "ada@", split: "focused" as const, enabled: true },
    { id: "b", match: "domain" as const, value: "github.com", split: "other" as const, enabled: true },
  ];
  assert.equal(applyRules(t, rules), true);
});

test("disabled rules are ignored", () => {
  const t = thread({
    subject: "CI",
    from: person("bot@github.com", "GitHub"),
    focused: true,
  });
  const rules = DEFAULT_RULES.map((r) => (r.id === "d-github" ? { ...r, enabled: false } : r));
  const github = rules.find((r) => r.id === "d-github")!;
  assert.equal(ruleMatches(t, github), false);
  assert.equal(applyRules(t, rules), true);
});

test("subject rules match a substring", () => {
  const t = thread({ subject: "Weekly digest", from: person("ada@example.com"), focused: true });
  const rule = { id: "s", match: "subject" as const, value: "digest", split: "other" as const, enabled: true };
  assert.equal(ruleMatches(t, rule), true);
  assert.equal(applyRules(t, [rule]), false);
});
