import * as Notifications from 'expo-notifications';

import type { CalendarEventType, EventRecurrence } from '@/db/schema';

import { type DateKey, fromDateKey } from './date';
import { offsetMinutes, type ReminderOffset } from './reminders';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function ensureNotificationPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

/** Checks current permission without ever prompting — used by startup
 * reconciliation, which must never ask the user for permission on its own
 * (only reminder creation/editing does that). */
export async function hasNotificationPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  return current.granted;
}

/** The parent Event/Birthday a reminder's notification content and timing is
 * derived from — the reminder itself never duplicates this data, it only
 * carries an offset (see @/lib/reminders). */
export type ReminderParentEvent = {
  type: CalendarEventType;
  title: string;
  notes?: string | null;
  date: DateKey;
  /** 'HH:mm' 24h, or null for an all-day parent — nothing can be scheduled
   * without a time, since a reminder's fire moment is always time-of-day
   * anchored (even "1 day before" needs an hour/minute to fire at). */
  time: string | null;
  recurrence: EventRecurrence;
};

/** Schedules one local notification for one reminder's offset against its
 * parent Event/Birthday. Returns null when there's nothing to schedule: the
 * parent has no time, or (for a non-recurring parent) the computed fire
 * moment has already passed. Doesn't cancel anything itself — callers own
 * that (the DAO layer cancels+deletes every existing reminder row for an
 * event before recreating them on save, see use-calendar-events.ts). */
export async function scheduleReminder(event: ReminderParentEvent, offset: ReminderOffset): Promise<string | null> {
  if (!event.time) return null;

  const [hourStr, minuteStr] = event.time.split(':');
  const anchor = fromDateKey(event.date);
  anchor.setHours(Number(hourStr), Number(minuteStr), 0, 0);

  const fireAt = new Date(anchor.getTime() - offsetMinutes(offset) * 60_000);

  const content: Notifications.NotificationContentInput = {
    title: eventNotificationTitle(event.type, event.title),
    body: event.notes ?? undefined,
  };

  if (event.recurrence === 'yearly') {
    // A reminder on a yearly-recurring parent (a birthday) must itself recur
    // yearly, anchored at the offset-shifted day/month — not fire once.
    // `fireAt`'s month/day/hour/minute already reflect the offset, including
    // any month/year rollover (e.g. "7 days before" a Jan 1 birthday lands
    // in December of the prior year, computed correctly by plain Date math).
    return Notifications.scheduleNotificationAsync({
      content,
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.YEARLY,
        day: fireAt.getDate(),
        month: fireAt.getMonth(),
        hour: fireAt.getHours(),
        minute: fireAt.getMinutes(),
      },
    });
  }

  if (fireAt.getTime() <= Date.now()) return null;

  return Notifications.scheduleNotificationAsync({
    content,
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: fireAt },
  });
}

export async function cancelReminderNotification(identifier: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(identifier).catch(() => {
    // Already fired or was never scheduled — nothing to clean up.
  });
}

function eventNotificationTitle(type: CalendarEventType, title: string): string {
  if (type === 'birthday') return `🎂 ${title}’s birthday`;
  if (type === 'reminder') return `⏰ ${title}`;
  return title;
}
