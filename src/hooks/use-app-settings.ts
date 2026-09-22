import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useCallback, useMemo } from 'react';

import { db } from '@/db/client';
import { appSettings } from '@/db/schema';

const SETTINGS_KEYS = {
  onboarded: 'onboarded',
  displayName: 'displayName',
  defaultReminderTime: 'defaultReminderTime',
  defaultBirthdayNotifyTime: 'defaultBirthdayNotifyTime',
  themeMode: 'themeMode',
} as const;

const DEFAULT_TIME_FB = '09:00';

/** 'system' follows the device's own appearance setting (the default);
 * 'light'/'dark' is a manual override, set from the Home screen menu. */
export type ThemeMode = 'system' | 'light' | 'dark';

function isThemeMode(value: string): value is ThemeMode {
  return value === 'system' || value === 'light' || value === 'dark';
}

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
  const setThemeMode = useCallback((mode: ThemeMode) => setSetting(SETTINGS_KEYS.themeMode, mode), [setSetting]);

  const rawThemeMode = map.get(SETTINGS_KEYS.themeMode);

  return {
    isOnboarded: map.get(SETTINGS_KEYS.onboarded) === 'true',
    displayName: map.get(SETTINGS_KEYS.displayName) ?? '',
    defaultReminderTime: map.get(SETTINGS_KEYS.defaultReminderTime) ?? DEFAULT_TIME_FB,
    defaultBirthdayNotifyTime: map.get(SETTINGS_KEYS.defaultBirthdayNotifyTime) ?? DEFAULT_TIME_FB,
    themeMode: rawThemeMode && isThemeMode(rawThemeMode) ? rawThemeMode : 'system',
    setOnboarded,
    setDisplayName,
    setThemeMode,
    setSetting,
    updatedAt,
  };
}
