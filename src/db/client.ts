import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync } from 'expo-sqlite';

import * as schema from './schema';

/** Database file name on-device. Bump only via a migration, never rename in place. */
export const DATABASE_NAME = 'personal-journal.db';

export const sqliteDb = openDatabaseSync(DATABASE_NAME, { enableChangeListener: true });

export const db = drizzle(sqliteDb, { schema });
