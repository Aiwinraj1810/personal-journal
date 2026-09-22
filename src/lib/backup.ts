import { eq } from 'drizzle-orm';
import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { wrapLegacyEntryAsBlocks } from '@/db/migrate-legacy-blocks';
import { db } from '@/db/client';
import { appSettings, calendarEventReminders, calendarEvents, entries, entryImages } from '@/db/schema';
import { parseBlocks, serializeBlocks } from '@/lib/journal-blocks';

import { uuid } from './id';
import { cancelReminderNotification, scheduleReminder, type ReminderParentEvent } from './notifications';
import { offsetFromColumns } from './reminders';

export const BACKUP_FORMAT_VERSION = 3;
const SUPPORTED_BACKUP_VERSIONS = [1, 2, 3];

export type BackupPayload = {
  backupFormatVersion: number;
  exportedAt: number;
  entries: (typeof entries.$inferSelect)[];
  /** Exported for continuity with v1 backups, but no longer the source of
   * truth for anything — photos live inside each entry's blocksJson now. */
  entryImages: (typeof entryImages.$inferSelect)[];
  calendarEvents: (typeof calendarEvents.$inferSelect)[];
  /** Absent on v1/v2 files — reminders didn't exist as their own table yet.
   * `notificationIdentifier` is device-local and never trusted on import;
   * every reminder is rescheduled fresh after restore (see importBackup). */
  calendarEventReminders: (typeof calendarEventReminders.$inferSelect)[];
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
    (v.calendarEventReminders === undefined || Array.isArray(v.calendarEventReminders)) &&
    Array.isArray(v.appSettings)
  );
}

/** Exports every table to a versioned JSON file and opens the OS share sheet so
 * it can be saved to Drive/Files/AirDrop/etc. Image rows keep only their
 * Cloudinary URL/publicId — Cloudinary is the permanent image store, per the
 * plan's accepted trade-off — so the file itself stays small and fast. */
export async function exportBackup(): Promise<void> {
  const [allEntries, allImages, allEvents, allReminders, allSettings] = await Promise.all([
    db.select().from(entries),
    db.select().from(entryImages),
    db.select().from(calendarEvents),
    db.select().from(calendarEventReminders),
    db.select().from(appSettings),
  ]);

  const payload: BackupPayload = {
    backupFormatVersion: BACKUP_FORMAT_VERSION,
    exportedAt: Date.now(),
    entries: allEntries,
    entryImages: allImages,
    calendarEvents: allEvents,
    calendarEventReminders: allReminders,
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

/** Migrates a pre-v3 payload's journal-block shape (v1) and event-reminder
 * shape (v1/v2) to the current one. For reminders: v1/v2 backups never had a
 * `calendar_event_reminders` table at all — each event row instead carried
 * its own legacy `notifyEnabled`/`notificationIdentifier` columns directly
 * (still present as plain properties in that old JSON, even though the
 * current schema/type no longer has them). Every enabled legacy event
 * becomes one synthesized 'at_time' reminder row, mirroring exactly what the
 * one-time on-device SQL migration did for existing local rows. Regardless
 * of version, every reminder's `notificationIdentifier` is nulled out here —
 * imported identifiers are inert on this device either way, and the fresh
 * reschedule pass in importBackup is what actually populates them. */
function migrateLegacyPayload(payload: BackupPayload): BackupPayload {
  const migratedEntries =
    payload.backupFormatVersion >= 2
      ? payload.entries
      : payload.entries.map((entryRow) => {
          const imageRows = payload.entryImages.filter((img) => img.entryId === entryRow.id);
          // A real v1 backup file was written under the pre-refactor schema, so its
          // JSON still uses the old `bodyJson` property name — the `blocksJson`
          // field on the (now current-schema-typed) `entryRow` won't actually be
          // present on disk for these. Normalize before handing off to the shared
          // legacy-wrap transform, which always reads `blocksJson`.
          const legacyRow = { ...entryRow, blocksJson: (entryRow as { bodyJson?: string }).bodyJson ?? entryRow.blocksJson };
          const result = wrapLegacyEntryAsBlocks(legacyRow, imageRows);
          return {
            ...entryRow,
            blocksJson: serializeBlocks(result.blocks),
            tags: '[]',
            deletedAt: null,
            coverImageUrl: result.coverImageUrl,
            coverImageWidth: result.coverImageWidth,
            coverImageHeight: result.coverImageHeight,
          };
        });

  let migratedReminders = (payload.calendarEventReminders ?? []).map((r) => ({ ...r, notificationIdentifier: null }));

  if (payload.backupFormatVersion < 3) {
    const legacySynthesized = payload.calendarEvents
      .filter((eventRow) => (eventRow as unknown as { notifyEnabled?: boolean }).notifyEnabled)
      .map((eventRow) => ({
        id: uuid(),
        eventId: eventRow.id,
        offsetType: 'at_time' as const,
        offsetValue: null,
        enabled: true,
        notificationIdentifier: null,
        createdAt: eventRow.createdAt,
      }));
    migratedReminders = [...migratedReminders, ...legacySynthesized];
  }

  return { ...payload, entries: migratedEntries, calendarEventReminders: migratedReminders };
}

/** Picks a backup JSON file, validates it, then replaces the entire local
 * database with its contents and reschedules every enabled reminder's
 * notification fresh — imported `notificationIdentifier` values are inert,
 * since the OS-level schedule never traveled with the file (per-event
 * notifications) or table (per-reminder notifications). Returns null if the
 * user cancelled the picker. */
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
  if (!SUPPORTED_BACKUP_VERSIONS.includes(payload.backupFormatVersion)) {
    throw new Error(`Unsupported backup format version: ${payload.backupFormatVersion}.`);
  }

  const migratedPayload = migrateLegacyPayload({ ...payload, calendarEventReminders: payload.calendarEventReminders ?? [] });

  // Cancel every currently-scheduled reminder notification before the wipe
  // below — their identifiers are about to be discarded either way.
  const existingReminders = await db.select().from(calendarEventReminders);
  await Promise.all(
    existingReminders.filter((r) => r.notificationIdentifier).map((r) => cancelReminderNotification(r.notificationIdentifier!)),
  );

  // Note: expo-sqlite's drizzle driver doesn't fully roll back on error mid-
  // transaction — validation above catches the common failure modes (bad
  // file, wrong version) before anything destructive happens, which is an
  // acceptable trade-off for a single-user local app.
  await db.transaction(async (tx) => {
    await tx.delete(entryImages);
    await tx.delete(entries);
    await tx.delete(calendarEventReminders);
    await tx.delete(calendarEvents);
    await tx.delete(appSettings);

    if (migratedPayload.entries.length) await tx.insert(entries).values(migratedPayload.entries);
    if (migratedPayload.entryImages.length) await tx.insert(entryImages).values(migratedPayload.entryImages);
    if (migratedPayload.calendarEvents.length) await tx.insert(calendarEvents).values(migratedPayload.calendarEvents);
    if (migratedPayload.calendarEventReminders.length) {
      await tx.insert(calendarEventReminders).values(migratedPayload.calendarEventReminders);
    }
    if (migratedPayload.appSettings.length) await tx.insert(appSettings).values(migratedPayload.appSettings);
  });

  const [importedEvents, importedReminders] = await Promise.all([
    db.select().from(calendarEvents),
    db.select().from(calendarEventReminders),
  ]);
  const eventsById = new Map(importedEvents.map((e) => [e.id, e]));

  await Promise.all(
    importedReminders
      .filter((r) => r.enabled)
      .map(async (r) => {
        const event = eventsById.get(r.eventId);
        if (!event) return;
        const parent: ReminderParentEvent = {
          type: event.type,
          title: event.title,
          notes: event.notes,
          date: event.date,
          time: event.time,
          recurrence: event.recurrence,
        };
        const notificationIdentifier = await scheduleReminder(parent, offsetFromColumns(r.offsetType, r.offsetValue));
        if (notificationIdentifier) {
          await db.update(calendarEventReminders).set({ notificationIdentifier }).where(eq(calendarEventReminders.id, r.id));
        }
      }),
  );

  return { entries: migratedPayload.entries.length, images: countPhotos(migratedPayload.entries), events: migratedPayload.calendarEvents.length };
}

/** Total photo count across every imported entry's blocks — photos live
 * inside `blocksJson` now, not the (unused, continuity-only) `entryImages`
 * table, so the import summary needs to count them this way to stay
 * meaningful for v2+ backups. */
function countPhotos(entryRows: BackupPayload['entries']): number {
  return entryRows.reduce((total, row) => {
    const blocks = parseBlocks(row.blocksJson);
    const photosInRow = blocks.reduce((count, block) => count + (block.type === 'photos' ? block.photos.length : 0), 0);
    return total + photosInRow;
  }, 0);
}
