import { router } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackupExportCard } from '@/components/settings/backup-export-card';
import { BackupImportCard } from '@/components/settings/backup-import-card';
import { IconButton } from '@/components/ui/icon-button';
import { useTheme } from '@/hooks/use-theme';

export default function BackupScreen() {
  const theme = useTheme();
  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: theme.background }}>
      <View className="flex-row items-center gap-three px-four py-two">
        <IconButton name="chevron-back" onPress={() => router.back()} />
        <Text className="font-sans-semibold text-[18px]" style={{ color: theme.text }}>
          Backup & restore
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
        <BackupExportCard />
        <BackupImportCard />
      </ScrollView>
    </SafeAreaView>
  );
}
