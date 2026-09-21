import { Text } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useBackup } from '@/hooks/use-backup';
import { useTheme } from '@/hooks/use-theme';

export function BackupExportCard() {
  const theme = useTheme();
  const { runExport, isExporting, error } = useBackup();

  return (
    <Card className="gap-three p-four">
      <Text className="font-sans-semibold text-[16px]" style={{ color: theme.text }}>
        Export backup
      </Text>
      <Text className="font-sans text-[13px]" style={{ color: theme.textSecondary }}>
        Saves every entry, birthday, event, and reminder to a JSON file you can store anywhere (Drive,
        Files, email) and restore from later on a new phone. Photos stay on Cloudinary — only their
        links are included, so the file stays small.
      </Text>
      <Button variant="outline" onPress={runExport} loading={isExporting}>
        Export backup
      </Button>
      {error && (
        <Text className="font-sans text-[13px]" style={{ color: '#D64545' }}>
          {error}
        </Text>
      )}
    </Card>
  );
}
