import {
  addDays,
  addMonths,
  addWeeks,
  addYears,
  differenceInCalendarDays,
  differenceInCalendarMonths,
  differenceInCalendarYears,
} from 'date-fns';

import type { EventRecurrence } from '@/db/schema';

import { fromDateKey, toDateKey, type DateKey } from './date';

/** The minimal shape every recurrence calculation needs — the parent Event/
 * Birthday's anchor date and how (and whether) it repeats. `date` is never
 * rewritten as occurrences pass; only the recurrence rule projects it
 * forward. Mirrors the plain "recurrence lives on the item, not duplicated
 * per-occurrence" model the whole feature is built around. */
export type RecurringItem = {
  date: DateKey;
  recurrence: EventRecurrence;
  recurrenceEndDate: DateKey | null;
};

function pastEnd(occursOn: DateKey, item: RecurringItem): boolean {
  return item.recurrenceEndDate !== null && occursOn > item.recurrenceEndDate;
}

/** Does this recurring item occur exactly on `target`? */
export function occursOn(item: RecurringItem, target: DateKey): boolean {
  if (target < item.date) return false;
  if (pastEnd(target, item)) return false;

  switch (item.recurrence) {
    case 'none':
      return target === item.date;
    case 'daily':
      return true;
    case 'weekly':
      return differenceInCalendarDays(fromDateKey(target), fromDateKey(item.date)) % 7 === 0;
    case 'monthly':
      return sameDayOfMonth(target, item.date);
    case 'yearly':
      return sameMonthDay(target, item.date);
  }
}

/** Every occurrence of this item within `[start, end]` (inclusive) — bounded
 * by the range itself (typically one visible calendar month), so this is
 * always cheap regardless of how long the item has existed. */
export function occurrencesInRange(item: RecurringItem, start: DateKey, end: DateKey): DateKey[] {
  const result: DateKey[] = [];
  let cursor = fromDateKey(start < item.date ? item.date : start);
  const endDate = fromDateKey(end);
  let guard = 0;
  while (toDateKey(cursor) <= end && guard < 400) {
    const key = toDateKey(cursor);
    if (occursOn(item, key)) result.push(key);
    cursor = addDays(cursor, 1);
    guard++;
    if (cursor > endDate) break;
  }
  return result;
}

/** The date-only projection: the next occurrence on or after `from`, ignoring
 * time-of-day entirely. Computed directly via date arithmetic rather than
 * stepping day-by-day, so it stays O(1) regardless of how old the item is. */
function nextOccurrenceDateOnOrAfter(item: RecurringItem, from: DateKey): DateKey | null {
  let occursOnDate: DateKey;

  if (item.recurrence === 'none') {
    if (item.date < from) return null;
    occursOnDate = item.date;
  } else if (from <= item.date) {
    occursOnDate = item.date;
  } else {
    const anchor = fromDateKey(item.date);
    const fromDate = fromDateKey(from);

    switch (item.recurrence) {
      case 'daily': {
        occursOnDate = from;
        break;
      }
      case 'weekly': {
        const days = differenceInCalendarDays(fromDate, anchor);
        const weeksElapsed = Math.ceil(days / 7);
        occursOnDate = toDateKey(addWeeks(anchor, weeksElapsed));
        break;
      }
      case 'monthly': {
        const months = differenceInCalendarMonths(fromDate, anchor);
        let candidate = addMonths(anchor, months);
        if (toDateKey(candidate) < from) candidate = addMonths(anchor, months + 1);
        occursOnDate = toDateKey(candidate);
        break;
      }
      case 'yearly': {
        const years = differenceInCalendarYears(fromDate, anchor);
        let candidate = addYears(anchor, years);
        if (toDateKey(candidate) < from) candidate = addYears(anchor, years + 1);
        occursOnDate = toDateKey(candidate);
        break;
      }
    }
  }

  return pastEnd(occursOnDate, item) ? null : occursOnDate;
}

function timeHasPassed(time: string, now: Date): boolean {
  const [hourStr, minuteStr] = time.split(':');
  const eventMinutes = Number(hourStr) * 60 + Number(minuteStr);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  return eventMinutes < nowMinutes;
}

/** The next occurrence on or after `from`, or null if the item has no more
 * occurrences on/after that moment — a one-off item already in the past, a
 * recurring item whose end date has passed, or (the case a pure date
 * comparison misses) a same-day occurrence whose time-of-day has already
 * gone by "now". In that last case, a recurring item rolls forward to its
 * next real occurrence (tomorrow for daily, next week for weekly, …) rather
 * than being reported as "later today" when it's actually already happened;
 * a one-off item simply has no more occurrences. `time` is the item's own
 * 'HH:mm' (or null for all-day, which is never considered "passed" — there's
 * no specific moment within the day to compare against). */
export function nextOccurrenceOnOrAfter(item: RecurringItem, from: DateKey, time: string | null, now: Date = new Date()): DateKey | null {
  const occursOnDate = nextOccurrenceDateOnOrAfter(item, from);
  if (occursOnDate === null) return null;

  const today = toDateKey(now);
  if (occursOnDate === today && time && timeHasPassed(time, now)) {
    if (item.recurrence === 'none') return null;
    return nextOccurrenceOnOrAfter(item, toDateKey(addDays(now, 1)), time, now);
  }

  return occursOnDate;
}

function sameMonthDay(a: DateKey, b: DateKey): boolean {
  const dateA = fromDateKey(a);
  const dateB = fromDateKey(b);
  return dateA.getMonth() === dateB.getMonth() && dateA.getDate() === dateB.getDate();
}

/** True when `target`'s day-of-month matches `anchor`'s, accounting for
 * `addMonths`-style end-of-month clamping (e.g. an anchor of Jan 31 recurs
 * on Feb 28/29, not by skipping February). */
function sameDayOfMonth(target: DateKey, anchor: DateKey): boolean {
  const anchorDate = fromDateKey(anchor);
  const targetDate = fromDateKey(target);
  const months = differenceInCalendarMonths(targetDate, anchorDate);
  return toDateKey(addMonths(anchorDate, months)) === target;
}
