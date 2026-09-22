import { relations } from 'drizzle-orm';
import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

/** 'great' | 'good' | 'okay' | 'low' | 'awful' — see @/constants/moods for display mapping. */
export type MoodCode = 'great' | 'good' | 'okay' | 'low' | 'awful';

/** 'birthday' | 'event' | 'reminder' */
export type CalendarEventType = 'birthday' | 'event' | 'reminder';

/** Birthdays are always 'yearly' (forced, not user-chosen). Events default to
 * 'none' but may repeat daily/weekly/monthly/yearly. No interval (e.g. "every
 * 2 weeks") yet — every native expo-notifications repeating trigger is a
 * fixed period of 1, and the UI stays simpler without it; see @/lib/recurrence. */
export type EventRecurrence = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';

/** How long before (or "at") the parent Event/Birthday's date+time a reminder
 * fires. See @/lib/reminders for the in-memory `ReminderOffset` union this
 * pair of columns represents — `offsetValue` is unused (null) for 'at_time'. */
export type ReminderOffsetType = 'at_time' | 'minutes_before' | 'hours_before' | 'days_before';

export const entries = sqliteTable(
  'entries',
  {
    id: text('id').primaryKey(),
    /** 'YYYY-MM-DD' — the diary day this entry belongs to. */
    entryDate: text('entry_date').notNull(),
    title: text('title').notNull(),
    /** Serialized JournalBlock[] — see @/lib/journal-blocks. */
    blocksJson: text('blocks_json').notNull(),
    /** Denormalized plaintext extract of blocksJson, for search/snippets. */
    bodyPlainText: text('body_plain_text').notNull(),
    mood: text('mood').$type<MoodCode>(),
    /** Serialized string[]. */
    tags: text('tags').notNull().default('[]'),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
    /** Soft delete — null means active. Never hard-deleted, for future sync. */
    deletedAt: integer('deleted_at'),
    /** Denormalized from the first photo block in document order, so Home
     * thumbnails don't need a join against entry_images. */
    coverImageUrl: text('cover_image_url'),
    coverImageWidth: integer('cover_image_width'),
    coverImageHeight: integer('cover_image_height'),
  },
  (table) => [index('entries_entry_date_idx').on(table.entryDate)],
);

/** Legacy side table — superseded by photos living directly inside PhotoBlocks
 * in entries.blocksJson. No longer written to by the app; kept only so old
 * rows/backups stay readable until a later migration drops it entirely. */
export const entryImages = sqliteTable(
  'entry_images',
  {
    id: text('id').primaryKey(),
    entryId: text('entry_id')
      .notNull()
      .references(() => entries.id, { onDelete: 'cascade' }),
    /** Needed to issue a signed Cloudinary destroy call when an image is removed. */
    cloudinaryPublicId: text('cloudinary_public_id').notNull(),
    cloudinaryUrl: text('cloudinary_url').notNull(),
    width: integer('width'),
    height: integer('height'),
    /** Used as the Home hero/list thumbnail for the entry. */
    isCover: integer('is_cover', { mode: 'boolean' }).notNull().default(false),
    createdAt: integer('created_at').notNull(),
  },
  (table) => [index('entry_images_entry_id_idx').on(table.entryId)],
);

export const calendarEvents = sqliteTable(
  'calendar_events',
  {
    id: text('id').primaryKey(),
    type: text('type').$type<CalendarEventType>().notNull(),
    title: text('title').notNull(),
    notes: text('notes'),
    /** 'YYYY-MM-DD' anchor date — for birthdays this keeps the birth year, for age calc. */
    date: text('date').notNull(),
    /** 'HH:mm' 24h, nullable — null means all-day, no notification time. */
    time: text('time'),
    recurrence: text('recurrence').$type<EventRecurrence>().notNull().default('none'),
    /** 'YYYY-MM-DD', nullable — only meaningful when recurrence !== 'none'.
     * Null means "repeats forever" (the common case, and the only one a
     * native expo-notifications repeating trigger can express — see
     * @/lib/notifications). A set end date is honored for occurrence/
     * Upcoming display and for best-effort notification cleanup via the
     * startup reconciliation pass, not by the notification trigger itself. */
    recurrenceEndDate: text('recurrence_end_date'),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
  },
  (table) => [index('calendar_events_date_idx').on(table.date), index('calendar_events_type_idx').on(table.type)],
);

/** A reminder configuration attached to an Event/Birthday — the event/birthday
 * itself stays the source of truth (title/date/time/notes); a reminder only
 * describes *when relative to that* a notification should fire. One event can
 * have several of these (see @/lib/reminders for the offset presets). Mirrors
 * the entryImages child-table pattern already used elsewhere in this schema. */
export const calendarEventReminders = sqliteTable(
  'calendar_event_reminders',
  {
    id: text('id').primaryKey(),
    eventId: text('event_id')
      .notNull()
      .references(() => calendarEvents.id, { onDelete: 'cascade' }),
    offsetType: text('offset_type').$type<ReminderOffsetType>().notNull(),
    /** Magnitude for minutes/hours/days_before; null for at_time. */
    offsetValue: integer('offset_value'),
    enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
    /** expo-notifications scheduled identifier for THIS reminder — device-
     * local, never treated as portable backup data (see lib/backup.ts). */
    notificationIdentifier: text('notification_identifier'),
    createdAt: integer('created_at').notNull(),
  },
  (table) => [index('calendar_event_reminders_event_id_idx').on(table.eventId)],
);

export const appSettings = sqliteTable('app_settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});

export const entriesRelations = relations(entries, ({ many }) => ({
  images: many(entryImages),
}));

export const entryImagesRelations = relations(entryImages, ({ one }) => ({
  entry: one(entries, { fields: [entryImages.entryId], references: [entries.id] }),
}));

export const calendarEventsRelations = relations(calendarEvents, ({ many }) => ({
  reminders: many(calendarEventReminders),
}));

export const calendarEventRemindersRelations = relations(calendarEventReminders, ({ one }) => ({
  event: one(calendarEvents, { fields: [calendarEventReminders.eventId], references: [calendarEvents.id] }),
}));
