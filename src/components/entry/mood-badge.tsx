import { Text, View, type ViewProps } from 'react-native';

import { MOOD_META } from '@/constants/moods';
import type { MoodCode } from '@/db/schema';
import { useTheme } from '@/hooks/use-theme';

export type MoodBadgeProps = ViewProps & {
  mood: MoodCode | null | undefined;
  size?: number;
};

/** Small circular emoji badge — the mood indicator seen on entry cards, list
 * rows, and the entry detail header. Renders nothing (not even a placeholder
 * circle) when there's no mood, keeping the low-stimulation layout uncluttered. */
export function MoodBadge({ mood, size = 28, style, ...rest }: MoodBadgeProps) {
  const theme = useTheme();
  if (!mood) return null;

  return (
    <View
      className="items-center justify-center rounded-pill"
      style={[{ width: size, height: size, backgroundColor: theme.backgroundElement }, style]}
      {...rest}>
      <Text style={{ fontSize: size * 0.55 }}>{MOOD_META[mood].emoji}</Text>
    </View>
  );
}
