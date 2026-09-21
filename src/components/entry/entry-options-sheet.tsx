import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { forwardRef } from 'react';
import { Pressable, Text, View } from 'react-native';

import { AppBottomSheet } from '@/components/ui/bottom-sheet';
import { Icon, type IconName } from '@/components/ui/icon';
import { useTheme } from '@/hooks/use-theme';

export type EntryOptionsSheetProps = {
  onEdit: () => void;
  onDelete: () => void;
};

/** The kebab-menu sheet on the entry detail screen: Edit / Delete. */
export const EntryOptionsSheet = forwardRef<BottomSheetModal, EntryOptionsSheetProps>(function EntryOptionsSheet(
  { onEdit, onDelete },
  ref,
) {
  return (
    <AppBottomSheet ref={ref}>
      <View className="gap-two px-four pt-two">
        <SheetRow icon="create-outline" label="Edit entry" onPress={onEdit} />
        <SheetRow icon="trash-outline" label="Delete entry" destructive onPress={onDelete} />
      </View>
    </AppBottomSheet>
  );
});

function SheetRow({
  icon,
  label,
  onPress,
  destructive = false,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  destructive?: boolean;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className="flex-row items-center gap-three rounded-small px-three py-three"
      style={{ backgroundColor: theme.backgroundElement }}>
      <Icon name={icon} size={20} color={destructive ? '#D64545' : theme.text} />
      <Text className="font-sans-medium text-[15px]" style={{ color: destructive ? '#D64545' : theme.text }}>
        {label}
      </Text>
    </Pressable>
  );
}
