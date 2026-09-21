import * as Notifications from 'expo-notifications';

import type { CalendarEventType, EventRecurrence } from '@/db/schema';

import { type DateKey, fromDateKey } from './date';

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

export type ScheduleEventInput = {
  type: CalendarEventType;
  title: string;
  notes?: string | null;
  date: DateKey;
  /** 'HH:mm' 24h, or null for an all-day event with nothing to schedule. */
  time: string | null;
  recurrence: EventRecurrence;
};

/** Cancels the previous scheduled notification for this event (if any) and, if the
 * event has a time set, schedules a fresh one matching its current date/time/
 * recurrence. Returns the new identifier to persist on the row, or null if there
 * is nothing to schedule (no time, or a one-off date that has already passed). */
export async function syncEventNotification(
  event: ScheduleEventInput,
  previousIdentifier: string | null,
): Promise<string | null> {
  if (previousIdentifier) {
    await cancelEventNotification(previousIdentifier);
  }

  // Callers only invoke this when notifyEnabled is true; an all-day event (no
  // time) simply has nothing to schedule.
  if (!event.time) return null;

  const [hourStr, minuteStr] = event.time.split(':');
  const hour = Number(hourStr);
  const minute = Number(minuteStr);

  const content: Notifications.NotificationContentInput = {
    title: eventNotificationTitle(event.type, event.title),
    body: event.notes ?? undefined,
  };

  if (event.recurrence === 'yearly') {
    const anchor = fromDateKey(event.date);
    return Notifications.scheduleNotificationAsync({
      content,
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.YEARLY,
        day: anchor.getDate(),
        month: anchor.getMonth(),
        hour,
        minute,
      },
    });
  }

  const fireDate = fromDateKey(event.date);
  fireDate.setHours(hour, minute, 0, 0);
  if (fireDate.getTime() <= Date.now()) return null;

  return Notifications.scheduleNotificationAsync({
    content,
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: fireDate },
  });
}

export async function cancelEventNotification(identifier: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(identifier).catch(() => {
    // Already fired or was never scheduled — nothing to clean up.
  });
}

function eventNotificationTitle(type: CalendarEventType, title: string): string {
  if (type === 'birthday') return `🎂 ${title}’s birthday`;
  if (type === 'reminder') return `⏰ ${title}`;
  return title;
}
