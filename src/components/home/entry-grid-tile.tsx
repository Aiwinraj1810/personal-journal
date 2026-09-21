import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Text, View } from 'react-native';

import { MoodBadge } from '@/components/entry/mood-badge';
import { PressableCard } from '@/components/ui/card';
import { type EntryWithImages } from '@/hooks/use-entries';
import { useTheme } from '@/hooks/use-theme';
import { formatTime } from '@/lib/date';

export type EntryGridTileProps = { entry: EntryWithImages };

/** A square tile for the Home "Today / Yesterday / Older" grid sections —
 * cover photo (or a plain fallback surface), mood badge, title, and time
 * overlaid at the bottom, same visual language as the old hero card but
 * self-sized for a multi-column grid instead of a single fixed-height row. */
export function EntryGridTile({ entry }: EntryGridTileProps) {
  const theme = useTheme();
  const cover = entry.images.find((image) => image.isCover) ?? entry.images[0];

  return (
    <PressableCard
      style={{ aspectRatio: 1 }}
      onPress={() => router.push({ pathname: '/entry/[id]', params: { id: entry.id } })}>
      {cover ? (
        <Image source={{ uri: cover.cloudinaryUrl }} style={{ flex: 1 }} contentFit="cover" transition={150} />
      ) : (
        <View style={{ flex: 1, backgroundColor: theme.backgroundSelected }} />
      )}

      <View
        className="absolute inset-x-0 bottom-0 p-two"
        style={{ experimental_backgroundImage: 'linear-gradient(180deg, transparent 30%, rgba(0,0,0,0.7) 100%)' }}>
        <View className="mb-half flex-row items-center justify-between">
          <MoodBadge mood={entry.mood} size={22} />
        </View>
        <Text numberOfLines={1} className="font-sans-semibold text-[14px] text-white">
          {entry.title || 'Untitled'}
        </Text>
        <Text className="mt-half font-sans text-[11px]" style={{ color: 'rgba(255,255,255,0.75)' }}>
          {formatTime(entry.createdAt)}
        </Text>
      </View>
    </PressableCard>
  );
}
