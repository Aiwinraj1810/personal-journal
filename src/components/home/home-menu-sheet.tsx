import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { forwardRef } from 'react';
import { Pressable, Text, View } from 'react-native';

import { AppBottomSheet } from '@/components/ui/bottom-sheet';
import { Icon, type IconName } from '@/components/ui/icon';
import { type ThemeMode, useAppSettings } from '@/hooks/use-app-settings';
import { useTheme } from '@/hooks/use-theme';

const APPEARANCE_OPTIONS: { value: ThemeMode; label: string; icon: IconName }[] = [
  { value: 'system', label: 'System', icon: 'phone-portrait-outline' },
  { value: 'light', label: 'Light', icon: 'sunny-outline' },
  { value: 'dark', label: 'Dark', icon: 'moon-outline' },
];

export type HomeMenuSheetProps = { onOpenSettings: () => void };

/** The Home screen's "..." menu — an appearance (Light/Dark/System) switch
 * plus a way into the full Settings screen. `themeMode` is persisted via
 * app_settings (see use-app-settings) and consumed everywhere theming
 * happens through useAppColorScheme, so this is the one place it's set. */
export const HomeMenuSheet = forwardRef<BottomSheetModal, HomeMenuSheetProps>(function HomeMenuSheet(
  { onOpenSettings },
  ref,
) {
  const theme = useTheme();
  const { themeMode, setThemeMode } = useAppSettings();

  return (
    <AppBottomSheet ref={ref}>
      <View className="gap-three px-four pb-two pt-two">
        <Text className="px-one font-sans-semibold text-[13px]" style={{ color: theme.textSecondary }}>
          Appearance
        </Text>
        <View className="flex-row gap-two">
          {APPEARANCE_OPTIONS.map((option) => {
            const selected = themeMode === option.value;
            return (
              <Pressable
                key={option.value}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => setThemeMode(option.value)}
                className="flex-1 items-center gap-one rounded-small py-three"
                style={{ backgroundColor: selected ? theme.text : theme.backgroundElement }}>
                <Icon name={option.icon} size={18} color={selected ? theme.background : theme.text} />
                <Text className="font-sans-medium text-[13px]" style={{ color: selected ? theme.background : theme.text }}>
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <SheetRow icon="settings-outline" label="Settings" onPress={onOpenSettings} />
      </View>
    </AppBottomSheet>
  );
});

function SheetRow({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
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
