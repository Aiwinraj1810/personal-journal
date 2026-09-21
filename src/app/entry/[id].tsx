import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { router, useLocalSearchParams } from 'expo-router';
import { useRef } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EntryOptionsSheet } from '@/components/entry/entry-options-sheet';
import { MoodBadge } from '@/components/entry/mood-badge';
import { RichContentView } from '@/components/entry/rich-content-view';
import { IconButton } from '@/components/ui/icon-button';
import { deleteEntry, useEntry } from '@/hooks/use-entries';
import { useTheme } from '@/hooks/use-theme';
import { destroyImage } from '@/lib/cloudinary';
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
          await Promise.all(entry!.images.map((img) => destroyImage(img.cloudinaryPublicId).catch(() => {})));
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

          {/* Any photo the entry has lives inline in the body content itself
              (inserted at the cursor while writing), so it renders here at
              its natural position — not hoisted to a separate hero image —
              which is what gives this the "news article" flow. */}
          <RichContentView bodyJson={entry.bodyJson} />
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
