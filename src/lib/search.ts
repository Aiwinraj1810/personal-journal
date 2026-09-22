import type { JournalBlock } from './journal-blocks';
import { parseTiptapDoc, type TiptapNode } from './tiptap';

const BLOCK_TYPES = new Set(['paragraph', 'heading', 'blockquote', 'listItem', 'codeBlock']);

/** Flattens a Tiptap JSON document (as produced by the rich text editor) into
 * plain text, for the denormalized `bodyPlainText` search/snippet column.
 * Block-level nodes are separated by newlines; inline text nodes are concatenated. */
export function extractPlainText(doc: TiptapNode | string): string {
  const root: TiptapNode = typeof doc === 'string' ? parseTiptapDoc(doc) : doc;
  const lines: string[] = [];
  let current = '';

  function walk(node: TiptapNode) {
    if (node.text) {
      current += node.text;
    }
    for (const child of node.content ?? []) {
      walk(child);
    }
    if (node.type && BLOCK_TYPES.has(node.type)) {
      lines.push(current.trim());
      current = '';
    }
  }

  walk(root);
  if (current.trim()) lines.push(current.trim());

  return lines.filter(Boolean).join('\n').trim();
}

/** Flattens an entry's ordered blocks into plain text for the denormalized
 * `bodyPlainText` search/snippet column — one text extract per block, joined
 * in document order. */
export function extractPlainTextFromBlocks(blocks: JournalBlock[]): string {
  const parts = blocks.map((block) => {
    switch (block.type) {
      case 'text':
        return extractPlainText(block.content as TiptapNode);
      case 'quote':
        return block.author ? `${block.text} — ${block.author}` : block.text;
      case 'photos':
        return block.photos
          .map((photo) => photo.caption)
          .filter((caption): caption is string => Boolean(caption))
          .join('\n');
    }
  });

  return parts.filter(Boolean).join('\n\n').trim();
}
