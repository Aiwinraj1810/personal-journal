import { and, desc, eq, gte, isNull, lte } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useMemo } from 'react';

import { db } from '@/db/client';
import { type MoodCode, entries } from '@/db/schema';
import { type DateKey } from '@/lib/date';
import { uuid } from '@/lib/id';
import { firstPhoto, parseBlocks, serializeBlocks, type JournalBlock } from '@/lib/journal-blocks';
import { extractPlainTextFromBlocks } from '@/lib/search';

export type JournalEntryRow = typeof entries.$inferSelect;

function parseTags(raw: string): string[] {
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as string[]) : [];
  } catch {
    return [];
  }
}

/** Reads a row's `blocksJson`/`tags` columns into their in-memory shapes. Every
 * read hook below returns rows through this, so consumers never touch the
 * raw serialized columns directly. */
export function withParsedEntry<T extends JournalEntryRow>(row: T): T & { blocks: JournalBlock[]; parsedTags: string[] } {
  return { ...row, blocks: parseBlocks(row.blocksJson), parsedTags: parseTags(row.tags) };
}

export type ParsedJournalEntry = ReturnType<typeof withParsedEntry>;

const notDeleted = isNull(entries.deletedAt);

/** All entries for one calendar day, most recently updated first. */
export function useEntriesForDate(date: DateKey) {
  const { data, updatedAt } = useLiveQuery(
    db.query.entries.findMany({
      where: and(eq(entries.entryDate, date), notDeleted),
      orderBy: [desc(entries.updatedAt)],
    }),
  );
  return { entries: (data ?? []).map(withParsedEntry), updatedAt };
}

/** Most recent entries across all dates, for the Home "Recent Entries" list. */
export function useRecentEntries(limit = 20) {
  const { data, updatedAt } = useLiveQuery(
    db.query.entries.findMany({
      where: notDeleted,
      orderBy: [desc(entries.updatedAt)],
      limit,
    }),
  );
  return { entries: (data ?? []).map(withParsedEntry), updatedAt };
}

/** A single entry with its blocks, for the detail/edit screens. */
export function useEntry(id: string | undefined) {
  const { data, updatedAt } = useLiveQuery(
    db.query.entries.findFirst({
      where: id ? and(eq(entries.id, id), notDeleted) : undefined,
    }),
    [id],
  );
  return { entry: id && data ? withParsedEntry(data) : undefined, updatedAt };
}

/** Distinct dates in `[start, end]` that have at least one (non-deleted) entry, for calendar dots. */
export function useEntryDatesInRange(start: DateKey, end: DateKey) {
  const { data } = useLiveQuery(
    db
      .selectDistinct({ entryDate: entries.entryDate })
      .from(entries)
      .where(and(gte(entries.entryDate, start), lte(entries.entryDate, end), notDeleted)),
  );
  return useMemo(() => new Set((data ?? []).map((row) => row.entryDate)), [data]);
}

export type CreateEntryInput = {
  entryDate: DateKey;
  title: string;
  mood: MoodCode | null;
  tags: string[];
  blocks: JournalBlock[];
};

export async function createEntry(input: CreateEntryInput): Promise<string> {
  const now = Date.now();
  const id = uuid();
  const cover = firstPhoto(input.blocks);
  await db.insert(entries).values({
    id,
    entryDate: input.entryDate,
    title: input.title,
    blocksJson: serializeBlocks(input.blocks),
    bodyPlainText: extractPlainTextFromBlocks(input.blocks),
    mood: input.mood,
    tags: JSON.stringify(input.tags),
    createdAt: now,
    updatedAt: now,
    coverImageUrl: cover?.url ?? null,
    coverImageWidth: cover?.width ?? null,
    coverImageHeight: cover?.height ?? null,
  });
  return id;
}

export type UpdateEntryInput = {
  id: string;
  title: string;
  mood: MoodCode | null;
  tags: string[];
  blocks: JournalBlock[];
};

export async function updateEntry(input: UpdateEntryInput): Promise<void> {
  const cover = firstPhoto(input.blocks);
  await db
    .update(entries)
    .set({
      title: input.title,
      blocksJson: serializeBlocks(input.blocks),
      bodyPlainText: extractPlainTextFromBlocks(input.blocks),
      mood: input.mood,
      tags: JSON.stringify(input.tags),
      updatedAt: Date.now(),
      coverImageUrl: cover?.url ?? null,
      coverImageWidth: cover?.width ?? null,
      coverImageHeight: cover?.height ?? null,
    })
    .where(eq(entries.id, input.id));
}

/** Soft-deletes the entry — sets `deletedAt` rather than removing the row, so
 * a future sync can propagate the deletion (latest `updatedAt` wins). Every
 * read hook above filters these out. No Cloudinary cleanup happens here —
 * see PhotoBlock's per-photo removal (in the composer) for that; whole-entry
 * deletion deliberately doesn't cascade into destroying images, both to keep
 * this path simple and because a soft-deleted entry may still need its
 * images if the delete is ever undone before a permanent purge. */
export async function deleteEntry(id: string): Promise<void> {
  await db.update(entries).set({ deletedAt: Date.now() }).where(eq(entries.id, id));
}
