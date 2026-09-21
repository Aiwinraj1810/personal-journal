import { Pressable, type PressableProps } from 'react-native';
import Animated from 'react-native-reanimated';

import { usePressScale } from '@/hooks/use-press-scale';
import { useTheme } from '@/hooks/use-theme';

import { Icon, type IconName } from './icon';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export type FabProps = Omit<PressableProps, 'children'> & { icon?: IconName };

/** The floating black circular "+" action button bottom-right on Home. */
export function Fab({ icon = 'add', style, ...rest }: FabProps) {
  const theme = useTheme();
  const { animatedStyle, onPressIn, onPressOut } = usePressScale();

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel="New entry"
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      className="h-16 w-16 items-center justify-center rounded-pill"
      style={[
        { backgroundColor: theme.text, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
        animatedStyle,
        style,
      ]}
      {...rest}>
      <Icon name={icon} size={26} color={theme.background} />
    </AnimatedPressable>
  );
}
