import { useLocalSearchParams } from 'expo-router';

import { EventForm } from '@/components/event/event-form';
import { useCalendarEvent } from '@/hooks/use-calendar-events';

export default function EditEventScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const event = useCalendarEvent(id);

  if (!event) return null;
  return <EventForm existingEvent={event} />;
}
