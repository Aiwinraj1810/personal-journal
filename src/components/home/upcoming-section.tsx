import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Icon, type IconName } from '@/components/ui/icon';
import { useTheme } from '@/hooks/use-theme';
import { useUpcomingItems, type UpcomingItem, type UpcomingItemType } from '@/hooks/use-upcoming';
import { formatRelativeDate } from '@/lib/date';

const VISIBLE_LIMIT = 5;

const TYPE_ICON: Record<UpcomingItemType, IconName> = {
  birthday: 'gift-outline',
  event: 'calendar-outline',
  reminder: 'notifications-outline',
  ticket: 'ticket-outline',
};

/** Module-level, not persisted — surviving only as long as the JS engine
 * does. Dismissing the empty state hides the section across screen
 * navigation within the same app session, but always comes back on a fresh
 * launch (the process restarts, this re-initializes to false), which is
 * exactly the "only during this session" behavior asked for without needing
 * any real persistence. */
let dismissedThisSession = false;

/** A compact, timeline-style glance at what's coming up — Events, Birthdays,
 * and standalone Reminders today; Tickets once that feature exists (see
 * @/hooks/use-upcoming). Purely derived, nothing stored here. */
export function UpcomingSection() {
  const theme = useTheme();
  const items = useUpcomingItems(VISIBLE_LIMIT + 1);
  const [dismissed, setDismissed] = useState(dismissedThisSession);

  if (dismissed) return null;

  const visible = items.slice(0, VISIBLE_LIMIT);
  const hasMore = items.length > VISIBLE_LIMIT;
  const isEmpty = visible.length === 0;

  function handleDismiss() {
    dismissedThisSession = true;
    setDismissed(true);
  }

  return (
    <View className="gap-three">
      <View className="flex-row items-center justify-between">
        <Text className="font-sans-semibold text-[16px]" style={{ color: theme.text }}>
          Upcoming
        </Text>
        {hasMore && (
          <Pressable accessibilityRole="button" onPress={() => router.push('/calendar')}>
            <Text className="font-sans-medium text-[13px]" style={{ color: theme.textSecondary }}>
              See all →
            </Text>
          </Pressable>
        )}
      </View>

      {isEmpty ? (
        <View className="flex-row items-center justify-between">
          <Text className="font-sans text-[14px]" style={{ color: theme.textSecondary, opacity: 0.6 }}>
            All caught up
          </Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Dismiss" onPress={handleDismiss} hitSlop={8}>
            <Icon name="close" size={16} muted />
          </Pressable>
        </View>
      ) : (
        <View className="gap-one overflow-hidden rounded-card" style={{ backgroundColor: theme.backgroundElement }}>
          {visible.map((item, index) => (
            <UpcomingRow key={item.id} item={item} isLast={index === visible.length - 1} />
          ))}
        </View>
      )}
    </View>
  );
}

function UpcomingRow({ item, isLast }: { item: UpcomingItem; isLast: boolean }) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push({ pathname: '/event/[id]/edit', params: { id: item.id } })}
      className="flex-row items-center gap-three px-three py-three"
      style={!isLast ? { borderBottomWidth: 1, borderBottomColor: theme.backgroundSelected } : undefined}>
      <View className="h-9 w-9 items-center justify-center rounded-pill" style={{ backgroundColor: theme.backgroundSelected }}>
        <Icon name={TYPE_ICON[item.type]} size={16} />
      </View>
      <View className="flex-1 gap-half">
        <Text numberOfLines={1} className="font-sans-semibold text-[14px]" style={{ color: theme.text }}>
          {item.title}
        </Text>
        <Text className="font-sans text-[12px]" style={{ color: theme.textSecondary }}>
          {formatRelativeDate(item.occursOn)}
          {item.time ? ` · ${item.time}` : ''}
        </Text>
      </View>
    </Pressable>
  );
}
