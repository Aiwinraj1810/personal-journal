import { eq } from 'drizzle-orm';

import { db } from '@/db/client';
import { calendarEventReminders } from '@/db/schema';

import { hasNotificationPermission, scheduleReminder, type ReminderParentEvent } from './notifications';
import { offsetFromColumns } from './reminders';

/** One-shot startup pass: schedules any enabled reminder that's missing a
 * notification identifier — e.g. permission was denied at the moment it was
 * created (see use-calendar-events.ts), or the OS evicted a scheduled
 * notification independently of the app. Idempotent by construction: it only
 * ever touches rows that don't already have an identifier, so repeat
 * launches never create duplicate notifications. Silently does nothing if
 * notification permission isn't currently granted, rather than prompting —
 * the app only ever asks for permission at the point the user configures a
 * reminder, never on its own at startup. */
export async function reconcileReminders(): Promise<void> {
  const granted = await hasNotificationPermission();
  if (!granted) return;

  const events = await db.query.calendarEvents.findMany({ with: { reminders: true } });

  for (const event of events) {
    for (const reminder of event.reminders) {
      if (!reminder.enabled || reminder.notificationIdentifier) continue;

      const parent: ReminderParentEvent = {
        type: event.type,
        title: event.title,
        notes: event.notes,
        date: event.date,
        time: event.time,
        recurrence: event.recurrence,
      };
      const notificationIdentifier = await scheduleReminder(parent, offsetFromColumns(reminder.offsetType, reminder.offsetValue));
      if (notificationIdentifier) {
        await db.update(calendarEventReminders).set({ notificationIdentifier }).where(eq(calendarEventReminders.id, reminder.id));
      }
    }
  }
}
