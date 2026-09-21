import { randomUUID } from 'expo-crypto';

/** Generates a UUID v4 for a new row. Used for every table's primary key so
 * backup restore can re-insert rows as-is, with no foreign-key remapping. */
export function uuid(): string {
  return randomUUID();
}
