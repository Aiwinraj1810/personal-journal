/** Shared Tiptap/ProseMirror JSON node shape — the minimal fields every
 * consumer in this app needs (search extraction, the news-article read view,
 * removing an image node by Cloudinary public ID). Matches TenTap's default
 * StarterKit schema, which is standard Tiptap — stable across versions, not
 * an Expo-specific moving target. */
export type TiptapMark = { type: string; attrs?: Record<string, unknown> };
export type TiptapNode = {
  type?: string;
  text?: string;
  marks?: TiptapMark[];
  attrs?: Record<string, unknown>;
  content?: TiptapNode[];
};

export function parseTiptapDoc(json: string): TiptapNode {
  try {
    return JSON.parse(json) as TiptapNode;
  } catch {
    return { type: 'doc', content: [] };
  }
}

/** Recursively strips every `image` node out of a legacy (pre-block-model)
 * Tiptap document, returning the cleaned doc plus the `src` of every image
 * found, in document order. Used only by the one-time legacy-blocks
 * migration (see @/db/migrate-legacy-blocks) to split an old single-document
 * entry into a TextBlock (the cleaned doc) and a PhotoBlock (the images,
 * matched back to their `entry_images` row by URL). */
export function extractAndStripImages(doc: TiptapNode): { doc: TiptapNode; imageSrcs: string[] } {
  const imageSrcs: string[] = [];

  function strip(node: TiptapNode): TiptapNode {
    if (!node.content) return node;
    const content: TiptapNode[] = [];
    for (const child of node.content) {
      if (child.type === 'image') {
        const src = child.attrs?.src;
        if (typeof src === 'string') imageSrcs.push(src);
        continue;
      }
      content.push(strip(child));
    }
    return { ...node, content };
  }

  return { doc: strip(doc), imageSrcs };
}
