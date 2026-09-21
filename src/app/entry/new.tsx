import { useLocalSearchParams } from 'expo-router';

import { EntryComposer } from '@/components/entry/entry-composer';
import { type DateKey, toDateKey } from '@/lib/date';

export default function NewEntryScreen() {
  const { date } = useLocalSearchParams<{ date?: DateKey }>();
  return <EntryComposer entryDate={date ?? toDateKey(new Date())} />;
}
