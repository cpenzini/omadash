import { addDays, addHours, nextMonday, setHours, setMinutes } from "date-fns";

export function laterToday() {
  const d = addHours(new Date(), 3);
  return setMinutes(d, 0);
}

export function tonight() {
  const d = setMinutes(setHours(new Date(), 18), 0);
  return d.getTime() > Date.now() ? d : addDays(d, 1);
}

export function tomorrowMorning() {
  return setMinutes(setHours(addDays(new Date(), 1), 8), 0);
}

export function nextWeekMorning() {
  return setMinutes(setHours(nextMonday(new Date()), 8), 0);
}

export const LATER_OPTIONS = [
  { id: "later", label: "Later today", hint: "in 3 hours", at: laterToday },
  { id: "tonight", label: "Tonight", hint: "6:00 PM", at: tonight },
  { id: "tomorrow", label: "Tomorrow", hint: "8:00 AM", at: tomorrowMorning },
  { id: "week", label: "Next week", hint: "Monday 8:00 AM", at: nextWeekMorning },
] as const;
