import assert from "node:assert/strict";
import { test } from "node:test";
import {
  agendaDays,
  cycleView,
  eventsOnDay,
  extractEvents,
  isAllDay,
  layoutDayEvents,
  mergeEvents,
  periodLabel,
  shiftPeriod,
  visibleEvents,
  weekDays,
  workDays,
  type CalEvent,
} from "../src/lib/mail/calendar.ts";
import { nextCalColor } from "../src/lib/mail/cal-presets.ts";
import { thread } from "./helpers.ts";

function ev(partial: Partial<CalEvent> & Pick<CalEvent, "id" | "title" | "start" | "end">): CalEvent {
  return {
    calendarId: "local",
    who: "You",
    box: 1,
    source: "local",
    ...partial,
  };
}

test("work week is Monday through Friday", () => {
  const days = workDays(new Date(2026, 7, 23));
  assert.equal(days.length, 5);
  assert.equal(days[0]!.getDay(), 1);
  assert.equal(days[4]!.getDay(), 5);
});

test("week is seven days starting Sunday", () => {
  const days = weekDays(new Date(2026, 7, 23));
  assert.equal(days.length, 7);
  assert.equal(days[0]!.getDay(), 0);
  assert.equal(days[6]!.getDay(), 6);
});

test("agenda is fourteen days from today", () => {
  const days = agendaDays(new Date(2026, 7, 23));
  assert.equal(days.length, 14);
});

test("cycleView walks day week work month agenda", () => {
  assert.equal(cycleView("day"), "week");
  assert.equal(cycleView("week"), "work");
  assert.equal(cycleView("work"), "month");
  assert.equal(cycleView("month"), "agenda");
  assert.equal(cycleView("agenda"), "day");
});

test("period labels are readable", () => {
  const day = new Date(2026, 7, 23);
  assert.match(periodLabel(day, "day"), /Sunday/);
  assert.match(periodLabel(day, "month"), /August 2026/);
  assert.match(periodLabel(day, "work"), /Aug/);
});

test("shiftPeriod moves by the view", () => {
  const day = new Date(2026, 7, 23);
  assert.equal(shiftPeriod(day, "day", 1).getDate(), 24);
  assert.equal(shiftPeriod(day, "week", 1).getDate(), 30);
  assert.equal(shiftPeriod(day, "month", 1).getMonth(), 8);
});

test("extractEvents never auto-pins mail", () => {
  const t = thread({ subject: "Friday at 2pm", body: "Let's meet Friday at 2pm." });
  assert.deepEqual(extractEvents([t], "you@omadash.test"), []);
});

test("eventsOnDay and visibleEvents filter", () => {
  const a = ev({
    id: "a",
    title: "Standup",
    start: new Date(2026, 7, 23, 9).toISOString(),
    end: new Date(2026, 7, 23, 9, 30).toISOString(),
    calendarId: "work",
  });
  const b = ev({
    id: "b",
    title: "Hidden",
    start: new Date(2026, 7, 23, 10).toISOString(),
    end: new Date(2026, 7, 23, 11).toISOString(),
    calendarId: "personal",
  });
  const c = ev({
    id: "c",
    title: "Tomorrow",
    start: new Date(2026, 7, 24, 9).toISOString(),
    end: new Date(2026, 7, 24, 10).toISOString(),
  });
  assert.equal(eventsOnDay(mergeEvents([a, b, c]), new Date(2026, 7, 23)).length, 2);
  assert.equal(visibleEvents([a, b], ["personal"]).map((e) => e.id).join(), "a");
});

test("overlapping timed events get columns", () => {
  const a = ev({
    id: "a",
    title: "A",
    start: new Date(2026, 7, 23, 9).toISOString(),
    end: new Date(2026, 7, 23, 10).toISOString(),
  });
  const b = ev({
    id: "b",
    title: "B",
    start: new Date(2026, 7, 23, 9, 30).toISOString(),
    end: new Date(2026, 7, 23, 10, 30).toISOString(),
  });
  const placed = layoutDayEvents([a, b]);
  assert.equal(placed.length, 2);
  assert.ok(placed[0]!.width < 1);
  assert.ok(placed[1]!.left > 0);
});

test("all-day spans twenty-three hours or more", () => {
  const all = ev({
    id: "d",
    title: "Off",
    start: new Date(2026, 7, 23).toISOString(),
    end: new Date(2026, 7, 24).toISOString(),
  });
  assert.equal(isAllDay(all), true);
  const hour = ev({
    id: "h",
    title: "Hour",
    start: new Date(2026, 7, 23, 9).toISOString(),
    end: new Date(2026, 7, 23, 10).toISOString(),
  });
  assert.equal(isAllDay(hour), false);
});

test("nextCalColor skips used swatches", () => {
  assert.equal(nextCalColor(["unread"]), "success");
  assert.equal(nextCalColor([]), "unread");
});
