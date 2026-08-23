import assert from "node:assert/strict";
import { test } from "node:test";
import { formatHit, parseThreadDates, readThreadId, stampThread } from "../src/lib/mail/dates.ts";
import { thread } from "./helpers.ts";

const now = new Date("2026-08-23T15:00:00");

test("parses Friday at 2pm as this week's Friday 14:00", () => {
  const hits = parseThreadDates(thread({ subject: "Catch up", body: "Let's meet Friday at 2pm." }), now);
  const hit = hits.find((h) => /friday at 2pm/i.test(h.text));
  assert.ok(hit, JSON.stringify(hits));
  assert.equal(hit.start.getHours(), 14);
  assert.equal(hit.start.getDay(), 5);
  assert.equal(hit.allDay, false);
});

test("parses a time range on tomorrow", () => {
  const hits = parseThreadDates(thread({ subject: "Call", body: "Call tomorrow 9am-10am." }), now);
  const hit = hits.find((h) => /tomorrow 9am/i.test(h.text));
  assert.ok(hit);
  assert.equal(hit.start.getHours(), 9);
  assert.equal(hit.end.getHours(), 10);
});

test("parses a calendar date with minutes", () => {
  const hits = parseThreadDates(thread({ subject: "Review", body: "Review Aug 28 at 3:30pm" }), now);
  const hit = hits.find((h) => /aug 28/i.test(h.text));
  assert.ok(hit);
  assert.equal(hit.start.getMonth(), 7);
  assert.equal(hit.start.getDate(), 28);
  assert.equal(hit.start.getHours(), 15);
  assert.equal(hit.start.getMinutes(), 30);
});

test("parses next Tuesday as a future Tuesday", () => {
  const hits = parseThreadDates(thread({ subject: "Walkthrough", body: "Next Tuesday for the walkthrough." }), now);
  const hit = hits.find((h) => /next tuesday/i.test(h.text));
  assert.ok(hit);
  assert.equal(hit.start.getDay(), 2);
  assert.ok(hit.start.getTime() > now.getTime());
});

test("parses at 4pm as today while the hour is still ahead", () => {
  const hits = parseThreadDates(thread({ subject: "Hop on", body: "Can you hop on at 4pm?" }), now);
  const hit = hits.find((h) => /at 4pm/i.test(h.text));
  assert.ok(hit);
  assert.equal(hit.start.getHours(), 16);
  assert.equal(hit.start.getDate(), 23);
});

test("skips quoted reply history", () => {
  const hits = parseThreadDates(
    thread({
      subject: "Re: Catch up",
      body: "Sounds good.\n> Let's meet Friday at 2pm last year",
    }),
    now,
  );
  assert.equal(
    hits.filter((h) => /last year/i.test(h.text)).length,
    0,
  );
});

test("formatHit is compact for today", () => {
  const hits = parseThreadDates(thread({ subject: "x", body: "today at 5pm" }), now);
  const hit = hits[0];
  assert.ok(hit);
  assert.match(formatHit(hit), /Today/i);
});

test("stamps and reads a thread id through an event description", () => {
  const id = "gm:you@omadash.test:12345";
  const desc = stampThread("Lunch", id);
  assert.match(desc, /omadash-thread:/);
  assert.equal(readThreadId(desc), id);
  assert.equal(readThreadId("plain notes"), undefined);
});
