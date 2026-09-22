import type { EditorBridge } from '@10play/tentap-editor';

import type { JournalBlock, PhotoBlock } from '@/lib/journal-blocks';

import { PhotoBlockView } from './photo-block';
import { QuoteBlockView } from './quote-block';
import { TextBlockView } from './text-block';

export type JournalBlockRendererProps = {
  block: JournalBlock;
  mode: 'edit' | 'read';
  onChange?: (next: JournalBlock) => void;
  /** Removes this block entirely. Edit mode only. */
  onRemove?: () => void;
  /** PhotoBlock only — see PhotoBlockView for why this is distinct from onChange. */
  onPhotoRemoved?: (photo: PhotoBlock['photos'][number]) => void;
  /** TextBlock (edit mode) only — see TextBlockView. */
  onRegisterEditor?: (blockId: string, editor: EditorBridge) => void;
  onUnregisterEditor?: (blockId: string) => void;
  onFocusChange?: (blockId: string, focused: boolean, editor: EditorBridge) => void;
};

/** Dispatches a single journal block to its type-specific component. The one
 * place in the app that knows about all block types — TextBlock/PhotoBlock/
 * QuoteBlock components only ever know about themselves, which is what lets
 * a future block type be added without touching them. Used identically by
 * both the composer (mode="edit") and the read-only entry detail screen
 * (mode="read"). */
export function JournalBlockRenderer({
  block,
  mode,
  onChange,
  onRemove,
  onPhotoRemoved,
  onRegisterEditor,
  onUnregisterEditor,
  onFocusChange,
}: JournalBlockRendererProps) {
  switch (block.type) {
    case 'text':
      return (
        <TextBlockView
          block={block}
          mode={mode}
          onRegisterEditor={onRegisterEditor}
          onUnregisterEditor={onUnregisterEditor}
          onFocusChange={onFocusChange}
        />
      );
    case 'photos':
      return <PhotoBlockView block={block} mode={mode} onChange={onChange} onRemove={onRemove} onPhotoRemoved={onPhotoRemoved} />;
    case 'quote':
      return <QuoteBlockView block={block} mode={mode} onChange={onChange} onRemove={onRemove} />;
  }
}
