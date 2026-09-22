import {
  addDays,
  differenceInCalendarDays,
  eachDayOfInterval,
  endOfMonth,
  format,
  isSameDay as dateFnsIsSameDay,
  isValid,
  parseISO,
  setYear,
  startOfMonth,
  startOfWeek,
} from 'date-fns';

/** 'YYYY-MM-DD' string, the shape every date column in the DB is stored as. */
export type DateKey = string;

const DATE_KEY_FORMAT = 'yyyy-MM-dd';

export function toDateKey(date: Date): DateKey {
  return format(date, DATE_KEY_FORMAT);
}

export function fromDateKey(key: DateKey): Date {
  const parsed = parseISO(key);
  return isValid(parsed) ? parsed : new Date(NaN);
}

export function isToday(key: DateKey): boolean {
  return dateFnsIsSameDay(fromDateKey(key), new Date());
}

export function isSameDay(a: DateKey, b: DateKey): boolean {
  return a === b;
}

/** The 7 days (Sun–Sat) of the week containing `anchor`, for the Home week strip. */
export function getWeekDays(anchor: Date): Date[] {
  const start = startOfWeek(anchor, { weekStartsOn: 0 });
  return eachDayOfInterval({ start, end: addDays(start, 6) });
}

/** Inclusive 'YYYY-MM-DD' range covering the whole month containing `anchor` —
 * used to query which days in a visible month have entries/events. */
export function getMonthRange(anchor: Date): { start: DateKey; end: DateKey } {
  return { start: toDateKey(startOfMonth(anchor)), end: toDateKey(endOfMonth(anchor)) };
}

/** Projects a recurring-yearly anchor date (e.g. a birthday) onto `targetYear`,
 * keeping the month/day. Feb 29 on a non-leap target year falls back to Feb 28. */
export function projectYearly(anchorKey: DateKey, targetYear: number): DateKey {
  const anchor = fromDateKey(anchorKey);
  const projected = setYear(anchor, targetYear);
  // date-fns setYear on Feb 29 -> non-leap year rolls forward to Mar 1; pull back to Feb 28.
  if (anchor.getMonth() === 1 && anchor.getDate() === 29 && projected.getMonth() === 2) {
    return toDateKey(addDays(projected, -1));
  }
  return toDateKey(projected);
}

/** "Tuesday, February 9" — the Home/day-agenda header date format. */
export function formatHeaderDate(key: DateKey): string {
  return format(fromDateKey(key), 'EEEE, MMMM d');
}

/** "Feb 9, 2026" — compact date for list rows and backup metadata. */
export function formatShortDate(key: DateKey): string {
  return format(fromDateKey(key), 'MMM d, yyyy');
}

/** "February 9, 2026" — full-month date for the Home memory cards. */
export function formatLongDate(key: DateKey): string {
  return format(fromDateKey(key), 'MMMM d, yyyy');
}

/** "Today" / "Tomorrow" / a weekday name (2–6 days out) / an absolute short
 * date beyond that — for compact Upcoming-style rows. Assumes `key` is on or
 * after today; a past date just falls through to the absolute-date case. */
export function formatRelativeDate(key: DateKey): string {
  const days = differenceInCalendarDays(fromDateKey(key), new Date());
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days > 1 && days <= 6) return format(fromDateKey(key), 'EEEE');
  return formatShortDate(key);
}

/** "20:35" — 24h time from a unix-ms timestamp, for entry list rows. */
export function formatTime(unixMs: number): string {
  return format(new Date(unixMs), 'HH:mm');
}

/** "20:35 · Feb 9" — combined recent-entry timestamp. */
export function formatEntryTimestamp(unixMs: number): string {
  return `${formatTime(unixMs)} · ${format(new Date(unixMs), 'MMM d')}`;
}

/** Single-letter weekday initials for the week strip header (S M T W T F S). */
export function weekdayInitial(date: Date): string {
  return format(date, 'EEEEE');
}
