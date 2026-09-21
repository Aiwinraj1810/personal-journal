import { type PropsWithChildren } from 'react';
import { Pressable, type PressableProps, View, type ViewProps } from 'react-native';
import Animated from 'react-native-reanimated';

import { usePressScale } from '@/hooks/use-press-scale';
import { useTheme } from '@/hooks/use-theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export type CardProps = PropsWithChildren<ViewProps & { elevated?: boolean }>;

/** Static rounded container — the base surface for list rows, form sections, etc. */
export function Card({ elevated = false, style, children, ...rest }: CardProps) {
  const theme = useTheme();
  return (
    <View
      className="rounded-card"
      style={[
        { backgroundColor: theme.backgroundElement },
        elevated && { shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 2 } },
        style,
      ]}
      {...rest}>
      {children}
    </View>
  );
}

export type PressableCardProps = PropsWithChildren<Omit<PressableProps, 'children'>>;

/** Same surface as Card, but tappable with the app-standard press-scale feedback. */
export function PressableCard({ style, children, ...rest }: PressableCardProps) {
  const theme = useTheme();
  const { animatedStyle, onPressIn, onPressOut } = usePressScale();
  return (
    <AnimatedPressable
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      className="rounded-card overflow-hidden"
      style={[{ backgroundColor: theme.backgroundElement }, animatedStyle, style]}
      {...rest}>
      {children}
    </AnimatedPressable>
  );
}
