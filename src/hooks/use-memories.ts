import { and, desc, isNotNull, isNull, ne, sql } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useMemo } from 'react';

import { db } from '@/db/client';
import { entries, type MoodCode } from '@/db/schema';
import { type DateKey, toDateKey } from '@/lib/date';

/** A derived presentation model for the Home screen's memory carousel — not a
 * stored table. The Journal Entry (`entries`) stays the one source of truth;
 * this is just a lightweight reshaping of a few of its columns, computed
 * fresh every time the Home screen loads. */
export type Memory = {
  id: string;
  journalId: string;
  date: DateKey;
  title?: string;
  preview?: string;
  image?: string;
  mood?: MoodCode | null;
  isOnThisDay: boolean;
};

const MAX_MEMORIES = 8;
const MAX_ON_THIS_DAY = 3;
const PREVIEW_MAX_LENGTH = 90;
const CANDIDATE_POOL_LIMIT = 40;

const notDeleted = isNull(entries.deletedAt);

// Only the columns a memory card actually needs — `bodyPlainText` and
// `coverImageUrl` are already denormalized on `entries` for exactly this
// kind of cheap read, so generating memories never has to parse a single
// entry's full `blocksJson`.
const memoryColumns = {
  id: entries.id,
  entryDate: entries.entryDate,
  title: entries.title,
  mood: entries.mood,
  bodyPlainText: entries.bodyPlainText,
  coverImageUrl: entries.coverImageUrl,
};

type MemoryRow = {
  id: string;
  entryDate: string;
  title: string;
  mood: MoodCode | null;
  bodyPlainText: string;
  coverImageUrl: string | null;
};

function buildPreview(bodyPlainText: string): string | undefined {
  const text = bodyPlainText.trim();
  if (!text) return undefined;
  if (text.length <= PREVIEW_MAX_LENGTH) return text;
  return `${text.slice(0, PREVIEW_MAX_LENGTH).trimEnd()}…`;
}

function toMemory(row: MemoryRow, isOnThisDay: boolean): Memory {
  return {
    id: row.id,
    journalId: row.id,
    date: row.entryDate,
    title: row.title || undefined,
    preview: buildPreview(row.bodyPlainText),
    image: row.coverImageUrl ?? undefined,
    mood: row.mood,
    isOnThisDay,
  };
}

/** A small deterministic PRNG seeded by today's date — keeps the non-"on
 * this day" portion of the carousel in a stable order for the whole day (no
 * visible reshuffling on re-render) while still rotating which memories
 * surface from one day to the next, giving the "feels varied" quality the
 * carousel wants without any real randomness or extra state to manage. */
function seededShuffle<T>(items: T[], seed: string): T[] {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    h = (h * 1103515245 + 12345) >>> 0;
    const j = h % (i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/** Derives a small, varied set of "memory" cards for the Home screen carousel:
 * entries from today's month/day in previous years ("On This Day") first,
 * then a day-stable shuffled sample of other photo-bearing entries, falling
 * back to plain entries only if there isn't enough photo content. Today's
 * own entry is excluded everywhere — it's shown in the "Today" section
 * already, not as a memory. Every entry appears at most once. */
export function useMemories(): Memory[] {
  const today = toDateKey(new Date());
  const monthDay = today.slice(5); // 'MM-DD'

  const { data: onThisDayRows } = useLiveQuery(
    db
      .select(memoryColumns)
      .from(entries)
      .where(and(notDeleted, sql`substr(${entries.entryDate}, 6, 5) = ${monthDay}`, ne(entries.entryDate, today)))
      .orderBy(desc(entries.entryDate)),
  );

  const { data: photoRows } = useLiveQuery(
    db
      .select(memoryColumns)
      .from(entries)
      .where(and(notDeleted, isNotNull(entries.coverImageUrl), ne(entries.entryDate, today)))
      .orderBy(desc(entries.entryDate))
      .limit(CANDIDATE_POOL_LIMIT),
  );

  const { data: recentRows } = useLiveQuery(
    db
      .select(memoryColumns)
      .from(entries)
      .where(and(notDeleted, ne(entries.entryDate, today)))
      .orderBy(desc(entries.entryDate))
      .limit(20),
  );

  return useMemo(() => {
    const seen = new Set<string>();
    const memories: Memory[] = [];

    for (const row of (onThisDayRows ?? []) as MemoryRow[]) {
      if (memories.length >= MAX_ON_THIS_DAY) break;
      if (seen.has(row.id)) continue;
      seen.add(row.id);
      memories.push(toMemory(row, true));
    }

    const shuffledPhotos = seededShuffle((photoRows ?? []) as MemoryRow[], today);
    for (const row of shuffledPhotos) {
      if (memories.length >= MAX_MEMORIES) break;
      if (seen.has(row.id)) continue;
      seen.add(row.id);
      memories.push(toMemory(row, false));
    }

    // Not enough visual content yet (a new journal) — fill remaining slots
    // with plain recent entries rather than leaving the carousel sparse.
    if (memories.length < 3) {
      for (const row of (recentRows ?? []) as MemoryRow[]) {
        if (memories.length >= MAX_MEMORIES) break;
        if (seen.has(row.id)) continue;
        seen.add(row.id);
        memories.push(toMemory(row, false));
      }
    }

    return memories;
  }, [onThisDayRows, photoRows, recentRows, today]);
}
