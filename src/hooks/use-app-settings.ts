import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useCallback, useMemo } from 'react';

import { db } from '@/db/client';
import { appSettings } from '@/db/schema';

const SETTINGS_KEYS = {
  onboarded: 'onboarded',
  displayName: 'displayName',
  defaultReminderTime: 'defaultReminderTime',
  defaultBirthdayNotifyTime: 'defaultBirthdayNotifyTime',
} as const;

const DEFAULT_TIME_FB = '09:00';

export function useAppSettings() {
  const { data, updatedAt } = useLiveQuery(db.select().from(appSettings));

  const map = useMemo(() => {
    const m = new Map<string, string>();
    for (const row of data ?? []) m.set(row.key, row.value);
    return m;
  }, [data]);

  const setSetting = useCallback(async (key: string, value: string) => {
    await db.insert(appSettings).values({ key, value }).onConflictDoUpdate({ target: appSettings.key, set: { value } });
  }, []);

  const setOnboarded = useCallback(() => setSetting(SETTINGS_KEYS.onboarded, 'true'), [setSetting]);
  const setDisplayName = useCallback((name: string) => setSetting(SETTINGS_KEYS.displayName, name), [setSetting]);

  return {
    isOnboarded: map.get(SETTINGS_KEYS.onboarded) === 'true',
    displayName: map.get(SETTINGS_KEYS.displayName) ?? '',
    defaultReminderTime: map.get(SETTINGS_KEYS.defaultReminderTime) ?? DEFAULT_TIME_FB,
    defaultBirthdayNotifyTime: map.get(SETTINGS_KEYS.defaultBirthdayNotifyTime) ?? DEFAULT_TIME_FB,
    setOnboarded,
    setDisplayName,
    setSetting,
    updatedAt,
  };
}
