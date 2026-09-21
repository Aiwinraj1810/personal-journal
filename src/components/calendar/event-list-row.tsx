import { router } from 'expo-router';
import { Text, View } from 'react-native';

import { PressableCard } from '@/components/ui/card';
import { Icon, type IconName } from '@/components/ui/icon';
import { type CalendarEvent } from '@/hooks/use-calendar-events';
import { useTheme } from '@/hooks/use-theme';
import { formatShortDate } from '@/lib/date';

const TYPE_ICON: Record<CalendarEvent['type'], IconName> = {
  birthday: 'gift-outline',
  event: 'calendar-outline',
  reminder: 'notifications-outline',
};

export type EventListRowProps = { event: CalendarEvent; occursOn: string };

export function EventListRow({ event, occursOn }: EventListRowProps) {
  const theme = useTheme();

  return (
    <PressableCard
      className="flex-row items-center gap-three p-three"
      onPress={() => router.push({ pathname: '/event/[id]/edit', params: { id: event.id } })}>
      <View className="h-10 w-10 items-center justify-center rounded-pill" style={{ backgroundColor: theme.backgroundSelected }}>
        <Icon name={TYPE_ICON[event.type]} size={18} />
      </View>
      <View className="flex-1 gap-half">
        <Text numberOfLines={1} className="font-sans-semibold text-[15px]" style={{ color: theme.text }}>
          {event.title}
        </Text>
        <Text className="font-sans text-[13px]" style={{ color: theme.textSecondary }}>
          {event.time ? `${formatShortDate(occursOn)} · ${event.time}` : formatShortDate(occursOn)}
        </Text>
      </View>
    </PressableCard>
  );
}
