import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { router, useLocalSearchParams } from 'expo-router';
import { useRef } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EntryOptionsSheet } from '@/components/entry/entry-options-sheet';
import { MoodBadge } from '@/components/entry/mood-badge';
import { JournalBlockRenderer } from '@/components/journal/journal-block-renderer';
import { IconButton } from '@/components/ui/icon-button';
import { deleteEntry, useEntry } from '@/hooks/use-entries';
import { useTheme } from '@/hooks/use-theme';
import { formatHeaderDate } from '@/lib/date';

export default function EntryDetailScreen() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { entry } = useEntry(id);
  const optionsRef = useRef<BottomSheetModal>(null);

  if (!entry) return null;

  function confirmDelete() {
    optionsRef.current?.dismiss();
    Alert.alert('Delete entry?', 'This can’t be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteEntry(entry!.id);
          router.back();
        },
      },
    ]);
  }

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: theme.background }}>
      <View className="flex-row items-center justify-between px-four py-two">
        <IconButton name="chevron-back" onPress={() => router.back()} />
        <View className="flex-row gap-two">
          <IconButton name="share-outline" onPress={() => {}} disabled />
          <IconButton name="ellipsis-horizontal" onPress={() => optionsRef.current?.present()} />
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 48 }}>
        <View className="gap-four px-four pt-two">
          <View className="gap-three">
            <View className="flex-row items-center justify-between">
              <Text className="font-sans text-[13px]" style={{ color: theme.textSecondary }}>
                {formatHeaderDate(entry.entryDate)}
              </Text>
              <MoodBadge mood={entry.mood} />
            </View>

            <Text className="font-sans-bold text-[28px] leading-[34px]" style={{ color: theme.text }}>
              {entry.title || 'Untitled'}
            </Text>
          </View>

          {entry.blocks.length === 0 ? (
            <Text className="font-sans text-[16px]" style={{ color: theme.textSecondary }}>
              No content.
            </Text>
          ) : (
            <View className="gap-four">
              {entry.blocks.map((block) => (
                <JournalBlockRenderer key={block.id} block={block} mode="read" />
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      <EntryOptionsSheet
        ref={optionsRef}
        onEdit={() => router.push({ pathname: '/entry/[id]/edit', params: { id: entry.id } })}
        onDelete={confirmDelete}
      />
    </SafeAreaView>
  );
}
