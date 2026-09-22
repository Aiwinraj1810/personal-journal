import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { TextInput } from '@/components/ui/text-input';
import { useTheme } from '@/hooks/use-theme';

export type TagInputProps = {
  tags: string[];
  onChange: (tags: string[]) => void;
};

/** Simple entry-level tags: existing tags as small dismissible chips, plus a
 * plain text field to type and submit a new one. Deliberately minimal — no
 * autocomplete, no tag management screen. */
export function TagInput({ tags, onChange }: TagInputProps) {
  const theme = useTheme();
  const [draft, setDraft] = useState('');

  function submit() {
    const tag = draft.trim();
    setDraft('');
    if (!tag || tags.includes(tag)) return;
    onChange([...tags, tag]);
  }

  function removeTag(tag: string) {
    onChange(tags.filter((t) => t !== tag));
  }

  return (
    <View className="flex-row flex-wrap items-center gap-two">
      {tags.map((tag) => (
        <View
          key={tag}
          className="flex-row items-center gap-one rounded-pill px-three py-half"
          style={{ backgroundColor: theme.backgroundElement }}>
          <Text className="font-sans text-[13px]" style={{ color: theme.text }}>
            #{tag}
          </Text>
          <Pressable accessibilityRole="button" onPress={() => removeTag(tag)}>
            <Icon name="close" size={12} muted />
          </Pressable>
        </View>
      ))}
      <TextInput
        variant="plain"
        value={draft}
        onChangeText={setDraft}
        onSubmitEditing={submit}
        onBlur={submit}
        returnKeyType="done"
        placeholder={tags.length === 0 ? 'Add tags…' : 'Add another…'}
        className="min-w-24 text-[13px]"
      />
    </View>
  );
}
