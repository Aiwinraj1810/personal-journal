import { Pressable, type PressableProps } from 'react-native';
import Animated from 'react-native-reanimated';

import { usePressScale } from '@/hooks/use-press-scale';
import { useTheme } from '@/hooks/use-theme';

import { Icon, type IconName } from './icon';

export type IconButtonProps = Omit<PressableProps, 'children'> & {
  name: IconName;
  size?: number;
  iconSize?: number;
  /** Filled shows a soft circular background (e.g. the FAB-adjacent controls); bare is icon-only. */
  variant?: 'filled' | 'bare';
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** A circular icon-only tap target — the back chevron, kebab menu, share icon,
 * etc. seen throughout the screenshots. */
export function IconButton({ name, size = 40, iconSize = 20, variant = 'bare', disabled, style, ...rest }: IconButtonProps) {
  const theme = useTheme();
  const { animatedStyle, onPressIn, onPressOut } = usePressScale();

  return (
    <AnimatedPressable
      accessibilityRole="button"
      disabled={disabled}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      className={`items-center justify-center rounded-pill ${disabled ? 'opacity-40' : ''}`}
      style={[
        { width: size, height: size },
        variant === 'filled' ? { backgroundColor: theme.backgroundElement } : null,
        animatedStyle,
        style,
      ]}
      {...rest}>
      <Icon name={name} size={iconSize} />
    </AnimatedPressable>
  );
}
