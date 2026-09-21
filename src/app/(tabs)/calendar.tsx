import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CalendarMonthGrid } from '@/components/calendar/calendar-month-grid';
import { EventListRow } from '@/components/calendar/event-list-row';
import { Fab } from '@/components/ui/fab';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useEventDatesInRange, useUpcomingEvents } from '@/hooks/use-calendar-events';
import { useEntryDatesInRange } from '@/hooks/use-entries';
import { useTheme } from '@/hooks/use-theme';
import { getMonthRange } from '@/lib/date';

export default function CalendarScreen() {
  const theme = useTheme();
  const [monthAnchor, setMonthAnchor] = useState(new Date());
  const monthRange = getMonthRange(monthAnchor);

  const entryDates = useEntryDatesInRange(monthRange.start, monthRange.end);
  const eventDates = useEventDatesInRange(monthRange.start, monthRange.end);
  const upcoming = useUpcomingEvents(10);

  return (
    <View className="flex-1" style={{ backgroundColor: theme.background }}>
      <SafeAreaView className="flex-1" edges={['top', 'left', 'right']}>
        <Text className="px-four pb-two pt-two font-sans-semibold text-[24px]" style={{ color: theme.text }}>
          Calendar
        </Text>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: BottomTabInset + Spacing.six }}>
          <CalendarMonthGrid
            monthAnchor={monthAnchor}
            onMonthChange={setMonthAnchor}
            entryDates={entryDates}
            eventDates={eventDates}
          />

          <View className="mt-four px-four">
            <Text className="mb-three font-sans-semibold text-[16px]" style={{ color: theme.text }}>
              Coming up
            </Text>
            <View className="gap-two">
              {upcoming.map(({ event, occursOn }) => (
                <EventListRow key={event.id} event={event} occursOn={occursOn} />
              ))}
              {upcoming.length === 0 && (
                <Text className="py-three text-center font-sans text-[14px]" style={{ color: theme.textSecondary }}>
                  No upcoming birthdays, events, or reminders.
                </Text>
              )}
            </View>
          </View>
        </ScrollView>

        <View className="absolute" style={{ right: Spacing.four, bottom: BottomTabInset + Spacing.three }}>
          <Fab icon="add" onPress={() => router.push('/event/new')} />
        </View>
      </SafeAreaView>
    </View>
  );
}
