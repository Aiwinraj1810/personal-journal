import { Image } from 'expo-image';
import { type ReactNode } from 'react';
import { Platform, Text, View } from 'react-native';

import { FontFamily } from '@/constants/fonts';
import { useTheme } from '@/hooks/use-theme';
import { parseTiptapDoc, type TiptapNode } from '@/lib/tiptap';

const MONO_FONT = Platform.select({ ios: 'ui-monospace', default: 'monospace' });

export type RichContentViewProps = { bodyJson: string };

/** Renders a saved entry's Tiptap JSON as plain native components — a "news
 * article" reading layout (headings, paragraphs, images, lists, quotes) —
 * rather than re-opening it in the WebView editor. This is deliberately not
 * the same code path as the editable composer: reading doesn't need an
 * editable WebView at all, and native Text gives real typographic control
 * (line-height, paragraph spacing) that CSS-in-a-WebView can't match as
 * reliably here. */
export function RichContentView({ bodyJson }: RichContentViewProps) {
  const theme = useTheme();
  const doc = parseTiptapDoc(bodyJson);
  const blocks = doc.content ?? [];

  if (blocks.length === 0) {
    return (
      <Text className="font-sans text-[16px]" style={{ color: theme.textSecondary }}>
        No content.
      </Text>
    );
  }

  return (
    <View className="gap-four">
      {blocks.map((node, index) => (
        <Block key={index} node={node} theme={theme} />
      ))}
    </View>
  );
}

function Block({ node, theme }: { node: TiptapNode; theme: ReturnType<typeof useTheme> }) {
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
    case 'image':
      return (
        <Image
          source={{ uri: node.attrs?.src as string }}
          style={{ width: '100%', aspectRatio: 1.4, borderRadius: 16 }}
          contentFit="cover"
        />
      );
    case 'horizontalRule':
      return <View style={{ height: 1, backgroundColor: theme.backgroundSelected }} />;
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

