import { Pressable, Text, View } from 'react-native';

import { MOOD_META, MOOD_ORDER } from '@/constants/moods';
import type { MoodCode } from '@/db/schema';
import { useTheme } from '@/hooks/use-theme';

export type MoodPickerProps = {
  value: MoodCode | null;
  onChange: (mood: MoodCode | null) => void;
};

/** A row of mood options — tapping the already-selected mood clears it. */
export function MoodPicker({ value, onChange }: MoodPickerProps) {
  const theme = useTheme();

  return (
    <View className="flex-row gap-two">
      {MOOD_ORDER.map((mood) => {
        const selected = value === mood;
        return (
          <Pressable
            key={mood}
            accessibilityRole="button"
            accessibilityLabel={MOOD_META[mood].label}
            onPress={() => onChange(selected ? null : mood)}
            className="h-11 w-11 items-center justify-center rounded-pill"
            style={{ backgroundColor: selected ? theme.backgroundSelected : theme.backgroundElement }}>
            <Text style={{ fontSize: 20 }}>{MOOD_META[mood].emoji}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
