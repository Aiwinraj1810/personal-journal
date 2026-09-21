import { useLocalSearchParams } from 'expo-router';

import { EntryComposer } from '@/components/entry/entry-composer';
import { useEntry } from '@/hooks/use-entries';

export default function EditEntryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { entry } = useEntry(id);

  if (!entry) return null;
  return <EntryComposer existingEntry={entry} />;
}
