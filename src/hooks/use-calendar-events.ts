import { eq } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useMemo } from 'react';

import { db } from '@/db/client';
import { type CalendarEventType, type EventRecurrence, calendarEventReminders, calendarEvents } from '@/db/schema';
import { type DateKey, fromDateKey, projectYearly, toDateKey } from '@/lib/date';
import { uuid } from '@/lib/id';
import { cancelReminderNotification, ensureNotificationPermission, scheduleReminder, type ReminderParentEvent } from '@/lib/notifications';
import { offsetToColumns, type ReminderOffset } from '@/lib/reminders';

export type CalendarEventReminder = typeof calendarEventReminders.$inferSelect;
export type CalendarEvent = typeof calendarEvents.$inferSelect & { reminders: CalendarEventReminder[] };

/** An event occurrence projected onto a specific calendar date — for a 'yearly'
 * event this date differs from `event.date` (which keeps the original/birth year). */
export type EventOccurrence = { event: CalendarEvent; occursOn: DateKey };

function occursInYear(event: CalendarEvent, year: number): DateKey {
  return event.recurrence === 'yearly' ? projectYearly(event.date, year) : event.date;
}

/** Live query of every calendar event with its reminders — the table is small
 * (personal birthdays/events/reminders), so occurrence expansion for
 * recurrence happens in JS rather than in SQL. */
function useAllEvents() {
  const { data, updatedAt } = useLiveQuery(db.query.calendarEvents.findMany({ with: { reminders: true } }));
  return { events: (data ?? []) as CalendarEvent[], updatedAt };
}

/** A single event by id, for the event edit screen. */
export function useCalendarEvent(id: string | undefined): CalendarEvent | undefined {
  const { events } = useAllEvents();
  return useMemo(() => events.find((event) => event.id === id), [events, id]);
}

/** All event occurrences landing on one calendar day. */
export function useEventsForDate(date: DateKey): EventOccurrence[] {
  const { events } = useAllEvents();
  const year = fromDateKey(date).getFullYear();
  return useMemo(
    () =>
      events
        .filter((event) => occursInYear(event, year) === date)
        .map((event) => ({ event, occursOn: date })),
    [events, date, year],
  );
}

/** Dates within `[start, end]` (inclusive, same month in practice) that have at
 * least one event occurrence, for calendar dot indicators. */
export function useEventDatesInRange(start: DateKey, end: DateKey): Set<DateKey> {
  const { events } = useAllEvents();
  return useMemo(() => {
    const years = new Set([fromDateKey(start).getFullYear(), fromDateKey(end).getFullYear()]);
    const result = new Set<DateKey>();
    for (const event of events) {
      for (const year of years) {
        const occursOn = occursInYear(event, year);
        if (occursOn >= start && occursOn <= end) result.add(occursOn);
      }
    }
    return result;
  }, [events, start, end]);
}

/** The next N upcoming occurrences (today or later), soonest first — for a
 * "Coming up" list on the Events screen. */
export function useUpcomingEvents(limit = 10): EventOccurrence[] {
  const { events } = useAllEvents();
  return useMemo(() => {
    const today = toDateKey(new Date());
    const thisYear = new Date().getFullYear();
    const occurrences = events.map((event) => {
      let occursOn = occursInYear(event, thisYear);
      if (event.recurrence === 'yearly' && occursOn < today) {
        occursOn = occursInYear(event, thisYear + 1);
      }
      return { event, occursOn };
    });
    return occurrences
      .filter((o) => o.occursOn >= today)
      .sort((a, b) => a.occursOn.localeCompare(b.occursOn))
      .slice(0, limit);
  }, [events, limit]);
}

export type UpsertReminderInput = { offset: ReminderOffset; enabled: boolean };

export type UpsertEventInput = {
  type: CalendarEventType;
  title: string;
  notes: string | null;
  date: DateKey;
  time: string | null;
  recurrence: EventRecurrence;
  reminders: UpsertReminderInput[];
};

/** Schedules (or, for a denied permission, records without scheduling) every
 * reminder in `input.reminders` as fresh rows for `eventId` — callers are
 * responsible for having already cancelled+deleted any prior reminder rows
 * (see updateEvent). Checks/requests notification permission once per call,
 * only if there's actually a reminder to schedule, never proactively.
 * Returns true if permission was denied (so the caller can tell the user),
 * false otherwise. */
async function scheduleAllReminders(eventId: string, input: UpsertEventInput): Promise<boolean> {
  const hasEnabledReminder = input.reminders.some((r) => r.enabled);
  const permissionDenied = hasEnabledReminder ? !(await ensureNotificationPermission()) : false;

  const parent: ReminderParentEvent = {
    type: input.type,
    title: input.title,
    notes: input.notes,
    date: input.date,
    time: input.time,
    recurrence: input.recurrence,
  };

  for (const reminder of input.reminders) {
    const notificationIdentifier = reminder.enabled && !permissionDenied ? await scheduleReminder(parent, reminder.offset) : null;
    const { offsetType, offsetValue } = offsetToColumns(reminder.offset);
    await db.insert(calendarEventReminders).values({
      id: uuid(),
      eventId,
      offsetType,
      offsetValue,
      enabled: reminder.enabled,
      notificationIdentifier,
      createdAt: Date.now(),
    });
  }

  return permissionDenied;
}

export async function createEvent(input: UpsertEventInput): Promise<{ id: string; permissionDenied: boolean }> {
  const now = Date.now();
  const id = uuid();

  await db.insert(calendarEvents).values({
    id,
    type: input.type,
    title: input.title,
    notes: input.notes,
    date: input.date,
    time: input.time,
    recurrence: input.recurrence,
    createdAt: now,
    updatedAt: now,
  });

  const permissionDenied = await scheduleAllReminders(id, input);
  return { id, permissionDenied };
}

/** Replaces every reminder on this event with the current form selection —
 * simpler and just as correct as diffing old vs. new reminder rows, since
 * reminders are cheap preset selections (not user-authored content worth
 * preserving identity across an edit), and it guarantees stale notifications
 * never survive a change to date/time/recurrence/reminder selection. */
export async function updateEvent(id: string, input: UpsertEventInput): Promise<{ permissionDenied: boolean }> {
  const existingReminders = await db.select().from(calendarEventReminders).where(eq(calendarEventReminders.eventId, id));
  await Promise.all(
    existingReminders.filter((r) => r.notificationIdentifier).map((r) => cancelReminderNotification(r.notificationIdentifier!)),
  );
  await db.delete(calendarEventReminders).where(eq(calendarEventReminders.eventId, id));

  await db
    .update(calendarEvents)
    .set({
      type: input.type,
      title: input.title,
      notes: input.notes,
      date: input.date,
      time: input.time,
      recurrence: input.recurrence,
      updatedAt: Date.now(),
    })
    .where(eq(calendarEvents.id, id));

  const permissionDenied = await scheduleAllReminders(id, input);
  return { permissionDenied };
}

/** Cancels every reminder notification for this event, then deletes the
 * event row (its reminder rows cascade-delete with it at the DB level). */
export async function deleteEvent(id: string): Promise<void> {
  const reminders = await db.select().from(calendarEventReminders).where(eq(calendarEventReminders.eventId, id));
  await Promise.all(reminders.filter((r) => r.notificationIdentifier).map((r) => cancelReminderNotification(r.notificationIdentifier!)));
  await db.delete(calendarEvents).where(eq(calendarEvents.id, id));
}
