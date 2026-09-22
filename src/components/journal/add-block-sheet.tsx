import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { forwardRef } from 'react';
import { Pressable, Text, View } from 'react-native';

import { AppBottomSheet } from '@/components/ui/bottom-sheet';
import { Icon, type IconName } from '@/components/ui/icon';
import { useTheme } from '@/hooks/use-theme';
import type { JournalBlock } from '@/lib/journal-blocks';

export type AddBlockSheetProps = {
  /** Called with the chosen block type; the caller creates the actual block
   * (each type needs different construction — an empty TextBlock doc, an
   * empty PhotoBlock that immediately opens the picker, etc.) and inserts it
   * at the position this sheet was opened for. */
  onSelect: (type: JournalBlock['type']) => void;
};

/** The "+" block-type picker — Text / Photo / Quote — opened from any "+"
 * affordance between (or after) blocks in the composer. */
export const AddBlockSheet = forwardRef<BottomSheetModal, AddBlockSheetProps>(function AddBlockSheet({ onSelect }, ref) {
  return (
    <AppBottomSheet ref={ref}>
      <View className="gap-two px-four pt-two">
        <Text className="px-one pb-one font-sans-semibold text-[15px]">Add Block</Text>
        <SheetOption icon="document-text-outline" label="Text" onPress={() => onSelect('text')} />
        <SheetOption icon="image-outline" label="Photo" onPress={() => onSelect('photos')} />
        <SheetOption icon="return-down-forward-outline" label="Quote" onPress={() => onSelect('quote')} />
      </View>
    </AppBottomSheet>
  );
});

function SheetOption({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className="flex-row items-center gap-three rounded-small px-three py-three"
      style={{ backgroundColor: theme.backgroundElement }}>
      <Icon name={icon} size={20} />
      <Text className="font-sans-medium text-[15px]" style={{ color: theme.text }}>
        {label}
      </Text>
    </Pressable>
  );
}
