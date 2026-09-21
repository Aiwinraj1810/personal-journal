import { router, useLocalSearchParams } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EntryListRow } from '@/components/home/entry-list-row';
import { EventListRow } from '@/components/calendar/event-list-row';
import { Button } from '@/components/ui/button';
import { IconButton } from '@/components/ui/icon-button';
import { useEventsForDate } from '@/hooks/use-calendar-events';
import { useEntriesForDate } from '@/hooks/use-entries';
import { useTheme } from '@/hooks/use-theme';
import { type DateKey, formatHeaderDate } from '@/lib/date';

export default function DayAgendaScreen() {
  const theme = useTheme();
  const { date } = useLocalSearchParams<{ date: DateKey }>();
  const { entries } = useEntriesForDate(date);
  const events = useEventsForDate(date);

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: theme.background }}>
      <View className="flex-row items-center justify-between px-four py-two">
        <IconButton name="chevron-back" onPress={() => router.back()} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 48 }}>
        <View className="gap-four px-four pt-two">
          <Text className="font-sans-bold text-[24px]" style={{ color: theme.text }}>
            {formatHeaderDate(date)}
          </Text>

          <View className="gap-three">
            <View className="flex-row items-center justify-between">
              <Text className="font-sans-semibold text-[16px]" style={{ color: theme.text }}>
                Entries
              </Text>
              <Button variant="outline" onPress={() => router.push({ pathname: '/entry/new', params: { date } })} style={{ height: 36, paddingHorizontal: 16 }}>
                <Text className="font-sans-medium text-[13px]" style={{ color: theme.text }}>
                  + New entry
                </Text>
              </Button>
            </View>
            <View className="gap-two">
              {entries.map((entry) => (
                <EntryListRow key={entry.id} entry={entry} />
              ))}
              {entries.length === 0 && (
                <Text className="font-sans text-[14px]" style={{ color: theme.textSecondary }}>
                  No entries on this day.
                </Text>
              )}
            </View>
          </View>

          {events.length > 0 && (
            <View className="gap-three">
              <Text className="font-sans-semibold text-[16px]" style={{ color: theme.text }}>
                Birthdays & events
              </Text>
              <View className="gap-two">
                {events.map(({ event, occursOn }) => (
                  <EventListRow key={event.id} event={event} occursOn={occursOn} />
                ))}
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
