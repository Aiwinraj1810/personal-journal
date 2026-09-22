import type { JSONContent } from '@tiptap/core';

import { uuid } from './id';

/** The ordered, typed content of a journal entry. `@10play/tentap-editor` only
 * ever owns the `content` of a TextBlock — photos, quotes, and the overall
 * entry layout are native RN, not editor concerns. */
export type TextBlock = { id: string; type: 'text'; content: JSONContent };

export type PhotoBlock = {
  id: string;
  type: 'photos';
  photos: {
    id: string;
    url: string;
    width: number;
    height: number;
    /** Internal only, never shown in the UI — lets an explicit single-photo
     * removal also issue a Cloudinary destroy call, like the app did before
     * this refactor. Not used for whole-block/whole-entry deletion. */
    cloudinaryPublicId: string;
    caption?: string;
  }[];
};

export type QuoteBlock = { id: string; type: 'quote'; text: string; author?: string };

export type JournalBlock = TextBlock | PhotoBlock | QuoteBlock;

/** A single empty paragraph — a valid, ready-to-type TenTap document. */
export function createEmptyTextBlock(): TextBlock {
  return { id: uuid(), type: 'text', content: { type: 'doc', content: [{ type: 'paragraph' }] } };
}

/** Parses a `blocksJson` column value. Never throws — an unparseable or
 * legacy (pre-migration) value yields an empty block list rather than
 * crashing the composer; the one-time DB migration is what's responsible for
 * actually converting legacy rows before the app reads them this way. */
export function parseBlocks(raw: string): JournalBlock[] {
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as JournalBlock[]) : [];
  } catch {
    return [];
  }
}

export function serializeBlocks(blocks: JournalBlock[]): string {
  return JSON.stringify(blocks);
}

/** The first photo in document order, used to derive the denormalized
 * `coverImage*` columns on save. */
export function firstPhoto(blocks: JournalBlock[]): { url: string; width: number; height: number } | undefined {
  for (const block of blocks) {
    if (block.type === 'photos' && block.photos.length > 0) {
      const { url, width, height } = block.photos[0];
      return { url, width, height };
    }
  }
  return undefined;
}
