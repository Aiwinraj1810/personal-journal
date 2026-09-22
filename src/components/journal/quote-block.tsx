import { Pressable, Text, View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { TextInput } from '@/components/ui/text-input';
import { FontFamily } from '@/constants/fonts';
import { useTheme } from '@/hooks/use-theme';
import type { QuoteBlock } from '@/lib/journal-blocks';

export type QuoteBlockViewProps = {
  block: QuoteBlock;
  mode: 'edit' | 'read';
  onChange?: (next: QuoteBlock) => void;
  onRemove?: () => void;
};

export function QuoteBlockView({ block, mode, onChange, onRemove }: QuoteBlockViewProps) {
  const theme = useTheme();

  if (mode === 'read') {
    if (!block.text.trim()) return null;
    return (
      <View className="gap-two rounded-card border-l-2 px-four py-three" style={{ borderColor: theme.backgroundSelected }}>
        <Icon name="return-down-forward-outline" size={18} muted />
        <Text className="text-[19px] leading-[28px]" style={{ color: theme.text, fontFamily: FontFamily.italic }}>
          {block.text}
        </Text>
        {block.author && (
          <Text className="font-sans text-[14px]" style={{ color: theme.textSecondary }}>
            — {block.author}
          </Text>
        )}
      </View>
    );
  }

  return (
    <View
      className="gap-two rounded-card border-l-2 p-three"
      style={{ borderColor: theme.backgroundSelected, backgroundColor: theme.backgroundElement }}>
      <View className="flex-row items-center justify-between">
        <Icon name="return-down-forward-outline" size={18} muted />
        <Pressable accessibilityRole="button" onPress={onRemove}>
          <Icon name="trash-outline" size={18} muted />
        </Pressable>
      </View>
      <TextInput
        variant="plain"
        value={block.text}
        onChangeText={(text) => onChange?.({ ...block, text })}
        placeholder="A quote worth remembering…"
        multiline
        style={{ fontFamily: FontFamily.italic, fontSize: 18, lineHeight: 26 }}
      />
      <TextInput
        variant="plain"
        value={block.author ?? ''}
        onChangeText={(author) => onChange?.({ ...block, author: author || undefined })}
        placeholder="Author (optional)"
        className="text-[14px]"
      />
    </View>
  );
}
