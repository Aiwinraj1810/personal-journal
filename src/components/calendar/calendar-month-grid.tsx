import { router } from 'expo-router';
import { Calendar, type DateData } from 'react-native-calendars';

import { FontFamily } from '@/constants/fonts';
import { useAppColorScheme } from '@/hooks/use-app-color-scheme';
import { useTheme } from '@/hooks/use-theme';
import { type DateKey, toDateKey } from '@/lib/date';

export type CalendarMonthGridProps = {
  monthAnchor: Date;
  onMonthChange: (date: Date) => void;
  entryDates: Set<DateKey>;
  eventDates: Set<DateKey>;
};

/** The Calendar tab's month grid — a thin, fully re-themed wrapper around
 * react-native-calendars so it reads as part of the same monochrome design
 * language as the rest of the app. A filled dot marks days with a diary
 * entry; a hollow ring marks days with a birthday/event/reminder. */
export function CalendarMonthGrid({ monthAnchor, onMonthChange, entryDates, eventDates }: CalendarMonthGridProps) {
  const theme = useTheme();
  const scheme = useAppColorScheme();

  const markedDates: Record<string, { marked?: boolean; dotColor?: string; customStyles?: object }> = {};
  const allDates = new Set([...entryDates, ...eventDates]);
  for (const date of allDates) {
    markedDates[date] = { marked: entryDates.has(date), dotColor: theme.text };
  }

  return (
    <Calendar
      // react-native-calendars caches its generated stylesheet internally and
      // doesn't reliably regenerate it when the `theme` prop changes at
      // runtime — without forcing a full remount here, switching Light/Dark
      // (see the Home screen menu) can leave the grid rendering with a stale
      // (often black) background instead of picking up the new theme.
      key={scheme}
      current={toDateKey(monthAnchor)}
      onMonthChange={(date: DateData) => onMonthChange(new Date(date.dateString))}
      onDayPress={(date: DateData) => router.push({ pathname: '/day/[date]', params: { date: date.dateString } })}
      markedDates={markedDates}
      enableSwipeMonths
      hideExtraDays={false}
      style={{ backgroundColor: theme.background }}
      theme={{
        backgroundColor: theme.background,
        calendarBackground: theme.background,
        textSectionTitleColor: theme.textSecondary,
        selectedDayBackgroundColor: theme.text,
        selectedDayTextColor: theme.background,
        todayTextColor: theme.text,
        todayBackgroundColor: theme.backgroundElement,
        dayTextColor: theme.text,
        textDisabledColor: theme.backgroundSelected,
        dotColor: theme.text,
        selectedDotColor: theme.background,
        arrowColor: theme.text,
        monthTextColor: theme.text,
        indicatorColor: theme.text,
        textDayFontFamily: FontFamily.regular,
        textMonthFontFamily: FontFamily.semibold,
        textDayHeaderFontFamily: FontFamily.medium,
        textDayFontSize: 15,
        textMonthFontSize: 16,
        textDayHeaderFontSize: 12,
      }}
    />
  );
}
