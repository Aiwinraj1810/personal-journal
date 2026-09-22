import { eq } from 'drizzle-orm';

import { db } from '@/db/client';
import { calendarEventReminders } from '@/db/schema';

import { toDateKey } from './date';
import { cancelReminderNotification, hasNotificationPermission, scheduleReminder, type ReminderParentEvent } from './notifications';
import { offsetFromColumns } from './reminders';

/** One-shot startup pass, run once per launch:
 *
 * 1. Schedules any enabled reminder that's missing a notification identifier
 *    — e.g. permission was denied at the moment it was created (see
 *    use-calendar-events.ts), or the OS evicted a scheduled notification
 *    independently of the app.
 * 2. Cancels any reminder whose parent's recurrence end date has passed — a
 *    native repeating trigger (daily/weekly/monthly/yearly) has no way to
 *    express "until this date" on its own (see notifications.ts), so this
 *    pass is what actually stops those notifications once their series has
 *    ended, rather than the trigger itself.
 *
 * Idempotent by construction: step 1 only touches rows without an
 * identifier, and step 2 only touches rows that still have one, so repeat
 * launches never create duplicate notifications or double-cancel. Silently
 * does nothing (for step 1) if notification permission isn't currently
 * granted, rather than prompting — the app only ever asks for permission at
 * the point the user configures a reminder, never on its own at startup. */
export async function reconcileReminders(): Promise<void> {
  const today = toDateKey(new Date());
  const events = await db.query.calendarEvents.findMany({ with: { reminders: true } });
  const granted = await hasNotificationPermission();

  for (const event of events) {
    const ended = event.recurrenceEndDate !== null && event.recurrenceEndDate < today;

    for (const reminder of event.reminders) {
      if (ended && reminder.notificationIdentifier) {
        await cancelReminderNotification(reminder.notificationIdentifier);
        await db.update(calendarEventReminders).set({ notificationIdentifier: null }).where(eq(calendarEventReminders.id, reminder.id));
        continue;
      }

      if (!granted || !reminder.enabled || reminder.notificationIdentifier || ended) continue;

      const parent: ReminderParentEvent = {
        type: event.type,
        title: event.title,
        notes: event.notes,
        date: event.date,
        time: event.time,
        recurrence: event.recurrence,
        recurrenceEndDate: event.recurrenceEndDate,
      };
      const notificationIdentifier = await scheduleReminder(parent, offsetFromColumns(reminder.offsetType, reminder.offsetValue));
      if (notificationIdentifier) {
        await db.update(calendarEventReminders).set({ notificationIdentifier }).where(eq(calendarEventReminders.id, reminder.id));
      }
    }
  }
}
