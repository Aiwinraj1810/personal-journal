import { type PropsWithChildren } from 'react';
import { ActivityIndicator, Pressable, type PressableProps, Text } from 'react-native';
import Animated from 'react-native-reanimated';

import { usePressScale } from '@/hooks/use-press-scale';
import { useTheme } from '@/hooks/use-theme';

export type ButtonVariant = 'primary' | 'outline' | 'ghost';

export type ButtonProps = PropsWithChildren<
  Omit<PressableProps, 'children'> & {
    variant?: ButtonVariant;
    loading?: boolean;
    fullWidth?: boolean;
  }
>;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** The app's one button primitive. `primary` is the solid black pill used for
 * the main call-to-action on a screen (e.g. onboarding's "Join for free");
 * `outline`/`ghost` are for secondary actions. */
export function Button({ variant = 'primary', loading = false, fullWidth = false, disabled, style, children, ...rest }: ButtonProps) {
  const theme = useTheme();
  const { animatedStyle, onPressIn, onPressOut } = usePressScale();
  const isDisabled = disabled || loading;

  const variantStyle =
    variant === 'primary'
      ? { backgroundColor: theme.text, borderWidth: 0 }
      : variant === 'outline'
        ? { backgroundColor: 'transparent', borderWidth: 1, borderColor: theme.backgroundSelected }
        : { backgroundColor: 'transparent', borderWidth: 0 };

  const textColor = variant === 'primary' ? theme.background : theme.text;

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled }}
      disabled={isDisabled}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      className={`h-[52px] items-center justify-center rounded-pill px-five ${fullWidth ? 'w-full' : ''} ${isDisabled ? 'opacity-40' : ''}`}
      style={[variantStyle, animatedStyle, style]}
      {...rest}>
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : typeof children === 'string' ? (
        <Text className="font-sans-semibold text-[16px]" style={{ color: textColor }}>
          {children}
        </Text>
      ) : (
        children
      )}
    </AnimatedPressable>
  );
}
