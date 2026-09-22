import { type EditorBridge, RichText, useBridgeState } from '@10play/tentap-editor';
import { Image } from 'expo-image';
import { type ReactNode, useEffect } from 'react';
import { Platform, Text, View } from 'react-native';

import { FontFamily } from '@/constants/fonts';
import { useJournalEditor } from '@/hooks/use-journal-editor';
import { useTheme } from '@/hooks/use-theme';
import type { TextBlock } from '@/lib/journal-blocks';
import { type TiptapNode } from '@/lib/tiptap';

const MONO_FONT = Platform.select({ ios: 'ui-monospace', default: 'monospace' });

/** A fixed height for each Text Block's editor, with TenTap's default
 * internal scroll for anything beyond it — see the long comment in
 * useJournalEditor for why this isn't `dynamicHeight` instead. Roomy enough
 * for a few paragraphs before scrolling kicks in. */
const TEXT_BLOCK_HEIGHT = 220;

export type TextBlockViewProps = {
  block: TextBlock;
  mode: 'edit' | 'read';
  /** Edit mode only — the composer needs each Text Block's live editor bridge
   * to pull its content via `getJSON()` at save time, and to bind the single
   * shared Toolbar to whichever block is currently focused (a per-block
   * Toolbar can't be used here: it's fixed to the screen bottom via absolute
   * positioning, which only resolves correctly as a sibling of the
   * composer's ScrollView, not nested inside one block's own view). */
  onRegisterEditor?: (blockId: string, editor: EditorBridge) => void;
  onUnregisterEditor?: (blockId: string) => void;
  onFocusChange?: (blockId: string, focused: boolean, editor: EditorBridge) => void;
};

export function TextBlockView({ block, mode, onRegisterEditor, onUnregisterEditor, onFocusChange }: TextBlockViewProps) {
  if (mode === 'read') return <TextBlockRead block={block} />;
  return <TextBlockEdit block={block} onRegisterEditor={onRegisterEditor} onUnregisterEditor={onUnregisterEditor} onFocusChange={onFocusChange} />;
}

function TextBlockEdit({
  block,
  onRegisterEditor,
  onUnregisterEditor,
  onFocusChange,
}: Omit<TextBlockViewProps, 'mode'>) {
  const editor = useJournalEditor(block.content);
  const editorState = useBridgeState(editor);

  useEffect(() => {
    onRegisterEditor?.(block.id, editor);
    return () => onUnregisterEditor?.(block.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [block.id]);

  useEffect(() => {
    onFocusChange?.(block.id, editorState.isFocused, editor);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [block.id, editorState.isFocused, onFocusChange]);

  return (
    <View style={{ height: TEXT_BLOCK_HEIGHT }}>
      <RichText editor={editor} />
    </View>
  );
}

function TextBlockRead({ block }: { block: TextBlock }) {
  const theme = useTheme();
  const doc = block.content as TiptapNode;
  const nodes = doc.content ?? [];

  if (nodes.length === 0) return null;

  return (
    <View className="gap-four">
      {nodes.map((node, index) => (
        <ReadNode key={index} node={node} theme={theme} />
      ))}
    </View>
  );
}

function ReadNode({ node, theme }: { node: TiptapNode; theme: ReturnType<typeof useTheme> }) {
  switch (node.type) {
    case 'heading': {
      const level = (node.attrs?.level as number) ?? 1;
      const sizes: Record<number, string> = {
        1: 'text-[26px] leading-[32px]',
        2: 'text-[22px] leading-[28px]',
        3: 'text-[19px] leading-[26px]',
      };
      return (
        <Text className={`font-sans-bold ${sizes[level] ?? sizes[3]}`} style={{ color: theme.text }}>
          {renderInline(node.content, theme)}
        </Text>
      );
    }
    case 'paragraph':
      if (!node.content?.length) return null;
      return (
        <Text className="font-sans text-[17px] leading-[27px]" style={{ color: theme.text }}>
          {renderInline(node.content, theme)}
        </Text>
      );
    case 'blockquote':
      return (
        <View className="border-l-2 pl-three" style={{ borderColor: theme.backgroundSelected }}>
          {(node.content ?? []).map((child, i) => (
            <Text
              key={i}
              className="text-[16px] leading-[25px]"
              style={{ color: theme.textSecondary, fontFamily: FontFamily.italic }}>
              {renderInline(child.content, theme)}
            </Text>
          ))}
        </View>
      );
    case 'codeBlock':
      return (
        <View className="rounded-small p-three" style={{ backgroundColor: theme.backgroundElement }}>
          <Text style={{ color: theme.text, fontFamily: MONO_FONT, fontSize: 14 }}>
            {(node.content ?? []).map((child) => child.text ?? '').join('')}
          </Text>
        </View>
      );
    case 'bulletList':
    case 'orderedList':
      return (
        <View className="gap-two">
          {(node.content ?? []).map((item, i) => (
            <View key={i} className="flex-row gap-two">
              <Text className="font-sans text-[17px] leading-[27px]" style={{ color: theme.textSecondary }}>
                {node.type === 'orderedList' ? `${i + 1}.` : '•'}
              </Text>
              <View className="flex-1">
                {(item.content ?? []).map((child, j) => (
                  <Text key={j} className="font-sans text-[17px] leading-[27px]" style={{ color: theme.text }}>
                    {renderInline(child.content, theme)}
                  </Text>
                ))}
              </View>
            </View>
          ))}
        </View>
      );
    case 'horizontalRule':
      return <View style={{ height: 1, backgroundColor: theme.backgroundSelected }} />;
    // Text Blocks never contain inline images in the new block model — a
    // legacy `image` node can only appear here if the one-time migration
    // (see @/db/migrate-legacy-blocks) somehow missed stripping it, so this
    // stays only as a defensive fallback, not an expected path.
    case 'image':
      return (
        <Image
          source={{ uri: node.attrs?.src as string }}
          style={{ width: '100%', aspectRatio: 1.4, borderRadius: 16 }}
          contentFit="cover"
        />
      );
    default:
      return null;
  }
}

function renderInline(nodes: TiptapNode[] | undefined, theme: ReturnType<typeof useTheme>): ReactNode {
  if (!nodes?.length) return null;
  return nodes.map((node, index) => {
    if (node.type === 'hardBreak') return '\n';
    if (typeof node.text !== 'string') return null;

    const marks = node.marks ?? [];
    const isBold = marks.some((m) => m.type === 'bold');
    const isItalic = marks.some((m) => m.type === 'italic');
    const isUnderline = marks.some((m) => m.type === 'underline');
    const isStrike = marks.some((m) => m.type === 'strike');
    const isCode = marks.some((m) => m.type === 'code');
    const link = marks.find((m) => m.type === 'link');

    const fontFamily = isCode ? MONO_FONT : isItalic ? FontFamily.italic : isBold ? FontFamily.bold : undefined;

    return (
      <Text
        key={index}
        style={{
          fontFamily,
          fontSize: isCode ? 15 : undefined,
          textDecorationLine: isUnderline && isStrike ? 'underline line-through' : isUnderline ? 'underline' : isStrike ? 'line-through' : undefined,
          color: link ? theme.text : undefined,
          textDecorationColor: link ? theme.textSecondary : undefined,
        }}>
        {node.text}
      </Text>
    );
  });
}
