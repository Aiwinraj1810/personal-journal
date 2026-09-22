import RNDateTimePicker from '@react-native-community/datetimepicker';
import { router } from 'expo-router';
import { type ReactNode, useState } from 'react';
import { Alert, Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { IconButton } from '@/components/ui/icon-button';
import { TextInput } from '@/components/ui/text-input';
import { type CalendarEventType, type EventRecurrence } from '@/db/schema';
import { type CalendarEvent, createEvent, deleteEvent, updateEvent } from '@/hooks/use-calendar-events';
import { useTheme } from '@/hooks/use-theme';
import { fromDateKey, toDateKey } from '@/lib/date';
import { offsetFromColumns, offsetLabel, offsetsEqual, REMINDER_PRESETS, type ReminderOffset } from '@/lib/reminders';

const TYPE_OPTIONS: { value: CalendarEventType; label: string }[] = [
  { value: 'event', label: 'Event' },
  { value: 'birthday', label: 'Birthday' },
  { value: 'reminder', label: 'Reminder' },
];

const RECURRENCE_OPTIONS: { value: EventRecurrence; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
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
  const [selectedReminders, setSelectedReminders] = useState<ReminderOffset[]>(
    () =>
      existingEvent?.reminders
        .filter((r) => r.enabled)
        .map((r) => offsetFromColumns(r.offsetType, r.offsetValue)) ?? [],
  );
  const [recurrence, setRecurrence] = useState<EventRecurrence>(existingEvent?.recurrence ?? 'none');
  const [recurrenceEndDate, setRecurrenceEndDate] = useState<Date | null>(
    existingEvent?.recurrenceEndDate ? fromDateKey(existingEvent.recurrenceEndDate) : null,
  );
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  function toggleReminder(offset: ReminderOffset) {
    setSelectedReminders((prev) =>
      prev.some((r) => offsetsEqual(r, offset)) ? prev.filter((r) => !offsetsEqual(r, offset)) : [...prev, offset],
    );
  }

  function handleTypeChange(nextType: CalendarEventType) {
    setType(nextType);
    // A Birthday inherently repeats yearly — not a user choice — while
    // leaving a different type keeps whatever repeat the user had picked,
    // unless it was only 'yearly' because they'd just come from Birthday.
    if (nextType === 'birthday') setRecurrence('yearly');
    else if (recurrence === 'yearly' && type === 'birthday') setRecurrence('none');
  }

  function handlePermissionDenied(onDone: () => void) {
    Alert.alert(
      'Notifications are off',
      'This was saved, but reminders won’t fire until notifications are enabled for this app.',
      [{ text: 'OK', onPress: onDone }],
    );
  }

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
        recurrence,
        recurrenceEndDate: recurrence === 'none' || !recurrenceEndDate ? null : toDateKey(recurrenceEndDate),
        reminders: selectedReminders.map((offset) => ({ offset, enabled: true })),
      };

      const result = existingEvent ? await updateEvent(existingEvent.id, input) : await createEvent(input);

      if (result.permissionDenied) {
        handlePermissionDenied(() => router.back());
      } else {
        router.back();
      }
    } finally {
      setIsSaving(false);
    }
  }

  function handleDelete() {
    if (!existingEvent) return;
    const message =
      existingEvent.recurrence !== 'none'
        ? 'This repeats — deleting it cancels the entire series, including all future occurrences. This can’t be undone.'
        : 'This can’t be undone.';
    Alert.alert('Delete this?', message, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteEvent(existingEvent.id);
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
                  onPress={() => handleTypeChange(option.value)}
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
            <Switch
              value={allDay}
              onValueChange={(value) => {
                setAllDay(value);
                // A reminder always fires at a specific time, so an all-day
                // event (no time) can't carry one — clear rather than leave
                // a config selected that silently never schedules anything.
                if (value) setSelectedReminders([]);
              }}
            />
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

          {type === 'birthday' ? (
            <View className="flex-row items-center gap-two rounded-small px-three py-three" style={{ backgroundColor: theme.backgroundElement }}>
              <Icon name="repeat-outline" size={18} muted />
              <Text className="font-sans text-[15px]" style={{ color: theme.textSecondary }}>
                Repeats yearly
              </Text>
            </View>
          ) : (
            <Field label="Repeat" theme={theme}>
              <View className="flex-row flex-wrap gap-two">
                {RECURRENCE_OPTIONS.map((option) => {
                  const selected = recurrence === option.value;
                  return (
                    <Pressable
                      key={option.value}
                      accessibilityRole="button"
                      onPress={() => setRecurrence(option.value)}
                      className="rounded-pill px-three py-two"
                      style={{ backgroundColor: selected ? theme.text : theme.backgroundElement }}>
                      <Text className="font-sans-medium text-[13px]" style={{ color: selected ? theme.background : theme.text }}>
                        {option.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </Field>
          )}

          {recurrence !== 'none' && (
            <Field label="Ends" theme={theme}>
              <View className="flex-row gap-two">
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setRecurrenceEndDate(null)}
                  className="flex-1 items-center rounded-pill py-three"
                  style={{ backgroundColor: recurrenceEndDate === null ? theme.text : theme.backgroundElement }}>
                  <Text className="font-sans-medium text-[14px]" style={{ color: recurrenceEndDate === null ? theme.background : theme.text }}>
                    Never
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    if (!recurrenceEndDate) setRecurrenceEndDate(date);
                    setShowEndDatePicker((v) => !v);
                  }}
                  className="flex-1 items-center rounded-pill py-three"
                  style={{ backgroundColor: recurrenceEndDate !== null ? theme.text : theme.backgroundElement }}>
                  <Text className="font-sans-medium text-[14px]" style={{ color: recurrenceEndDate !== null ? theme.background : theme.text }}>
                    {recurrenceEndDate ? recurrenceEndDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'On date'}
                  </Text>
                </Pressable>
              </View>
              {showEndDatePicker && recurrenceEndDate && (
                <RNDateTimePicker
                  value={recurrenceEndDate}
                  mode="date"
                  minimumDate={date}
                  onValueChange={(_event, selected) => {
                    setShowEndDatePicker(false);
                    if (selected) setRecurrenceEndDate(selected);
                  }}
                />
              )}
            </Field>
          )}

          {existingEvent && recurrence !== 'none' && (
            <Text className="font-sans text-[12px]" style={{ color: theme.textSecondary }}>
              This repeats. Saving changes updates the entire series, not just this occurrence.
            </Text>
          )}

          {!allDay && (
            <Field label="Remind me" theme={theme}>
              <View className="gap-two">
                {REMINDER_PRESETS.map((preset) => {
                  const checked = selectedReminders.some((r) => offsetsEqual(r, preset));
                  return (
                    <Pressable
                      key={offsetLabel(preset)}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked }}
                      onPress={() => toggleReminder(preset)}
                      className="flex-row items-center gap-three rounded-small px-three py-three"
                      style={{ backgroundColor: theme.backgroundElement }}>
                      <Icon name={checked ? 'checkmark-circle' : 'ellipse-outline'} size={20} color={checked ? theme.text : undefined} muted={!checked} />
                      <Text className="font-sans text-[15px]" style={{ color: theme.text }}>
                        {offsetLabel(preset)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </Field>
          )}

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
