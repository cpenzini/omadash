import assert from "node:assert/strict";
import { test } from "node:test";
import { APP_NAME, APP_VERSION } from "../src/lib/app.ts";
import { formatListTime, snippetOf } from "../src/lib/mail/format.ts";
import { emailHasRemoteImages, isTrackerUrl } from "../src/lib/mail/html.ts";
import { LATER_OPTIONS, tonight, tomorrowMorning } from "../src/lib/mail/later.ts";
import { parsePrefs } from "../src/lib/mail/prefs.ts";
import { SNIPPETS } from "../src/lib/mail/snippets.ts";

test("identity is 0.2.0", () => {
  assert.equal(APP_NAME, "Omadash");
  assert.equal(APP_VERSION, "0.2.0");
});

test("prefs default to two panes and blocked remote images", () => {
  const empty = parsePrefs(null);
  assert.equal(empty.layout, "two");
  assert.equal(empty.showRemoteImages, false);
  assert.equal(empty.notifyMail, true);
  const three = parsePrefs({ layout: "three", showRemoteImages: true, notifyMail: false });
  assert.equal(three.layout, "three");
  assert.equal(three.showRemoteImages, true);
  assert.equal(three.notifyMail, false);
  assert.equal(parsePrefs({ layout: "weird" }).layout, "two");
});

test("snippets have unique triggers and ;thanks exists", () => {
  const triggers = SNIPPETS.map((s) => s.trigger);
  assert.equal(new Set(triggers).size, triggers.length);
  assert.ok(SNIPPETS.some((s) => s.trigger === "thanks"));
});

test("later options land in the future", () => {
  const now = Date.now();
  for (const opt of LATER_OPTIONS) {
    assert.ok(opt.at().getTime() > now - 60_000, opt.id);
  }
  assert.equal(tonight().getHours(), 18);
  assert.equal(tomorrowMorning().getHours(), 8);
});

test("list time and snippet", () => {
  const today = new Date();
  today.setHours(14, 30, 0, 0);
  assert.match(formatListTime(today.toISOString(), today), /2:30/);
  assert.equal(snippetOf("Hello\n\nWorld"), "Hello World");
});

test("remote images and trackers", () => {
  assert.equal(emailHasRemoteImages('<img src="https://cdn.example.com/a.png">'), true);
  assert.equal(emailHasRemoteImages("<p>Hi</p>"), false);
  assert.equal(isTrackerUrl("https://click.sendgrid.net/open/pixel.gif"), true);
  assert.equal(isTrackerUrl("https://mailchimp.com/track/open"), true);
  assert.equal(isTrackerUrl("https://photos.example.com/shot.jpg"), false);
});
