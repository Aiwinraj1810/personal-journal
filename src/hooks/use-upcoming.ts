import { useMemo } from 'react';

import type { CalendarEventType } from '@/db/schema';
import type { DateKey } from '@/lib/date';

import { useUpcomingEvents } from './use-calendar-events';

/** `CalendarEventType` covers Events/Birthdays/standalone Reminders today;
 * 'ticket' has no data source yet, but is reserved here so a future Tickets
 * feature can be merged into Upcoming without reshaping this type. */
export type UpcomingItemType = CalendarEventType | 'ticket';

/** A single row in the Home/Calendar "Upcoming" list — a thin presentation
 * shape derived from Events/Birthdays/Reminders (and, later, Tickets). Never
 * a second source of truth: `id` + `type` identify exactly which underlying
 * record to open. An Event/Birthday appears at most once here regardless of
 * how many reminders it has — reminders configure *when* a notification
 * fires, they aren't separate Upcoming rows (see @/hooks/use-calendar-events'
 * useUpcomingEvents, which already iterates events, not reminders). */
export type UpcomingItem = {
  id: string;
  type: UpcomingItemType;
  title: string;
  occursOn: DateKey;
  time: string | null;
};

/** The next `limit` upcoming items across Events/Birthdays/Reminders, sorted
 * soonest-first — the source for both the Home screen's compact preview and
 * the Calendar tab's full "Coming up" list. */
export function useUpcomingItems(limit = 5): UpcomingItem[] {
  const occurrences = useUpcomingEvents(limit);

  return useMemo(
    () =>
      occurrences.map(({ event, occursOn }) => ({
        id: event.id,
        type: event.type,
        title: event.title,
        occursOn,
        time: event.time,
      })),
    [occurrences],
  );
}
