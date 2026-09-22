import { Text, View } from 'react-native';

import { EntryGridTile } from '@/components/home/entry-grid-tile';
import { type ParsedJournalEntry } from '@/hooks/use-entries';
import { useTheme } from '@/hooks/use-theme';

export type EntriesGridSectionProps = { title: string; entries: ParsedJournalEntry[] };

/** One of Home's "Today / Yesterday / Older" sections — a 2-column grid of
 * tiles. Renders nothing when the section has no entries, so an empty
 * "Yesterday" doesn't clutter the page. */
export function EntriesGridSection({ title, entries }: EntriesGridSectionProps) {
  const theme = useTheme();
  if (entries.length === 0) return null;

  return (
    <View className="gap-three">
      <Text className="font-sans-semibold text-[16px]" style={{ color: theme.text }}>
        {title}
      </Text>
      <View className="flex-row flex-wrap gap-three">
        {entries.map((entry) => (
          <View key={entry.id} style={{ width: '47%' }}>
            <EntryGridTile entry={entry} />
          </View>
        ))}
      </View>
    </View>
  );
}
