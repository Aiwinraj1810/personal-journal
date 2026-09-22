import { asc, eq, inArray } from 'drizzle-orm';

import { serializeBlocks, type JournalBlock, type PhotoBlock, type TextBlock } from '@/lib/journal-blocks';
import { uuid } from '@/lib/id';
import { extractAndStripImages, parseTiptapDoc } from '@/lib/tiptap';

import { db } from './client';
import { appSettings, entries, entryImages } from './schema';

const MIGRATION_FLAG_KEY = 'legacyBlocksMigrated';
const BATCH_SIZE = 100;

type EntryRow = typeof entries.$inferSelect;
type EntryImageRow = typeof entryImages.$inferSelect;

type LegacyWrapResult = {
  blocks: JournalBlock[];
  coverImageUrl: string | null;
  coverImageWidth: number | null;
  coverImageHeight: number | null;
};

/** Converts one legacy (pre-block-model) entry row — whose `blocksJson`
 * column still holds a single whole-document Tiptap JSON string, the shape
 * used before this refactor — into the new block model: one TextBlock
 * wrapping the document with its inline `image` nodes stripped out, plus a
 * PhotoBlock for those images if there were any. Images are matched back to
 * their `entry_images` row by URL so width/height/publicId/isCover survive,
 * kept in the document's original inline order; any entry_images row that
 * couldn't be matched to an inline node is appended at the end rather than
 * silently dropped. Pure function — reused by both the one-time on-device
 * migration below and the legacy (v1) backup-import path in @/lib/backup. */
export function wrapLegacyEntryAsBlocks(entryRow: EntryRow, imageRows: EntryImageRow[]): LegacyWrapResult {
  const legacyDoc = parseTiptapDoc(entryRow.blocksJson);
  const { doc: cleanedDoc, imageSrcs } = extractAndStripImages(legacyDoc);

  const remaining = [...imageRows];
  const orderedImages: EntryImageRow[] = [];
  for (const src of imageSrcs) {
    const matchIndex = remaining.findIndex((row) => src.includes(row.cloudinaryPublicId) || row.cloudinaryUrl === src);
    if (matchIndex < 0) continue;
    orderedImages.push(remaining[matchIndex]);
    remaining.splice(matchIndex, 1);
  }
  orderedImages.push(...remaining);

  const textBlock: TextBlock = { id: uuid(), type: 'text', content: cleanedDoc };
  const blocks: JournalBlock[] = [textBlock];

  if (orderedImages.length > 0) {
    const photoBlock: PhotoBlock = {
      id: uuid(),
      type: 'photos',
      photos: orderedImages.map((row) => ({
        id: uuid(),
        url: row.cloudinaryUrl,
        width: row.width ?? 0,
        height: row.height ?? 0,
        cloudinaryPublicId: row.cloudinaryPublicId,
      })),
    };
    blocks.push(photoBlock);
  }

  const cover = orderedImages.find((row) => row.isCover) ?? orderedImages[0];
  return {
    blocks,
    coverImageUrl: cover?.cloudinaryUrl ?? null,
    coverImageWidth: cover?.width ?? null,
    coverImageHeight: cover?.height ?? null,
  };
}

/** A legacy row's `blocksJson` parses to a bare Tiptap doc object; a
 * migrated row's parses to an array. Fully reliable either way, which is
 * what makes this whole pass safely resumable/idempotent without needing a
 * per-row flag — only the table-level `legacyBlocksMigrated` setting is used,
 * purely as a fast-path skip on already-migrated installs. */
function isLegacyRow(blocksJson: string): boolean {
  try {
    return !Array.isArray(JSON.parse(blocksJson));
  } catch {
    return false;
  }
}

/** One-time pass converting any pre-refactor entry rows to the block model
 * in place. Call once from the root layout, after `useDatabaseMigrations()`
 * (the SQL schema migration that renames body_json -> blocks_json and adds
 * the new columns) has succeeded. Processes rows in batches so it never
 * loads the whole table into memory, even on a large journal. */
export async function migrateLegacyBlocks(): Promise<void> {
  const [flag] = await db.select().from(appSettings).where(eq(appSettings.key, MIGRATION_FLAG_KEY)).limit(1);
  if (flag?.value === 'true') return;

  let offset = 0;
  for (;;) {
    const batch = await db.select().from(entries).orderBy(asc(entries.id)).limit(BATCH_SIZE).offset(offset);
    if (batch.length === 0) break;

    const legacyRows = batch.filter((row) => isLegacyRow(row.blocksJson));
    if (legacyRows.length > 0) {
      const imageRows = await db
        .select()
        .from(entryImages)
        .where(inArray(entryImages.entryId, legacyRows.map((row) => row.id)));

      for (const row of legacyRows) {
        const rowImages = imageRows.filter((img) => img.entryId === row.id);
        const result = wrapLegacyEntryAsBlocks(row, rowImages);
        await db
          .update(entries)
          .set({
            blocksJson: serializeBlocks(result.blocks),
            coverImageUrl: result.coverImageUrl,
            coverImageWidth: result.coverImageWidth,
            coverImageHeight: result.coverImageHeight,
          })
          .where(eq(entries.id, row.id));
      }
    }

    offset += BATCH_SIZE;
  }

  await db
    .insert(appSettings)
    .values({ key: MIGRATION_FLAG_KEY, value: 'true' })
    .onConflictDoUpdate({ target: appSettings.key, set: { value: 'true' } });
}
