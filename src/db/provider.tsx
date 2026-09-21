import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { useDrizzleStudio } from 'expo-drizzle-studio-plugin';

import { db, sqliteDb } from './client';
import migrations from './migrations/migrations';

/**
 * Applies pending Drizzle migrations. Call from the root layout alongside
 * `useFonts` and gate splash-hiding on `{ success }` from both, so the app
 * never flashes an unmigrated or unstyled screen.
 */
export function useDatabaseMigrations() {
  return useMigrations(db, migrations);
}

/** Dev-only Drizzle Studio inspector, mount once near the root. No-ops in production. */
export function DrizzleStudioDevTools() {
  useDrizzleStudio(__DEV__ ? sqliteDb : null);
  return null;
}
