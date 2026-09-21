import { router } from 'expo-router';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { useAppSettings } from '@/hooks/use-app-settings';
import { useTheme } from '@/hooks/use-theme';

/**
 * One-time welcome screen, shown only until `app_settings.onboarded` is set.
 * There is no real auth — both buttons just dismiss it and drop into Home.
 */
export default function OnboardingScreen() {
  const theme = useTheme();
  const { setOnboarded } = useAppSettings();

  async function complete() {
    await setOnboarded();
    router.replace('/(tabs)');
  }

  return (
    <SafeAreaView className="flex-1 items-center justify-between px-five py-five" style={{ backgroundColor: theme.background }}>
      <View className="mt-six w-full flex-1 items-center justify-center">
        <View
          className="h-56 w-56 items-center justify-center rounded-pill"
          style={{ backgroundColor: theme.backgroundElement }}>
          <Icon name="book-outline" size={96} muted />
        </View>
      </View>

      <View className="w-full items-center gap-five pb-three">
        <Text className="text-center font-sans-semibold text-[34px] leading-[40px]" style={{ color: theme.text }}>
          Start keeping{'\n'}track of your{' '}
          <Text className="underline decoration-2" style={{ textDecorationColor: theme.textSecondary }}>
            life
          </Text>
        </Text>

        <View className="w-full gap-three">
          <Button variant="primary" fullWidth onPress={complete}>
            Join for free
          </Button>

          <View className="flex-row items-center justify-center gap-one">
            <Text className="font-sans text-[14px]" style={{ color: theme.textSecondary }}>
              Already have an account?
            </Text>
            <Text className="font-sans-semibold text-[14px]" style={{ color: theme.text }} onPress={complete}>
              Log in
            </Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}
