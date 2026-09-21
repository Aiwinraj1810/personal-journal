import { View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { TextInput } from '@/components/ui/text-input';
import { useTheme } from '@/hooks/use-theme';

export type SearchBarProps = { value: string; onChangeText: (text: string) => void };

/** Filters the Home "Recent Entries" list inline — no separate search screen. */
export function SearchBar({ value, onChangeText }: SearchBarProps) {
  const theme = useTheme();
  return (
    <View
      className="flex-row items-center gap-two rounded-pill px-three"
      style={{ backgroundColor: theme.backgroundElement, height: 48 }}>
      <Icon name="search-outline" size={18} muted />
      <TextInput
        variant="plain"
        value={value}
        onChangeText={onChangeText}
        placeholder="Search entries"
        className="flex-1 font-sans text-[15px]"
        returnKeyType="search"
      />
    </View>
  );
}
