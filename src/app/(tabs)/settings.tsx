import { router } from 'expo-router';
import { type ReactNode, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PressableCard } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { TextInput } from '@/components/ui/text-input';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useAppSettings } from '@/hooks/use-app-settings';
import { useNotificationsPermission } from '@/hooks/use-notifications-permission';
import { useTheme } from '@/hooks/use-theme';

export default function SettingsScreen() {
  const theme = useTheme();
  const { displayName, setDisplayName } = useAppSettings();
  const { status, request } = useNotificationsPermission();
  const [name, setName] = useState(displayName);

  return (
    <View className="flex-1" style={{ backgroundColor: theme.background }}>
      <SafeAreaView className="flex-1 px-four" edges={['top', 'left', 'right']}>
        <Text className="pb-four pt-two font-sans-semibold text-[24px]" style={{ color: theme.text }}>
          Settings
        </Text>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: BottomTabInset + Spacing.six, gap: Spacing.three }}>
          <Section title="Your name" theme={theme}>
            <TextInput
              value={name}
              onChangeText={setName}
              onBlur={() => setDisplayName(name.trim())}
              placeholder="Sam"
            />
          </Section>

          <Section title="Notifications" theme={theme}>
            <Row
              icon="notifications-outline"
              label={status === 'granted' ? 'Enabled' : 'Enable reminders & birthdays'}
              onPress={status === 'granted' ? undefined : request}
            />
          </Section>

          <Section title="Data" theme={theme}>
            <Row icon="cloud-upload-outline" label="Backup & restore" onPress={() => router.push('/settings/backup')} />
          </Section>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function Section({ title, theme, children }: { title: string; theme: ReturnType<typeof useTheme>; children: ReactNode }) {
  return (
    <View className="gap-two">
      <Text className="font-sans text-[13px]" style={{ color: theme.textSecondary }}>
        {title}
      </Text>
      {children}
    </View>
  );
}

function Row({ icon, label, onPress }: { icon: Parameters<typeof Icon>[0]['name']; label: string; onPress?: () => void }) {
  const theme = useTheme();
  return (
    <PressableCard className="flex-row items-center gap-three p-three" onPress={onPress} disabled={!onPress}>
      <Icon name={icon} size={18} />
      <Text className="flex-1 font-sans-medium text-[15px]" style={{ color: theme.text }}>
        {label}
      </Text>
      {onPress && <Icon name="chevron-forward" size={16} muted />}
    </PressableCard>
  );
}
