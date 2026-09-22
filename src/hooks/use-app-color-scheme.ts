import { useColorScheme as useSystemColorScheme } from '@/hooks/use-color-scheme';

import { useAppSettings } from './use-app-settings';

/** The color scheme the app should actually render with: the user's manual
 * override (Light/Dark, set from the Home screen's menu) when one is set,
 * falling back to the device's own appearance when the mode is "System"
 * (the default). Use this — not the raw device-only `useColorScheme` —
 * anywhere theming needs to react to color scheme, so a manual override is
 * respected uniformly: themed components (via useTheme), navigation chrome
 * and native tabs (root layout), and the journal editor's WebView CSS. */
export function useAppColorScheme(): 'light' | 'dark' {
  const system = useSystemColorScheme();
  const { themeMode } = useAppSettings();
  if (themeMode === 'light' || themeMode === 'dark') return themeMode;
  return system === 'dark' ? 'dark' : 'light';
}
