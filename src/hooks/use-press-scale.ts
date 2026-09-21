import { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

const PRESS_SCALE = 0.96;
const DURATION_MS = 120;

/** A subtle, no-overshoot scale-down on press — used by every tappable
 * primitive (Button, IconButton, Fab, Card) so interactions feel smooth and
 * consistent without the bounce/spring motion a "low stimulation" design wants
 * to avoid. */
export function usePressScale() {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  // Reanimated's SharedValue is intentionally mutable via `.value` — this is
  // the documented, required way to drive an animation, not React state, so
  // it's exempt from the "don't mutate" rule the React Compiler lint plugin
  // otherwise (correctly) enforces elsewhere.
  const onPressIn = () => {
    // eslint-disable-next-line react-hooks/immutability
    scale.value = withTiming(PRESS_SCALE, { duration: DURATION_MS });
  };
  const onPressOut = () => {
    // eslint-disable-next-line react-hooks/immutability
    scale.value = withTiming(1, { duration: DURATION_MS });
  };

  return { animatedStyle, onPressIn, onPressOut };
}
