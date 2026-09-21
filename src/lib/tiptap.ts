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

function isImageWithPublicId(node: TiptapNode, publicId: string): boolean {
  const src = node.attrs?.src;
  return node.type === 'image' && typeof src === 'string' && src.includes(publicId);
}

/** Recursively strips any `image` node whose `src` references `publicId` —
 * used when a user removes a photo's thumbnail chip in the composer, so the
 * embedded copy inside the body disappears too, not just the chip. */
export function removeImageByPublicId(doc: TiptapNode, publicId: string): TiptapNode {
  if (!doc.content) return doc;
  return {
    ...doc,
    content: doc.content.filter((child) => !isImageWithPublicId(child, publicId)).map((child) => removeImageByPublicId(child, publicId)),
  };
}
