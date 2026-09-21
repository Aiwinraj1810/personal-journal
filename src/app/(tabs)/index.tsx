import { subDays } from 'date-fns';
import { Redirect, router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CalendarWeekStrip } from '@/components/home/calendar-week-strip';
import { EntriesGridSection } from '@/components/home/entries-grid-section';
import { EntryListRow } from '@/components/home/entry-list-row';
import { SearchBar } from '@/components/home/search-bar';
import { Fab } from '@/components/ui/fab';
import { IconButton } from '@/components/ui/icon-button';
import { useAppSettings } from '@/hooks/use-app-settings';
import { useEntryDatesInRange, useRecentEntries } from '@/hooks/use-entries';
import { useTheme } from '@/hooks/use-theme';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { getMonthRange, toDateKey } from '@/lib/date';

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Goodmorning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function HomeScreen() {
  const theme = useTheme();
  const { isOnboarded, displayName, updatedAt: settingsUpdatedAt } = useAppSettings();
  const [query, setQuery] = useState('');

  const today = useMemo(() => new Date(), []);
  const todayKey = toDateKey(today);
  const yesterdayKey = toDateKey(subDays(today, 1));
  const monthRange = getMonthRange(today);

  const { entries: recentEntries } = useRecentEntries();
  const entryDates = useEntryDatesInRange(monthRange.start, monthRange.end);

  // Settings haven't loaded yet — render nothing rather than flashing Home
  // before we know whether onboarding is required.
  if (settingsUpdatedAt === undefined) return null;
  if (!isOnboarded) return <Redirect href="/onboarding" />;

  const isSearching = query.trim().length > 0;
  const searchResults = isSearching
    ? recentEntries.filter((entry) =>
        `${entry.title} ${entry.bodyPlainText}`.toLowerCase().includes(query.trim().toLowerCase()),
      )
    : [];

  const todayEntries = recentEntries.filter((entry) => entry.entryDate === todayKey);
  const yesterdayEntries = recentEntries.filter((entry) => entry.entryDate === yesterdayKey);
  const olderEntries = recentEntries.filter((entry) => entry.entryDate < yesterdayKey);

  return (
    <View className="flex-1" style={{ backgroundColor: theme.background }}>
      <SafeAreaView className="flex-1 px-four" edges={['top', 'left', 'right']}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: BottomTabInset + Spacing.six }}>
          <View className="mb-four mt-two flex-row items-center justify-between">
            <View>
              <Text className="font-sans-semibold text-[24px]" style={{ color: theme.text }}>
                {greeting()}
                {displayName ? ` ${displayName}` : ''}
              </Text>
              <Text className="mt-half font-sans text-[13px]" style={{ color: theme.textSecondary }}>
                {today.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
              </Text>
            </View>
            <IconButton name="ellipsis-horizontal" onPress={() => router.push('/settings')} />
          </View>

          <CalendarWeekStrip entryDates={entryDates} />

          <View className="mt-four">
            <SearchBar value={query} onChangeText={setQuery} />
          </View>

          {isSearching ? (
            <View className="mt-five gap-two">
              {searchResults.map((entry) => (
                <EntryListRow key={entry.id} entry={entry} />
              ))}
              {searchResults.length === 0 && (
                <Text className="py-four text-center font-sans text-[14px]" style={{ color: theme.textSecondary }}>
                  No entries match your search.
                </Text>
              )}
            </View>
          ) : (
            <View className="mt-five gap-five">
              <EntriesGridSection title="Today" entries={todayEntries} />
              <EntriesGridSection title="Yesterday" entries={yesterdayEntries} />
              <EntriesGridSection title="Older" entries={olderEntries} />
              {recentEntries.length === 0 && (
                <Text className="py-four text-center font-sans text-[14px]" style={{ color: theme.textSecondary }}>
                  No entries yet — tap + to write your first one.
                </Text>
              )}
            </View>
          )}
        </ScrollView>

        <View className="absolute" style={{ right: Spacing.four, bottom: BottomTabInset + Spacing.three }}>
          <Fab onPress={() => router.push('/entry/new')} />
        </View>
      </SafeAreaView>
    </View>
  );
}
