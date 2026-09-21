import { and, desc, eq, gte, lte } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useMemo } from 'react';

import { db } from '@/db/client';
import { type MoodCode, entries, entryImages } from '@/db/schema';
import { type DateKey } from '@/lib/date';
import { uuid } from '@/lib/id';
import { extractPlainText } from '@/lib/search';

export type EntryWithImages = typeof entries.$inferSelect & {
  images: (typeof entryImages.$inferSelect)[];
};

/** All entries for one calendar day, most recently updated first. */
export function useEntriesForDate(date: DateKey) {
  const { data, updatedAt } = useLiveQuery(
    db.query.entries.findMany({
      where: eq(entries.entryDate, date),
      with: { images: true },
      orderBy: [desc(entries.updatedAt)],
    }),
  );
  return { entries: (data ?? []) as EntryWithImages[], updatedAt };
}

/** Most recent entries across all dates, for the Home "Recent Entries" list. */
export function useRecentEntries(limit = 20) {
  const { data, updatedAt } = useLiveQuery(
    db.query.entries.findMany({
      with: { images: true },
      orderBy: [desc(entries.updatedAt)],
      limit,
    }),
  );
  return { entries: (data ?? []) as EntryWithImages[], updatedAt };
}

/** A single entry with its images, for the detail/edit screens. */
export function useEntry(id: string | undefined) {
  const { data, updatedAt } = useLiveQuery(
    db.query.entries.findFirst({
      where: id ? eq(entries.id, id) : undefined,
      with: { images: true },
    }),
    [id],
  );
  return { entry: (id ? data : undefined) as EntryWithImages | undefined, updatedAt };
}

/** Distinct dates in `[start, end]` that have at least one entry, for calendar dots. */
export function useEntryDatesInRange(start: DateKey, end: DateKey) {
  const { data } = useLiveQuery(
    db
      .selectDistinct({ entryDate: entries.entryDate })
      .from(entries)
      .where(and(gte(entries.entryDate, start), lte(entries.entryDate, end))),
  );
  return useMemo(() => new Set((data ?? []).map((row) => row.entryDate)), [data]);
}

export type CreateEntryInput = {
  entryDate: DateKey;
  title: string;
  bodyJson: string;
  mood: MoodCode | null;
};

export async function createEntry(input: CreateEntryInput): Promise<string> {
  const now = Date.now();
  const id = uuid();
  await db.insert(entries).values({
    id,
    entryDate: input.entryDate,
    title: input.title,
    bodyJson: input.bodyJson,
    bodyPlainText: extractPlainText(input.bodyJson),
    mood: input.mood,
    createdAt: now,
    updatedAt: now,
  });
  return id;
}

export type UpdateEntryInput = {
  id: string;
  title: string;
  bodyJson: string;
  mood: MoodCode | null;
};

export async function updateEntry(input: UpdateEntryInput): Promise<void> {
  await db
    .update(entries)
    .set({
      title: input.title,
      bodyJson: input.bodyJson,
      bodyPlainText: extractPlainText(input.bodyJson),
      mood: input.mood,
      updatedAt: Date.now(),
    })
    .where(eq(entries.id, input.id));
}

/** Deletes the entry row; `entry_images` cascade-deletes with it (the caller is
 * responsible for issuing the matching Cloudinary `destroyImage` calls first —
 * see entry-options-sheet, which reads the images before calling this). */
export async function deleteEntry(id: string): Promise<void> {
  await db.delete(entries).where(eq(entries.id, id));
}

export async function addEntryImage(input: {
  entryId: string;
  cloudinaryPublicId: string;
  cloudinaryUrl: string;
  width: number;
  height: number;
  isCover: boolean;
}): Promise<void> {
  await db.insert(entryImages).values({
    id: uuid(),
    entryId: input.entryId,
    cloudinaryPublicId: input.cloudinaryPublicId,
    cloudinaryUrl: input.cloudinaryUrl,
    width: input.width,
    height: input.height,
    isCover: input.isCover,
    createdAt: Date.now(),
  });
}

/** Removes the DB row only — callers issue the Cloudinary `destroyImage` call
 * separately (network + DB write are kept independent so a network failure
 * doesn't block the local removal). */
export async function removeEntryImage(id: string): Promise<void> {
  await db.delete(entryImages).where(eq(entryImages.id, id));
}
