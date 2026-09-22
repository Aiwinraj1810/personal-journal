import * as Notifications from 'expo-notifications';

import type { CalendarEventType, EventRecurrence } from '@/db/schema';

import { type DateKey, fromDateKey, toDateKey } from './date';
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
  /** Only meaningful when recurrence !== 'none'. A native repeating trigger
   * (daily/weekly/monthly/yearly) has no way to express "until this date" —
   * so a set end date is honored here only as an upfront "has it already
   * ended?" check; ongoing enforcement is the startup reconciliation pass's
   * job (see @/lib/reminder-reconciliation), which cancels reminders whose
   * parent's end date has since passed. */
  recurrenceEndDate: DateKey | null;
};

/** Schedules one local notification for one reminder's offset against its
 * parent Event/Birthday. Returns null when there's nothing to schedule: the
 * parent has no time, its recurrence has already ended, or (for a
 * non-recurring parent) the computed fire moment has already passed.
 * Doesn't cancel anything itself — callers own that (the DAO layer cancels+
 * deletes every existing reminder row for an event before recreating them on
 * save, see use-calendar-events.ts). */
export async function scheduleReminder(event: ReminderParentEvent, offset: ReminderOffset): Promise<string | null> {
  if (!event.time) return null;
  if (event.recurrenceEndDate && event.recurrenceEndDate < toDateKey(new Date())) return null;

  const [hourStr, minuteStr] = event.time.split(':');
  const anchor = fromDateKey(event.date);
  anchor.setHours(Number(hourStr), Number(minuteStr), 0, 0);

  // The offset shifts the anchor moment backward; each recurrence type below
  // reads whichever of fireAt's components it needs (day/month/weekday/
  // hour/minute), so a day-level offset correctly rolls across week/month/
  // year boundaries for free via ordinary Date arithmetic.
  const fireAt = new Date(anchor.getTime() - offsetMinutes(offset) * 60_000);

  const content: Notifications.NotificationContentInput = {
    title: eventNotificationTitle(event.type, event.title),
    body: event.notes ?? undefined,
  };

  switch (event.recurrence) {
    case 'daily':
      return Notifications.scheduleNotificationAsync({
        content,
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: fireAt.getHours(), minute: fireAt.getMinutes() },
      });

    case 'weekly':
      return Notifications.scheduleNotificationAsync({
        content,
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
          // expo-notifications weekday: 1 = Sunday … 7 = Saturday; JS Date#getDay(): 0 = Sunday … 6 = Saturday.
          weekday: fireAt.getDay() + 1,
          hour: fireAt.getHours(),
          minute: fireAt.getMinutes(),
        },
      });

    case 'monthly':
      return Notifications.scheduleNotificationAsync({
        content,
        trigger: { type: Notifications.SchedulableTriggerInputTypes.MONTHLY, day: fireAt.getDate(), hour: fireAt.getHours(), minute: fireAt.getMinutes() },
      });

    case 'yearly':
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

    case 'none':
      if (fireAt.getTime() <= Date.now()) return null;
      return Notifications.scheduleNotificationAsync({
        content,
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: fireAt },
      });
  }
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
