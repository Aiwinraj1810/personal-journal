import type { ReminderOffsetType } from '@/db/schema';

/** How long before the parent Event/Birthday's date+time a reminder fires.
 * "Remind me about this event" is the whole UX — this is the only thing the
 * user configures; the notification content always comes from the parent. */
export type ReminderOffset =
  | { type: 'at_time' }
  | { type: 'minutes_before'; value: number }
  | { type: 'hours_before'; value: number }
  | { type: 'days_before'; value: number };

export function offsetsEqual(a: ReminderOffset, b: ReminderOffset): boolean {
  if (a.type !== b.type) return false;
  if (a.type === 'at_time') return true;
  return a.value === (b as { value: number }).value;
}

/** Total lead time in minutes — the one number the scheduling math actually needs. */
export function offsetMinutes(offset: ReminderOffset): number {
  switch (offset.type) {
    case 'at_time':
      return 0;
    case 'minutes_before':
      return offset.value;
    case 'hours_before':
      return offset.value * 60;
    case 'days_before':
      return offset.value * 60 * 24;
  }
}

export function offsetToColumns(offset: ReminderOffset): { offsetType: ReminderOffsetType; offsetValue: number | null } {
  return offset.type === 'at_time' ? { offsetType: 'at_time', offsetValue: null } : { offsetType: offset.type, offsetValue: offset.value };
}

export function offsetFromColumns(offsetType: ReminderOffsetType, offsetValue: number | null): ReminderOffset {
  if (offsetType === 'at_time') return { type: 'at_time' };
  return { type: offsetType, value: offsetValue ?? 0 };
}

export function offsetLabel(offset: ReminderOffset): string {
  switch (offset.type) {
    case 'at_time':
      return 'At the time';
    case 'minutes_before':
      return `${offset.value} minutes before`;
    case 'hours_before':
      return offset.value === 1 ? '1 hour before' : `${offset.value} hours before`;
    case 'days_before':
      if (offset.value === 7) return '1 week before';
      return offset.value === 1 ? '1 day before' : `${offset.value} days before`;
  }
}

/** The simple, fixed preset list offered in the reminders picker — kept
 * deliberately small rather than a free-form lead-time input. */
export const REMINDER_PRESETS: ReminderOffset[] = [
  { type: 'at_time' },
  { type: 'minutes_before', value: 10 },
  { type: 'minutes_before', value: 30 },
  { type: 'hours_before', value: 1 },
  { type: 'days_before', value: 1 },
  { type: 'days_before', value: 7 },
];
