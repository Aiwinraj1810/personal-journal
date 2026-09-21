import { Alert, Text } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useBackup } from '@/hooks/use-backup';
import { useTheme } from '@/hooks/use-theme';

export function BackupImportCard() {
  const theme = useTheme();
  const { runImport, isImporting, error } = useBackup();

  async function handleImport() {
    Alert.alert(
      'Replace all data?',
      'Importing a backup replaces everything currently on this device with the contents of the backup file.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Import',
          style: 'destructive',
          onPress: async () => {
            const result = await runImport();
            if (result) {
              Alert.alert(
                'Import complete',
                `Restored ${result.entries} ${result.entries === 1 ? 'entry' : 'entries'}, ${result.images} ${result.images === 1 ? 'photo' : 'photos'}, and ${result.events} ${result.events === 1 ? 'event' : 'events'}.`,
              );
            }
          },
        },
      ],
    );
  }

  return (
    <Card className="gap-three p-four">
      <Text className="font-sans-semibold text-[16px]" style={{ color: theme.text }}>
        Import backup
      </Text>
      <Text className="font-sans text-[13px]" style={{ color: theme.textSecondary }}>
        Restores from a previously exported backup file — for example, setting up a new phone.
        This replaces everything currently on this device.
      </Text>
      <Button variant="outline" onPress={handleImport} loading={isImporting}>
        Choose backup file
      </Button>
      {error && (
        <Text className="font-sans text-[13px]" style={{ color: '#D64545' }}>
          {error}
        </Text>
      )}
    </Card>
  );
}
