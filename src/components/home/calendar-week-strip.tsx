import { addDays, format } from 'date-fns';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { IconButton } from '@/components/ui/icon-button';
import { useTheme } from '@/hooks/use-theme';
import { getWeekDays, isToday, toDateKey, weekdayInitial } from '@/lib/date';

export type CalendarWeekStripProps = {
  entryDates: Set<string>;
};

/** The Home header week strip — S M T W T F S with day numbers, today filled.
 * Tapping a day opens its agenda; the arrows step a week at a time so past
 * and future weeks are reachable, not just the current one. */
export function CalendarWeekStrip({ entryDates }: CalendarWeekStripProps) {
  const theme = useTheme();
  const [weekAnchor, setWeekAnchor] = useState(() => new Date());
  const days = getWeekDays(weekAnchor);

  return (
    <View className="gap-two">
      <View className="flex-row items-center justify-between">
        <IconButton name="chevron-back" size={32} iconSize={16} onPress={() => setWeekAnchor((prev) => addDays(prev, -7))} />
        <Text className="font-sans text-[13px]" style={{ color: theme.textSecondary }}>
          {format(days[0], 'MMM d')} – {format(days[6], 'MMM d, yyyy')}
        </Text>
        <IconButton name="chevron-forward" size={32} iconSize={16} onPress={() => setWeekAnchor((prev) => addDays(prev, 7))} />
      </View>

      <View className="flex-row justify-between">
        {days.map((day) => {
          const key = toDateKey(day);
          const today = isToday(key);
          const hasEntry = entryDates.has(key);

          return (
            <Pressable
              key={key}
              accessibilityRole="button"
              onPress={() => router.push({ pathname: '/day/[date]', params: { date: key } })}
              className="items-center gap-two">
              <Text className="font-sans text-[13px]" style={{ color: theme.textSecondary }}>
                {weekdayInitial(day)}
              </Text>
              <View
                className="h-9 w-9 items-center justify-center rounded-pill"
                style={today ? { backgroundColor: theme.text } : undefined}>
                <Text className="font-sans-semibold text-[15px]" style={{ color: today ? theme.background : theme.text }}>
                  {day.getDate()}
                </Text>
              </View>
              <View
                className="h-1 w-1 rounded-pill"
                style={{ backgroundColor: hasEntry && !today ? theme.textSecondary : 'transparent' }}
              />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
