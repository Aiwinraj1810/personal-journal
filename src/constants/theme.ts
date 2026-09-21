/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

// Colors/Spacing/Radius live in theme-tokens.js (plain JS, no TS) because
// tailwind.config.js requires that file directly under plain Node, outside the
// Metro/Babel/TS pipeline. This re-export keeps app code and Tailwind reading
// from one source of truth instead of two.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const tokens = require('./theme-tokens.js') as {
  Colors: {
    light: Record<'text' | 'background' | 'backgroundElement' | 'backgroundSelected' | 'textSecondary', string>;
    dark: Record<'text' | 'background' | 'backgroundElement' | 'backgroundSelected' | 'textSecondary', string>;
  };
  Spacing: Record<'half' | 'one' | 'two' | 'three' | 'four' | 'five' | 'six', number>;
  Radius: Record<'small' | 'card' | 'sheet' | 'pill', number>;
};

export const Colors = tokens.Colors;
export const Radius = tokens.Radius;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = tokens.Spacing;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
