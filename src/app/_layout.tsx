import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import {
  PlayfairDisplay_400Regular,
  PlayfairDisplay_400Regular_Italic,
  PlayfairDisplay_500Medium,
  PlayfairDisplay_600SemiBold,
  PlayfairDisplay_700Bold,
  useFonts,
} from '@expo-google-fonts/playfair-display';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { migrateLegacyBlocks } from '@/db/migrate-legacy-blocks';
import { DrizzleStudioDevTools, useDatabaseMigrations } from '@/db/provider';
import { reconcileReminders } from '@/lib/reminder-reconciliation';

SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [fontsLoaded] = useFonts({
    PlayfairDisplay_400Regular,
    PlayfairDisplay_500Medium,
    PlayfairDisplay_600SemiBold,
    PlayfairDisplay_700Bold,
    PlayfairDisplay_400Regular_Italic,
  });
  const migrationState = useDatabaseMigrations();
  const [legacyBlocksMigrated, setLegacyBlocksMigrated] = useState(false);
  const [legacyBlocksError, setLegacyBlocksError] = useState<Error | null>(null);

  const ready = fontsLoaded && migrationState.success && legacyBlocksMigrated;

  if (migrationState.error) {
    // A migration failure means the local database is unusable — surfacing it
    // plainly beats silently losing the user's entries to a blank app.
    throw migrationState.error;
  }
  if (legacyBlocksError) {
    throw legacyBlocksError;
  }

  // Converts any pre-block-model entry rows (old single-document `bodyJson`
  // shape) to the new blocks array, once the SQL schema migration above
  // (which renames the column and adds the new ones) has succeeded. Gating
  // `ready` on this too means the app never renders a screen that assumes
  // `entries.blocksJson` is already an array.
  useEffect(() => {
    if (!migrationState.success) return;
    migrateLegacyBlocks()
      .then(() => setLegacyBlocksMigrated(true))
      .catch((error: unknown) => setLegacyBlocksError(error instanceof Error ? error : new Error(String(error))));
  }, [migrationState.success]);

  // Best-effort background pass, not gated on `ready` — a missed/failed
  // reconciliation shouldn't block the splash screen from hiding, unlike the
  // block-format migration above which the app can't safely render without.
  useEffect(() => {
    if (!migrationState.success) return;
    reconcileReminders().catch(() => {});
  }, [migrationState.success]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <BottomSheetModalProvider>
            <AnimatedSplashOverlay ready={ready} />
            <DrizzleStudioDevTools />
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="onboarding" options={{ gestureEnabled: false }} />
              <Stack.Screen name="entry/new" options={{ presentation: 'modal' }} />
              <Stack.Screen name="entry/[id]" />
              <Stack.Screen name="entry/[id]/edit" options={{ presentation: 'modal' }} />
              <Stack.Screen name="event/new" options={{ presentation: 'modal' }} />
              <Stack.Screen name="event/[id]/edit" options={{ presentation: 'modal' }} />
              <Stack.Screen name="settings/backup" />
              <Stack.Screen name="day/[date]" />
            </Stack>
          </BottomSheetModalProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
