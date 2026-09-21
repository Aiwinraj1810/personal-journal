import { Ionicons } from '@expo/vector-icons';
import { type ComponentProps } from 'react';

import { useTheme } from '@/hooks/use-theme';

export type IconName = ComponentProps<typeof Ionicons>['name'];

export type IconProps = {
  name: IconName;
  size?: number;
  color?: string;
  /** When true, uses the theme's secondary (muted) text color instead of the primary one. */
  muted?: boolean;
};

/** Thin themed wrapper around Ionicons, the app's one icon set — outline glyphs
 * throughout keep things low-stimulation and match the monochrome design. */
export function Icon({ name, size = 22, color, muted = false }: IconProps) {
  const theme = useTheme();
  return <Ionicons name={name} size={size} color={color ?? (muted ? theme.textSecondary : theme.text)} />;
}
