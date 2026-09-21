import RNDateTimePicker from '@react-native-community/datetimepicker';
import { router } from 'expo-router';
import { type ReactNode, useState } from 'react';
import { Alert, Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { IconButton } from '@/components/ui/icon-button';
import { TextInput } from '@/components/ui/text-input';
import { type CalendarEventType } from '@/db/schema';
import { type CalendarEvent, createEvent, deleteEvent, updateEvent } from '@/hooks/use-calendar-events';
import { useTheme } from '@/hooks/use-theme';
import { fromDateKey, toDateKey } from '@/lib/date';

const TYPE_OPTIONS: { value: CalendarEventType; label: string }[] = [
  { value: 'event', label: 'Event' },
  { value: 'birthday', label: 'Birthday' },
  { value: 'reminder', label: 'Reminder' },
];

export type EventFormProps = { existingEvent?: CalendarEvent };

export function EventForm({ existingEvent }: EventFormProps) {
  const theme = useTheme();
  const [type, setType] = useState<CalendarEventType>(existingEvent?.type ?? 'event');
  const [title, setTitle] = useState(existingEvent?.title ?? '');
  const [notes, setNotes] = useState(existingEvent?.notes ?? '');
  const [date, setDate] = useState(existingEvent ? fromDateKey(existingEvent.date) : new Date());
  const [allDay, setAllDay] = useState(existingEvent ? !existingEvent.time : false);
  const [time, setTime] = useState(() => {
    const d = new Date();
    if (existingEvent?.time) {
      const [h, m] = existingEvent.time.split(':').map(Number);
      d.setHours(h, m, 0, 0);
    } else {
      d.setHours(9, 0, 0, 0);
    }
    return d;
  });
  const [notifyEnabled, setNotifyEnabled] = useState(existingEvent?.notifyEnabled ?? true);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSave() {
    if (!title.trim()) {
      Alert.alert('Add a title', `Give this ${type} a name before saving.`);
      return;
    }
    setIsSaving(true);
    try {
      const input = {
        type,
        title: title.trim(),
        notes: notes.trim() || null,
        date: toDateKey(date),
        time: allDay ? null : `${String(time.getHours()).padStart(2, '0')}:${String(time.getMinutes()).padStart(2, '0')}`,
        recurrence: type === 'birthday' ? ('yearly' as const) : ('none' as const),
        notifyEnabled,
      };

      if (existingEvent) {
        await updateEvent(existingEvent.id, input, existingEvent.notificationIdentifier);
      } else {
        await createEvent(input);
      }
      router.back();
    } finally {
      setIsSaving(false);
    }
  }

  function handleDelete() {
    if (!existingEvent) return;
    Alert.alert('Delete this?', 'This can’t be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteEvent(existingEvent.id, existingEvent.notificationIdentifier);
          router.back();
        },
      },
    ]);
  }

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: theme.background }}>
      <View className="flex-row items-center justify-between px-four py-two">
        <IconButton name="close" onPress={() => router.back()} />
        <Text className="font-sans-semibold text-[16px]" style={{ color: theme.text }}>
          {existingEvent ? 'Edit' : 'New'}
        </Text>
        {existingEvent ? (
          <IconButton name="trash-outline" onPress={handleDelete} />
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
        <View className="gap-four px-four pt-two">
          <View className="flex-row gap-two">
            {TYPE_OPTIONS.map((option) => {
              const selected = type === option.value;
              return (
                <Pressable
                  key={option.value}
                  accessibilityRole="button"
                  onPress={() => setType(option.value)}
                  className="flex-1 items-center rounded-pill py-three"
                  style={{ backgroundColor: selected ? theme.text : theme.backgroundElement }}>
                  <Text className="font-sans-medium text-[14px]" style={{ color: selected ? theme.background : theme.text }}>
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder={type === 'birthday' ? "Whose birthday?" : 'Title'}
          />

          <Field label={type === 'birthday' ? 'Birth date' : 'Date'} theme={theme}>
            <Pressable
              accessibilityRole="button"
              onPress={() => setShowDatePicker((v) => !v)}
              className="rounded-small px-three py-three"
              style={{ backgroundColor: theme.backgroundElement }}>
              <Text className="font-sans text-[15px]" style={{ color: theme.text }}>
                {date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
              </Text>
            </Pressable>
            {showDatePicker && (
              <RNDateTimePicker
                value={date}
                mode="date"
                onValueChange={(_event, selected) => {
                  setShowDatePicker(false);
                  if (selected) setDate(selected);
                }}
              />
            )}
          </Field>

          <View className="flex-row items-center justify-between">
            <Text className="font-sans-medium text-[15px]" style={{ color: theme.text }}>
              All day
            </Text>
            <Switch value={allDay} onValueChange={setAllDay} />
          </View>

          {!allDay && (
            <Field label="Time" theme={theme}>
              <Pressable
                accessibilityRole="button"
                onPress={() => setShowTimePicker((v) => !v)}
                className="rounded-small px-three py-three"
                style={{ backgroundColor: theme.backgroundElement }}>
                <Text className="font-sans text-[15px]" style={{ color: theme.text }}>
                  {time.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                </Text>
              </Pressable>
              {showTimePicker && (
                <RNDateTimePicker
                  value={time}
                  mode="time"
                  onValueChange={(_event, selected) => {
                    setShowTimePicker(false);
                    if (selected) setTime(selected);
                  }}
                />
              )}
            </Field>
          )}

          <View className="flex-row items-center justify-between">
            <Text className="font-sans-medium text-[15px]" style={{ color: theme.text }}>
              Remind me
            </Text>
            <Switch value={notifyEnabled} onValueChange={setNotifyEnabled} />
          </View>

          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Notes"
            multiline
            numberOfLines={4}
            style={{ minHeight: 96, textAlignVertical: 'top' }}
          />

          <Button variant="primary" fullWidth onPress={handleSave} loading={isSaving}>
            Save
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Field({ label, theme, children }: { label: string; theme: ReturnType<typeof useTheme>; children: ReactNode }) {
  return (
    <View className="gap-two">
      <Text className="font-sans text-[13px]" style={{ color: theme.textSecondary }}>
        {label}
      </Text>
      {children}
    </View>
  );
}
