import { eq } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useMemo } from 'react';

import { db } from '@/db/client';
import { type CalendarEventType, type EventRecurrence, calendarEvents } from '@/db/schema';
import { type DateKey, fromDateKey, projectYearly, toDateKey } from '@/lib/date';
import { uuid } from '@/lib/id';
import { cancelEventNotification, syncEventNotification } from '@/lib/notifications';

export type CalendarEvent = typeof calendarEvents.$inferSelect;

/** An event occurrence projected onto a specific calendar date — for a 'yearly'
 * event this date differs from `event.date` (which keeps the original/birth year). */
export type EventOccurrence = { event: CalendarEvent; occursOn: DateKey };

function occursInYear(event: CalendarEvent, year: number): DateKey {
  return event.recurrence === 'yearly' ? projectYearly(event.date, year) : event.date;
}

/** Live query of every calendar event — the table is small (personal birthdays/
 * events/reminders), so occurrence expansion for recurrence happens in JS
 * rather than in SQL. */
function useAllEvents() {
  const { data, updatedAt } = useLiveQuery(db.select().from(calendarEvents));
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

export type UpsertEventInput = {
  type: CalendarEventType;
  title: string;
  notes: string | null;
  date: DateKey;
  time: string | null;
  recurrence: EventRecurrence;
  notifyEnabled: boolean;
};

export async function createEvent(input: UpsertEventInput): Promise<string> {
  const now = Date.now();
  const id = uuid();

  const notificationIdentifier = input.notifyEnabled ? await syncEventNotification(input, null) : null;

  await db.insert(calendarEvents).values({
    id,
    type: input.type,
    title: input.title,
    notes: input.notes,
    date: input.date,
    time: input.time,
    recurrence: input.recurrence,
    notifyEnabled: input.notifyEnabled,
    notificationIdentifier,
    createdAt: now,
    updatedAt: now,
  });
  return id;
}

export async function updateEvent(id: string, input: UpsertEventInput, previousNotificationId: string | null): Promise<void> {
  let notificationIdentifier: string | null = null;
  if (input.notifyEnabled) {
    notificationIdentifier = await syncEventNotification(input, previousNotificationId);
  } else if (previousNotificationId) {
    await cancelEventNotification(previousNotificationId);
  }

  await db
    .update(calendarEvents)
    .set({
      type: input.type,
      title: input.title,
      notes: input.notes,
      date: input.date,
      time: input.time,
      recurrence: input.recurrence,
      notifyEnabled: input.notifyEnabled,
      notificationIdentifier,
      updatedAt: Date.now(),
    })
    .where(eq(calendarEvents.id, id));
}

export async function deleteEvent(id: string, notificationIdentifier: string | null): Promise<void> {
  if (notificationIdentifier) await cancelEventNotification(notificationIdentifier);
  await db.delete(calendarEvents).where(eq(calendarEvents.id, id));
}
