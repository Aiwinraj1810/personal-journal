import { eq } from 'drizzle-orm';
import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { db } from '@/db/client';
import { appSettings, calendarEvents, entries, entryImages } from '@/db/schema';

import { cancelEventNotification, syncEventNotification } from './notifications';

export const BACKUP_FORMAT_VERSION = 1;

export type BackupPayload = {
  backupFormatVersion: number;
  exportedAt: number;
  entries: (typeof entries.$inferSelect)[];
  entryImages: (typeof entryImages.$inferSelect)[];
  calendarEvents: (typeof calendarEvents.$inferSelect)[];
  appSettings: (typeof appSettings.$inferSelect)[];
};

function isBackupPayload(value: unknown): value is BackupPayload {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.backupFormatVersion === 'number' &&
    Array.isArray(v.entries) &&
    Array.isArray(v.entryImages) &&
    Array.isArray(v.calendarEvents) &&
    Array.isArray(v.appSettings)
  );
}

/** Exports every table to a versioned JSON file and opens the OS share sheet so
 * it can be saved to Drive/Files/AirDrop/etc. Image rows keep only their
 * Cloudinary URL/publicId — Cloudinary is the permanent image store, per the
 * plan's accepted trade-off — so the file itself stays small and fast. */
export async function exportBackup(): Promise<void> {
  const [allEntries, allImages, allEvents, allSettings] = await Promise.all([
    db.select().from(entries),
    db.select().from(entryImages),
    db.select().from(calendarEvents),
    db.select().from(appSettings),
  ]);

  const payload: BackupPayload = {
    backupFormatVersion: BACKUP_FORMAT_VERSION,
    exportedAt: Date.now(),
    entries: allEntries,
    entryImages: allImages,
    calendarEvents: allEvents,
    appSettings: allSettings,
  };

  const fileName = `personal-journal-backup-${payload.exportedAt}.json`;
  const file = new File(Paths.cache, fileName);
  if (file.exists) file.delete();
  file.create();
  file.write(JSON.stringify(payload, null, 2));

  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) {
    throw new Error('Sharing is not available on this device.');
  }
  await Sharing.shareAsync(file.uri, { mimeType: 'application/json', dialogTitle: 'Save journal backup' });
}

export type ImportResult = { entries: number; images: number; events: number };

/** Picks a backup JSON file, validates it, then replaces the entire local
 * database with its contents and reschedules every notify-enabled event's
 * notification fresh (imported `notificationIdentifier` values are inert — the
 * OS-level schedule never traveled with the file). Returns null if the user
 * cancelled the picker. */
export async function importBackup(): Promise<ImportResult | null> {
  const picked = await DocumentPicker.getDocumentAsync({ type: 'application/json', copyToCacheDirectory: true });
  if (picked.canceled || !picked.assets[0]) return null;

  const file = new File(picked.assets[0].uri);
  const raw = await file.text();

  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    throw new Error('That file is not valid JSON.');
  }
  if (!isBackupPayload(payload)) {
    throw new Error('That file does not look like a personal-journal backup.');
  }
  if (payload.backupFormatVersion !== BACKUP_FORMAT_VERSION) {
    throw new Error(`Unsupported backup format version: ${payload.backupFormatVersion}.`);
  }

  // Cancel every currently-scheduled notification before the wipe below —
  // their identifiers are about to be discarded either way.
  const existingEvents = await db.select().from(calendarEvents);
  await Promise.all(
    existingEvents.filter((e) => e.notificationIdentifier).map((e) => cancelEventNotification(e.notificationIdentifier!)),
  );

  // Note: expo-sqlite's drizzle driver doesn't fully roll back on error mid-
  // transaction — validation above catches the common failure modes (bad
  // file, wrong version) before anything destructive happens, which is an
  // acceptable trade-off for a single-user local app.
  await db.transaction(async (tx) => {
    await tx.delete(entryImages);
    await tx.delete(entries);
    await tx.delete(calendarEvents);
    await tx.delete(appSettings);

    if (payload.entries.length) await tx.insert(entries).values(payload.entries);
    if (payload.entryImages.length) await tx.insert(entryImages).values(payload.entryImages);
    if (payload.calendarEvents.length) await tx.insert(calendarEvents).values(payload.calendarEvents);
    if (payload.appSettings.length) await tx.insert(appSettings).values(payload.appSettings);
  });

  const importedEvents = await db.select().from(calendarEvents);
  await Promise.all(
    importedEvents
      .filter((e) => e.notifyEnabled && e.time)
      .map(async (e) => {
        const identifier = await syncEventNotification(
          { type: e.type, title: e.title, notes: e.notes, date: e.date, time: e.time, recurrence: e.recurrence },
          null,
        );
        if (identifier) {
          await db.update(calendarEvents).set({ notificationIdentifier: identifier }).where(eq(calendarEvents.id, e.id));
        }
      }),
  );

  return { entries: payload.entries.length, images: payload.entryImages.length, events: payload.calendarEvents.length };
}
