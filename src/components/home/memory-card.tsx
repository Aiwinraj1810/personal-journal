import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Text, View } from 'react-native';

import { PressableCard } from '@/components/ui/card';
import { MOOD_META } from '@/constants/moods';
import { useTheme } from '@/hooks/use-theme';
import type { Memory } from '@/hooks/use-memories';
import { formatLongDate } from '@/lib/date';

export const MEMORY_CARD_ASPECT_RATIO = 16 / 10;

export type MemoryCardProps = { memory: Memory; style?: object };

/** A single memory — a photo (or, lacking one, a soft tinted surface) with a
 * bottom gradient carrying date/title/preview/mood, in that visual priority.
 * Tapping opens the original journal entry; nothing here duplicates its
 * content, it's read straight off the entry's own lightweight columns. */
export function MemoryCard({ memory, style }: MemoryCardProps) {
  const theme = useTheme();
  const heading = memory.title ?? memory.preview;

  return (
    <PressableCard
      style={[{ aspectRatio: MEMORY_CARD_ASPECT_RATIO, overflow: 'hidden' }, style]}
      onPress={() => router.push({ pathname: '/entry/[id]', params: { id: memory.journalId } })}>
      {memory.image ? (
        <Image source={{ uri: memory.image }} style={{ flex: 1 }} contentFit="cover" transition={200} />
      ) : (
        <View style={{ flex: 1, backgroundColor: theme.backgroundSelected }} />
      )}

      <View
        className="absolute inset-x-0 bottom-0 gap-half p-four"
        style={{ experimental_backgroundImage: 'linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.65) 100%)' }}>
        {memory.isOnThisDay && (
          <Text className="font-sans-semibold text-[12px] uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.85)' }}>
            ✨ On this day
          </Text>
        )}

        <Text className="font-sans text-[13px]" style={{ color: 'rgba(255,255,255,0.85)' }}>
          {formatLongDate(memory.date)}
        </Text>

        {heading && (
          <Text numberOfLines={2} className="font-sans-semibold text-[19px] leading-[24px] text-white">
            {heading}
          </Text>
        )}

        {memory.mood && (
          <Text className="font-sans text-[13px]" style={{ color: 'rgba(255,255,255,0.85)' }}>
            {MOOD_META[memory.mood].emoji} {MOOD_META[memory.mood].label}
          </Text>
        )}
      </View>
    </PressableCard>
  );
}
