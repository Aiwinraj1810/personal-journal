import { relations } from 'drizzle-orm';
import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

/** 'great' | 'good' | 'okay' | 'low' | 'awful' — see @/constants/moods for display mapping. */
export type MoodCode = 'great' | 'good' | 'okay' | 'low' | 'awful';

/** 'birthday' | 'event' | 'reminder' */
export type CalendarEventType = 'birthday' | 'event' | 'reminder';

/** 'none' | 'yearly' — only birthdays use 'yearly' today. */
export type EventRecurrence = 'none' | 'yearly';

export const entries = sqliteTable(
  'entries',
  {
    id: text('id').primaryKey(),
    /** 'YYYY-MM-DD' — the diary day this entry belongs to. */
    entryDate: text('entry_date').notNull(),
    title: text('title').notNull(),
    /** Serialized Tiptap/ProseMirror JSON document from the rich text editor. */
    bodyJson: text('body_json').notNull(),
    /** Denormalized plaintext extract of bodyJson, for search/snippets. */
    bodyPlainText: text('body_plain_text').notNull(),
    mood: text('mood').$type<MoodCode>(),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
  },
  (table) => [index('entries_entry_date_idx').on(table.entryDate)],
);

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
    notifyEnabled: integer('notify_enabled', { mode: 'boolean' }).notNull().default(true),
    /** expo-notifications scheduled identifier, so it can be cancelled/rescheduled on edit. */
    notificationIdentifier: text('notification_identifier'),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
  },
  (table) => [index('calendar_events_date_idx').on(table.date), index('calendar_events_type_idx').on(table.type)],
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
