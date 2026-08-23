import assert from "node:assert/strict";
import { test } from "node:test";
import { parseIcsEvents, rruleLabel, serializeIcsEvent } from "../src/lib/mail/ics.ts";

test("round-trips a timed event", () => {
  const start = new Date(Date.UTC(2026, 7, 23, 18, 0, 0));
  const end = new Date(Date.UTC(2026, 7, 23, 19, 0, 0));
  const ics = serializeIcsEvent({
    uid: "omadash-test",
    title: "Lunch, with Ada",
    start,
    end,
    where: "Cafe; Main St",
    description: "omadash-thread:gm%3Ax",
  });
  assert.match(ics, /BEGIN:VCALENDAR/);
  assert.match(ics, /SUMMARY:Lunch\\, with Ada/);
  assert.match(ics, /LOCATION:Cafe\\; Main St/);
  const events = parseIcsEvents(ics);
  assert.equal(events.length, 1);
  assert.equal(events[0]!.title, "Lunch, with Ada");
  assert.equal(events[0]!.where, "Cafe; Main St");
  assert.equal(events[0]!.description, "omadash-thread:gm%3Ax");
  assert.equal(events[0]!.start.toISOString(), start.toISOString());
  assert.equal(events[0]!.end.toISOString(), end.toISOString());
});

test("reads a folded DESCRIPTION and DURATION", () => {
  const raw = [
    "BEGIN:VCALENDAR",
    "BEGIN:VEVENT",
    "UID:dur",
    "SUMMARY:Hold",
    "DTSTART:20260823T150000Z",
    "DURATION:PT90M",
    "DESCRIPTION:Filed from mail",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  const events = parseIcsEvents(raw);
  assert.equal(events.length, 1);
  assert.equal(events[0]!.end.getTime() - events[0]!.start.getTime(), 90 * 60_000);
});

test("rruleLabel names weekly and daily", () => {
  assert.equal(rruleLabel("FREQ=WEEKLY"), "Weekly");
  assert.equal(rruleLabel("FREQ=DAILY"), "Daily");
  assert.equal(rruleLabel(undefined), undefined);
});
