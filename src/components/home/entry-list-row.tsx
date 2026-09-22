import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Text, View } from 'react-native';

import { MoodBadge } from '@/components/entry/mood-badge';
import { PressableCard } from '@/components/ui/card';
import { useTheme } from '@/hooks/use-theme';
import { type ParsedJournalEntry } from '@/hooks/use-entries';
import { formatEntryTimestamp } from '@/lib/date';

export type EntryListRowProps = { entry: ParsedJournalEntry };

/** A Recent Entries list row — thumbnail, title, timestamp, mood. */
export function EntryListRow({ entry }: EntryListRowProps) {
  const theme = useTheme();

  return (
    <PressableCard
      className="flex-row items-center gap-three p-two"
      onPress={() => router.push({ pathname: '/entry/[id]', params: { id: entry.id } })}>
      {entry.coverImageUrl ? (
        <Image source={{ uri: entry.coverImageUrl }} style={{ width: 56, height: 56, borderRadius: 14 }} contentFit="cover" />
      ) : (
        <View className="rounded-small" style={{ width: 56, height: 56, backgroundColor: theme.backgroundSelected }} />
      )}

      <View className="flex-1 gap-half">
        <Text numberOfLines={1} className="font-sans-semibold text-[15px]" style={{ color: theme.text }}>
          {entry.title || 'Untitled'}
        </Text>
        <Text className="font-sans text-[13px]" style={{ color: theme.textSecondary }}>
          {formatEntryTimestamp(entry.createdAt)}
        </Text>
      </View>

      <MoodBadge mood={entry.mood} size={26} />
    </PressableCard>
  );
}
